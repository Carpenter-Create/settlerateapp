-- ============================================================
-- Epic 8: Durable Stripe event evidence for billing recovery
-- Authority: docs/adr/0009-billing-recovery-guarantee.md
--
-- Intent:
--   - Append-only verified Event JSON (Layer A) + optional applied
--     subscription source (Layer B) for retrieve-first parity
--   - Stop DELETE-on-retry for the idempotency ledger (preserve evidence FK)
--   - Allow reclaim of failed_retryable / stuck processing rows
--     (processing reclaim only after stuck threshold; not in-flight duplicates)
--   - Recovery-run audit table (no event payloads)
--
-- Excluded: production apply, entitlement semantic changes, ADR 0011
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1) Evidence table (Layer A + optional Layer B)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_event_evidence (
  event_id text PRIMARY KEY
    REFERENCES public.stripe_webhook_events(event_id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  event_created bigint NOT NULL,
  livemode boolean NOT NULL,
  api_version text,
  event_payload jsonb NOT NULL,
  applied_subscription_source jsonb,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stripe_event_evidence_created_nonneg CHECK (event_created >= 0)
);

COMMENT ON TABLE public.stripe_event_evidence IS
  'Epic 8 append-only recovery evidence: verified Stripe Event JSON + optional applied subscription source (ADR 0009).';
COMMENT ON COLUMN public.stripe_event_evidence.event_payload IS
  'Layer A: verified Stripe Event object JSON after constructEvent (never headers/secrets).';
COMMENT ON COLUMN public.stripe_event_evidence.applied_subscription_source IS
  'Layer B: Subscription-shaped JSON actually mapped at apply time (post-retrieve). NULL until apply or non-apply paths.';

CREATE INDEX IF NOT EXISTS stripe_event_evidence_created_idx
  ON public.stripe_event_evidence (event_created ASC, event_id ASC);

CREATE INDEX IF NOT EXISTS stripe_event_evidence_livemode_created_idx
  ON public.stripe_event_evidence (livemode, event_created ASC, event_id ASC);

ALTER TABLE public.stripe_event_evidence ENABLE ROW LEVEL SECURITY;
-- No client policies: deny-all under RLS for anon/authenticated.

REVOKE ALL ON TABLE public.stripe_event_evidence FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.stripe_event_evidence TO service_role;
-- UPDATE is granted only so Layer B NULL→value can be set via SECURITY DEFINER RPC;
-- immutability trigger blocks other mutations. No DELETE grant to service_role.

CREATE OR REPLACE FUNCTION public.stripe_event_evidence_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'stripe_event_evidence is append-only (DELETE forbidden)'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.event_id IS DISTINCT FROM OLD.event_id
       OR NEW.event_type IS DISTINCT FROM OLD.event_type
       OR NEW.event_created IS DISTINCT FROM OLD.event_created
       OR NEW.livemode IS DISTINCT FROM OLD.livemode
       OR NEW.api_version IS DISTINCT FROM OLD.api_version
       OR NEW.event_payload IS DISTINCT FROM OLD.event_payload
       OR NEW.ingested_at IS DISTINCT FROM OLD.ingested_at
    THEN
      RAISE EXCEPTION 'stripe_event_evidence immutable columns cannot change'
        USING ERRCODE = '42501';
    END IF;

    -- One-way Layer B fill: NULL → non-null only
    IF OLD.applied_subscription_source IS NOT NULL
       AND NEW.applied_subscription_source IS DISTINCT FROM OLD.applied_subscription_source
    THEN
      RAISE EXCEPTION 'stripe_event_evidence.applied_subscription_source cannot be rewritten'
        USING ERRCODE = '42501';
    END IF;

    IF OLD.applied_subscription_source IS NOT NULL
       AND NEW.applied_subscription_source IS NULL
    THEN
      RAISE EXCEPTION 'stripe_event_evidence.applied_subscription_source cannot be cleared'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stripe_event_evidence_immutability ON public.stripe_event_evidence;
CREATE TRIGGER trg_stripe_event_evidence_immutability
  BEFORE UPDATE OR DELETE ON public.stripe_event_evidence
  FOR EACH ROW
  EXECUTE FUNCTION public.stripe_event_evidence_immutability();

REVOKE ALL ON FUNCTION public.stripe_event_evidence_immutability() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Recovery audit runs (no payloads)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_recovery_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  environment text NOT NULL,
  project_ref text NOT NULL,
  mode text NOT NULL,
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_event_ids text[] NOT NULL DEFAULT '{}'::text[],
  result text NOT NULL,
  proposed_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  applied_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  unresolved jsonb NOT NULL DEFAULT '[]'::jsonb,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT billing_recovery_runs_mode_check
    CHECK (mode IN ('dry_run', 'apply', 'external_reconcile')),
  CONSTRAINT billing_recovery_runs_result_check
    CHECK (result IN ('success', 'unresolved', 'failed', 'blocked', 'noop'))
);

COMMENT ON TABLE public.billing_recovery_runs IS
  'Epic 8 recovery attempt audit (ids/counts/summaries only; never Event payloads). ADR 0009 §11.';

CREATE INDEX IF NOT EXISTS billing_recovery_runs_created_at_idx
  ON public.billing_recovery_runs (created_at DESC);

ALTER TABLE public.billing_recovery_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.billing_recovery_runs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.billing_recovery_runs TO service_role;

-- ---------------------------------------------------------------------------
-- 3) Claim: reclaim failed_retryable / stuck processing; never require DELETE
--    In-flight `processing` rows are NOT reclaimable (ADR 0009 §5 idempotency).
--    Only reclaim `processing` after a stuck threshold so concurrent Stripe
--    deliveries cannot double-apply billing mutations.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_stripe_webhook_event(
  p_event_id text,
  p_event_type text,
  p_stripe_customer_id text DEFAULT NULL,
  p_app_user_id uuid DEFAULT NULL,
  p_action_taken text DEFAULT 'received',
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_processed_at timestamptz;
BEGIN
  INSERT INTO public.stripe_webhook_events (
    event_id, event_type, stripe_customer_id, app_user_id, action_taken, details
  ) VALUES (
    p_event_id,
    p_event_type,
    p_stripe_customer_id,
    p_app_user_id,
    p_action_taken,
    COALESCE(p_details, '{}'::jsonb)
  );
  RETURN true;
EXCEPTION
  WHEN unique_violation THEN
    SELECT action_taken, processed_at INTO v_action, v_processed_at
    FROM public.stripe_webhook_events
    WHERE event_id = p_event_id
    FOR UPDATE;

    IF v_action = 'failed_retryable'
       OR (
         v_action = 'processing'
         AND v_processed_at IS NOT NULL
         AND v_processed_at < now() - interval '5 minutes'
       ) THEN
      UPDATE public.stripe_webhook_events
      SET
        event_type = p_event_type,
        stripe_customer_id = COALESCE(p_stripe_customer_id, stripe_customer_id),
        app_user_id = COALESCE(p_app_user_id, app_user_id),
        action_taken = p_action_taken,
        details = COALESCE(p_details, details),
        processed_at = now()
      WHERE event_id = p_event_id;
      RETURN true;
    END IF;

    RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_stripe_webhook_event(text, text, text, uuid, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_stripe_webhook_event(text, text, text, uuid, text, jsonb)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 4) Release: mark failed_retryable (do NOT delete — evidence retention)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_stripe_webhook_event(p_event_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.stripe_webhook_events
  SET
    action_taken = 'failed_retryable',
    details = COALESCE(details, '{}'::jsonb) || jsonb_build_object('released_at', now())
  WHERE event_id = p_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.release_stripe_webhook_event(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_stripe_webhook_event(text)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 5) Evidence RPCs (service_role only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_stripe_event_evidence(
  p_event_id text,
  p_event_type text,
  p_event_created bigint,
  p_livemode boolean,
  p_api_version text,
  p_event_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_event_id IS NULL OR length(p_event_id) = 0 THEN
    RAISE EXCEPTION 'event_id required' USING ERRCODE = '22023';
  END IF;
  IF p_event_payload IS NULL OR jsonb_typeof(p_event_payload) <> 'object' THEN
    RAISE EXCEPTION 'event_payload must be a JSON object' USING ERRCODE = '22023';
  END IF;
  IF p_event_created IS NULL OR p_event_created < 0 THEN
    RAISE EXCEPTION 'event_created invalid' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.stripe_event_evidence (
    event_id,
    event_type,
    event_created,
    livemode,
    api_version,
    event_payload
  ) VALUES (
    p_event_id,
    p_event_type,
    p_event_created,
    COALESCE(p_livemode, false),
    p_api_version,
    p_event_payload
  )
  ON CONFLICT (event_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.record_stripe_event_evidence(text, text, bigint, boolean, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_stripe_event_evidence(text, text, bigint, boolean, text, jsonb)
  TO service_role;

CREATE OR REPLACE FUNCTION public.set_stripe_event_applied_subscription_source(
  p_event_id text,
  p_applied_subscription_source jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_event_id IS NULL OR length(p_event_id) = 0 THEN
    RAISE EXCEPTION 'event_id required' USING ERRCODE = '22023';
  END IF;
  IF p_applied_subscription_source IS NULL
     OR jsonb_typeof(p_applied_subscription_source) <> 'object'
  THEN
    RAISE EXCEPTION 'applied_subscription_source must be a JSON object' USING ERRCODE = '22023';
  END IF;

  UPDATE public.stripe_event_evidence
  SET applied_subscription_source = p_applied_subscription_source
  WHERE event_id = p_event_id
    AND applied_subscription_source IS NULL;

  IF NOT FOUND THEN
    -- Either missing evidence row, or Layer B already set (idempotent no-op if equal)
    IF NOT EXISTS (
      SELECT 1 FROM public.stripe_event_evidence WHERE event_id = p_event_id
    ) THEN
      RAISE EXCEPTION 'stripe_event_evidence row missing for %', p_event_id
        USING ERRCODE = 'P0002';
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_stripe_event_applied_subscription_source(text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_stripe_event_applied_subscription_source(text, jsonb)
  TO service_role;

CREATE OR REPLACE FUNCTION public.insert_billing_recovery_run(
  p_environment text,
  p_project_ref text,
  p_mode text,
  p_scope jsonb DEFAULT '{}'::jsonb,
  p_evidence_event_ids text[] DEFAULT '{}'::text[],
  p_result text DEFAULT 'failed',
  p_proposed_summary jsonb DEFAULT '{}'::jsonb,
  p_applied_summary jsonb DEFAULT '{}'::jsonb,
  p_unresolved jsonb DEFAULT '[]'::jsonb,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.billing_recovery_runs (
    environment,
    project_ref,
    mode,
    scope,
    evidence_event_ids,
    result,
    proposed_summary,
    applied_summary,
    unresolved,
    details
  ) VALUES (
    p_environment,
    p_project_ref,
    p_mode,
    COALESCE(p_scope, '{}'::jsonb),
    COALESCE(p_evidence_event_ids, '{}'::text[]),
    p_result,
    COALESCE(p_proposed_summary, '{}'::jsonb),
    COALESCE(p_applied_summary, '{}'::jsonb),
    COALESCE(p_unresolved, '[]'::jsonb),
    COALESCE(p_details, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_billing_recovery_run(
  text, text, text, jsonb, text[], text, jsonb, jsonb, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_billing_recovery_run(
  text, text, text, jsonb, text[], text, jsonb, jsonb, jsonb, jsonb
) TO service_role;
