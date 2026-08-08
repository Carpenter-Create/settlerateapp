-- Epic 6 PR 2H — legacy share RPC client EXECUTE revoked

DO $pr2h$
BEGIN
  IF has_function_privilege('anon', 'public.generate_share_token()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.generate_share_token()', 'EXECUTE')
     OR has_function_privilege('public', 'public.generate_share_token()', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR2H fail: client/PUBLIC EXECUTE on generate_share_token';
  END IF;

  IF has_function_privilege('anon', 'public.validate_comparison_share(text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.validate_comparison_share(text)', 'EXECUTE')
     OR has_function_privilege('public', 'public.validate_comparison_share(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR2H fail: client/PUBLIC EXECUTE on validate_comparison_share';
  END IF;

  IF has_function_privilege('anon', 'public.touch_comparison_share(text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.touch_comparison_share(text)', 'EXECUTE')
     OR has_function_privilege('public', 'public.touch_comparison_share(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR2H fail: client/PUBLIC EXECUTE on touch_comparison_share';
  END IF;

  -- Tables remain (disposition = retain)
  IF to_regclass('public.saved_comparisons') IS NULL
     OR to_regclass('public.comparison_shares') IS NULL THEN
    RAISE EXCEPTION 'PR2H fail: unexpected drop of legacy comparison tables';
  END IF;
END
$pr2h$;
