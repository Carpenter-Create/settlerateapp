-- =============================================================================
-- Epic 6 PR 2F — RPC / function EXECUTE least-privilege (repository target)
-- =============================================================================
-- Authority: FD-RPC-EXECUTE-PUBLIC (ACCEPTED) in
--   docs/database/GRANT_SECURITY_DECISIONS_PR2C.md
--
-- Scope (high-confidence only):
--   B1 Admin RPCs — revoke PUBLIC/anon; preserve authenticated
--   B2 Webhook helper — revoke PUBLIC/anon/authenticated; preserve service_role
--   B3 Plan helpers — revoke PUBLIC/anon/authenticated (DEFINER-internal)
--   B4 Trigger-only helpers — revoke PUBLIC/anon/authenticated; preserve service_role
--
-- Deferred (do NOT change here):
--   advisor RPCs (ADR 0011 / PR 2I)
--   share helpers (dual-model / PR 2H)
--   has_role / is_admin authenticated EXECUTE (RLS dependency)
--   protect_admin_subscriptions (done in PR 2D)
--
-- No function body / RLS / table / ownership / data changes.
-- Production apply separately gated via EPIC6_PRODUCTION_APPLY_PLAN.md.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- B1) Admin RPCs — authenticated-only client EXECUTE
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.promote_to_admin(p_email text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.promote_to_admin(p_email text) FROM anon;
GRANT EXECUTE ON FUNCTION public.promote_to_admin(p_email text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.list_admins() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_admins() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_admins() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.list_recent_admin_promotions(p_limit integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_recent_admin_promotions(p_limit integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.list_recent_admin_promotions(p_limit integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- B2) Webhook admin-ignore helper — service_role only
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.log_webhook_admin_ignored(p_user_id uuid, p_email text, p_event_type text)
  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_webhook_admin_ignored(p_user_id uuid, p_email text, p_event_type text)
  FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_webhook_admin_ignored(p_user_id uuid, p_email text, p_event_type text)
  FROM authenticated;
GRANT EXECUTE ON FUNCTION public.log_webhook_admin_ignored(p_user_id uuid, p_email text, p_event_type text)
  TO service_role;

-- ---------------------------------------------------------------------------
-- B3) Plan helpers — not client RPCs (called inside SECURITY DEFINER paths)
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.is_professional_price(p_price_id text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_professional_price(p_price_id text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_professional_price(p_price_id text) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.resolve_plan_code(p_price_id text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_plan_code(p_price_id text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_plan_code(p_price_id text) FROM authenticated;

-- ---------------------------------------------------------------------------
-- B4) Trigger-only helpers — client EXECUTE unnecessary
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.protect_admin_billing() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_admin_billing() TO service_role;

REVOKE EXECUTE ON FUNCTION public.protect_admin_role_deletion() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_admin_role_deletion() TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE EXECUTE ON FUNCTION public.normalize_admin_billing_insert() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_admin_billing_insert() TO service_role;

REVOKE EXECUTE ON FUNCTION public.set_pdf_exports_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_pdf_exports_updated_at() TO service_role;

REVOKE EXECUTE ON FUNCTION public.tg_set_billing_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_set_billing_updated_at() TO service_role;

REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_set_updated_at() TO service_role;

REVOKE EXECUTE ON FUNCTION public.tg_set_scenarios_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_set_scenarios_updated_at() TO service_role;

REVOKE EXECUTE ON FUNCTION public.tg_set_comparison_version_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_set_comparison_version_number() TO service_role;
