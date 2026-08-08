-- Epic 8 — stripe_event_evidence / billing_recovery_runs security + immutability
-- Authority: docs/adr/0009-billing-recovery-guarantee.md

DO $epic8$
DECLARE
  v_event text := 'evt_epic8_recovery_test_1';
BEGIN
  PERFORM test.reset_auth();

  -- Tables exist with RLS and no client policies
  PERFORM test.assert_true(
    'stripe_event_evidence RLS enabled',
    EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'stripe_event_evidence' AND c.relrowsecurity
    )
  );

  PERFORM test.assert_true(
    'billing_recovery_runs RLS enabled',
    EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'billing_recovery_runs' AND c.relrowsecurity
    )
  );

  PERFORM test.assert_true(
    'stripe_event_evidence has zero policies',
    (
      SELECT count(*)::int FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'stripe_event_evidence'
    ) = 0
  );

  PERFORM test.assert_true(
    'billing_recovery_runs has zero policies',
    (
      SELECT count(*)::int FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'billing_recovery_runs'
    ) = 0
  );

  -- Client roles lack table privileges after Epic 8 revoke
  PERFORM test.assert_true(
    'anon lacks SELECT on stripe_event_evidence',
    NOT has_table_privilege('anon', 'public.stripe_event_evidence', 'SELECT')
  );
  PERFORM test.assert_true(
    'authenticated lacks SELECT on stripe_event_evidence',
    NOT has_table_privilege('authenticated', 'public.stripe_event_evidence', 'SELECT')
  );
  PERFORM test.assert_true(
    'anon lacks SELECT on billing_recovery_runs',
    NOT has_table_privilege('anon', 'public.billing_recovery_runs', 'SELECT')
  );
  PERFORM test.assert_true(
    'authenticated lacks SELECT on billing_recovery_runs',
    NOT has_table_privilege('authenticated', 'public.billing_recovery_runs', 'SELECT')
  );

  -- RPC execute grants
  PERFORM test.assert_true(
    'anon cannot execute record_stripe_event_evidence',
    NOT has_function_privilege(
      'anon',
      'public.record_stripe_event_evidence(text,text,bigint,boolean,text,jsonb)',
      'EXECUTE'
    )
  );
  PERFORM test.assert_true(
    'authenticated cannot execute record_stripe_event_evidence',
    NOT has_function_privilege(
      'authenticated',
      'public.record_stripe_event_evidence(text,text,bigint,boolean,text,jsonb)',
      'EXECUTE'
    )
  );
  PERFORM test.assert_true(
    'service_role can execute record_stripe_event_evidence',
    has_function_privilege(
      'service_role',
      'public.record_stripe_event_evidence(text,text,bigint,boolean,text,jsonb)',
      'EXECUTE'
    )
  );

  -- Claim + evidence + release does not DELETE ledger
  -- (SECURITY DEFINER RPCs; table owner in harness)
  PERFORM public.claim_stripe_webhook_event(v_event, 'customer.created', NULL, NULL, 'processing', '{}'::jsonb);
  PERFORM public.record_stripe_event_evidence(
    v_event,
    'customer.created',
    1700000000,
    false,
    '2025-08-27.basil',
    jsonb_build_object('id', v_event, 'type', 'customer.created', 'data', jsonb_build_object())
  );
  PERFORM public.release_stripe_webhook_event(v_event);

  PERFORM test.assert_true(
    'release marks failed_retryable without deleting ledger',
    EXISTS (
      SELECT 1 FROM public.stripe_webhook_events
      WHERE event_id = v_event AND action_taken = 'failed_retryable'
    )
  );
  PERFORM test.assert_true(
    'evidence survives release',
    EXISTS (SELECT 1 FROM public.stripe_event_evidence WHERE event_id = v_event)
  );

  -- Reclaim after failed_retryable
  PERFORM test.assert_true(
    'claim reclaims failed_retryable',
    public.claim_stripe_webhook_event(v_event, 'customer.created', NULL, NULL, 'processing', '{}'::jsonb)
  );

  -- Immutability: cannot rewrite payload
  BEGIN
    UPDATE public.stripe_event_evidence
    SET event_payload = '{"id":"mutated"}'::jsonb
    WHERE event_id = v_event;
    PERFORM test.assert_true('payload mutation should have failed', false);
  EXCEPTION WHEN insufficient_privilege OR check_violation OR others THEN
    PERFORM test.assert_true(
      'payload mutation blocked',
      SQLERRM ILIKE '%immutable%' OR SQLERRM ILIKE '%append-only%' OR SQLSTATE = '42501'
    );
  END;

  -- Layer B one-way fill
  PERFORM public.set_stripe_event_applied_subscription_source(
    v_event,
    jsonb_build_object('id', 'sub_x', 'status', 'active')
  );
  PERFORM test.assert_true(
    'Layer B set',
    EXISTS (
      SELECT 1 FROM public.stripe_event_evidence
      WHERE event_id = v_event AND applied_subscription_source->>'id' = 'sub_x'
    )
  );

  BEGIN
    UPDATE public.stripe_event_evidence
    SET applied_subscription_source = jsonb_build_object('id', 'sub_y')
    WHERE event_id = v_event;
    PERFORM test.assert_true('Layer B rewrite should have failed', false);
  EXCEPTION WHEN insufficient_privilege OR others THEN
    PERFORM test.assert_true(
      'Layer B rewrite blocked',
      SQLERRM ILIKE '%cannot be rewritten%' OR SQLSTATE = '42501'
    );
  END;

  -- Evidence DELETE is forbidden (append-only); disposable DB retains row.
  PERFORM test.reset_auth();

  RAISE NOTICE 'Epic 8 billing recovery assertions passed';
END
$epic8$;
