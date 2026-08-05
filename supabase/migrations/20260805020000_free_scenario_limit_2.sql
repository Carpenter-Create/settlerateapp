-- Free tier: lower saved-scenario limit from 3 to 2.
-- Entitlement model unchanged (same features/gates); Professional remains unlimited.

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
  v_limit constant integer := 2;
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
