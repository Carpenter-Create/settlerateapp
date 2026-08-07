-- Epic 4 PR 2 — remaining RLS relations + administrative path matrix.
--
-- Authority: docs/adr/0004-rls-testing-standard.md
-- Inventory: docs/security/RLS_COVERAGE_INVENTORY.md
-- Harness: scripts/test-entitlement-sql.mjs
--
-- Ordering: runs after epic4_pr1_core_rls.sql (inventory drift gate) and
-- after epic1_admin_bootstrap.sql so the administrator is created via the
-- approved bootstrap path (claim_admin_bootstrap) without contaminating
-- Epic 1's zero-admin precondition. Runs before Phase 6 entitlement
-- fixtures.
--
-- service_role / table-owner (postgres) may seed fixtures only.
-- Isolation evidence uses test.set_auth / test.reset_auth exclusively.
-- Reuses test.epic4_pr1_assert_rls_exception for RLS-attributable denials.

DO $matrix$
DECLARE
  v_owner uuid := 'e4200000-0000-4000-8000-000000000401';
  v_non_owner uuid := 'e4200000-0000-4000-8000-000000000402';
  -- Created by supabase/tests/epic1_admin_bootstrap.sql via approved path.
  v_admin uuid := 'a1000000-0000-0000-0000-00000000a001';
  v_price text := 'price_1U0t2QC56u2NxRItya8dElyg';
  v_owner_scenario uuid;
  v_non_owner_scenario uuid;
  v_owner_saved uuid;
  v_non_owner_saved uuid;
  v_owner_export_file uuid;
  v_non_owner_export_file uuid;
  v_owner_export_share uuid;
  v_owner_cmp_share uuid;
  v_owner_pdf uuid;
  v_owner_contact uuid;
  v_owner_advisor uuid;
  v_owner_storage uuid;
  v_non_owner_storage uuid;
  v_moderator_role_id uuid;
  v_n int;
  v_tbl text;
  v_pr2_tables text[] := ARRAY[
    'public.pdf_exports',
    'public.export_files',
    'public.export_shares',
    'public.comparison_shares',
    'public.billing',
    'public.stripe_webhook_events',
    'public.entitlement_bypass_log',
    'public.user_roles',
    'public.admin_audit_log',
    'public.admin_bootstrap_tokens',
    'public.advisor_access_requests',
    'public.contact_messages'
  ];
BEGIN
  PERFORM test.reset_auth();

  PERFORM test.assert_true(
    'epic4_pr2 precondition: approved admin fixture exists',
    public.has_role(v_admin, 'admin')
  );

  -- Privileged fixture setup (table owner / bypass). Not isolation evidence.
  INSERT INTO auth.users (id, email) VALUES
    (v_owner, 'epic4-pr2-owner@test.local'),
    (v_non_owner, 'epic4-pr2-nonowner@test.local')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name)
  VALUES
    (v_owner, 'Epic4 PR2 Owner'),
    (v_non_owner, 'Epic4 PR2 NonOwner')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

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

  BEGIN
    PERFORM set_config('app.skip_scenario_entitlement', '1', true);
    INSERT INTO public.scenarios (user_id, name, scenario_type, inputs, derived)
    VALUES (v_owner, 'Epic4 PR2 owner scenario', 'purchase', '{}'::jsonb, '{}'::jsonb)
    RETURNING id INTO v_owner_scenario;

    INSERT INTO public.scenarios (user_id, name, scenario_type, inputs, derived)
    VALUES (v_non_owner, 'Epic4 PR2 nonowner scenario', 'purchase', '{}'::jsonb, '{}'::jsonb)
    RETURNING id INTO v_non_owner_scenario;
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM set_config('app.skip_scenario_entitlement', '0', true);
      RAISE;
  END;
  PERFORM set_config('app.skip_scenario_entitlement', '0', true);

  INSERT INTO public.saved_comparisons (user_id, name)
  VALUES (v_owner, 'Epic4 PR2 owner saved')
  RETURNING id INTO v_owner_saved;

  INSERT INTO public.saved_comparisons (user_id, name)
  VALUES (v_non_owner, 'Epic4 PR2 nonowner saved')
  RETURNING id INTO v_non_owner_saved;

  INSERT INTO public.export_files (
    owner_user_id, entity_type, entity_id, storage_path, export_version
  ) VALUES (
    v_owner, 'scenario', v_owner_scenario, v_owner::text || '/export-owner.pdf', '1'
  )
  RETURNING id INTO v_owner_export_file;

  INSERT INTO public.export_files (
    owner_user_id, entity_type, entity_id, storage_path, export_version
  ) VALUES (
    v_non_owner, 'scenario', v_non_owner_scenario, v_non_owner::text || '/export-nonowner.pdf', '1'
  )
  RETURNING id INTO v_non_owner_export_file;

  INSERT INTO public.export_shares (
    export_file_id, token, created_by_user_id
  ) VALUES (
    v_owner_export_file, 'epic4-pr2-export-share-token-owner-001', v_owner
  )
  RETURNING id INTO v_owner_export_share;

  INSERT INTO public.comparison_shares (
    comparison_id, created_by, token
  ) VALUES (
    v_owner_saved, v_owner, 'epic4-pr2-comparison-share-token-owner-001'
  )
  RETURNING id INTO v_owner_cmp_share;

  INSERT INTO public.pdf_exports (
    user_id, kind, source_id, storage_path, status
  ) VALUES (
    v_owner, 'scenario', v_owner_scenario, v_owner::text || '/pdf-owner.pdf', 'queued'
  )
  RETURNING id INTO v_owner_pdf;

  INSERT INTO public.contact_messages (full_name, email, topic, message, user_id)
  VALUES ('Seed Contact', 'seed@test.local', 'support', 'seed', v_owner)
  RETURNING id INTO v_owner_contact;

  INSERT INTO public.advisor_access_requests (user_id, email, full_name, status)
  VALUES (v_owner, 'epic4-pr2-owner@test.local', 'Epic4 PR2 Owner', 'pending')
  RETURNING id INTO v_owner_advisor;

  INSERT INTO public.stripe_webhook_events (event_id, event_type, app_user_id, action_taken)
  VALUES ('evt_epic4_pr2_seed', 'customer.subscription.updated', v_owner, 'seed');

  INSERT INTO public.entitlement_bypass_log (user_id, feature, source, details)
  VALUES (v_owner, 'pdf_export', 'epic4_pr2_seed', '{"seed":true}'::jsonb);

  INSERT INTO public.admin_bootstrap_tokens (token_hash, expires_at)
  VALUES (digest('epic4-pr2-bootstrap-seed', 'sha256'), now() + interval '15 minutes');

  INSERT INTO public.admin_audit_log (actor_user_id, target_user_id, action, details)
  VALUES (v_admin, v_owner, 'epic4_pr2_seed', '{"seed":true}'::jsonb);

  -- Storage fixtures (exports bucket created by migration).
  PERFORM test.assert_true(
    'storage: exports bucket exists',
    EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'exports')
  );

  INSERT INTO storage.objects (bucket_id, name, owner)
  VALUES ('exports', v_owner::text || '/epic4-pr2-owner.pdf', v_owner)
  RETURNING id INTO v_owner_storage;

  INSERT INTO storage.objects (bucket_id, name, owner)
  VALUES ('exports', v_non_owner::text || '/epic4-pr2-nonowner.pdf', v_non_owner)
  RETURNING id INTO v_non_owner_storage;

  -- Anon must hold table DML so anonymous denials are RLS-attributable.
  FOREACH v_tbl IN ARRAY v_pr2_tables LOOP
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

  PERFORM test.assert_true(
    'anon has SELECT on storage.objects',
    has_table_privilege('anon', 'storage.objects'::regclass, 'SELECT')
  );
  PERFORM test.assert_true(
    'anon has INSERT on storage.objects',
    has_table_privilege('anon', 'storage.objects'::regclass, 'INSERT')
  );
  PERFORM test.assert_true(
    'anon has UPDATE on storage.objects',
    has_table_privilege('anon', 'storage.objects'::regclass, 'UPDATE')
  );
  PERFORM test.assert_true(
    'anon has DELETE on storage.objects',
    has_table_privilege('anon', 'storage.objects'::regclass, 'DELETE')
  );
  PERFORM test.assert_true(
    'authenticated has SELECT on storage.objects',
    has_table_privilege('authenticated', 'storage.objects'::regclass, 'SELECT')
  );
  PERFORM test.assert_true(
    'authenticated has INSERT on storage.objects',
    has_table_privilege('authenticated', 'storage.objects'::regclass, 'INSERT')
  );

  -- =========================================================================
  -- public.pdf_exports
  -- =========================================================================
  PERFORM test.assert_true(
    'pdf_exports: RLS enabled',
    (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'pdf_exports')
  );

  PERFORM test.set_auth(v_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.pdf_exports WHERE id = v_owner_pdf;
  PERFORM test.assert_true('pdf_exports: owner can select own', v_n = 1);

  INSERT INTO public.pdf_exports (user_id, kind, source_id, storage_path, status)
  VALUES (v_owner, 'scenario', v_owner_scenario, v_owner::text || '/pdf-owner-2.pdf', 'queued');

  BEGIN
    INSERT INTO public.pdf_exports (user_id, kind, source_id, storage_path, status)
    VALUES (v_non_owner, 'scenario', v_non_owner_scenario, v_owner::text || '/forge.pdf', 'queued');
    RAISE EXCEPTION 'ASSERT_FAIL: pdf_exports owner forge as non-owner should fail';
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM test.epic4_pr1_assert_rls_exception('pdf_exports owner cannot forge user_id', SQLERRM);
  END;

  BEGIN
    INSERT INTO public.pdf_exports (user_id, kind, source_id, storage_path, status)
    VALUES (v_owner, 'scenario', v_non_owner_scenario, v_owner::text || '/unowned-source.pdf', 'queued');
    RAISE EXCEPTION 'ASSERT_FAIL: pdf_exports insert with unowned source should fail';
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM test.epic4_pr1_assert_rls_exception('pdf_exports owner cannot use unowned source', SQLERRM);
  END;

  UPDATE public.pdf_exports SET status = 'ready' WHERE id = v_owner_pdf;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('pdf_exports: owner can update own', v_n = 1);

  PERFORM test.set_auth(v_non_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.pdf_exports WHERE id = v_owner_pdf;
  PERFORM test.assert_true('pdf_exports: non-owner cannot select', v_n = 0);
  UPDATE public.pdf_exports SET status = 'failed' WHERE id = v_owner_pdf;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('pdf_exports: non-owner cannot update', v_n = 0);
  DELETE FROM public.pdf_exports WHERE id = v_owner_pdf;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('pdf_exports: non-owner cannot delete', v_n = 0);

  PERFORM test.set_auth(v_admin, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.pdf_exports WHERE id = v_owner_pdf;
  PERFORM test.assert_true('pdf_exports: admin has no implicit select bypass', v_n = 0);

  PERFORM test.reset_auth();
  SET ROLE anon;
  SELECT count(*)::int INTO v_n FROM public.pdf_exports WHERE id = v_owner_pdf;
  PERFORM test.assert_true('pdf_exports: anon cannot select', v_n = 0);
  BEGIN
    INSERT INTO public.pdf_exports (user_id, kind, source_id, storage_path, status)
    VALUES (v_owner, 'scenario', v_owner_scenario, 'anon.pdf', 'queued');
    RAISE EXCEPTION 'ASSERT_FAIL: pdf_exports anon insert should fail';
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM test.epic4_pr1_assert_rls_exception('pdf_exports anon cannot insert', SQLERRM);
  END;
  PERFORM test.reset_auth();

  PERFORM test.set_auth(v_owner, 'authenticated');
  DELETE FROM public.pdf_exports
  WHERE user_id = v_owner AND storage_path = v_owner::text || '/pdf-owner-2.pdf';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('pdf_exports: owner can delete own', v_n = 1);
  PERFORM test.reset_auth();

  -- =========================================================================
  -- public.export_files (no UPDATE policy)
  -- =========================================================================
  PERFORM test.assert_true(
    'export_files: RLS enabled',
    (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'export_files')
  );

  PERFORM test.set_auth(v_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.export_files WHERE id = v_owner_export_file;
  PERFORM test.assert_true('export_files: owner can select own', v_n = 1);
  SELECT count(*)::int INTO v_n FROM public.export_files WHERE id = v_non_owner_export_file;
  PERFORM test.assert_true('export_files: owner cannot select non-owner', v_n = 0);

  INSERT INTO public.export_files (
    owner_user_id, entity_type, entity_id, storage_path, export_version
  ) VALUES (
    v_owner, 'scenario', v_owner_scenario, v_owner::text || '/export-owner-2.pdf', '2'
  );

  UPDATE public.export_files SET checksum = 'abc' WHERE id = v_owner_export_file;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('export_files: owner update denied (no UPDATE policy)', v_n = 0);

  PERFORM test.set_auth(v_non_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.export_files WHERE id = v_owner_export_file;
  PERFORM test.assert_true('export_files: non-owner cannot select', v_n = 0);
  DELETE FROM public.export_files WHERE id = v_owner_export_file;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('export_files: non-owner cannot delete', v_n = 0);

  PERFORM test.set_auth(v_admin, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.export_files WHERE id = v_owner_export_file;
  PERFORM test.assert_true('export_files: admin has no implicit select bypass', v_n = 0);

  PERFORM test.reset_auth();
  SET ROLE anon;
  SELECT count(*)::int INTO v_n FROM public.export_files WHERE id = v_owner_export_file;
  PERFORM test.assert_true('export_files: anon cannot select', v_n = 0);
  BEGIN
    INSERT INTO public.export_files (
      owner_user_id, entity_type, entity_id, storage_path, export_version
    ) VALUES (v_owner, 'scenario', v_owner_scenario, 'anon.pdf', '9');
    RAISE EXCEPTION 'ASSERT_FAIL: export_files anon insert should fail';
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM test.epic4_pr1_assert_rls_exception('export_files anon cannot insert', SQLERRM);
  END;
  PERFORM test.reset_auth();

  PERFORM test.set_auth(v_owner, 'authenticated');
  DELETE FROM public.export_files
  WHERE owner_user_id = v_owner AND export_version = '2';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('export_files: owner can delete own', v_n = 1);
  PERFORM test.reset_auth();

  -- =========================================================================
  -- public.export_shares (indirect ownership via export_files)
  -- =========================================================================
  PERFORM test.assert_true(
    'export_shares: RLS enabled',
    (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'export_shares')
  );

  PERFORM test.set_auth(v_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.export_shares WHERE id = v_owner_export_share;
  PERFORM test.assert_true('export_shares: parent owner can select', v_n = 1);

  INSERT INTO public.export_shares (export_file_id, token, created_by_user_id)
  VALUES (v_owner_export_file, 'epic4-pr2-export-share-token-owner-002', v_owner);

  UPDATE public.export_shares SET revoked_at = now() WHERE id = v_owner_export_share;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('export_shares: parent owner can update', v_n = 1);

  BEGIN
    INSERT INTO public.export_shares (export_file_id, token, created_by_user_id)
    VALUES (v_non_owner_export_file, 'epic4-pr2-export-share-forge', v_owner);
    RAISE EXCEPTION 'ASSERT_FAIL: export_shares insert on foreign parent should fail';
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM test.epic4_pr1_assert_rls_exception(
        'export_shares owner cannot insert on foreign parent',
        SQLERRM
      );
  END;

  PERFORM test.set_auth(v_non_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.export_shares WHERE id = v_owner_export_share;
  PERFORM test.assert_true('export_shares: non-owner cannot select', v_n = 0);
  UPDATE public.export_shares SET revoked_at = now() WHERE id = v_owner_export_share;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('export_shares: non-owner cannot update', v_n = 0);
  DELETE FROM public.export_shares WHERE id = v_owner_export_share;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('export_shares: non-owner cannot delete', v_n = 0);

  PERFORM test.set_auth(v_admin, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.export_shares WHERE id = v_owner_export_share;
  PERFORM test.assert_true('export_shares: admin has no implicit select bypass', v_n = 0);

  PERFORM test.reset_auth();
  SET ROLE anon;
  SELECT count(*)::int INTO v_n FROM public.export_shares WHERE id = v_owner_export_share;
  PERFORM test.assert_true('export_shares: anon cannot select', v_n = 0);
  PERFORM test.reset_auth();

  PERFORM test.set_auth(v_owner, 'authenticated');
  DELETE FROM public.export_shares
  WHERE token = 'epic4-pr2-export-share-token-owner-002';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('export_shares: parent owner can delete', v_n = 1);
  PERFORM test.reset_auth();

  -- =========================================================================
  -- public.comparison_shares (indirect ownership via saved_comparisons)
  -- =========================================================================
  PERFORM test.assert_true(
    'comparison_shares: RLS enabled',
    (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'comparison_shares')
  );

  PERFORM test.set_auth(v_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.comparison_shares WHERE id = v_owner_cmp_share;
  PERFORM test.assert_true('comparison_shares: parent owner can select', v_n = 1);

  INSERT INTO public.comparison_shares (comparison_id, created_by, token)
  VALUES (v_owner_saved, v_owner, 'epic4-pr2-comparison-share-token-owner-002');

  UPDATE public.comparison_shares SET require_auth = true WHERE id = v_owner_cmp_share;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('comparison_shares: parent owner can update', v_n = 1);

  BEGIN
    INSERT INTO public.comparison_shares (comparison_id, created_by, token)
    VALUES (v_non_owner_saved, v_owner, 'epic4-pr2-comparison-share-forge');
    RAISE EXCEPTION 'ASSERT_FAIL: comparison_shares insert on foreign parent should fail';
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM test.epic4_pr1_assert_rls_exception(
        'comparison_shares owner cannot insert on foreign parent',
        SQLERRM
      );
  END;

  PERFORM test.set_auth(v_non_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.comparison_shares WHERE id = v_owner_cmp_share;
  PERFORM test.assert_true('comparison_shares: non-owner cannot select', v_n = 0);
  DELETE FROM public.comparison_shares WHERE id = v_owner_cmp_share;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('comparison_shares: non-owner cannot delete', v_n = 0);

  PERFORM test.set_auth(v_admin, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.comparison_shares WHERE id = v_owner_cmp_share;
  PERFORM test.assert_true('comparison_shares: admin has no implicit select bypass', v_n = 0);

  PERFORM test.reset_auth();
  SET ROLE anon;
  SELECT count(*)::int INTO v_n FROM public.comparison_shares WHERE id = v_owner_cmp_share;
  PERFORM test.assert_true('comparison_shares: anon cannot select', v_n = 0);
  BEGIN
    INSERT INTO public.comparison_shares (comparison_id, created_by, token)
    VALUES (v_owner_saved, v_owner, 'epic4-pr2-comparison-share-anon');
    RAISE EXCEPTION 'ASSERT_FAIL: comparison_shares anon insert should fail';
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM test.epic4_pr1_assert_rls_exception('comparison_shares anon cannot insert', SQLERRM);
  END;
  PERFORM test.reset_auth();

  PERFORM test.set_auth(v_owner, 'authenticated');
  DELETE FROM public.comparison_shares
  WHERE token = 'epic4-pr2-comparison-share-token-owner-002';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('comparison_shares: parent owner can delete', v_n = 1);
  PERFORM test.reset_auth();

  -- =========================================================================
  -- public.billing (SELECT-own only; no client write policies)
  -- =========================================================================
  PERFORM test.assert_true(
    'billing: RLS enabled',
    (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'billing')
  );

  PERFORM test.set_auth(v_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.billing WHERE user_id = v_owner;
  PERFORM test.assert_true('billing: owner can select own', v_n = 1);
  SELECT count(*)::int INTO v_n FROM public.billing WHERE user_id = v_non_owner;
  PERFORM test.assert_true('billing: owner cannot select non-owner', v_n = 0);

  -- Disposable auth user so FK cannot masquerade as the denial layer.
  PERFORM test.reset_auth();
  INSERT INTO auth.users (id, email)
  VALUES ('e4200000-0000-4000-8000-000000000499', 'epic4-pr2-billing-insert@test.local')
  ON CONFLICT (id) DO NOTHING;

  PERFORM test.set_auth(v_owner, 'authenticated');
  BEGIN
    INSERT INTO public.billing (user_id, subscription_status)
    VALUES ('e4200000-0000-4000-8000-000000000499', 'active');
    RAISE EXCEPTION 'ASSERT_FAIL: billing client insert should fail (RLS)';
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM test.epic4_pr1_assert_rls_exception('billing authenticated cannot insert', SQLERRM);
  END;

  UPDATE public.billing SET subscription_status = 'canceled' WHERE user_id = v_owner;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('billing: owner update denied (no UPDATE policy)', v_n = 0);
  DELETE FROM public.billing WHERE user_id = v_owner;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('billing: owner delete denied (no DELETE policy)', v_n = 0);

  PERFORM test.set_auth(v_admin, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.billing WHERE user_id = v_owner;
  PERFORM test.assert_true('billing: admin has no implicit select bypass', v_n = 0);

  PERFORM test.reset_auth();
  SET ROLE anon;
  SELECT count(*)::int INTO v_n FROM public.billing WHERE user_id = v_owner;
  PERFORM test.assert_true('billing: anon cannot select', v_n = 0);
  PERFORM test.reset_auth();

  -- =========================================================================
  -- public.stripe_webhook_events (RLS on, no effective policies)
  -- =========================================================================
  PERFORM test.assert_true(
    'stripe_webhook_events: RLS enabled',
    (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'stripe_webhook_events')
  );
  PERFORM test.assert_true(
    'stripe_webhook_events: no effective policies',
    (SELECT count(*)::int FROM pg_policy p
     JOIN pg_class c ON c.oid = p.polrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'stripe_webhook_events') = 0
  );

  PERFORM test.set_auth(v_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.stripe_webhook_events WHERE event_id = 'evt_epic4_pr2_seed';
  PERFORM test.assert_true('stripe_webhook_events: authenticated cannot select', v_n = 0);
  BEGIN
    INSERT INTO public.stripe_webhook_events (event_id, event_type)
    VALUES ('evt_epic4_pr2_client', 'invoice.paid');
    RAISE EXCEPTION 'ASSERT_FAIL: stripe_webhook_events client insert should fail';
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM test.epic4_pr1_assert_rls_exception(
        'stripe_webhook_events authenticated cannot insert',
        SQLERRM
      );
  END;
  UPDATE public.stripe_webhook_events SET action_taken = 'x' WHERE event_id = 'evt_epic4_pr2_seed';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('stripe_webhook_events: authenticated cannot update', v_n = 0);
  DELETE FROM public.stripe_webhook_events WHERE event_id = 'evt_epic4_pr2_seed';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('stripe_webhook_events: authenticated cannot delete', v_n = 0);

  PERFORM test.set_auth(v_admin, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.stripe_webhook_events WHERE event_id = 'evt_epic4_pr2_seed';
  PERFORM test.assert_true('stripe_webhook_events: admin cannot select (no policies)', v_n = 0);

  PERFORM test.reset_auth();
  SET ROLE anon;
  SELECT count(*)::int INTO v_n FROM public.stripe_webhook_events WHERE event_id = 'evt_epic4_pr2_seed';
  PERFORM test.assert_true('stripe_webhook_events: anon cannot select', v_n = 0);
  BEGIN
    INSERT INTO public.stripe_webhook_events (event_id, event_type)
    VALUES ('evt_epic4_pr2_anon', 'invoice.paid');
    RAISE EXCEPTION 'ASSERT_FAIL: stripe_webhook_events anon insert should fail';
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM test.epic4_pr1_assert_rls_exception('stripe_webhook_events anon cannot insert', SQLERRM);
  END;
  PERFORM test.reset_auth();

  -- =========================================================================
  -- public.entitlement_bypass_log (RLS on, no effective policies)
  -- =========================================================================
  PERFORM test.assert_true(
    'entitlement_bypass_log: RLS enabled',
    (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'entitlement_bypass_log')
  );
  PERFORM test.assert_true(
    'entitlement_bypass_log: no effective policies',
    (SELECT count(*)::int FROM pg_policy p
     JOIN pg_class c ON c.oid = p.polrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'entitlement_bypass_log') = 0
  );

  PERFORM test.set_auth(v_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.entitlement_bypass_log WHERE user_id = v_owner;
  PERFORM test.assert_true('entitlement_bypass_log: authenticated cannot select', v_n = 0);
  BEGIN
    INSERT INTO public.entitlement_bypass_log (user_id, source)
    VALUES (v_owner, 'client');
    RAISE EXCEPTION 'ASSERT_FAIL: entitlement_bypass_log client insert should fail';
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM test.epic4_pr1_assert_rls_exception(
        'entitlement_bypass_log authenticated cannot insert',
        SQLERRM
      );
  END;

  PERFORM test.set_auth(v_admin, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.entitlement_bypass_log WHERE user_id = v_owner;
  PERFORM test.assert_true('entitlement_bypass_log: admin cannot select (no policies)', v_n = 0);

  PERFORM test.reset_auth();
  SET ROLE anon;
  SELECT count(*)::int INTO v_n FROM public.entitlement_bypass_log WHERE user_id = v_owner;
  PERFORM test.assert_true('entitlement_bypass_log: anon cannot select', v_n = 0);
  PERFORM test.reset_auth();

  -- =========================================================================
  -- public.user_roles (admin-only SELECT/INSERT/DELETE; no UPDATE)
  -- =========================================================================
  PERFORM test.assert_true(
    'user_roles: RLS enabled',
    (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'user_roles')
  );

  PERFORM test.set_auth(v_non_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.user_roles WHERE user_id = v_admin;
  PERFORM test.assert_true('user_roles: non-admin cannot select', v_n = 0);
  BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_non_owner, 'moderator');
    RAISE EXCEPTION 'ASSERT_FAIL: user_roles non-admin insert should fail';
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM test.epic4_pr1_assert_rls_exception('user_roles non-admin cannot insert', SQLERRM);
  END;

  PERFORM test.set_auth(v_admin, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.user_roles WHERE user_id = v_admin AND role = 'admin';
  PERFORM test.assert_true('user_roles: admin can select roles', v_n = 1);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_non_owner, 'moderator')
  RETURNING id INTO v_moderator_role_id;
  PERFORM test.assert_true('user_roles: admin can insert role', v_moderator_role_id IS NOT NULL);

  UPDATE public.user_roles SET role = 'user' WHERE id = v_moderator_role_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('user_roles: admin update denied (no UPDATE policy)', v_n = 0);

  DELETE FROM public.user_roles WHERE id = v_moderator_role_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('user_roles: admin can delete non-last role', v_n = 1);

  PERFORM test.reset_auth();
  SET ROLE anon;
  SELECT count(*)::int INTO v_n FROM public.user_roles;
  PERFORM test.assert_true('user_roles: anon cannot select', v_n = 0);
  BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_owner, 'user');
    RAISE EXCEPTION 'ASSERT_FAIL: user_roles anon insert should fail';
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM test.epic4_pr1_assert_rls_exception('user_roles anon cannot insert', SQLERRM);
  END;
  PERFORM test.reset_auth();

  -- =========================================================================
  -- public.admin_audit_log (admin SELECT only)
  -- =========================================================================
  PERFORM test.assert_true(
    'admin_audit_log: RLS enabled',
    (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'admin_audit_log')
  );

  PERFORM test.set_auth(v_admin, 'authenticated');
  SELECT count(*)::int INTO v_n
  FROM public.admin_audit_log
  WHERE action = 'epic4_pr2_seed';
  PERFORM test.assert_true('admin_audit_log: admin can select', v_n = 1);

  BEGIN
    INSERT INTO public.admin_audit_log (actor_user_id, action)
    VALUES (v_admin, 'epic4_pr2_client_insert');
    RAISE EXCEPTION 'ASSERT_FAIL: admin_audit_log client insert should fail';
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM test.epic4_pr1_assert_rls_exception('admin_audit_log admin cannot insert via RLS', SQLERRM);
  END;

  PERFORM test.set_auth(v_non_owner, 'authenticated');
  SELECT count(*)::int INTO v_n
  FROM public.admin_audit_log
  WHERE action = 'epic4_pr2_seed';
  PERFORM test.assert_true('admin_audit_log: non-admin cannot select', v_n = 0);

  PERFORM test.reset_auth();
  SET ROLE anon;
  SELECT count(*)::int INTO v_n FROM public.admin_audit_log;
  PERFORM test.assert_true('admin_audit_log: anon cannot select', v_n = 0);
  PERFORM test.reset_auth();

  -- =========================================================================
  -- public.admin_bootstrap_tokens (RLS on, no effective policies)
  -- =========================================================================
  PERFORM test.assert_true(
    'admin_bootstrap_tokens: RLS enabled',
    (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'admin_bootstrap_tokens')
  );
  PERFORM test.assert_true(
    'admin_bootstrap_tokens: no effective policies',
    (SELECT count(*)::int FROM pg_policy p
     JOIN pg_class c ON c.oid = p.polrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'admin_bootstrap_tokens') = 0
  );

  PERFORM test.set_auth(v_admin, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.admin_bootstrap_tokens;
  PERFORM test.assert_true('admin_bootstrap_tokens: admin cannot select (no policies)', v_n = 0);
  BEGIN
    INSERT INTO public.admin_bootstrap_tokens (token_hash, expires_at)
    VALUES (digest('epic4-pr2-admin-client', 'sha256'), now() + interval '5 minutes');
    RAISE EXCEPTION 'ASSERT_FAIL: admin_bootstrap_tokens client insert should fail';
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM test.epic4_pr1_assert_rls_exception(
        'admin_bootstrap_tokens admin cannot insert',
        SQLERRM
      );
  END;

  PERFORM test.set_auth(v_non_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.admin_bootstrap_tokens;
  PERFORM test.assert_true('admin_bootstrap_tokens: non-admin cannot select', v_n = 0);

  PERFORM test.reset_auth();
  SET ROLE anon;
  SELECT count(*)::int INTO v_n FROM public.admin_bootstrap_tokens;
  PERFORM test.assert_true('admin_bootstrap_tokens: anon cannot select', v_n = 0);
  PERFORM test.reset_auth();

  -- =========================================================================
  -- public.advisor_access_requests
  -- =========================================================================
  PERFORM test.assert_true(
    'advisor_access_requests: RLS enabled',
    (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'advisor_access_requests')
  );

  PERFORM test.set_auth(v_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.advisor_access_requests WHERE id = v_owner_advisor;
  PERFORM test.assert_true('advisor_access_requests: owner can select own', v_n = 1);
  UPDATE public.advisor_access_requests SET status = 'approved' WHERE id = v_owner_advisor;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('advisor_access_requests: owner cannot update', v_n = 0);
  DELETE FROM public.advisor_access_requests WHERE id = v_owner_advisor;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('advisor_access_requests: owner cannot delete', v_n = 0);

  -- Owner already has a request (UNIQUE user_id); insert as non-owner for own path.
  PERFORM test.set_auth(v_non_owner, 'authenticated');
  INSERT INTO public.advisor_access_requests (user_id, email, full_name, status)
  VALUES (v_non_owner, 'epic4-pr2-nonowner@test.local', 'Epic4 PR2 NonOwner', 'pending');
  SELECT count(*)::int INTO v_n FROM public.advisor_access_requests WHERE id = v_owner_advisor;
  PERFORM test.assert_true('advisor_access_requests: non-owner cannot select foreign', v_n = 0);

  PERFORM test.set_auth(v_admin, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.advisor_access_requests WHERE id = v_owner_advisor;
  PERFORM test.assert_true('advisor_access_requests: admin can select all', v_n = 1);
  UPDATE public.advisor_access_requests
  SET status = 'denied', reviewed_by = v_admin, reviewed_at = now()
  WHERE id = v_owner_advisor;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('advisor_access_requests: admin can update', v_n = 1);
  DELETE FROM public.advisor_access_requests WHERE user_id = v_non_owner;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('advisor_access_requests: admin can delete', v_n = 1);

  PERFORM test.reset_auth();
  SET ROLE anon;
  SELECT count(*)::int INTO v_n FROM public.advisor_access_requests WHERE id = v_owner_advisor;
  PERFORM test.assert_true('advisor_access_requests: anon cannot select', v_n = 0);
  BEGIN
    INSERT INTO public.advisor_access_requests (user_id, email, status)
    VALUES (v_owner, 'anon@test.local', 'pending');
    RAISE EXCEPTION 'ASSERT_FAIL: advisor_access_requests anon insert should fail';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'ASSERT_FAIL: advisor anon insert hit unique before RLS';
    WHEN OTHERS THEN
      PERFORM test.epic4_pr1_assert_rls_exception('advisor_access_requests anon cannot insert', SQLERRM);
  END;
  PERFORM test.reset_auth();

  -- =========================================================================
  -- public.contact_messages (intentional public INSERT; admin read/update)
  -- =========================================================================
  PERFORM test.assert_true(
    'contact_messages: RLS enabled',
    (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'contact_messages')
  );

  PERFORM test.reset_auth();
  SET ROLE anon;
  INSERT INTO public.contact_messages (full_name, email, topic, message)
  VALUES ('Anon Contact', 'anon-contact@test.local', 'billing', 'hello from anon');
  SELECT count(*)::int INTO v_n
  FROM public.contact_messages
  WHERE email = 'anon-contact@test.local';
  PERFORM test.assert_true('contact_messages: anon cannot select after public insert', v_n = 0);
  PERFORM test.reset_auth();

  PERFORM test.set_auth(v_non_owner, 'authenticated');
  INSERT INTO public.contact_messages (full_name, email, topic, message, user_id)
  VALUES ('Auth Contact', 'auth-contact@test.local', 'support', 'hello from auth', v_non_owner);
  SELECT count(*)::int INTO v_n FROM public.contact_messages WHERE id = v_owner_contact;
  PERFORM test.assert_true('contact_messages: non-admin cannot select', v_n = 0);
  UPDATE public.contact_messages SET status = 'reviewed' WHERE id = v_owner_contact;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('contact_messages: non-admin cannot update', v_n = 0);
  DELETE FROM public.contact_messages WHERE id = v_owner_contact;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('contact_messages: delete denied (no DELETE policy)', v_n = 0);

  PERFORM test.set_auth(v_admin, 'authenticated');
  SELECT count(*)::int INTO v_n FROM public.contact_messages WHERE id = v_owner_contact;
  PERFORM test.assert_true('contact_messages: admin can select', v_n = 1);
  UPDATE public.contact_messages
  SET status = 'reviewed', reviewed_by = v_admin, reviewed_at = now()
  WHERE id = v_owner_contact;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('contact_messages: admin can update', v_n = 1);
  PERFORM test.reset_auth();

  -- =========================================================================
  -- storage.objects (exports bucket folder ownership)
  -- =========================================================================
  PERFORM test.assert_true(
    'storage.objects: RLS enabled',
    (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'storage' AND c.relname = 'objects')
  );

  PERFORM test.set_auth(v_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM storage.objects WHERE id = v_owner_storage;
  PERFORM test.assert_true('storage.objects: owner can select own folder object', v_n = 1);
  SELECT count(*)::int INTO v_n FROM storage.objects WHERE id = v_non_owner_storage;
  PERFORM test.assert_true('storage.objects: owner cannot select foreign folder', v_n = 0);

  INSERT INTO storage.objects (bucket_id, name, owner)
  VALUES ('exports', v_owner::text || '/epic4-pr2-owner-2.pdf', v_owner);

  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('exports', v_non_owner::text || '/forge-by-owner.pdf', v_owner);
    RAISE EXCEPTION 'ASSERT_FAIL: storage insert into foreign folder should fail';
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM test.epic4_pr1_assert_rls_exception(
        'storage.objects owner cannot insert into foreign folder',
        SQLERRM
      );
  END;

  UPDATE storage.objects
  SET metadata = '{"k":1}'::jsonb
  WHERE id = v_owner_storage;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('storage.objects: owner can update own folder object', v_n = 1);

  UPDATE storage.objects
  SET metadata = '{"k":2}'::jsonb
  WHERE id = v_non_owner_storage;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('storage.objects: owner cannot update foreign folder', v_n = 0);

  PERFORM test.set_auth(v_non_owner, 'authenticated');
  SELECT count(*)::int INTO v_n FROM storage.objects WHERE id = v_owner_storage;
  PERFORM test.assert_true('storage.objects: non-owner cannot select foreign folder', v_n = 0);
  DELETE FROM storage.objects WHERE id = v_owner_storage;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('storage.objects: non-owner cannot delete foreign folder', v_n = 0);

  PERFORM test.set_auth(v_admin, 'authenticated');
  SELECT count(*)::int INTO v_n FROM storage.objects WHERE id = v_owner_storage;
  PERFORM test.assert_true('storage.objects: admin has no implicit select bypass', v_n = 0);

  PERFORM test.reset_auth();
  SET ROLE anon;
  SELECT count(*)::int INTO v_n FROM storage.objects WHERE id = v_owner_storage;
  PERFORM test.assert_true('storage.objects: anon cannot select', v_n = 0);
  BEGIN
    INSERT INTO storage.objects (bucket_id, name)
    VALUES ('exports', v_owner::text || '/anon.pdf');
    RAISE EXCEPTION 'ASSERT_FAIL: storage anon insert should fail';
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM test.epic4_pr1_assert_rls_exception('storage.objects anon cannot insert', SQLERRM);
  END;
  PERFORM test.reset_auth();

  PERFORM test.set_auth(v_owner, 'authenticated');
  DELETE FROM storage.objects
  WHERE name = v_owner::text || '/epic4-pr2-owner-2.pdf';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM test.assert_true('storage.objects: owner can delete own folder object', v_n = 1);
  PERFORM test.reset_auth();

  RAISE NOTICE 'EPIC4_PR2_REMAINING_RLS: ALL ASSERTIONS PASSED';
END;
$matrix$;
