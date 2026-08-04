-- ============================================================
-- Phase 6: Entitlement hardening (non-destructive)
-- - stripe_webhook_events idempotency
-- - billing entitlement columns (legacy columns retained)
-- - canonical entitlement RPCs
-- - atomic free-tier scenario limit (advisory lock)
-- - RLS corrections for scenarios / comparisons
-- ============================================================

-- 1) Webhook event idempotency
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  stripe_customer_id text,
  app_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_taken text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_processed_at_idx
  ON public.stripe_webhook_events (processed_at DESC);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- No client policies: service_role only (RLS on, no grants to authenticated)

-- 2) Billing entitlement-supporting columns (non-destructive)
ALTER TABLE public.billing
  ADD COLUMN IF NOT EXISTS product_id text,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS plan_code text,
  ADD COLUMN IF NOT EXISTS entitlement_status text,
  ADD COLUMN IF NOT EXISTS last_stripe_event_id text,
  ADD COLUMN IF NOT EXISTS last_stripe_event_at timestamptz;

COMMENT ON COLUMN public.billing.plan_code IS 'Canonical: analytical | professional';
COMMENT ON COLUMN public.billing.entitlement_status IS 'Canonical: entitled | trial_entitled | read_only | free | denied';

-- 3) Admin bypass audit log
CREATE TABLE IF NOT EXISTS public.entitlement_bypass_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS entitlement_bypass_log_user_id_idx
  ON public.entitlement_bypass_log (user_id, created_at DESC);

ALTER TABLE public.entitlement_bypass_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.log_admin_entitlement_bypass(
  p_user_id uuid,
  p_source text,
  p_feature text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.entitlement_bypass_log (user_id, feature, source, details)
  VALUES (p_user_id, p_feature, p_source, COALESCE(p_details, '{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.log_admin_entitlement_bypass(uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_admin_entitlement_bypass(uuid, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_admin_entitlement_bypass(uuid, text, text, jsonb) TO authenticated;

-- 4) Price allowlist + plan resolution
CREATE OR REPLACE FUNCTION public.is_professional_price(p_price_id text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_price_id IN (
    'price_1Sod4a3ppKk8xETz9TzPFn8P',
    'price_1Sod513ppKk8xETzwcEPnT51'
  );
$$;

CREATE OR REPLACE FUNCTION public.resolve_plan_code(p_price_id text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN public.is_professional_price(p_price_id) THEN 'professional'
    ELSE 'analytical'
  END;
$$;

-- 5) Canonical entitlement evaluation from billing row (+ admin)
CREATE OR REPLACE FUNCTION public.evaluate_entitlement(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_status text;
  v_price_id text;
  v_period_end timestamptz;
  v_cancel boolean;
  v_entitlement text;
  v_plan text;
  v_period_valid boolean;
BEGIN
  SELECT public.has_role(p_user_id, 'admin') INTO v_is_admin;

  IF v_is_admin THEN
    RETURN jsonb_build_object(
      'planCode', 'professional',
      'entitlementStatus', 'entitled',
      'isAdminBypass', true,
      'cancelAtPeriodEnd', false,
      'currentPeriodEndsAt', NULL,
      'priceId', NULL,
      'stripeStatus', NULL,
      'hasProfessionalAccess', true
    );
  END IF;

  SELECT
    b.subscription_status,
    b.price_id,
    b.current_period_end,
    COALESCE(b.cancel_at_period_end, false)
  INTO v_status, v_price_id, v_period_end, v_cancel
  FROM public.billing b
  WHERE b.user_id = p_user_id;

  IF NOT FOUND THEN
    v_status := NULL;
    v_price_id := NULL;
    v_period_end := NULL;
    v_cancel := false;
  END IF;

  v_period_valid := (v_period_end IS NULL OR v_period_end > now());
  v_plan := 'analytical';
  v_entitlement := 'free';

  IF v_status = 'active' AND public.is_professional_price(v_price_id) AND v_period_valid THEN
    v_entitlement := 'entitled';
    v_plan := 'professional';
  ELSIF v_status = 'trialing' AND public.is_professional_price(v_price_id) AND v_period_valid THEN
    v_entitlement := 'trial_entitled';
    v_plan := 'professional';
  ELSIF v_status IN ('past_due', 'unpaid') THEN
    v_entitlement := 'read_only';
    v_plan := public.resolve_plan_code(v_price_id);
  ELSE
    v_entitlement := 'free';
    v_plan := 'analytical';
  END IF;

  RETURN jsonb_build_object(
    'planCode', v_plan,
    'entitlementStatus', v_entitlement,
    'isAdminBypass', false,
    'cancelAtPeriodEnd', (v_cancel AND v_status IN ('active', 'trialing')),
    'currentPeriodEndsAt', v_period_end,
    'priceId', v_price_id,
    'stripeStatus', v_status,
    'hasProfessionalAccess', v_entitlement IN ('entitled', 'trial_entitled')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_entitlement(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_entitlement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_entitlement(uuid) TO service_role;

-- 6) Feature allow check (optionally with scenario count)
CREATE OR REPLACE FUNCTION public.feature_allowed(
  p_user_id uuid,
  p_feature text,
  p_scenario_count integer DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decision jsonb;
  v_status text;
  v_count integer;
  v_limit constant integer := 3;
BEGIN
  v_decision := public.evaluate_entitlement(p_user_id);
  v_status := v_decision ->> 'entitlementStatus';

  IF v_status = 'denied' THEN
    RETURN p_feature = 'billing_manage';
  END IF;

  IF p_feature = 'billing_manage' THEN
    RETURN true;
  END IF;

  IF p_feature = 'scenario_update' THEN
    RETURN v_status IN ('entitled', 'trial_entitled', 'free');
  END IF;

  IF p_feature IN ('scenario_create', 'scenario_duplicate') THEN
    IF v_status IN ('entitled', 'trial_entitled') THEN
      RETURN true;
    END IF;
    IF v_status = 'free' THEN
      IF p_scenario_count IS NULL THEN
        SELECT count(*)::integer INTO v_count
        FROM public.scenarios s
        WHERE s.user_id = p_user_id AND COALESCE(s.is_archived, false) = false;
      ELSE
        v_count := p_scenario_count;
      END IF;
      RETURN v_count < v_limit;
    END IF;
    RETURN false;
  END IF;

  IF p_feature IN ('comparison_create', 'pdf_export', 'share_create', 'income_context') THEN
    RETURN v_status IN ('entitled', 'trial_entitled');
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.feature_allowed(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.feature_allowed(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.feature_allowed(uuid, text, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.assert_feature_allowed(p_feature text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_decision jsonb;
  v_allowed boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  v_decision := public.evaluate_entitlement(v_uid);

  IF (v_decision ->> 'isAdminBypass')::boolean IS TRUE THEN
    PERFORM public.log_admin_entitlement_bypass(
      v_uid,
      'assert_feature_allowed',
      p_feature,
      jsonb_build_object('entitlementStatus', v_decision ->> 'entitlementStatus')
    );
  END IF;

  v_allowed := public.feature_allowed(v_uid, p_feature, NULL);
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'ENTITLEMENT_DENIED:%', p_feature
      USING ERRCODE = '42501';
  END IF;

  RETURN v_decision;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_feature_allowed(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_feature_allowed(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assert_feature_allowed(text) TO service_role;

-- 7) Atomic scenario create/duplicate enforcement via trigger
CREATE OR REPLACE FUNCTION public.enforce_scenario_write_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := NEW.user_id;

  -- Serialize create/duplicate counts per user
  PERFORM pg_advisory_xact_lock(hashtext(v_uid::text));

  IF TG_OP = 'INSERT' THEN
    IF NOT public.feature_allowed(v_uid, 'scenario_create', NULL) THEN
      RAISE EXCEPTION 'ENTITLEMENT_DENIED:scenario_create'
        USING ERRCODE = '42501';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT public.feature_allowed(v_uid, 'scenario_update', NULL) THEN
      RAISE EXCEPTION 'ENTITLEMENT_DENIED:scenario_update'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_scenario_write_entitlement ON public.scenarios;
CREATE TRIGGER trg_enforce_scenario_write_entitlement
  BEFORE INSERT OR UPDATE ON public.scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_scenario_write_entitlement();

-- Update duplicate_scenario to check entitlement under the same lock path
CREATE OR REPLACE FUNCTION public.duplicate_scenario(
  source_scenario_id uuid,
  new_name text default null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  src record;
  new_id uuid;
  resolved_name text;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_uid::text));

  IF NOT public.feature_allowed(v_uid, 'scenario_duplicate', NULL) THEN
    RAISE EXCEPTION 'ENTITLEMENT_DENIED:scenario_duplicate'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
    INTO src
  FROM public.scenarios
  WHERE id = source_scenario_id
    AND user_id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Scenario not found or access denied';
  END IF;

  resolved_name := coalesce(new_name, src.name || ' (Copy)');

  -- Disable entitlement trigger recursion count double-check by using a session flag
  PERFORM set_config('app.skip_scenario_entitlement', '1', true);

  INSERT INTO public.scenarios (
    user_id,
    name,
    scenario_type,
    schema_version,
    inputs,
    derived,
    assumptions_hash,
    is_archived
  )
  VALUES (
    v_uid,
    resolved_name,
    src.scenario_type,
    src.schema_version,
    src.inputs,
    src.derived,
    src.assumptions_hash,
    false
  )
  RETURNING id INTO new_id;

  PERFORM set_config('app.skip_scenario_entitlement', '0', true);

  RETURN new_id;
END;
$$;

-- Adjust trigger to honor skip flag (duplicate already checked)
CREATE OR REPLACE FUNCTION public.enforce_scenario_write_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  IF current_setting('app.skip_scenario_entitlement', true) = '1' THEN
    RETURN NEW;
  END IF;

  v_uid := NEW.user_id;
  PERFORM pg_advisory_xact_lock(hashtext(v_uid::text));

  IF TG_OP = 'INSERT' THEN
    IF NOT public.feature_allowed(v_uid, 'scenario_create', NULL) THEN
      RAISE EXCEPTION 'ENTITLEMENT_DENIED:scenario_create'
        USING ERRCODE = '42501';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT public.feature_allowed(v_uid, 'scenario_update', NULL) THEN
      RAISE EXCEPTION 'ENTITLEMENT_DENIED:scenario_update'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.duplicate_scenario(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.duplicate_scenario(uuid, text) TO authenticated;

-- 8) Comparison write entitlement
CREATE OR REPLACE FUNCTION public.enforce_comparison_write_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT public.feature_allowed(NEW.user_id, 'comparison_create', NULL) THEN
      RAISE EXCEPTION 'ENTITLEMENT_DENIED:comparison_create'
        USING ERRCODE = '42501';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Treat updates as create-equivalent paid write
    IF NOT public.feature_allowed(NEW.user_id, 'comparison_create', NULL) THEN
      RAISE EXCEPTION 'ENTITLEMENT_DENIED:comparison_create'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_comparison_write_entitlement ON public.user_comparisons;
CREATE TRIGGER trg_enforce_comparison_write_entitlement
  BEFORE INSERT OR UPDATE ON public.user_comparisons
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_comparison_write_entitlement();

-- 9) Update get_effective_tier: admin→professional mapping as pro; no advisor feature grant
CREATE OR REPLACE FUNCTION public.get_effective_tier(target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decision jsonb;
BEGIN
  v_decision := public.evaluate_entitlement(target_user_id);
  IF (v_decision ->> 'hasProfessionalAccess')::boolean IS TRUE THEN
    RETURN 'pro';
  END IF;
  RETURN 'free';
END;
$$;

REVOKE ALL ON FUNCTION public.get_effective_tier(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_effective_tier(uuid) TO postgres;
GRANT EXECUTE ON FUNCTION public.get_effective_tier(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_effective_tier(uuid) TO authenticated;

-- is_advisor: role check only (does not grant professional billing features)
CREATE OR REPLACE FUNCTION public.is_advisor(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(uid, 'advisor') OR public.has_role(uid, 'admin')
$$;

-- 10) Claim webhook event (idempotency helper)
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
BEGIN
  INSERT INTO public.stripe_webhook_events (
    event_id, event_type, stripe_customer_id, app_user_id, action_taken, details
  ) VALUES (
    p_event_id, p_event_type, p_stripe_customer_id, p_app_user_id, p_action_taken, COALESCE(p_details, '{}'::jsonb)
  );
  RETURN true;
EXCEPTION
  WHEN unique_violation THEN
    RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_stripe_webhook_event(text, text, text, uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_stripe_webhook_event(text, text, text, uuid, text, jsonb) TO service_role;
