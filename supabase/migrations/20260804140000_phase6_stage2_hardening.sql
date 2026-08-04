-- Phase 6 Stage 2: export ownership (user_comparisons), admin bypass logging on DB writes

-- C5: comparison export ownership checks user_comparisons (and legacy saved_comparisons)
CREATE OR REPLACE FUNCTION public.assert_export_source_owned_by_user(
  p_kind public.export_kind,
  p_source_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ok boolean := false;
BEGIN
  IF p_kind = 'scenario' THEN
    SELECT true INTO ok
    FROM public.scenarios s
    WHERE s.id = p_source_id
      AND s.user_id = p_user_id
    LIMIT 1;
  ELSIF p_kind = 'comparison' THEN
    SELECT true INTO ok
    FROM public.user_comparisons c
    WHERE c.id = p_source_id
      AND c.user_id = p_user_id
    LIMIT 1;
    IF NOT ok THEN
      SELECT true INTO ok
      FROM public.saved_comparisons c
      WHERE c.id = p_source_id
        AND c.user_id = p_user_id
      LIMIT 1;
    END IF;
  END IF;
  RETURN COALESCE(ok, false);
END;
$$;

REVOKE ALL ON FUNCTION public.assert_export_source_owned_by_user(public.export_kind, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_export_source_owned_by_user(public.export_kind, uuid, uuid) TO authenticated;

-- C6: log admin bypass on protected scenario/comparison writes
CREATE OR REPLACE FUNCTION public.maybe_log_admin_entitlement_write(
  p_user_id uuid,
  p_source text,
  p_feature text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decision jsonb;
BEGIN
  v_decision := public.evaluate_entitlement(p_user_id);
  IF (v_decision ->> 'isAdminBypass')::boolean IS TRUE THEN
    PERFORM public.log_admin_entitlement_bypass(
      p_user_id,
      p_source,
      p_feature,
      jsonb_build_object('entitlementStatus', v_decision ->> 'entitlementStatus')
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.maybe_log_admin_entitlement_write(uuid, text, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.enforce_scenario_write_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_feature text;
BEGIN
  IF current_setting('app.skip_scenario_entitlement', true) = '1' THEN
    RETURN NEW;
  END IF;

  v_uid := NEW.user_id;
  PERFORM pg_advisory_xact_lock(hashtext(v_uid::text));

  IF TG_OP = 'INSERT' THEN
    v_feature := 'scenario_create';
    PERFORM public.maybe_log_admin_entitlement_write(v_uid, 'enforce_scenario_write_entitlement', v_feature);
    IF NOT public.feature_allowed(v_uid, v_feature, NULL) THEN
      RAISE EXCEPTION 'ENTITLEMENT_DENIED:scenario_create'
        USING ERRCODE = '42501';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    v_feature := 'scenario_update';
    PERFORM public.maybe_log_admin_entitlement_write(v_uid, 'enforce_scenario_write_entitlement', v_feature);
    IF NOT public.feature_allowed(v_uid, v_feature, NULL) THEN
      RAISE EXCEPTION 'ENTITLEMENT_DENIED:scenario_update'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_comparison_write_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.maybe_log_admin_entitlement_write(
      NEW.user_id,
      'enforce_comparison_write_entitlement',
      'comparison_create'
    );
    IF NOT public.feature_allowed(NEW.user_id, 'comparison_create', NULL) THEN
      RAISE EXCEPTION 'ENTITLEMENT_DENIED:comparison_create'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

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

  PERFORM public.maybe_log_admin_entitlement_write(v_uid, 'duplicate_scenario', 'scenario_duplicate');

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

REVOKE ALL ON FUNCTION public.duplicate_scenario(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.duplicate_scenario(uuid, text) TO authenticated;
