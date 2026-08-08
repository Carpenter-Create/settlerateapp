-- =============================================================================
-- Epic 6 PR 2H — revoke client EXECUTE on unused legacy comparison-share RPCs
-- =============================================================================
-- Authority: ADR 0007 dual-model disposition (legacy_temporarily_retained tables)
-- + FD-RPC-EXECUTE-PUBLIC (high-confidence: no App/Edge .rpc consumers).
--
-- Does NOT drop tables/views/triggers. Advisor surfaces unchanged (ADR 0011).
-- Production apply gated via EPIC6_PRODUCTION_APPLY_PLAN.md.
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.generate_share_token() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_share_token() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_share_token() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.validate_comparison_share(p_token text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_comparison_share(p_token text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_comparison_share(p_token text) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.touch_comparison_share(p_token text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_comparison_share(p_token text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.touch_comparison_share(p_token text) FROM authenticated;
