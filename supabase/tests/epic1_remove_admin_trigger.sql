-- Epic 1 (Admin Provisioning Security) — PR 2: legacy trigger removal assertions.
--
-- Must run AFTER supabase/tests/epic1_admin_bootstrap.sql, which needs a
-- true zero-admin starting state to test the fresh bootstrap happy path.
-- This file deliberately runs once that admin already exists, because
-- public.protect_admin_role_deletion_trigger (migration
-- 20260112203733_...sql) permanently blocks deleting the last admin role —
-- there is no way to return to a zero-admin state after any admin is
-- created in this test run, so this file must not attempt to.
--
-- Instead of re-creating a fresh admin, it reuses the admin that
-- epic1_admin_bootstrap.sql already created to prove bootstrap still fails
-- closed correctly, and that existing admin promotion still works, after
-- the legacy trigger removal migration.

DO $remove_trigger$
DECLARE
  v_hardcoded_email_user uuid := 'b2000000-0000-0000-0000-00000000b001';
  v_promoted_user uuid := 'b2000000-0000-0000-0000-00000000b003';
  v_existing_admin uuid;
  v_promote_result json;
  v_issue_blocked boolean := false;
BEGIN
  -- 1) Legacy trigger and function no longer exist.
  PERFORM test.assert_true(
    'legacy on_auth_user_created_grant_admin trigger no longer exists',
    NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_grant_admin')
  );
  PERFORM test.assert_true(
    'legacy grant_admin_on_signup function no longer exists',
    to_regprocedure('public.grant_admin_on_signup()') IS NULL
  );

  -- 2) A NEW signup using the exact legacy hardcoded email is NOT auto-granted admin.
  INSERT INTO auth.users (id, email)
  VALUES (v_hardcoded_email_user, 'adam@carpentercreate.com')
  ON CONFLICT (id) DO NOTHING;
  PERFORM test.assert_true(
    'new signup with legacy hardcoded email is not auto-granted admin',
    NOT public.has_role(v_hardcoded_email_user, 'admin')
  );

  -- Locate the admin created by epic1_admin_bootstrap.sql (or any admin, if
  -- test ordering changes) to exercise the remaining checks. See file
  -- header: an admin necessarily already exists by this point.
  SELECT user_id INTO v_existing_admin
  FROM public.user_roles
  WHERE role = 'admin'
  LIMIT 1;
  PERFORM test.assert_true(
    'an existing admin is present to exercise post-removal checks',
    v_existing_admin IS NOT NULL
  );

  -- 3) Explicit bootstrap (PR 1) remains functional: it still runs and
  --    still correctly fails closed while an admin exists, proving the
  --    mechanism was not disturbed by the trigger removal migration. (The
  --    fresh issue+claim happy path is proven separately by
  --    epic1_admin_bootstrap.sql, which runs before this file.)
  BEGIN
    SET ROLE service_role;
    PERFORM public.issue_admin_bootstrap_token(15);
    RESET ROLE;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    v_issue_blocked := true;
  END;
  PERFORM test.assert_true(
    'bootstrap issuance still fails closed while an admin exists, post-removal',
    v_issue_blocked
  );

  -- 4) Existing admin promotion (promote_to_admin) still works, exercised
  --    by an admin that predates this migration.
  INSERT INTO auth.users (id, email)
  VALUES (v_promoted_user, 'epic1-pr2-promoted@test.local')
  ON CONFLICT (id) DO NOTHING;
  PERFORM test.set_auth(v_existing_admin, 'authenticated');
  v_promote_result := public.promote_to_admin('epic1-pr2-promoted@test.local');
  PERFORM test.reset_auth();
  PERFORM test.assert_true(
    'promote_to_admin still succeeds for an existing admin caller',
    (v_promote_result ->> 'success')::boolean IS TRUE
  );
  PERFORM test.assert_true(
    'promote_to_admin still grants the target admin role',
    public.has_role(v_promoted_user, 'admin')
  );

  RAISE NOTICE 'EPIC1_REMOVE_ADMIN_TRIGGER_SQL: ALL ASSERTIONS PASSED';
END;
$remove_trigger$;
