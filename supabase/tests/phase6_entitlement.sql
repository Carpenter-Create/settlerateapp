-- Phase 6 entitlement integration assertions (run against applied migrations)

DO $phase6$
DECLARE
  v_free uuid := '11111111-1111-1111-1111-111111111111';
  v_entitled uuid := '22222222-2222-2222-2222-222222222222';
  v_read_only uuid := '33333333-3333-3333-3333-333333333333';
  v_admin uuid := '44444444-4444-4444-4444-444444444444';
  v_user_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_user_b uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_scenario uuid;
  v_scenario_b uuid;
  v_read_only_scenario uuid;
  v_free_delete_scenario uuid;
  v_comparison uuid;
  v_decision jsonb;
  v_pro_price constant text := 'price_1U0t2QC56u2NxRItya8dElyg';
  v_advisor_price constant text := 'price_1Sod5F3ppKk8xETzl9EDOR6I';
  v_future timestamptz := now() + interval '30 days';
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (v_free, 'free@test.local'),
    (v_entitled, 'entitled@test.local'),
    (v_read_only, 'readonly@test.local'),
    (v_admin, 'admin@test.local'),
    (v_user_a, 'usera@test.local'),
    (v_user_b, 'userb@test.local')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_admin, 'admin')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.billing (user_id, subscription_status, price_id, current_period_end)
  VALUES
    (v_entitled, 'active', v_pro_price, v_future),
    (v_read_only, 'past_due', v_pro_price, v_future)
  ON CONFLICT (user_id) DO UPDATE SET
    subscription_status = EXCLUDED.subscription_status,
    price_id = EXCLUDED.price_id,
    current_period_end = EXCLUDED.current_period_end;

  PERFORM set_config('app.skip_scenario_entitlement', '1', true);

  INSERT INTO public.scenarios (user_id, name, scenario_type, inputs, derived)
  VALUES (v_free, 'Seed 1', 'purchase', '{}'::jsonb, '{}'::jsonb)
  RETURNING id INTO v_scenario;

  INSERT INTO public.scenarios (user_id, name, scenario_type, inputs, derived, is_archived)
  VALUES
    (v_free, 'Seed 2', 'purchase', '{}'::jsonb, '{}'::jsonb, false),
    (v_free, 'Seed 3 archived', 'purchase', '{}'::jsonb, '{}'::jsonb, true);

  INSERT INTO public.scenarios (user_id, name, scenario_type, inputs, derived)
  VALUES (v_user_a, 'A1', 'purchase', '{}'::jsonb, '{}'::jsonb);

  INSERT INTO public.scenarios (user_id, name, scenario_type, inputs, derived)
  VALUES (v_user_b, 'B1', 'purchase', '{}'::jsonb, '{}'::jsonb)
  RETURNING id INTO v_scenario_b;

  INSERT INTO public.scenarios (user_id, name, scenario_type, inputs, derived)
  VALUES (v_read_only, 'RO1', 'purchase', '{}'::jsonb, '{}'::jsonb);

  PERFORM set_config('app.skip_scenario_entitlement', '0', true);

  PERFORM test.set_auth(v_free);
  PERFORM test.assert_raises(
    'free fourth scenario denied',
    $sql$INSERT INTO public.scenarios (user_id, name, scenario_type, inputs, derived)
      VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 'Fourth', 'purchase', '{}'::jsonb, '{}'::jsonb)$sql$
  );
  PERFORM test.assert_raises(
    'archived rows count toward limit',
    $sql$INSERT INTO public.scenarios (user_id, name, scenario_type, inputs, derived)
      VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 'Another', 'purchase', '{}'::jsonb, '{}'::jsonb)$sql$
  );

  -- 4) duplicate at limit denied
  PERFORM test.assert_raises(
    'duplicate at limit denied',
    format('SELECT public.duplicate_scenario(%L::uuid)', v_scenario)
  );
  PERFORM test.reset_auth();

  PERFORM test.set_auth(v_free);
  UPDATE public.scenarios SET name = 'Seed 1 updated' WHERE id = v_scenario;
  PERFORM test.assert_true('free update allowed', true);
  PERFORM test.reset_auth();

  PERFORM test.set_auth(v_read_only);
  BEGIN
    UPDATE public.scenarios SET name = 'blocked' WHERE user_id = v_read_only;
    RAISE EXCEPTION 'ASSERT_FAIL: read_only update should be denied';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%ENTITLEMENT_DENIED:scenario_update%' THEN
      RAISE;
    END IF;
    RAISE NOTICE 'ASSERT_OK: read_only update denied (%).', SQLERRM;
  END;
  PERFORM test.reset_auth();

  SELECT id INTO v_read_only_scenario
  FROM public.scenarios
  WHERE user_id = v_read_only AND name = 'RO1'
  LIMIT 1;

  PERFORM test.set_auth(v_read_only);
  DELETE FROM public.scenarios WHERE id = v_read_only_scenario;
  PERFORM test.assert_true(
    'read_only delete allowed',
    NOT EXISTS (SELECT 1 FROM public.scenarios WHERE id = v_read_only_scenario)
  );
  PERFORM test.reset_auth();

  SELECT id INTO v_free_delete_scenario
  FROM public.scenarios
  WHERE user_id = v_free AND name = 'Seed 2'
  LIMIT 1;

  PERFORM test.set_auth(v_free);
  DELETE FROM public.scenarios WHERE id = v_free_delete_scenario;
  PERFORM test.assert_true(
    'free delete allowed',
    NOT EXISTS (SELECT 1 FROM public.scenarios WHERE id = v_free_delete_scenario)
  );
  PERFORM test.reset_auth();

  PERFORM test.set_auth(v_free);
  PERFORM test.assert_raises(
    'free user_comparisons insert denied',
    format(
      $sql$INSERT INTO public.user_comparisons (user_id, name, scenario_a_id, scenario_b_id)
        SELECT %L::uuid, 'cmp', s1.id, s2.id
        FROM public.scenarios s1, public.scenarios s2
        WHERE s1.user_id = %L::uuid AND s2.user_id = %L::uuid
        LIMIT 1$sql$,
      v_free, v_free, v_free
    )
  );
  PERFORM test.reset_auth();

  PERFORM test.set_auth(v_entitled);
  INSERT INTO public.scenarios (user_id, name, scenario_type, inputs, derived)
  VALUES (v_entitled, 'E1', 'purchase', '{}'::jsonb, '{}'::jsonb),
         (v_entitled, 'E2', 'purchase', '{}'::jsonb, '{}'::jsonb);

  INSERT INTO public.user_comparisons (user_id, name, scenario_a_id, scenario_b_id)
  SELECT v_entitled, 'Pro cmp', s1.id, s2.id
  FROM public.scenarios s1
  JOIN public.scenarios s2 ON s2.user_id = v_entitled AND s2.id <> s1.id
  WHERE s1.user_id = v_entitled
  LIMIT 1
  RETURNING id INTO v_comparison;
  PERFORM test.assert_true('entitled comparison insert ok', v_comparison IS NOT NULL);
  PERFORM test.reset_auth();

  PERFORM test.set_auth(v_free);
  PERFORM test.assert_raises(
    'free saved_comparisons denied',
    $sql$INSERT INTO public.saved_comparisons (user_id, name) VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 'legacy')$sql$
  );
  PERFORM test.reset_auth();

  PERFORM test.set_auth(v_user_a);
  PERFORM test.assert_raises(
    'comparison non-owned scenario denied',
    format(
      $sql$INSERT INTO public.user_comparisons (user_id, name, scenario_a_id, scenario_b_id)
        VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'bad', %L::uuid, %L::uuid)$sql$,
      v_scenario, v_scenario_b
    )
  );
  PERFORM test.reset_auth();

  PERFORM test.set_auth(v_user_a);
  BEGIN
    PERFORM public.evaluate_entitlement(v_user_b);
    RAISE EXCEPTION 'ASSERT_FAIL: cross-user evaluate should fail';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%not authorized%' THEN RAISE; END IF;
    RAISE NOTICE 'ASSERT_OK: cross-user evaluate denied (%).', SQLERRM;
  END;
  PERFORM test.reset_auth();

  EXECUTE 'SET SESSION AUTHORIZATION authenticator';
  PERFORM set_config('request.jwt.claim.sub', v_free::text, false);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', false);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_free, 'role', 'authenticated')::text,
    false
  );
  SET ROLE authenticated;
  DELETE FROM public.scenarios WHERE id = v_scenario_b;
  RESET ROLE;
  EXECUTE 'RESET SESSION AUTHORIZATION';
  PERFORM test.assert_true(
    'cross-user delete blocked by RLS',
    EXISTS (SELECT 1 FROM public.scenarios WHERE id = v_scenario_b)
  );

  PERFORM test.set_auth(v_free);
  BEGIN
    PERFORM public.log_admin_entitlement_bypass(v_free, 'client', 'scenario_create');
    RAISE EXCEPTION 'ASSERT_FAIL: client bypass log should be denied';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ASSERT_OK: client bypass log execute denied.';
  END;
  PERFORM test.reset_auth();

  DELETE FROM public.entitlement_bypass_log WHERE user_id = v_admin;
  PERFORM test.set_auth(v_admin);
  INSERT INTO public.scenarios (user_id, name, scenario_type, inputs, derived)
  VALUES (v_admin, 'Admin scenario', 'purchase', '{}'::jsonb, '{}'::jsonb);
  PERFORM test.reset_auth();
  PERFORM test.assert_true(
    'admin bypass log row exists',
    EXISTS (
      SELECT 1 FROM public.entitlement_bypass_log
      WHERE user_id = v_admin AND feature = 'scenario_create'
    )
  );

  SET ROLE service_role;
  PERFORM test.assert_true(
    'claim first true',
    public.claim_stripe_webhook_event(
      p_event_id := 'evt_test_1',
      p_event_type := 'test',
      p_action_taken := 'processing'
    )
  );
  PERFORM test.assert_true(
    'claim duplicate false',
    public.claim_stripe_webhook_event(
      p_event_id := 'evt_test_1',
      p_event_type := 'test',
      p_action_taken := 'processing'
    ) IS FALSE
  );
  PERFORM public.release_stripe_webhook_event('evt_test_1');
  PERFORM test.assert_true(
    'claim after release true',
    public.claim_stripe_webhook_event(
      p_event_id := 'evt_test_1',
      p_event_type := 'test',
      p_action_taken := 'processing'
    )
  );
  RESET ROLE;

  v_decision := public.evaluate_entitlement(v_entitled);
  PERFORM test.assert_true('active pro entitled', (v_decision ->> 'entitlementStatus') = 'entitled');

  INSERT INTO public.billing (user_id, subscription_status, price_id, current_period_end)
  VALUES (v_user_a, 'active', v_advisor_price, v_future)
  ON CONFLICT (user_id) DO UPDATE SET
    subscription_status = EXCLUDED.subscription_status,
    price_id = EXCLUDED.price_id,
    current_period_end = EXCLUDED.current_period_end;
  v_decision := public.evaluate_entitlement(v_user_a);
  PERFORM test.assert_true('advisor price maps free', (v_decision ->> 'entitlementStatus') = 'free');

  BEGIN
    PERFORM public.approve_advisor_request(gen_random_uuid(), true);
    PERFORM test.assert_true('approve_advisor_request should fail', false);
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM test.assert_true(
        'approve_advisor_request fail-closed',
        SQLERRM LIKE '%Advisor product model removed%'
      );
  END;

  UPDATE public.billing SET current_period_end = NULL WHERE user_id = v_entitled;
  v_decision := public.evaluate_entitlement(v_entitled);
  PERFORM test.assert_true('null period end maps free', (v_decision ->> 'entitlementStatus') = 'free');

  UPDATE public.billing SET current_period_end = v_future WHERE user_id = v_entitled;
  PERFORM test.assert_true(
    'export ownership user_comparisons',
    public.assert_export_source_owned_by_user('comparison'::public.export_kind, v_comparison, v_entitled)
  );
  PERFORM test.assert_true(
    'export ownership non-owner false',
    NOT public.assert_export_source_owned_by_user('comparison'::public.export_kind, v_comparison, v_free)
  );

  RAISE NOTICE 'PHASE6_ENTITLEMENT_SQL: ALL ASSERTIONS PASSED';
END;
$phase6$;
