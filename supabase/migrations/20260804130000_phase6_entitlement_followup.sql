-- ============================================================
-- Phase 6 follow-up (specialist orchestration — lead integration)
-- Non-destructive: RPC caller binding, audit grant lockdown,
-- archived-scenario limit bypass close, legacy comparison gate,
-- comparison ownership check. Does not alter product policy.
-- ============================================================

-- 1) Caller binding on entitlement evaluators (close cross-user IDOR)
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
  v_caller uuid := auth.uid();
  v_jwt_role text := coalesce(auth.jwt() ->> 'role', '');
BEGIN
  -- Authenticated callers may only evaluate themselves; service_role may evaluate any
  IF v_caller IS NOT NULL
     AND v_caller IS DISTINCT FROM p_user_id
     AND v_jwt_role IS DISTINCT FROM 'service_role'
     AND NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

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

  -- Require a future period end for active/trialing grants (null does not perpetuate)
  v_period_valid := (v_period_end IS NOT NULL AND v_period_end > now());
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
  v_caller uuid := auth.uid();
  v_jwt_role text := coalesce(auth.jwt() ->> 'role', '');
BEGIN
  IF v_caller IS NOT NULL
     AND v_caller IS DISTINCT FROM p_user_id
     AND v_jwt_role IS DISTINCT FROM 'service_role'
     AND NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

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
        -- Count all rows (including archived) so stash-then-unarchive cannot bypass the limit
        SELECT count(*)::integer INTO v_count
        FROM public.scenarios s
        WHERE s.user_id = p_user_id;
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

CREATE OR REPLACE FUNCTION public.get_effective_tier(target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decision jsonb;
  v_caller uuid := auth.uid();
  v_jwt_role text := coalesce(auth.jwt() ->> 'role', '');
BEGIN
  IF v_caller IS NOT NULL
     AND v_caller IS DISTINCT FROM target_user_id
     AND v_jwt_role IS DISTINCT FROM 'service_role'
     AND NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  v_decision := public.evaluate_entitlement(target_user_id);
  IF (v_decision ->> 'hasProfessionalAccess')::boolean IS TRUE THEN
    RETURN 'pro';
  END IF;
  RETURN 'free';
END;
$$;

REVOKE ALL ON FUNCTION public.get_effective_tier(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_effective_tier(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_effective_tier(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_tier(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_effective_tier(uuid) TO postgres;

-- 2) Audit log: service_role + DEFINER callers only (not client-forgeable)
REVOKE ALL ON FUNCTION public.log_admin_entitlement_bypass(uuid, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_admin_entitlement_bypass(uuid, text, text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.log_admin_entitlement_bypass(uuid, text, text, jsonb) TO service_role;

-- assert_feature_allowed still logs via SECURITY DEFINER owner privileges
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
  -- Only log real admins (prevents forging bypass rows for non-admins)
  IF NOT public.has_role(p_user_id, 'admin') THEN
    RETURN;
  END IF;

  INSERT INTO public.entitlement_bypass_log (user_id, feature, source, details)
  VALUES (p_user_id, p_feature, p_source, COALESCE(p_details, '{}'::jsonb));
END;
$$;

-- 3) Close archived-insert → unarchive free-tier bypass
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
    -- Unarchive is not a new row; create-limit bypass is closed by counting archived on INSERT
    IF NOT public.feature_allowed(v_uid, 'scenario_update', NULL) THEN
      RAISE EXCEPTION 'ENTITLEMENT_DENIED:scenario_update'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4) Gate legacy saved_comparisons + ownership of comparison scenario refs
CREATE OR REPLACE FUNCTION public.enforce_comparison_write_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NOT public.feature_allowed(NEW.user_id, 'comparison_create', NULL) THEN
      RAISE EXCEPTION 'ENTITLEMENT_DENIED:comparison_create'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_comparison_write_entitlement_saved ON public.saved_comparisons;
CREATE TRIGGER trg_enforce_comparison_write_entitlement_saved
  BEFORE INSERT OR UPDATE ON public.saved_comparisons
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_comparison_write_entitlement();

CREATE OR REPLACE FUNCTION public.enforce_user_comparison_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.scenarios s
    WHERE s.id = NEW.scenario_a_id AND s.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Comparison scenario_a not owned by user' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.scenarios s
    WHERE s.id = NEW.scenario_b_id AND s.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Comparison scenario_b not owned by user' USING ERRCODE = '42501';
  END IF;
  IF NEW.scenario_c_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.scenarios s
    WHERE s.id = NEW.scenario_c_id AND s.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Comparison scenario_c not owned by user' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_user_comparison_ownership ON public.user_comparisons;
CREATE TRIGGER trg_enforce_user_comparison_ownership
  BEFORE INSERT OR UPDATE ON public.user_comparisons
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_user_comparison_ownership();

-- 5) Webhook claim reclaim helper for failed processing
CREATE OR REPLACE FUNCTION public.release_stripe_webhook_event(p_event_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.stripe_webhook_events WHERE event_id = p_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.release_stripe_webhook_event(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_stripe_webhook_event(text) TO service_role;

-- Defense in depth: no client table privileges on audit/idempotency tables
REVOKE ALL ON TABLE public.stripe_webhook_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.entitlement_bypass_log FROM PUBLIC, anon, authenticated;
