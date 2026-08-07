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
-- Inventory drift gate
-- Committed expected fingerprint: supabase/tests/fixtures/epic4_pr1_rls_catalog.sha256
-- (injected by scripts/test-entitlement-sql.mjs as test.epic4_pr1_expected_catalog_fp).
-- Human-readable inventory: docs/security/RLS_COVERAGE_INVENTORY.md
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION test.epic4_pr1_catalog_canonical()
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_lines text := '';
  v_rel record;
  v_pol record;
  v_roles text;
  v_first boolean;
BEGIN
  FOR v_rel IN
    SELECT n.nspname AS schema_name,
           c.relname AS relation_name,
           c.relrowsecurity AS rls_enabled,
           c.relforcerowsecurity AS rls_forced,
           c.oid AS relid
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND c.relrowsecurity = true
      AND n.nspname IN ('public', 'storage')
    ORDER BY n.nspname, c.relname
  LOOP
    v_lines := v_lines
      || 'REL|' || v_rel.schema_name || '|' || v_rel.relation_name || '|'
      || v_rel.rls_enabled::text || '|' || v_rel.rls_forced::text
      || E'\n';

    v_first := true;
    FOR v_pol IN
      SELECT p.polname AS policy_name,
             CASE p.polcmd
               WHEN 'r' THEN 'SELECT'
               WHEN 'a' THEN 'INSERT'
               WHEN 'w' THEN 'UPDATE'
               WHEN 'd' THEN 'DELETE'
               WHEN '*' THEN 'ALL'
               ELSE p.polcmd::text
             END AS command,
             COALESCE(
               (
                 SELECT string_agg(rol.rolname, ',' ORDER BY rol.rolname)
                 FROM pg_roles rol
                 WHERE rol.oid = ANY (p.polroles)
               ),
               'PUBLIC'
             ) AS roles,
             COALESCE(pg_get_expr(p.polqual, p.polrelid), '') AS using_expr,
             COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') AS with_check_expr
      FROM pg_policy p
      WHERE p.polrelid = v_rel.relid
      ORDER BY p.polname, 2
    LOOP
      v_first := false;
      v_lines := v_lines
        || 'POL|' || v_pol.policy_name || '|' || v_pol.command || '|'
        || v_pol.roles || '|' || v_pol.using_expr || '|' || v_pol.with_check_expr
        || E'\n';
    END LOOP;

    IF v_first THEN
      v_lines := v_lines || 'POL|NONE' || E'\n';
    END IF;
  END LOOP;

  RETURN v_lines;
END;
$$;

CREATE OR REPLACE FUNCTION test.epic4_pr1_assert_rls_exception(p_label text, p_sqlerrm text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_sqlerrm ILIKE '%row-level security%' THEN
    RAISE NOTICE 'ASSERT_OK: % (%).', p_label, p_sqlerrm;
    RETURN;
  END IF;
  IF p_sqlerrm ILIKE '%permission denied%' THEN
    RAISE EXCEPTION
      'ASSERT_FAIL: % denied by missing privilege/grant, not RLS (%).',
      p_label,
      p_sqlerrm;
  END IF;
  RAISE EXCEPTION 'ASSERT_FAIL: % unexpected error (%).', p_label, p_sqlerrm;
END;
$$;

DO $inventory$
DECLARE
  v_rel_count int;
  v_pol_count int;
  v_expected_fp text;
  v_actual_fp text;
  v_canonical text;
  v_missing text;
  v_extra text;
  v_expected_rels text[] := ARRAY[
    'public.admin_audit_log',
    'public.admin_bootstrap_tokens',
    'public.advisor_access_requests',
    'public.billing',
    'public.comparison_items',
    'public.comparison_shares',
    'public.comparison_versions',
    'public.contact_messages',
    'public.entitlement_bypass_log',
    'public.export_files',
    'public.export_shares',
    'public.pdf_exports',
    'public.profiles',
    'public.saved_comparisons',
    'public.scenarios',
    'public.stripe_webhook_events',
    'public.subscriptions',
    'public.user_comparisons',
    'public.user_roles',
    'storage.objects'
  ];
BEGIN
  PERFORM test.reset_auth();

  v_expected_fp := nullif(current_setting('test.epic4_pr1_expected_catalog_fp', true), '');
  PERFORM test.assert_true(
    'inventory: expected fingerprint injected by harness',
    v_expected_fp IS NOT NULL AND length(v_expected_fp) = 64
  );

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
  WHERE n.nspname IN ('public', 'storage')
    AND c.relrowsecurity = true;

  PERFORM test.assert_true(
    format('inventory: exactly 20 RLS-enabled relations (got %s)', v_rel_count),
    v_rel_count = 20
  );
  PERFORM test.assert_true(
    format('inventory: exactly 56 effective policies (got %s)', v_pol_count),
    v_pol_count = 56
  );

  SELECT string_agg(t, ', ' ORDER BY t) INTO v_missing
  FROM unnest(v_expected_rels) AS t
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND c.relrowsecurity = true
      AND (n.nspname || '.' || c.relname) = t
  );
  PERFORM test.assert_true(
    format('inventory: no missing classified relations (%s)', coalesce(v_missing, 'none')),
    v_missing IS NULL
  );

  SELECT string_agg(n.nspname || '.' || c.relname, ', ' ORDER BY 1) INTO v_extra
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r'
    AND c.relrowsecurity = true
    AND n.nspname IN ('public', 'storage')
    AND (n.nspname || '.' || c.relname) <> ALL (v_expected_rels);
  PERFORM test.assert_true(
    format('inventory: no extra RLS relations (%s)', coalesce(v_extra, 'none')),
    v_extra IS NULL
  );

  v_canonical := test.epic4_pr1_catalog_canonical();
  v_actual_fp := encode(digest(v_canonical, 'sha256'), 'hex');

  PERFORM test.assert_true(
    format(
      'inventory: catalog fingerprint matches committed fixture (expected %s got %s)',
      v_expected_fp,
      v_actual_fp
    ),
    v_actual_fp = v_expected_fp
  );

  RAISE NOTICE 'EPIC4_PR1_INVENTORY: relations=% policies=% fingerprint=%',
    v_rel_count, v_pol_count, v_actual_fp;
END;
$inventory$;

GRANT EXECUTE ON FUNCTION test.epic4_pr1_catalog_canonical() TO postgres, authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION test.epic4_pr1_assert_rls_exception(text, text) TO postgres, authenticated, service_role, anon;

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
  v_tbl text;
  v_core_tables text[] := ARRAY[
    'public.scenarios',
    'public.profiles',
    'public.saved_comparisons',
    'public.user_comparisons',
    'public.comparison_items',
    'public.comparison_versions'
  ];
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
  -- privileged setup). Always restore, even on failure.
  BEGIN
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
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM set_config('app.skip_scenario_entitlement', '0', true);
      RAISE;
  END;
  PERFORM set_config('app.skip_scenario_entitlement', '0', true);

  -- Anon must already hold table DML for PR 1 relations so later anonymous
  -- denials cannot pass from missing grants.
  FOREACH v_tbl IN ARRAY v_core_tables LOOP
    PERFORM test.assert_true(
      format('anon has SELECT on %s', v_tbl),
      has_table_privilege('anon', v_tbl::regclass, 'SELECT')
    );
    PERFORM test.assert_true(
      format('anon has INSERT on %s', v_tbl),
      has_table_privilege('anon', v_tbl::regclass, 'INSERT')
    );
    PERFORM test.assert_true(
      format('anon has UPDATE on %s', v_tbl),
      has_table_privilege('anon', v_tbl::regclass, 'UPDATE')
    );
    PERFORM test.assert_true(
      format('anon has DELETE on %s', v_tbl),
      has_table_privilege('anon', v_tbl::regclass, 'DELETE')
    );
  END LOOP;

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
  BEGIN
    PERFORM set_config('app.skip_scenario_entitlement', '1', true);
    BEGIN
      UPDATE public.scenarios SET user_id = v_non_owner WHERE id = v_owner_scenario;
      RAISE EXCEPTION 'ASSERT_FAIL: scenarios ownership transfer should fail RLS';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM ILIKE '%row-level security%' THEN
          RAISE NOTICE 'ASSERT_OK: scenarios owner cannot transfer ownership (%).', SQLERRM;
        ELSE
          RAISE;
        END IF;
    END;
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM set_config('app.skip_scenario_entitlement', '0', true);
      RAISE;
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
    WHEN OTHERS THEN
      PERFORM test.epic4_pr1_assert_rls_exception('scenarios anon cannot insert', SQLERRM);
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
    -- auth.users row exists (v_orphan); no profile yet — denial must be RLS.
    INSERT INTO public.profiles (id, full_name)
    VALUES (v_orphan, 'anon');
    RAISE EXCEPTION 'ASSERT_FAIL: profiles anon insert should fail';
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE EXCEPTION 'ASSERT_FAIL: profiles anon insert hit FK (not authz)';
    WHEN unique_violation THEN
      RAISE EXCEPTION 'ASSERT_FAIL: profiles anon insert hit unique (not authz)';
    WHEN OTHERS THEN
      PERFORM test.epic4_pr1_assert_rls_exception('profiles anon cannot insert', SQLERRM);
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
    WHEN OTHERS THEN
      PERFORM test.epic4_pr1_assert_rls_exception(
        'saved_comparisons anon cannot insert',
        SQLERRM
      );
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
