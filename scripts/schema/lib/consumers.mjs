/**
 * Static App/Edge/RPC consumer map, hardcoded from the Epic 6 PR 0
 * repository inventory (`docs/database/SCHEMA_RECONCILIATION_INVENTORY.md`).
 * This is repository evidence only (surface D in ADR 0006 §2), not derived
 * from a live code scan — keep it in sync by hand when PR 0's inventory doc
 * changes. Used by compareDrift.mjs to annotate drift records with
 * "who actually reads/writes this" and to help classify highPriority.
 */

// object key -> { schema, name, kind } consumer entries.
// kind: "table" | "function" | "enum" | "view"
export const CONSUMER_MAP = {
  "table:public.scenarios": {
    consumers: [
      "App scenario store",
      "Edge check-subscription",
      "Edge generate-pdf",
    ],
    notes: "Canonical scenarios table.",
  },
  "table:public.user_comparisons": {
    consumers: ["App useComparisons", "Edge generate-pdf"],
    notes: "Active comparison model.",
  },
  "table:public.profiles": {
    consumers: ["App useProfile"],
    notes:
      "High-priority types<->migrations mismatch: types.ts lists plan_key/plan_status/stripe_customer_id columns absent from the profiles CREATE migration.",
  },
  "table:public.billing": {
    consumers: [
      "Edge checkout",
      "Edge portal",
      "Edge stripe-webhook",
      "Edge check-subscription",
    ],
    notes: "Entitlement source-of-truth store per docs.",
  },
  "table:public.user_roles": {
    consumers: ["App admin/authz", "Edge role checks"],
    notes: "Admin gating via has_role().",
  },
  "table:public.pdf_exports": {
    consumers: ["App useExportShare", "Edge export-share"],
    notes: "Active PDF export model.",
  },
  "table:public.admin_audit_log": {
    consumers: ["Admin RPCs"],
    notes: null,
  },
  "table:public.admin_bootstrap_tokens": {
    consumers: ["Bootstrap RPCs", "Epic 1 SQL tests"],
    notes: "Absent from generated types.ts. Epic 1 first-admin bootstrap.",
  },
  "table:public.stripe_webhook_events": {
    consumers: ["Edge stripe-webhook"],
    notes: "Absent from generated types.ts.",
  },
  "table:public.entitlement_bypass_log": {
    consumers: ["log_admin_entitlement_bypass RPC"],
    notes: "Absent from generated types.ts.",
  },
  "table:public.contact_messages": {
    consumers: [],
    notes: "No App `.from()` usage found in this repo; possibly marketing-site owned.",
  },
  "table:public.subscriptions": {
    consumers: [
      "Edge stripe-webhook (best-effort)",
      "protect_admin_subscriptions trigger",
      "supabase/tests/00_auth_stub.sql (TEST-HARNESS reconstruction only)",
    ],
    notes:
      "No migration CREATE TABLE anywhere in supabase/migrations/. Only defined by the harness stub. Any harness-mode capture that shows this table exists BECAUSE OF THE STUB, not because of migration history — never conflate the two reconstructions when reading drift records for this table.",
  },
  "table:public.saved_comparisons": {
    consumers: [],
    notes: "Dual comparison model (legacy); still entitlement-triggered.",
  },
  "table:public.comparison_items": {
    consumers: [],
    notes: "Dual comparison model (legacy).",
  },
  "table:public.comparison_versions": {
    consumers: [],
    notes: "Dual comparison model (legacy); backs v_comparison_latest_version view.",
  },
  "table:public.comparison_shares": {
    consumers: ["Share RPCs (no App/Edge rpc callers found)"],
    notes: "Dual comparison model (legacy).",
  },
  "table:public.export_files": {
    consumers: [],
    notes: "Dual export model (legacy); active path uses pdf_exports.",
  },
  "table:public.export_shares": {
    consumers: [],
    notes: "Dual export model (legacy); active path uses pdf_exports.",
  },
  "table:public.advisor_access_requests": {
    consumers: ["Deprecated advisor RPCs", "Edge admin-assign-advisor (HTTP 410)"],
    notes: "Pending ADR 0011 (advisor model decision, not yet written).",
  },
  "view:public.v_comparison_latest_version": {
    consumers: [],
    notes:
      "security_invoker view over legacy comparison versions; no App/Edge consumers found.",
  },
  "function:public.evaluate_entitlement": {
    consumers: ["SQL/TS parity harness (scripts/test-entitlement-sql.mjs)"],
    notes: "Entitlement core.",
  },
  "function:public.feature_allowed": {
    consumers: ["Triggers", "SQL tests"],
    notes: "Free scenario limit = 2.",
  },
  "function:public.assert_feature_allowed": {
    consumers: ["Edge generate-pdf", "Edge export-share"],
    notes: null,
  },
  "function:public.get_effective_tier": {
    consumers: ["App entitlementResolver"],
    notes: null,
  },
  "function:public.claim_stripe_webhook_event": {
    consumers: ["Edge stripe-webhook"],
    notes: "service_role only.",
  },
  "function:public.release_stripe_webhook_event": {
    consumers: ["Edge stripe-webhook"],
    notes: "service_role only.",
  },
  "function:public.log_admin_entitlement_bypass": {
    consumers: ["Edge stripe-webhook", "Edge portal"],
    notes: "service_role only.",
  },
  "function:public.duplicate_scenario": {
    consumers: ["App scenario store"],
    notes: null,
  },
  "function:public.assert_export_source_owned_by_user": {
    consumers: ["public.pdf_exports RLS"],
    notes: "Includes user_comparisons after Phase 6 stage 2.",
  },
  "function:public.has_role": {
    consumers: ["RLS policies", "Admin RPCs"],
    notes: null,
  },
  "function:public.is_admin": {
    consumers: ["RLS policies", "Admin RPCs"],
    notes: null,
  },
  "function:public.is_advisor": {
    consumers: ["RLS policies (deprecated meaning)"],
    notes: "Advisor product model removed; retained for compatibility.",
  },
  "function:public.promote_to_admin": {
    consumers: ["Admin UI"],
    notes: null,
  },
  "function:public.list_admins": {
    consumers: ["Admin UI"],
    notes: null,
  },
  "function:public.list_recent_admin_promotions": {
    consumers: ["Admin UI"],
    notes: "Return types fixed in Epic 1.",
  },
  "function:public.issue_admin_bootstrap_token": {
    consumers: ["Ops / Epic 1 tests"],
    notes: "Absent from generated types.ts.",
  },
  "function:public.claim_admin_bootstrap": {
    consumers: ["Ops / Epic 1 tests"],
    notes: "Absent from generated types.ts.",
  },
  "function:public.validate_comparison_share": {
    consumers: [],
    notes: "No App/Edge callers found; legacy share path.",
  },
  "function:public.touch_comparison_share": {
    consumers: [],
    notes: "No App/Edge callers found; legacy share path.",
  },
  "function:public.generate_share_token": {
    consumers: [],
    notes: "No App/Edge callers found; legacy share path.",
  },
  "function:public.approve_advisor_request": {
    consumers: [],
    notes: "Advisor leftover; fail-closed / unused.",
  },
  "function:public.list_pending_advisor_requests": {
    consumers: [],
    notes: "Advisor leftover; fail-closed / unused.",
  },
  "function:public.is_professional_price": {
    consumers: ["SQL entitlement path"],
    notes: "Absent from generated types.ts.",
  },
  "function:public.resolve_plan_code": {
    consumers: ["SQL entitlement path"],
    notes: "Absent from generated types.ts.",
  },
  "enum:public.app_role": {
    consumers: ["RLS policies", "has_role()"],
    notes: "`advisor` value is a leftover after product-model removal.",
  },
};

/**
 * Names (unqualified) that mark a drift record as high-priority regardless
 * of the CONSUMER_MAP note above, per Epic 6 PR 0's "high-signal
 * reconciliation candidates" list.
 */
export const HIGH_PRIORITY_UNQUALIFIED_NAMES = new Set([
  "subscriptions",
  "profiles",
  "saved_comparisons",
  "comparison_items",
  "comparison_versions",
  "comparison_shares",
  "export_files",
  "export_shares",
  "pdf_exports",
  "user_comparisons",
  "advisor_access_requests",
  "admin_bootstrap_tokens",
  "issue_admin_bootstrap_token",
  "claim_admin_bootstrap",
  "is_advisor",
  "approve_advisor_request",
  "list_pending_advisor_requests",
  "app_role",
]);

export function getConsumerEntry(kind, schema, name) {
  return CONSUMER_MAP[`${kind}:${schema}.${name}`] ?? null;
}

export function isHighPriorityObject(name) {
  return HIGH_PRIORITY_UNQUALIFIED_NAMES.has(name);
}
