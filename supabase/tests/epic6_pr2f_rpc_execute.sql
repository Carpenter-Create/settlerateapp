-- Epic 6 PR 2F — RPC EXECUTE privilege contract (migration-only / post re-apply)

DO $pr2f$
DECLARE
  v_fn text;
  v_trigger_fns text[] := ARRAY[
    'public.protect_admin_billing()',
    'public.protect_admin_role_deletion()',
    'public.handle_new_user()',
    'public.normalize_admin_billing_insert()',
    'public.set_pdf_exports_updated_at()',
    'public.tg_set_billing_updated_at()',
    'public.tg_set_updated_at()',
    'public.tg_set_scenarios_updated_at()',
    'public.tg_set_comparison_version_number()'
  ];
BEGIN
  -- B1 admin RPCs
  IF has_function_privilege('anon', 'public.promote_to_admin(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR2F fail: anon EXECUTE on promote_to_admin';
  END IF;
  IF has_function_privilege('public', 'public.promote_to_admin(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR2F fail: PUBLIC EXECUTE on promote_to_admin';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.promote_to_admin(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR2F fail: authenticated missing EXECUTE on promote_to_admin';
  END IF;

  IF has_function_privilege('anon', 'public.list_admins()', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR2F fail: anon EXECUTE on list_admins';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.list_admins()', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR2F fail: authenticated missing EXECUTE on list_admins';
  END IF;

  IF has_function_privilege('anon', 'public.list_recent_admin_promotions(integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR2F fail: anon EXECUTE on list_recent_admin_promotions';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.list_recent_admin_promotions(integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR2F fail: authenticated missing EXECUTE on list_recent_admin_promotions';
  END IF;

  -- B2 webhook helper
  IF has_function_privilege('anon', 'public.log_webhook_admin_ignored(uuid, text, text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.log_webhook_admin_ignored(uuid, text, text)', 'EXECUTE')
     OR has_function_privilege('public', 'public.log_webhook_admin_ignored(uuid, text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR2F fail: client/PUBLIC EXECUTE on log_webhook_admin_ignored';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.log_webhook_admin_ignored(uuid, text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR2F fail: service_role missing EXECUTE on log_webhook_admin_ignored';
  END IF;

  -- B3 plan helpers
  IF has_function_privilege('anon', 'public.is_professional_price(text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.is_professional_price(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR2F fail: client EXECUTE on is_professional_price';
  END IF;
  IF has_function_privilege('anon', 'public.resolve_plan_code(text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.resolve_plan_code(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR2F fail: client EXECUTE on resolve_plan_code';
  END IF;

  -- B4 trigger-only
  FOREACH v_fn IN ARRAY v_trigger_fns LOOP
    IF has_function_privilege('anon', v_fn, 'EXECUTE')
       OR has_function_privilege('authenticated', v_fn, 'EXECUTE')
       OR has_function_privilege('public', v_fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'PR2F fail: client/PUBLIC EXECUTE on %', v_fn;
    END IF;
    IF NOT has_function_privilege('service_role', v_fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'PR2F fail: service_role missing EXECUTE on %', v_fn;
    END IF;
  END LOOP;

  -- Deferred surfaces must still allow authenticated has_role / is_admin
  IF NOT has_function_privilege('authenticated', 'public.has_role(uuid, public.app_role)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR2F fail: unexpectedly revoked authenticated EXECUTE on has_role';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.is_admin(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR2F fail: unexpectedly revoked authenticated EXECUTE on is_admin';
  END IF;
END
$pr2f$;
