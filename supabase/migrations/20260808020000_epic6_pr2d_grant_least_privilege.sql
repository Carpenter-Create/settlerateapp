-- =============================================================================
-- Epic 6 PR 2D — first least-privilege grant remediation (repository target)
-- =============================================================================
-- Authority: docs/database/GRANT_SECURITY_DECISIONS_PR2C.md (founder FD-* ACCEPTED)
--   FD-SUB-CLIENT-WRITES
--   FD-DEFAULT-BROAD-GRANTS (structural TRUNCATE/REFERENCES/TRIGGER only here)
--   FD-LEGACY-DUAL-MODEL-GRANTS (structural only; DML/SELECT deferred)
--   FD-RPC-EXECUTE-PUBLIC deferred except protect_admin_subscriptions()
--
-- Scope:
--   A) public.subscriptions — revoke ALL listed client table privileges from
--      anon + authenticated (service_role/postgres preserved)
--   B) public app tables — revoke TRUNCATE/REFERENCES/TRIGGER from anon +
--      authenticated (DML/SELECT unchanged except subscriptions above)
--   C) public.protect_admin_subscriptions() — revoke EXECUTE from
--      anon/authenticated/PUBLIC; preserve postgres + service_role
--
-- Explicitly NOT in this migration:
--   - broader RPC EXECUTE remediation
--   - RLS / policy / function body / ownership / DDL / DML data changes
--   - production apply (separate founder gate)
--
-- REVOKE of an absent privilege is a no-op in PostgreSQL (idempotent).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A) public.subscriptions — zero client table privileges
-- ---------------------------------------------------------------------------
REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.subscriptions
  FROM anon, authenticated;

-- Preserve Edge sync path (do not revoke service_role).
-- postgres owner/admin privileges are unchanged.

-- ---------------------------------------------------------------------------
-- B) Structural privilege reductions (anon / authenticated)
--    TRUNCATE / REFERENCES / TRIGGER only — DML/SELECT untouched here.
-- ---------------------------------------------------------------------------
REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON TABLE
    public.profiles,
    public.scenarios,
    public.billing,
    public.subscriptions,
    public.user_roles,
    public.user_comparisons,
    public.pdf_exports,
    public.admin_audit_log,
    public.admin_bootstrap_tokens,
    public.entitlement_bypass_log,
    public.stripe_webhook_events,
    public.saved_comparisons,
    public.comparison_items,
    public.comparison_versions,
    public.comparison_shares,
    public.export_files,
    public.export_shares,
    public.advisor_access_requests
  FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- C) protect_admin_subscriptions() — trigger-only SECURITY DEFINER
-- ---------------------------------------------------------------------------
-- Clear default PUBLIC EXECUTE and any client EXECUTE (trigger-only function).
REVOKE EXECUTE ON FUNCTION public.protect_admin_subscriptions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_admin_subscriptions() FROM anon;
REVOKE EXECUTE ON FUNCTION public.protect_admin_subscriptions() FROM authenticated;

-- Re-assert intended EXECUTE (matches 20260112204012_* intent).
GRANT EXECUTE ON FUNCTION public.protect_admin_subscriptions() TO postgres;
GRANT EXECUTE ON FUNCTION public.protect_admin_subscriptions() TO service_role;
