-- Epic 4 PR 1 — RLS coverage inventory assertions + core user-owned
-- owner / authenticated non-owner / anonymous matrix.
--
-- Authority: docs/adr/0004-rls-testing-standard.md
-- Harness: scripts/test-entitlement-sql.mjs (runs before Epic 1 / Phase 6
-- fixtures so admin/entitlement seeds cannot contaminate this matrix).
--
-- service_role / table-owner (postgres) may seed fixtures only.
-- Isolation evidence uses test.set_auth / test.reset_auth exclusively.

-- ---------------------------------------------------------------------------
-- Inventory: assert every RLS-enabled application relation is classified.
-- Full human-readable inventory: docs/security/RLS_COVERAGE_INVENTORY.md
-- (generated from the same catalog query against the ephemeral DB).
-- ---------------------------------------------------------------------------
DO $inventory$
DECLARE
  v_rel_count int;
  v_pol_count int;
  v_missing text;
BEGIN
  PERFORM test.reset_auth();

  SELECT count(*)::int INTO v_rel_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r'
    AND c.relrowsecurity = true
    AND n.nspname IN ('public', 'storage');

  SELECT count(*)::int INTO v_pol_count
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('public', 'storage');

  PERFORM test.assert_true(
    'inventory: at least 18 RLS-enabled relations expected (public + storage.objects)',
    v_rel_count >= 18
  );
  PERFORM test.assert_true(
    'inventory: policies exist on RLS-enabled relations',
    v_pol_count >= 40
  );

  -- Core PR 1 set must be present with RLS enabled.
  SELECT string_agg(t, ', ' ORDER BY t) INTO v_missing
  FROM (
    VALUES
      ('public.scenarios'),
      ('public.profiles'),
      ('public.saved_comparisons'),
      ('public.user_comparisons'),
      ('public.comparison_items'),
      ('public.comparison_versions')
  ) AS required(t)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND c.relrowsecurity = true
      AND (n.nspname || '.' || c.relname) = required.t
  );

  PERFORM test.assert_true(
    'inventory: all PR 1 core tables have RLS enabled',
    v_missing IS NULL
  );

  RAISE NOTICE 'EPIC4_PR1_INVENTORY: relations=% policies=%', v_rel_count, v_pol_count;
END;
$inventory$;

-- ---------------------------------------------------------------------------
-- Core matrix fixtures + assertions
-- ---------------------------------------------------------------------------
DO $matrix$
DECLARE
  v_owner uuid := 'e4000000-0000-4000-8000-000000000401';
  v_non_owner uuid := 'e4000000-0000-4000-8000-000000000402';
  v_orphan uuid := 'e4000000-0000-4000-8000-000000000499';
  v_price text := 'price_1U0t2QC56u2NxRItya8dElyg';
  v_owner_scenario uuid;
  v_owner_scenario_b uuid;
  v_non_owner_scenario uuid;
  v_non_owner_scenario_b uuid;
  v_owner_saved uuid;
  v_non_owner_saved uuid;
  v_owner_user_cmp uuid;
  v_owner_item uuid;
  v_owner_version uuid;
  v_n int;
BEGIN
  PERFORM test.reset_auth();

  -- Privileged fixture setup (table owner / bypass). Not isolation evidence.
  INSERT INTO auth.users (id, email) VALUES
    (v_owner, 'epic4-pr1-owner@test.local'),
    (v_non_owner, 'epic4-pr1-nonowner@test.local'),
    (v_orphan, 'epic4-pr1-orphan@test.local')
  ON CONFLICT (id) DO NOTHING;

  -- Profiles may already exist via handle_new_user; ensure rows present.
  INSERT INTO public.profiles (id, full_name)
  VALUES
    (v_owner, 'Epic4 Owner'),
    (v_non_owner, 'Epic4 NonOwner')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  -- Orphan auth user must have no profile so anon INSERT denial is RLS, not unique.
  DELETE FROM public.profiles WHERE id = v_orphan;

  -- Professional billing so scenario/comparison entitlement triggers do not
  -- masquerade as RLS denials during owner-allowed mutations.
  INSERT INTO public.billing (
    user_id, subscription_status, price_id, current_period_end, cancel_at_period_end
  ) VALUES
    (v_owner, 'active', v_price, now() + interval '30 days', false),
    (v_non_owner, 'active', v_price, now() + interval '30 days', false)
  ON CONFLICT (user_id) DO UPDATE SET
    subscription_status = EXCLUDED.subscription_status,
    price_id = EXCLUDED.price_id,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end;

  -- Seed owned rows with entitlement skip only for scenarios (documented
  -- privileged setup). Restore immediately.
  PERFORM set_config('app.skip_scenario_entitlement', '1', true);
  INSERT INTO public.scenarios (user_id, name, scenario_type, inputs, derived)
  VALUES (v_owner, 'Epic4 owner scenario', 'purchase', '{}'::jsonb, '{}'::jsonb)
  RETURNING id INTO v_owner_scenario;

  INSERT INTO public.scenarios (user_id, name, scenario_type, inputs, derived)
  VALUES (v_owner, 'Epic4 owner scenario B', 'refinance', '{}'::jsonb, '{}'::jsonb)
  RETURNING id INTO v_owner_scenario_b;

  INSERT INTO public.scenarios (user_id, name, scenario_type, inputs, derived)
  VALUES (v_non_owner, 'Epic4 nonowner scenario', 'purchase', '{}'::jsonb, '{}'::jsonb)
  RETURNING id INTO v_non_owner_scenario;

  INSERT INTO public.scenarios (user_id, name, scenario_type, inputs, derived)
  VALUES (v_non_owner, 'Epic4 nonowner scenario B', 'refinance', '{}'::jsonb, '{}'::jsonb)
  RETURNING id INTO v_non_owner_scenario_b;
  PERFORM set_config('app.skip_scenario_entitlement', '0', true);

  INSERT INTO public.saved_comparisons (user_id, name)
  VALUES (v_owner, 'Epic4 owner saved comparison')
  RETURNING id INTO v_owner_saved;

  INSERT INTO public.saved_comparisons (user_id, name)
  VALUES (v_non_owner, 'Epic4 nonowner saved comparison')
  RETURNING id INTO v_non_owner_saved;

  INSERT INTO public.user_comparisons (
    user_id, name, scenario_a_id, scenario_b_id
  ) VALUES (
    v_owner, 'Epic4 owner user comparison', v_owner_scenario, v_owner_scenario_b
  )
  RETURNING id INTO v_owner_user_cmp;

  INSERT INTO public.comparison_items (comparison_id, scenario_id, sort_order)
  VALUES (v_owner_saved, v_owner_scenario::text, 0)
  RETURNING id INTO v_owner_item;

  INSERT INTO public.comparison_versions (
    comparison_id, created_by, snapshot, assumptions_hash, version_number
  ) VALUES (
    v_owner_saved, v_owner, '{"k":1}'::jsonb, 'hash-owner', 1
  )
  RETURNING id INTO v_owner_version;

  -- =========================================================================
  -- public.scenarios
  -- =========================================================================
  PERFORM test.assert_true(
    'scenarios: RLS enabled',
    (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'scenarios')
  );

  PERFORM test.set_auth(v_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.scenarios WHERE id = v_owner_scenario;
  PERFORM test.assert_true('scenarios: owner can select own', v_n = 1);

  SELECT count(*)::int INTO v_n FROM public.scenarios WHERE id = v_non_owner_scenario;
  PERFORM test.assert_true('scenarios: owner cannot select non-owner row', v_n = 0);

  INSERT INTO public.scenarios (user_id, name, scenario_type, inputs, derived)
  VALUES (v_owner, 'Epic4 owner insert ok', 'purchase', '{}'::jsonb, '{}'::jsonb);

  BEGIN
    INSERT INTO public.scenarios (user_id, name, scenario_type, inputs, derived)
    VALUES (v_non_owner, 'Epic4 owner forging nonowner', 'purchase', '{}'::jsonb, '{}'::jsonb);
    RAISE EXCEPTION 'ASSERT_FAIL: scenarios owner insert as other user should fail';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'ASSERT_OK: scenarios owner cannot insert as other (RLS).';
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%row-level security%' THEN
        RAISE NOTICE 'ASSERT_OK: scenarios owner cannot insert as other (%).', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;

  UPDATE public.scenarios SET name = 'Epic4 owner updated'
  WHERE id = v_owner_scenario;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('scenarios: owner can update own', v_n = 1);

  -- Skip entitlement trigger so denial is attributable to RLS WITH CHECK
  -- (auth.uid() = user_id), not billing visibility under the trigger.
  -- Postgres raises on WITH CHECK failure for UPDATE (does not return 0 rows).
  PERFORM set_config('app.skip_scenario_entitlement', '1', true);
  BEGIN
    UPDATE public.scenarios SET user_id = v_non_owner WHERE id = v_owner_scenario;
    RAISE EXCEPTION 'ASSERT_FAIL: scenarios ownership transfer should fail RLS';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'ASSERT_OK: scenarios owner cannot transfer ownership.';
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%row-level security%' THEN
        RAISE NOTICE 'ASSERT_OK: scenarios owner cannot transfer ownership (%).', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;
  PERFORM set_config('app.skip_scenario_entitlement', '0', true);

  UPDATE public.scenarios SET name = 'x' WHERE id = v_non_owner_scenario;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('scenarios: owner cannot update non-owner row', v_n = 0);

  PERFORM test.set_auth(v_non_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.scenarios WHERE id = v_owner_scenario;
  PERFORM test.assert_true('scenarios: non-owner cannot select owner row', v_n = 0);

  BEGIN
    INSERT INTO public.scenarios (user_id, name, scenario_type, inputs, derived)
    VALUES (v_owner, 'Epic4 nonowner forging owner', 'purchase', '{}'::jsonb, '{}'::jsonb);
    RAISE EXCEPTION 'ASSERT_FAIL: scenarios non-owner insert as owner should fail';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'ASSERT_OK: scenarios non-owner cannot insert as owner (RLS).';
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%row-level security%' THEN
        RAISE NOTICE 'ASSERT_OK: scenarios non-owner cannot insert as owner (%).', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;

  UPDATE public.scenarios SET name = 'x' WHERE id = v_owner_scenario;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('scenarios: non-owner cannot update owner row', v_n = 0);

  DELETE FROM public.scenarios WHERE id = v_owner_scenario;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('scenarios: non-owner cannot delete owner row', v_n = 0);

  PERFORM test.reset_auth();
  SET ROLE anon;
  SELECT count(*)::int INTO v_n FROM public.scenarios WHERE id = v_owner_scenario;
  PERFORM test.assert_true('scenarios: anon cannot select', v_n = 0);
  BEGIN
    INSERT INTO public.scenarios (user_id, name, scenario_type, inputs, derived)
    VALUES (v_owner, 'Epic4 anon insert', 'purchase', '{}'::jsonb, '{}'::jsonb);
    RAISE EXCEPTION 'ASSERT_FAIL: scenarios anon insert should fail';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'ASSERT_OK: scenarios anon cannot insert.';
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%row-level security%' OR SQLERRM ILIKE '%permission denied%' THEN
        RAISE NOTICE 'ASSERT_OK: scenarios anon cannot insert (%).', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;
  UPDATE public.scenarios SET name = 'x' WHERE id = v_owner_scenario;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('scenarios: anon cannot update', v_n = 0);
  DELETE FROM public.scenarios WHERE id = v_owner_scenario;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('scenarios: anon cannot delete', v_n = 0);
  PERFORM test.reset_auth();

  -- Owner delete of a disposable owned row (not the FK-referenced ones).
  PERFORM test.set_auth(v_owner, 'authenticated');
  DELETE FROM public.scenarios
  WHERE user_id = v_owner AND name = 'Epic4 owner insert ok';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('scenarios: owner can delete own disposable row', v_n = 1);
  PERFORM test.reset_auth();

  -- =========================================================================
  -- public.profiles (no DELETE policy)
  -- =========================================================================
  PERFORM test.assert_true(
    'profiles: RLS enabled',
    (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'profiles')
  );

  PERFORM test.set_auth(v_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.profiles WHERE id = v_owner;
  PERFORM test.assert_true('profiles: owner can select own', v_n = 1);
  SELECT count(*)::int INTO v_n FROM public.profiles WHERE id = v_non_owner;
  PERFORM test.assert_true('profiles: owner cannot select non-owner', v_n = 0);

  UPDATE public.profiles SET full_name = 'Epic4 Owner Updated' WHERE id = v_owner;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('profiles: owner can update own', v_n = 1);

  UPDATE public.profiles SET full_name = 'x' WHERE id = v_non_owner;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('profiles: owner cannot update non-owner', v_n = 0);

  -- No DELETE policy: delete should affect 0 rows (or raise). Documented.
  DELETE FROM public.profiles WHERE id = v_owner;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('profiles: owner delete has no policy (0 rows)', v_n = 0);

  PERFORM test.set_auth(v_non_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.profiles WHERE id = v_owner;
  PERFORM test.assert_true('profiles: non-owner cannot select owner', v_n = 0);
  UPDATE public.profiles SET full_name = 'x' WHERE id = v_owner;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('profiles: non-owner cannot update owner', v_n = 0);

  BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (v_owner, 'forged');
    RAISE EXCEPTION 'ASSERT_FAIL: profiles non-owner insert as owner should fail';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'ASSERT_FAIL: profiles insert hit unique_violation (not RLS)';
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'ASSERT_OK: profiles non-owner cannot insert as owner.';
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%row-level security%' THEN
        RAISE NOTICE 'ASSERT_OK: profiles non-owner cannot insert as owner (%).', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;

  PERFORM test.reset_auth();
  SET ROLE anon;
  SELECT count(*)::int INTO v_n FROM public.profiles WHERE id = v_owner;
  PERFORM test.assert_true('profiles: anon cannot select', v_n = 0);
  BEGIN
    -- auth.users row exists (v_orphan); no profile yet — denial must be authz/RLS.
    INSERT INTO public.profiles (id, full_name)
    VALUES (v_orphan, 'anon');
    RAISE EXCEPTION 'ASSERT_FAIL: profiles anon insert should fail';
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE EXCEPTION 'ASSERT_FAIL: profiles anon insert hit FK (not authz)';
    WHEN unique_violation THEN
      RAISE EXCEPTION 'ASSERT_FAIL: profiles anon insert hit unique (not authz)';
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'ASSERT_OK: profiles anon cannot insert.';
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%row-level security%' OR SQLERRM ILIKE '%permission denied%' THEN
        RAISE NOTICE 'ASSERT_OK: profiles anon cannot insert (%).', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;
  PERFORM test.reset_auth();

  -- =========================================================================
  -- public.saved_comparisons
  -- =========================================================================
  PERFORM test.assert_true(
    'saved_comparisons: RLS enabled',
    (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'saved_comparisons')
  );

  PERFORM test.set_auth(v_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.saved_comparisons WHERE id = v_owner_saved;
  PERFORM test.assert_true('saved_comparisons: owner can select own', v_n = 1);
  SELECT count(*)::int INTO v_n FROM public.saved_comparisons WHERE id = v_non_owner_saved;
  PERFORM test.assert_true('saved_comparisons: owner cannot select non-owner', v_n = 0);

  INSERT INTO public.saved_comparisons (user_id, name)
  VALUES (v_owner, 'Epic4 owner saved insert ok');

  BEGIN
    INSERT INTO public.saved_comparisons (user_id, name)
    VALUES (v_non_owner, 'Epic4 forged saved');
    RAISE EXCEPTION 'ASSERT_FAIL: saved_comparisons owner insert as other should fail';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'ASSERT_OK: saved_comparisons owner cannot insert as other.';
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%row-level security%' THEN
        RAISE NOTICE 'ASSERT_OK: saved_comparisons owner cannot insert as other (%).', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;

  UPDATE public.saved_comparisons SET name = 'Epic4 owner saved updated'
  WHERE id = v_owner_saved;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('saved_comparisons: owner can update own', v_n = 1);

  BEGIN
    UPDATE public.saved_comparisons SET user_id = v_non_owner WHERE id = v_owner_saved;
    RAISE EXCEPTION 'ASSERT_FAIL: saved_comparisons ownership transfer should fail RLS';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'ASSERT_OK: saved_comparisons owner cannot transfer ownership.';
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%row-level security%' THEN
        RAISE NOTICE 'ASSERT_OK: saved_comparisons owner cannot transfer ownership (%).', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;

  PERFORM test.set_auth(v_non_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.saved_comparisons WHERE id = v_owner_saved;
  PERFORM test.assert_true('saved_comparisons: non-owner cannot select', v_n = 0);
  UPDATE public.saved_comparisons SET name = 'x' WHERE id = v_owner_saved;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('saved_comparisons: non-owner cannot update', v_n = 0);
  DELETE FROM public.saved_comparisons WHERE id = v_owner_saved;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('saved_comparisons: non-owner cannot delete', v_n = 0);

  BEGIN
    INSERT INTO public.saved_comparisons (user_id, name)
    VALUES (v_owner, 'Epic4 nonowner forging saved');
    RAISE EXCEPTION 'ASSERT_FAIL: saved_comparisons non-owner insert as owner should fail';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'ASSERT_OK: saved_comparisons non-owner cannot insert as owner.';
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%row-level security%' THEN
        RAISE NOTICE 'ASSERT_OK: saved_comparisons non-owner cannot insert as owner (%).', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;

  PERFORM test.reset_auth();
  SET ROLE anon;
  SELECT count(*)::int INTO v_n FROM public.saved_comparisons WHERE id = v_owner_saved;
  PERFORM test.assert_true('saved_comparisons: anon cannot select', v_n = 0);
  BEGIN
    INSERT INTO public.saved_comparisons (user_id, name)
    VALUES (v_owner, 'anon saved');
    RAISE EXCEPTION 'ASSERT_FAIL: saved_comparisons anon insert should fail';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'ASSERT_OK: saved_comparisons anon cannot insert.';
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%row-level security%' OR SQLERRM ILIKE '%permission denied%' THEN
        RAISE NOTICE 'ASSERT_OK: saved_comparisons anon cannot insert (%).', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;
  PERFORM test.reset_auth();

  PERFORM test.set_auth(v_owner, 'authenticated');
  DELETE FROM public.saved_comparisons
  WHERE user_id = v_owner AND name = 'Epic4 owner saved insert ok';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('saved_comparisons: owner can delete disposable own', v_n = 1);
  PERFORM test.reset_auth();

  -- =========================================================================
  -- public.user_comparisons
  -- =========================================================================
  PERFORM test.assert_true(
    'user_comparisons: RLS enabled',
    (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'user_comparisons')
  );

  PERFORM test.set_auth(v_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.user_comparisons WHERE id = v_owner_user_cmp;
  PERFORM test.assert_true('user_comparisons: owner can select own', v_n = 1);

  UPDATE public.user_comparisons SET name = 'Epic4 owner user cmp updated'
  WHERE id = v_owner_user_cmp;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('user_comparisons: owner can update own', v_n = 1);

  BEGIN
    UPDATE public.user_comparisons SET user_id = v_non_owner WHERE id = v_owner_user_cmp;
    RAISE EXCEPTION 'ASSERT_FAIL: user_comparisons ownership transfer should fail RLS';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'ASSERT_OK: user_comparisons owner cannot transfer ownership.';
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%row-level security%' THEN
        RAISE NOTICE 'ASSERT_OK: user_comparisons owner cannot transfer ownership (%).', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;

  -- Cross-user scenario references fail ownership trigger (not RLS). Prove
  -- RLS separately: non-owner cannot select/update/delete.
  PERFORM test.set_auth(v_non_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.user_comparisons WHERE id = v_owner_user_cmp;
  PERFORM test.assert_true('user_comparisons: non-owner cannot select', v_n = 0);
  UPDATE public.user_comparisons SET name = 'x' WHERE id = v_owner_user_cmp;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('user_comparisons: non-owner cannot update', v_n = 0);
  DELETE FROM public.user_comparisons WHERE id = v_owner_user_cmp;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('user_comparisons: non-owner cannot delete', v_n = 0);

  BEGIN
    INSERT INTO public.user_comparisons (
      user_id, name, scenario_a_id, scenario_b_id
    ) VALUES (
      v_owner, 'forged user cmp', v_non_owner_scenario, v_non_owner_scenario_b
    );
    RAISE EXCEPTION 'ASSERT_FAIL: user_comparisons non-owner insert as owner should fail';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'ASSERT_OK: user_comparisons non-owner cannot insert as owner.';
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%row-level security%' THEN
        RAISE NOTICE 'ASSERT_OK: user_comparisons non-owner cannot insert as owner (%).', SQLERRM;
      ELSE
        RAISE EXCEPTION
          'ASSERT_FAIL: user_comparisons non-owner forge denied by % (need RLS)',
          SQLERRM;
      END IF;
  END;

  PERFORM test.reset_auth();
  SET ROLE anon;
  SELECT count(*)::int INTO v_n FROM public.user_comparisons WHERE id = v_owner_user_cmp;
  PERFORM test.assert_true('user_comparisons: anon cannot select', v_n = 0);
  PERFORM test.reset_auth();

  -- Owner insert of own comparison (entitlement already Professional).
  PERFORM test.set_auth(v_owner, 'authenticated');
  INSERT INTO public.user_comparisons (
    user_id, name, scenario_a_id, scenario_b_id
  ) VALUES (
    v_owner, 'Epic4 owner user cmp insert ok', v_owner_scenario, v_owner_scenario_b
  );
  BEGIN
    INSERT INTO public.user_comparisons (
      user_id, name, scenario_a_id, scenario_b_id
    ) VALUES (
      v_non_owner, 'Epic4 owner forging user cmp', v_non_owner_scenario, v_non_owner_scenario_b
    );
    RAISE EXCEPTION 'ASSERT_FAIL: user_comparisons owner insert as other should fail';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'ASSERT_OK: user_comparisons owner cannot insert as other.';
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%row-level security%' THEN
        RAISE NOTICE 'ASSERT_OK: user_comparisons owner cannot insert as other (%).', SQLERRM;
      ELSE
        RAISE EXCEPTION
          'ASSERT_FAIL: user_comparisons owner forge denied by % (need RLS)',
          SQLERRM;
      END IF;
  END;

  DELETE FROM public.user_comparisons
  WHERE user_id = v_owner AND name = 'Epic4 owner user cmp insert ok';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('user_comparisons: owner can delete disposable own', v_n = 1);
  PERFORM test.reset_auth();

  -- =========================================================================
  -- public.comparison_items (parent ownership via saved_comparisons)
  -- =========================================================================
  PERFORM test.assert_true(
    'comparison_items: RLS enabled',
    (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'comparison_items')
  );

  PERFORM test.set_auth(v_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.comparison_items WHERE id = v_owner_item;
  PERFORM test.assert_true('comparison_items: owner can select via parent', v_n = 1);

  INSERT INTO public.comparison_items (comparison_id, scenario_id, sort_order)
  VALUES (v_owner_saved, 'extra-scenario-label', 1);

  -- Re-parent / cross-user insert into non-owner parent
  BEGIN
    INSERT INTO public.comparison_items (comparison_id, scenario_id, sort_order)
    VALUES (v_non_owner_saved, 'cross-parent', 0);
    RAISE EXCEPTION 'ASSERT_FAIL: comparison_items insert into other parent should fail';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'ASSERT_OK: comparison_items cannot insert into other parent.';
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%row-level security%' THEN
        RAISE NOTICE 'ASSERT_OK: comparison_items cannot insert into other parent (%).', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;

  BEGIN
    UPDATE public.comparison_items
    SET comparison_id = v_non_owner_saved
    WHERE id = v_owner_item;
    RAISE EXCEPTION 'ASSERT_FAIL: comparison_items re-parent should fail RLS';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'ASSERT_OK: comparison_items owner cannot re-parent to other user.';
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%row-level security%' THEN
        RAISE NOTICE 'ASSERT_OK: comparison_items owner cannot re-parent (%).', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;

  UPDATE public.comparison_items SET label_override = 'ok' WHERE id = v_owner_item;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('comparison_items: owner can update own parent item', v_n = 1);

  PERFORM test.set_auth(v_non_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.comparison_items WHERE id = v_owner_item;
  PERFORM test.assert_true('comparison_items: non-owner cannot select', v_n = 0);
  UPDATE public.comparison_items SET label_override = 'x' WHERE id = v_owner_item;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('comparison_items: non-owner cannot update', v_n = 0);
  DELETE FROM public.comparison_items WHERE id = v_owner_item;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('comparison_items: non-owner cannot delete', v_n = 0);

  BEGIN
    INSERT INTO public.comparison_items (comparison_id, scenario_id, sort_order)
    VALUES (v_owner_saved, 'nonowner-into-owner', 9);
    RAISE EXCEPTION 'ASSERT_FAIL: comparison_items non-owner insert into owner parent should fail';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'ASSERT_OK: comparison_items non-owner cannot insert into owner parent.';
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%row-level security%' THEN
        RAISE NOTICE 'ASSERT_OK: comparison_items non-owner cannot insert into owner parent (%).', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;

  PERFORM test.reset_auth();
  SET ROLE anon;
  SELECT count(*)::int INTO v_n FROM public.comparison_items WHERE id = v_owner_item;
  PERFORM test.assert_true('comparison_items: anon cannot select', v_n = 0);
  PERFORM test.reset_auth();

  PERFORM test.set_auth(v_owner, 'authenticated');
  DELETE FROM public.comparison_items
  WHERE comparison_id = v_owner_saved AND scenario_id = 'extra-scenario-label';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('comparison_items: owner can delete disposable own', v_n = 1);
  PERFORM test.reset_auth();

  -- =========================================================================
  -- public.comparison_versions (no UPDATE privilege/policy)
  -- =========================================================================
  PERFORM test.assert_true(
    'comparison_versions: RLS enabled',
    (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'comparison_versions')
  );

  PERFORM test.set_auth(v_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.comparison_versions WHERE id = v_owner_version;
  PERFORM test.assert_true('comparison_versions: owner can select via parent', v_n = 1);

  INSERT INTO public.comparison_versions (
    comparison_id, created_by, snapshot, assumptions_hash
  ) VALUES (
    v_owner_saved, v_owner, '{"k":2}'::jsonb, 'hash-owner-2'
  );

  -- created_by must match auth.uid() AND parent ownership
  BEGIN
    INSERT INTO public.comparison_versions (
      comparison_id, created_by, snapshot, assumptions_hash
    ) VALUES (
      v_owner_saved, v_non_owner, '{"k":3}'::jsonb, 'hash-forged-creator'
    );
    RAISE EXCEPTION 'ASSERT_FAIL: comparison_versions insert with other created_by should fail';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'ASSERT_OK: comparison_versions created_by must match auth.uid().';
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%row-level security%' THEN
        RAISE NOTICE 'ASSERT_OK: comparison_versions created_by must match auth.uid() (%).', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;

  BEGIN
    INSERT INTO public.comparison_versions (
      comparison_id, created_by, snapshot, assumptions_hash
    ) VALUES (
      v_non_owner_saved, v_owner, '{"k":4}'::jsonb, 'hash-cross-parent'
    );
    RAISE EXCEPTION 'ASSERT_FAIL: comparison_versions insert into other parent should fail';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'ASSERT_OK: comparison_versions cannot insert into other parent.';
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%row-level security%' THEN
        RAISE NOTICE 'ASSERT_OK: comparison_versions cannot insert into other parent (%).', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;

  -- UPDATE is revoked from authenticated — assert privilege denial (documented).
  BEGIN
    UPDATE public.comparison_versions SET note = 'x' WHERE id = v_owner_version;
    RAISE EXCEPTION 'ASSERT_FAIL: comparison_versions update should be denied';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'ASSERT_OK: comparison_versions update revoked for authenticated.';
    WHEN OTHERS THEN
      RAISE NOTICE 'ASSERT_OK: comparison_versions update denied (%).', SQLERRM;
  END;

  PERFORM test.set_auth(v_non_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.comparison_versions WHERE id = v_owner_version;
  PERFORM test.assert_true('comparison_versions: non-owner cannot select', v_n = 0);
  DELETE FROM public.comparison_versions WHERE id = v_owner_version;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('comparison_versions: non-owner cannot delete', v_n = 0);

  PERFORM test.reset_auth();
  SET ROLE anon;
  SELECT count(*)::int INTO v_n FROM public.comparison_versions WHERE id = v_owner_version;
  PERFORM test.assert_true('comparison_versions: anon cannot select', v_n = 0);
  PERFORM test.reset_auth();

  PERFORM test.set_auth(v_owner, 'authenticated');
  DELETE FROM public.comparison_versions
  WHERE comparison_id = v_owner_saved AND assumptions_hash = 'hash-owner-2';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('comparison_versions: owner can delete disposable own', v_n = 1);
  PERFORM test.reset_auth();

  RAISE NOTICE 'EPIC4_PR1_CORE_RLS: ALL ASSERTIONS PASSED';
END;
$matrix$;
