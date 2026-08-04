-- Phase 6 function grant authority assertions

DO $grants$
BEGIN
  PERFORM test.assert_true(
    'anon cannot execute claim_stripe_webhook_event',
    NOT has_function_privilege(
      'anon',
      'public.claim_stripe_webhook_event(text,text,text,uuid,text,jsonb)',
      'EXECUTE'
    )
  );

  PERFORM test.assert_true(
    'authenticated cannot execute claim_stripe_webhook_event',
    NOT has_function_privilege(
      'authenticated',
      'public.claim_stripe_webhook_event(text,text,text,uuid,text,jsonb)',
      'EXECUTE'
    )
  );

  PERFORM test.assert_true(
    'service_role can execute claim_stripe_webhook_event',
    has_function_privilege(
      'service_role',
      'public.claim_stripe_webhook_event(text,text,text,uuid,text,jsonb)',
      'EXECUTE'
    )
  );

  PERFORM test.assert_true(
    'anon cannot execute release_stripe_webhook_event',
    NOT has_function_privilege('anon', 'public.release_stripe_webhook_event(text)', 'EXECUTE')
  );

  PERFORM test.assert_true(
    'authenticated cannot execute release_stripe_webhook_event',
    NOT has_function_privilege('authenticated', 'public.release_stripe_webhook_event(text)', 'EXECUTE')
  );

  PERFORM test.assert_true(
    'service_role can execute release_stripe_webhook_event',
    has_function_privilege('service_role', 'public.release_stripe_webhook_event(text)', 'EXECUTE')
  );

  PERFORM test.assert_true(
    'anon cannot execute log_admin_entitlement_bypass',
    NOT has_function_privilege(
      'anon',
      'public.log_admin_entitlement_bypass(uuid,text,text,jsonb)',
      'EXECUTE'
    )
  );

  PERFORM test.assert_true(
    'authenticated cannot execute log_admin_entitlement_bypass',
    NOT has_function_privilege(
      'authenticated',
      'public.log_admin_entitlement_bypass(uuid,text,text,jsonb)',
      'EXECUTE'
    )
  );

  PERFORM test.assert_true(
    'service_role can execute log_admin_entitlement_bypass',
    has_function_privilege(
      'service_role',
      'public.log_admin_entitlement_bypass(uuid,text,text,jsonb)',
      'EXECUTE'
    )
  );

  PERFORM test.assert_true(
    'anon cannot execute maybe_log_admin_entitlement_write',
    NOT has_function_privilege(
      'anon',
      'public.maybe_log_admin_entitlement_write(uuid,text,text)',
      'EXECUTE'
    )
  );

  PERFORM test.assert_true(
    'authenticated cannot execute maybe_log_admin_entitlement_write',
    NOT has_function_privilege(
      'authenticated',
      'public.maybe_log_admin_entitlement_write(uuid,text,text)',
      'EXECUTE'
    )
  );

  PERFORM test.assert_true(
    'authenticated can execute evaluate_entitlement',
    has_function_privilege('authenticated', 'public.evaluate_entitlement(uuid)', 'EXECUTE')
  );

  PERFORM test.assert_true(
    'anon cannot execute evaluate_entitlement',
    NOT has_function_privilege('anon', 'public.evaluate_entitlement(uuid)', 'EXECUTE')
  );

  PERFORM test.assert_true(
    'authenticated can execute feature_allowed',
    has_function_privilege(
      'authenticated',
      'public.feature_allowed(uuid,text,integer)',
      'EXECUTE'
    )
  );

  PERFORM test.assert_true(
    'anon cannot execute feature_allowed',
    NOT has_function_privilege('anon', 'public.feature_allowed(uuid,text,integer)', 'EXECUTE')
  );

  PERFORM test.assert_true(
    'authenticated can execute assert_feature_allowed',
    has_function_privilege('authenticated', 'public.assert_feature_allowed(text)', 'EXECUTE')
  );

  PERFORM test.assert_true(
    'anon cannot execute assert_feature_allowed',
    NOT has_function_privilege('anon', 'public.assert_feature_allowed(text)', 'EXECUTE')
  );

  PERFORM test.assert_true(
    'authenticated can execute duplicate_scenario',
    has_function_privilege('authenticated', 'public.duplicate_scenario(uuid,text)', 'EXECUTE')
  );

  PERFORM test.assert_true(
    'anon cannot execute duplicate_scenario',
    NOT has_function_privilege('anon', 'public.duplicate_scenario(uuid,text)', 'EXECUTE')
  );

  -- Runtime denial: authenticated cannot invoke privileged RPCs even if mis-granted elsewhere
  PERFORM test.set_auth('11111111-1111-1111-1111-111111111111'::uuid, 'authenticated');
  BEGIN
    PERFORM public.claim_stripe_webhook_event('evt_grant_test', 'test', NULL, NULL, 'processing');
    RAISE EXCEPTION 'ASSERT_FAIL: authenticated claim should be denied at runtime';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ASSERT_OK: authenticated claim runtime denied.';
  END;

  BEGIN
    PERFORM public.release_stripe_webhook_event('evt_grant_test');
    RAISE EXCEPTION 'ASSERT_FAIL: authenticated release should be denied at runtime';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ASSERT_OK: authenticated release runtime denied.';
  END;

  BEGIN
    PERFORM public.log_admin_entitlement_bypass(
      '11111111-1111-1111-1111-111111111111'::uuid,
      'grant_test',
      'scenario_create'
    );
    RAISE EXCEPTION 'ASSERT_FAIL: authenticated bypass log should be denied at runtime';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ASSERT_OK: authenticated bypass log runtime denied.';
  END;

  PERFORM test.reset_auth();

  SET ROLE service_role;
  PERFORM test.assert_true(
    'service_role claim succeeds at runtime',
    public.claim_stripe_webhook_event('evt_grant_test', 'test', NULL, NULL, 'processing')
  );
  PERFORM public.release_stripe_webhook_event('evt_grant_test');
  RESET ROLE;

  RAISE NOTICE 'PHASE6_FUNCTION_GRANTS_SQL: ALL ASSERTIONS PASSED';
END;
$grants$;
