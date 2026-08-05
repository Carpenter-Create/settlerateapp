-- Epic 1 (Admin Provisioning Security) — admin bootstrap mechanism assertions.
-- Proves the bootstrap path works end-to-end and fails closed in every
-- adversarial case, without touching the legacy grant_admin_on_signup()
-- trigger. Run against a fresh (zero-admin) database by
-- scripts/test-entitlement-sql.mjs before the Phase 6 entitlement fixtures
-- (which seed an admin user) run.

DO $grants$
BEGIN
  PERFORM test.assert_true(
    'anon cannot execute issue_admin_bootstrap_token',
    NOT has_function_privilege(
      'anon',
      'public.issue_admin_bootstrap_token(integer)',
      'EXECUTE'
    )
  );

  PERFORM test.assert_true(
    'authenticated cannot execute issue_admin_bootstrap_token',
    NOT has_function_privilege(
      'authenticated',
      'public.issue_admin_bootstrap_token(integer)',
      'EXECUTE'
    )
  );

  PERFORM test.assert_true(
    'service_role can execute issue_admin_bootstrap_token',
    has_function_privilege(
      'service_role',
      'public.issue_admin_bootstrap_token(integer)',
      'EXECUTE'
    )
  );

  PERFORM test.assert_true(
    'anon cannot execute claim_admin_bootstrap',
    NOT has_function_privilege('anon', 'public.claim_admin_bootstrap(text)', 'EXECUTE')
  );

  PERFORM test.assert_true(
    'authenticated can execute claim_admin_bootstrap',
    has_function_privilege('authenticated', 'public.claim_admin_bootstrap(text)', 'EXECUTE')
  );

  -- Runtime denial: authenticated cannot issue tokens even if mis-granted elsewhere.
  PERFORM test.set_auth('e0000000-0000-0000-0000-00000000000e'::uuid, 'authenticated');
  BEGIN
    PERFORM public.issue_admin_bootstrap_token(15);
    RAISE EXCEPTION 'ASSERT_FAIL: authenticated issue should be denied at runtime';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ASSERT_OK: authenticated issue runtime denied.';
  END;
  PERFORM test.reset_auth();

  RAISE NOTICE 'EPIC1_ADMIN_BOOTSTRAP_GRANTS_SQL: ALL ASSERTIONS PASSED';
END;
$grants$;

DO $bootstrap$
DECLARE
  v_first_admin uuid := 'a1000000-0000-0000-0000-00000000a001';
  v_second_user uuid := 'a1000000-0000-0000-0000-00000000a002';
  v_no_admin_check boolean;
  v_token text;
  v_token_b text;
  v_claim_result boolean;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (v_first_admin, 'bootstrap-first-admin@test.local'),
    (v_second_user, 'bootstrap-second-user@test.local')
  ON CONFLICT (id) DO NOTHING;

  -- Precondition for this fixture: no admins exist yet in this test run.
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
    INTO v_no_admin_check;
  PERFORM test.assert_true('precondition: no admin exists yet', v_no_admin_check);

  -- Invalid TTL is rejected.
  SET ROLE service_role;
  BEGIN
    PERFORM public.issue_admin_bootstrap_token(0);
    RAISE EXCEPTION 'ASSERT_FAIL: zero ttl should be rejected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> '22023' THEN RAISE; END IF;
    RAISE NOTICE 'ASSERT_OK: zero ttl rejected (%).', SQLERRM;
  END;
  BEGIN
    PERFORM public.issue_admin_bootstrap_token(61);
    RAISE EXCEPTION 'ASSERT_FAIL: excessive ttl should be rejected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> '22023' THEN RAISE; END IF;
    RAISE NOTICE 'ASSERT_OK: excessive ttl rejected (%).', SQLERRM;
  END;

  -- service_role issues a valid token.
  v_token := public.issue_admin_bootstrap_token(15);
  PERFORM test.assert_true('issued token is non-empty', v_token IS NOT NULL AND length(v_token) > 0);
  RESET ROLE;

  -- Wrong token is rejected and does not grant admin.
  PERFORM test.set_auth(v_second_user, 'authenticated');
  BEGIN
    PERFORM public.claim_admin_bootstrap('not-the-real-token');
    RAISE EXCEPTION 'ASSERT_FAIL: wrong token should be rejected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> '22023' THEN RAISE; END IF;
    RAISE NOTICE 'ASSERT_OK: wrong token rejected (%).', SQLERRM;
  END;
  PERFORM test.assert_true(
    'wrong token did not grant admin',
    NOT public.has_role(v_second_user, 'admin')
  );
  PERFORM test.reset_auth();

  -- Unauthenticated (anon-style, no JWT sub) claim is rejected.
  PERFORM test.reset_auth();
  BEGIN
    PERFORM public.claim_admin_bootstrap(v_token);
    RAISE EXCEPTION 'ASSERT_FAIL: unauthenticated claim should be rejected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> '42501' THEN RAISE; END IF;
    RAISE NOTICE 'ASSERT_OK: unauthenticated claim rejected (%).', SQLERRM;
  END;

  -- Correct token, authenticated caller: claim succeeds and grants admin.
  PERFORM test.set_auth(v_first_admin, 'authenticated');
  v_claim_result := public.claim_admin_bootstrap(v_token);
  PERFORM test.assert_true('claim returns true', v_claim_result IS TRUE);
  PERFORM test.assert_true('claim grants admin role', public.has_role(v_first_admin, 'admin'));
  PERFORM test.reset_auth();

  -- Same token cannot be claimed twice (single-use).
  PERFORM test.set_auth(v_second_user, 'authenticated');
  BEGIN
    PERFORM public.claim_admin_bootstrap(v_token);
    RAISE EXCEPTION 'ASSERT_FAIL: reused token should be rejected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> '22023' AND SQLSTATE <> '42501' THEN RAISE; END IF;
    RAISE NOTICE 'ASSERT_OK: reused token rejected (%).', SQLERRM;
  END;
  PERFORM test.assert_true(
    'reused token did not grant a second admin',
    NOT public.has_role(v_second_user, 'admin')
  );
  PERFORM test.reset_auth();

  -- Once an admin exists, service_role cannot issue a new bootstrap token.
  SET ROLE service_role;
  BEGIN
    v_token_b := public.issue_admin_bootstrap_token(15);
    RAISE EXCEPTION 'ASSERT_FAIL: issuance should be blocked once an admin exists';
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> '42501' THEN RAISE; END IF;
    RAISE NOTICE 'ASSERT_OK: issuance blocked once admin exists (%).', SQLERRM;
  END;
  RESET ROLE;

  -- Legacy trigger function is untouched by this migration.
  PERFORM test.assert_true(
    'legacy grant_admin_on_signup trigger function still exists',
    EXISTS (
      SELECT 1 FROM pg_proc
      WHERE proname = 'grant_admin_on_signup' AND pronamespace = 'public'::regnamespace
    )
  );

  RAISE NOTICE 'EPIC1_ADMIN_BOOTSTRAP_SQL: ALL ASSERTIONS PASSED';
END;
$bootstrap$;
