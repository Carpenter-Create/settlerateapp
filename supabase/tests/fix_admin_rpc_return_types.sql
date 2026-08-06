-- fix/admin-rpc-return-types — admin RPC return-type mismatch assertions.
--
-- Proves the production defect (42804 "structure of query does not match
-- function result type", surfaced to clients as HTTP 400) is fixed for
-- public.list_admins() and public.list_recent_admin_promotions(), and does
-- not regress admin-only authorization. See
-- supabase/migrations/20260808010000_fix_admin_rpc_return_types.sql for the
-- fix itself, and supabase/tests/00_auth_stub.sql for why auth.users.email
-- must be character varying(255) (not text) for this to reproduce/verify
-- correctly.
--
-- Self-contained: creates its own admin/non-admin/target users rather than
-- depending on admin state left by earlier test files, so it can run at any
-- point after 00_auth_stub.sql and the defining migration have been applied.

DO $admin_rpc_types$
DECLARE
  v_admin_id uuid := 'd4000000-0000-0000-0000-00000000d001';
  v_non_admin_id uuid := 'd4000000-0000-0000-0000-00000000d002';
  v_target_id uuid := 'd4000000-0000-0000-0000-00000000d003';
  v_admins_count int;
  v_found_admin boolean;
  v_promo_count int;
  v_promote_result json;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (v_admin_id, 'rpc-types-admin@test.local'),
    (v_non_admin_id, 'rpc-types-nonadmin@test.local'),
    (v_target_id, 'rpc-types-target@test.local')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_admin_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 1) An authenticated admin can call list_admins successfully (would
  --    raise 42804 pre-fix, since auth.users.email is varchar(255)).
  PERFORM test.set_auth(v_admin_id, 'authenticated');
  SELECT count(*) INTO v_admins_count FROM public.list_admins();
  PERFORM test.assert_true('list_admins executes for an admin caller', v_admins_count >= 1);

  -- 2) list_admins returns the existing (calling) admin.
  SELECT EXISTS (
    SELECT 1 FROM public.list_admins() WHERE user_id = v_admin_id
  ) INTO v_found_admin;
  PERFORM test.assert_true('list_admins includes the calling admin', v_found_admin);

  -- 3) list_admins' returned column types match its declared RETURNS TABLE
  --    signature exactly (uuid, text, timestamptz).
  PERFORM test.assert_true(
    'list_admins.user_id is uuid',
    (SELECT pg_typeof(user_id)::text FROM public.list_admins() LIMIT 1) = 'uuid'
  );
  PERFORM test.assert_true(
    'list_admins.email is text',
    (SELECT pg_typeof(email)::text FROM public.list_admins() LIMIT 1) = 'text'
  );
  PERFORM test.assert_true(
    'list_admins.created_at is timestamptz',
    (SELECT pg_typeof(created_at)::text FROM public.list_admins() LIMIT 1) = 'timestamp with time zone'
  );

  -- 4) Produce at least one PROMOTE_TO_ADMIN audit row for the next checks.
  v_promote_result := public.promote_to_admin('rpc-types-target@test.local');
  PERFORM test.assert_true(
    'promote_to_admin succeeds for the seed audit row',
    (v_promote_result ->> 'success')::boolean IS TRUE
  );

  -- 5) An authenticated admin can call list_recent_admin_promotions
  --    successfully (would raise 42804 pre-fix, since actor_email is also
  --    sourced from auth.users.email).
  SELECT count(*) INTO v_promo_count FROM public.list_recent_admin_promotions(20);
  PERFORM test.assert_true(
    'list_recent_admin_promotions executes for an admin caller',
    v_promo_count >= 1
  );

  -- 6) list_recent_admin_promotions' returned column types match its
  --    declared RETURNS TABLE signature exactly.
  PERFORM test.assert_true(
    'list_recent_admin_promotions.id is uuid',
    (SELECT pg_typeof(id)::text FROM public.list_recent_admin_promotions(1) LIMIT 1) = 'uuid'
  );
  PERFORM test.assert_true(
    'list_recent_admin_promotions.actor_user_id is uuid',
    (SELECT pg_typeof(actor_user_id)::text FROM public.list_recent_admin_promotions(1) LIMIT 1) = 'uuid'
  );
  PERFORM test.assert_true(
    'list_recent_admin_promotions.actor_email is text',
    (SELECT pg_typeof(actor_email)::text FROM public.list_recent_admin_promotions(1) LIMIT 1) = 'text'
  );
  PERFORM test.assert_true(
    'list_recent_admin_promotions.target_user_id is uuid',
    (SELECT pg_typeof(target_user_id)::text FROM public.list_recent_admin_promotions(1) LIMIT 1) = 'uuid'
  );
  PERFORM test.assert_true(
    'list_recent_admin_promotions.target_email is text',
    (SELECT pg_typeof(target_email)::text FROM public.list_recent_admin_promotions(1) LIMIT 1) = 'text'
  );
  PERFORM test.assert_true(
    'list_recent_admin_promotions.action is text',
    (SELECT pg_typeof(action)::text FROM public.list_recent_admin_promotions(1) LIMIT 1) = 'text'
  );
  PERFORM test.assert_true(
    'list_recent_admin_promotions.created_at is timestamptz',
    (SELECT pg_typeof(created_at)::text FROM public.list_recent_admin_promotions(1) LIMIT 1) = 'timestamp with time zone'
  );

  PERFORM test.reset_auth();

  -- 7) Non-admin access remains denied for both RPCs (unchanged behavior).
  PERFORM test.set_auth(v_non_admin_id, 'authenticated');
  BEGIN
    PERFORM public.list_admins();
    RAISE EXCEPTION 'ASSERT_FAIL: non-admin list_admins call should be denied';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'Access denied%' THEN RAISE; END IF;
    RAISE NOTICE 'ASSERT_OK: non-admin list_admins denied (%).', SQLERRM;
  END;
  BEGIN
    PERFORM public.list_recent_admin_promotions(10);
    RAISE EXCEPTION 'ASSERT_FAIL: non-admin list_recent_admin_promotions call should be denied';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'Access denied%' THEN RAISE; END IF;
    RAISE NOTICE 'ASSERT_OK: non-admin list_recent_admin_promotions denied (%).', SQLERRM;
  END;
  PERFORM test.reset_auth();

  RAISE NOTICE 'FIX_ADMIN_RPC_RETURN_TYPES_SQL: ALL ASSERTIONS PASSED';
END;
$admin_rpc_types$;
