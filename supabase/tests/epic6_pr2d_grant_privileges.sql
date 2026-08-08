-- Epic 6 PR 2D — privilege contract after migration-only reconstruction
-- (no CI GRANT ALL overlay). Requires test.assert_true from 00_auth_stub
-- OR inline DO-block assertions when run from the dedicated vitest harness.

DO $pr2d$
DECLARE
  v_tbl text;
  v_tables text[] := ARRAY[
    'public.profiles',
    'public.scenarios',
    'public.billing',
    'public.subscriptions',
    'public.user_roles',
    'public.user_comparisons',
    'public.pdf_exports',
    'public.admin_audit_log',
    'public.admin_bootstrap_tokens',
    'public.entitlement_bypass_log',
    'public.stripe_webhook_events',
    'public.stripe_event_evidence',
    'public.billing_recovery_runs',
    'public.saved_comparisons',
    'public.comparison_items',
    'public.comparison_versions',
    'public.comparison_shares',
    'public.export_files',
    'public.export_shares',
    'public.advisor_access_requests'
  ];
  v_priv text;
  v_client_privs text[] := ARRAY[
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
  ];
  v_structural text[] := ARRAY['TRUNCATE', 'REFERENCES', 'TRIGGER'];
  v_role text;
  v_pol_count int;
  v_trig_count int;
BEGIN
  -- -------------------------------------------------------------------------
  -- subscriptions: anon / authenticated have no table privileges
  -- -------------------------------------------------------------------------
  FOREACH v_priv IN ARRAY v_client_privs LOOP
    IF has_table_privilege('anon', 'public.subscriptions'::regclass, v_priv) THEN
      RAISE EXCEPTION 'PR2D fail: anon still has % on public.subscriptions', v_priv;
    END IF;
    IF has_table_privilege('authenticated', 'public.subscriptions'::regclass, v_priv) THEN
      RAISE EXCEPTION 'PR2D fail: authenticated still has % on public.subscriptions', v_priv;
    END IF;
  END LOOP;

  -- service_role retains DML used by Edge sync
  IF NOT has_table_privilege('service_role', 'public.subscriptions'::regclass, 'SELECT') THEN
    RAISE EXCEPTION 'PR2D fail: service_role missing SELECT on subscriptions';
  END IF;
  IF NOT has_table_privilege('service_role', 'public.subscriptions'::regclass, 'INSERT') THEN
    RAISE EXCEPTION 'PR2D fail: service_role missing INSERT on subscriptions';
  END IF;
  IF NOT has_table_privilege('service_role', 'public.subscriptions'::regclass, 'UPDATE') THEN
    RAISE EXCEPTION 'PR2D fail: service_role missing UPDATE on subscriptions';
  END IF;
  IF NOT has_table_privilege('service_role', 'public.subscriptions'::regclass, 'DELETE') THEN
    RAISE EXCEPTION 'PR2D fail: service_role missing DELETE on subscriptions';
  END IF;

  -- postgres owner/admin remains
  IF NOT has_table_privilege('postgres', 'public.subscriptions'::regclass, 'SELECT') THEN
    RAISE EXCEPTION 'PR2D fail: postgres missing SELECT on subscriptions';
  END IF;

  -- RLS + policy preserved (policy may be unreachable for clients; still present)
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'subscriptions' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'PR2D fail: subscriptions RLS not enabled';
  END IF;

  SELECT count(*) INTO v_pol_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'subscriptions' AND policyname = 'subscriptions_select_own';
  IF v_pol_count <> 1 THEN
    RAISE EXCEPTION 'PR2D fail: subscriptions_select_own policy missing or changed count=%', v_pol_count;
  END IF;

  -- -------------------------------------------------------------------------
  -- protect_admin_subscriptions(): no client EXECUTE; triggers remain
  -- -------------------------------------------------------------------------
  IF has_function_privilege('anon', 'public.protect_admin_subscriptions()', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR2D fail: anon still has EXECUTE on protect_admin_subscriptions()';
  END IF;
  IF has_function_privilege('authenticated', 'public.protect_admin_subscriptions()', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR2D fail: authenticated still has EXECUTE on protect_admin_subscriptions()';
  END IF;
  IF has_function_privilege('public', 'public.protect_admin_subscriptions()', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR2D fail: PUBLIC still has EXECUTE on protect_admin_subscriptions()';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.protect_admin_subscriptions()', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR2D fail: service_role missing EXECUTE on protect_admin_subscriptions()';
  END IF;
  IF NOT has_function_privilege('postgres', 'public.protect_admin_subscriptions()', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR2D fail: postgres missing EXECUTE on protect_admin_subscriptions()';
  END IF;

  SELECT count(*) INTO v_trig_count
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'subscriptions'
    AND NOT t.tgisinternal
    AND t.tgname IN (
      'trg_protect_admin_subscriptions_ins',
      'trg_protect_admin_subscriptions_upd'
    );
  IF v_trig_count <> 2 THEN
    RAISE EXCEPTION 'PR2D fail: protect_admin_subscriptions triggers missing (count=%)', v_trig_count;
  END IF;

  -- -------------------------------------------------------------------------
  -- Structural privileges: anon/authenticated lack TRUNCATE/REFERENCES/TRIGGER
  -- -------------------------------------------------------------------------
  FOREACH v_tbl IN ARRAY v_tables LOOP
    FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      FOREACH v_priv IN ARRAY v_structural LOOP
        IF has_table_privilege(v_role, v_tbl::regclass, v_priv) THEN
          RAISE EXCEPTION 'PR2D fail: % still has % on %', v_role, v_priv, v_tbl;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Epic 6 PR 2D grant privilege assertions passed';
END
$pr2d$;
