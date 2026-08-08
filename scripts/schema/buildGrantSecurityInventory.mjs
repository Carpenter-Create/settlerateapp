#!/usr/bin/env node
/**
 * Epic 6 PR 2C — grant/security classification inventory builder.
 * Evidence / classification only. Never emits or executes GRANT/REVOKE.
 *
 * Inputs:
 *   - docs/database/production-schema/production-schema-catalog.json
 *   - docs/database/reconstruction/migration_only-schema.json
 *   - docs/database/schema-drift-report.json (migration_only grant_mismatch)
 *
 * Outputs:
 *   - docs/database/grant-security-inventory-pr2c.json
 *   - docs/database/GRANT_SECURITY_DECISIONS_PR2C.md (via sibling render)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { grantIdentityKey } from "./lib/compareDrift.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");

const TAXONOMY = {
  REQUIRED_RUNTIME: "required_runtime",
  REQUIRED_OPERATIONAL: "required_operational",
  REQUIRED_SERVICE_ROLE: "required_service_role",
  EXPECTED_PLATFORM_DEFAULT: "expected_platform_default",
  REPOSITORY_PROVENANCE_GAP: "repository_provenance_gap",
  EXCESSIVE_BUT_RLS_CONSTRAINED: "excessive_but_rls_constrained",
  EXCESSIVE_HIGH_RISK: "excessive_high_risk",
  FUNCTION_EXECUTE_REVIEW: "function_execute_review",
  UNKNOWN_FOUNDER_DECISION: "unknown_founder_decision",
};

const ACTION = {
  KEEP: "KEEP",
  ADD_TO_REPO_PROVENANCE: "ADD_TO_REPO_PROVENANCE",
  REVOKE_CANDIDATE: "REVOKE_CANDIDATE",
  PLATFORM_EXPECTED: "PLATFORM_EXPECTED",
  NEEDS_FOUNDER_DECISION: "NEEDS_FOUNDER_DECISION",
  NEEDS_MORE_EVIDENCE: "NEEDS_MORE_EVIDENCE",
};

const SEVERITY = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  INFORMATIONAL: "INFORMATIONAL",
};

const DANGER_PRIVS = new Set(["INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]);
const CLIENT_ROLES = new Set(["anon", "authenticated", "PUBLIC"]);
const EXTENSION_FN_PREFIXES = [
  "armor", "crypt", "dearmor", "decrypt", "decrypt_iv", "digest", "encrypt", "encrypt_iv",
  "gen_random_bytes", "gen_random_uuid", "gen_salt", "hmac", "pgp_", "uuid_",
];

/**
 * Known consumers from repository scan (Epic 6 PR 2C).
 * edgeService = service_role client; edgeUserJwt = anon key + user Authorization.
 */
const TABLE_CONSUMERS = {
  scenarios: {
    app: ["src/lib/scenarioStore.ts", "src/contexts/AuthContext.tsx"],
    edgeService: ["supabase/functions/check-subscription"],
    edgeUserJwt: ["supabase/functions/generate-pdf"],
    ops: [],
  },
  profiles: { app: ["src/hooks/useProfile.ts"], edgeService: [], edgeUserJwt: [], ops: [] },
  user_roles: {
    app: ["src/lib/authz.ts", "src/lib/entitlementResolver.ts", "src/hooks/useAdmin.ts"],
    edgeService: ["supabase/functions/check-subscription", "supabase/functions/customer-portal", "supabase/functions/stripe-webhook"],
    edgeUserJwt: [],
    ops: [],
  },
  user_comparisons: {
    app: ["src/hooks/useComparisons.ts"],
    edgeService: [],
    edgeUserJwt: ["supabase/functions/generate-pdf"],
    ops: [],
  },
  pdf_exports: {
    app: ["src/hooks/useExportShare.ts"],
    edgeService: ["supabase/functions/export-share (public-token path)"],
    edgeUserJwt: ["supabase/functions/export-share (create/manage)"],
    ops: [],
  },
  billing: {
    app: [],
    edgeService: ["supabase/functions/create-checkout", "supabase/functions/customer-portal", "supabase/functions/check-subscription", "supabase/functions/stripe-webhook"],
    edgeUserJwt: [],
    ops: [],
  },
  subscriptions: {
    app: [],
    edgeService: ["supabase/functions/stripe-webhook (best-effort legacy sync)"],
    edgeUserJwt: [],
    ops: [],
  },
  stripe_webhook_events: {
    app: [],
    edgeService: ["supabase/functions/stripe-webhook"],
    edgeUserJwt: [],
    ops: [],
  },
  admin_audit_log: { app: [], edgeService: [], edgeUserJwt: [], ops: ["admin RPCs list_recent_admin_promotions / promote_to_admin"] },
  admin_bootstrap_tokens: { app: [], edgeService: [], edgeUserJwt: [], ops: ["issue_admin_bootstrap_token / claim_admin_bootstrap", "Epic 1 SQL tests"] },
  entitlement_bypass_log: { app: [], edgeService: [], edgeUserJwt: [], ops: ["log_admin_entitlement_bypass RPC (Edge service)"] },
  contact_messages: { app: [], edgeService: [], edgeUserJwt: [], ops: ["possible marketing-site / unused in this repo"] },
  saved_comparisons: { app: [], edgeService: [], edgeUserJwt: [], ops: [] },
  comparison_items: { app: [], edgeService: [], edgeUserJwt: [], ops: [] },
  comparison_versions: { app: [], edgeService: [], edgeUserJwt: [], ops: [] },
  comparison_shares: { app: [], edgeService: [], edgeUserJwt: [], ops: [] },
  export_files: { app: [], edgeService: [], edgeUserJwt: [], ops: [] },
  export_shares: { app: [], edgeService: [], edgeUserJwt: [], ops: [] },
  advisor_access_requests: { app: [], edgeService: [], edgeUserJwt: [], ops: [] },
  v_comparison_latest_version: { app: [], edgeService: [], edgeUserJwt: [], ops: [] },
};

const FUNCTION_CONSUMERS = {
  "get_effective_tier(p_user_id uuid)": { app: ["src/lib/entitlementResolver.ts"], edge: [], ops: [], triggerOnly: false, intendedRoles: ["authenticated", "service_role"] },
  "get_effective_tier(uuid)": { app: ["src/lib/entitlementResolver.ts"], edge: [], ops: [], triggerOnly: false, intendedRoles: ["authenticated", "service_role"] },
  "duplicate_scenario(uuid, text)": { app: ["src/lib/scenarioStore.ts"], edge: [], ops: [], triggerOnly: false, intendedRoles: ["authenticated"] },
  "list_admins()": { app: ["src/pages/admin/AdminAccess.tsx"], edge: [], ops: [], triggerOnly: false, intendedRoles: ["authenticated"] },
  "list_recent_admin_promotions(p_limit integer)": { app: ["src/pages/admin/AdminAccess.tsx"], edge: [], ops: [], triggerOnly: false, intendedRoles: ["authenticated"] },
  "list_recent_admin_promotions(integer)": { app: ["src/pages/admin/AdminAccess.tsx"], edge: [], ops: [], triggerOnly: false, intendedRoles: ["authenticated"] },
  "promote_to_admin(text)": { app: ["src/pages/admin/AdminAccess.tsx"], edge: [], ops: [], triggerOnly: false, intendedRoles: ["authenticated"] },
  "assert_feature_allowed(text)": { app: [], edge: ["supabase/functions/generate-pdf", "supabase/functions/export-share"], ops: [], triggerOnly: false, intendedRoles: ["authenticated", "service_role"] },
  "claim_stripe_webhook_event(text, text, text, uuid, text, jsonb)": { app: [], edge: ["supabase/functions/stripe-webhook"], ops: [], triggerOnly: false, intendedRoles: ["service_role"] },
  "release_stripe_webhook_event(text)": { app: [], edge: ["supabase/functions/stripe-webhook"], ops: [], triggerOnly: false, intendedRoles: ["service_role"] },
  "log_admin_entitlement_bypass(uuid, text, text, jsonb)": { app: [], edge: ["supabase/functions/stripe-webhook", "supabase/functions/customer-portal"], ops: [], triggerOnly: false, intendedRoles: ["service_role"] },
  "issue_admin_bootstrap_token(integer)": { app: [], edge: [], ops: ["ops / Epic 1 SQL"], triggerOnly: false, intendedRoles: ["service_role"] },
  "claim_admin_bootstrap(text)": { app: [], edge: [], ops: ["ops / Epic 1 SQL / authenticated bootstrap"], triggerOnly: false, intendedRoles: ["authenticated", "service_role"] },
  "protect_admin_subscriptions()": { app: [], edge: [], ops: [], triggerOnly: true, intendedRoles: ["postgres", "service_role"] },
  "evaluate_entitlement(uuid)": { app: [], edge: [], ops: ["called by other entitlement RPCs"], triggerOnly: false, intendedRoles: ["authenticated", "service_role"] },
  "feature_allowed(uuid, text, integer)": { app: [], edge: [], ops: [], triggerOnly: false, intendedRoles: ["authenticated", "service_role"] },
};

const CRITICAL_TABLES = [
  "subscriptions", "profiles", "scenarios", "billing",
  "admin_bootstrap_tokens", "admin_audit_log", "entitlement_bypass_log",
  "stripe_webhook_events", "user_roles",
  "user_comparisons", "saved_comparisons", "comparison_items", "comparison_versions", "comparison_shares",
  "pdf_exports", "export_files", "export_shares",
  "advisor_access_requests", "contact_messages",
];

const SENSITIVE_TABLES = new Set([
  "subscriptions", "billing", "admin_bootstrap_tokens", "admin_audit_log",
  "entitlement_bypass_log", "stripe_webhook_events", "user_roles", "profiles",
]);

function loadJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), "utf8"));
}

function stableId(parts) {
  return "GS-" + createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 12);
}

function baseName(objectName) {
  if (!objectName) return "";
  const paren = objectName.indexOf("(");
  return paren === -1 ? objectName : objectName.slice(0, paren);
}

function isExtensionFunction(name) {
  const n = baseName(name);
  return EXTENSION_FN_PREFIXES.some((p) => n === p || n.startsWith(p));
}

function policyMatchesRole(policyRoles, grantee) {
  const roles = String(policyRoles || "").replace(/[{}]/g, "").split(",").map((s) => s.trim()).filter(Boolean);
  if (roles.length === 0) return false;
  if (roles.includes("public") || roles.includes("PUBLIC")) return true;
  return roles.includes(grantee);
}

function policiesFor(prod, schema, table) {
  return (prod.policies || []).filter((p) => p.schema === schema && p.table === table);
}

function tableMeta(prod, schema, name) {
  return (prod.tables || []).find((t) => (t.schema || "public") === schema && t.name === name)
    || (prod.views || []).find((v) => (v.schema || "public") === schema && v.name === name)
    || null;
}

function functionMeta(prod, schema, objectName) {
  const name = baseName(objectName);
  const args = objectName.includes("(") ? objectName.slice(objectName.indexOf("(") + 1, objectName.lastIndexOf(")")) : "";
  const candidates = (prod.functions || []).filter((f) => f.schema === schema && f.name === name);
  if (candidates.length === 1) return candidates[0];
  return candidates.find((f) => (f.identityArgs || "") === args) || candidates[0] || null;
}

function consumersForTable(name) {
  const c = TABLE_CONSUMERS[name] || { app: [], edgeService: [], edgeUserJwt: [], ops: [] };
  return {
    ...c,
    edge: [...(c.edgeService || []), ...(c.edgeUserJwt || [])],
  };
}

function consumersForFunction(objectName) {
  if (FUNCTION_CONSUMERS[objectName]) return FUNCTION_CONSUMERS[objectName];
  const bare = baseName(objectName);
  const hit = Object.entries(FUNCTION_CONSUMERS).find(([k]) => baseName(k) === bare);
  return hit ? hit[1] : { app: [], edge: [], ops: [], triggerOnly: false, intendedRoles: [] };
}

function postgrestExposesPrivilege(privilege) {
  return privilege === "SELECT" || privilege === "INSERT" || privilege === "UPDATE" || privilege === "DELETE";
}

function hasPolicyForPrivilege(policies, grantee, privilege) {
  const cmd = privilege === "SELECT" ? "SELECT"
    : privilege === "INSERT" ? "INSERT"
      : privilege === "UPDATE" ? "UPDATE"
        : privilege === "DELETE" ? "DELETE"
          : null;
  if (!cmd) return false;
  return policies.some((p) => p.cmd === cmd && policyMatchesRole(p.roles, grantee));
}

function classifyTableGrant({ schema, objectName, grantee, privilege, issue, rlsEnabled, policies, consumers }) {
  const notes = [];
  const isClient = CLIENT_ROLES.has(grantee);
  const isService = grantee === "service_role";
  const isPostgres = grantee === "postgres";
  const hasApp = (consumers.app || []).length > 0;
  const hasEdgeService = (consumers.edgeService || []).length > 0;
  const hasEdgeUserJwt = (consumers.edgeUserJwt || []).length > 0;
  const policyOk = hasPolicyForPrivilege(policies, grantee === "PUBLIC" ? "authenticated" : grantee, privilege)
    || hasPolicyForPrivilege(policies, grantee, privilege);
  const apiReachable = isClient && postgrestExposesPrivilege(privilege);
  // Authenticated table grants are required when browser or user-JWT Edge paths hit PostgREST.
  const requiredByRuntime = apiReachable && (
    (grantee === "authenticated" && policyOk && (hasApp || hasEdgeUserJwt))
    || (grantee === "anon" && policyOk && objectName === "contact_messages")
  );

  if (schema === "storage") {
    return {
      category: TAXONOMY.EXPECTED_PLATFORM_DEFAULT,
      action: ACTION.PLATFORM_EXPECTED,
      severity: SEVERITY.INFORMATIONAL,
      proposedLeastPrivilegeTarget: "retain platform storage defaults unless SettleRate bucket policies require otherwise",
      notes: ["storage/platform grant; classify separately from public app surface"],
      privilegeRequiredByKnownRuntime: false,
      anonAuthenticatedApiReachable: false,
    };
  }

  if (isPostgres) {
    return {
      category: TAXONOMY.EXPECTED_PLATFORM_DEFAULT,
      action: ACTION.PLATFORM_EXPECTED,
      severity: SEVERITY.INFORMATIONAL,
      proposedLeastPrivilegeTarget: "KEEP owner/admin postgres privileges",
      notes: ["postgres owner/admin semantics"],
      privilegeRequiredByKnownRuntime: false,
      anonAuthenticatedApiReachable: false,
    };
  }

  if (isService) {
    const edgeNeeds = hasEdgeService || ["billing", "subscriptions", "stripe_webhook_events", "user_roles", "pdf_exports", "scenarios"].includes(objectName);
    if (privilege === "TRUNCATE" || privilege === "REFERENCES" || privilege === "TRIGGER") {
      return {
        category: TAXONOMY.EXCESSIVE_BUT_RLS_CONSTRAINED,
        action: ACTION.REVOKE_CANDIDATE,
        severity: SENSITIVE_TABLES.has(objectName) ? SEVERITY.MEDIUM : SEVERITY.LOW,
        proposedLeastPrivilegeTarget: `service_role: SELECT/INSERT/UPDATE/DELETE only (no ${privilege}) unless ops prove need`,
        notes: ["service_role bypasses RLS; TRUNCATE/REFERENCES/TRIGGER unused by Edge PostgREST patterns"],
        privilegeRequiredByKnownRuntime: false,
        anonAuthenticatedApiReachable: false,
      };
    }
    return {
      category: edgeNeeds ? TAXONOMY.REQUIRED_SERVICE_ROLE : TAXONOMY.REPOSITORY_PROVENANCE_GAP,
      action: edgeNeeds
        ? (issue === "match" || issue === "privilege_only_in_b" ? ACTION.KEEP : ACTION.ADD_TO_REPO_PROVENANCE)
        : ACTION.NEEDS_MORE_EVIDENCE,
      severity: SEVERITY.LOW,
      proposedLeastPrivilegeTarget: `service_role: KEEP ${privilege} if Edge writes/reads; document in migrations if production-only`,
      notes: edgeNeeds ? ["Edge service_role consumer present"] : ["no Edge .from consumer found; may still be intentional for ops"],
      privilegeRequiredByKnownRuntime: edgeNeeds,
      anonAuthenticatedApiReachable: false,
    };
  }

  // Client roles (anon / authenticated / PUBLIC)
  if (privilege === "TRUNCATE") {
    return {
      category: TAXONOMY.EXCESSIVE_HIGH_RISK,
      action: ACTION.REVOKE_CANDIDATE,
      severity: SENSITIVE_TABLES.has(objectName) ? SEVERITY.HIGH : SEVERITY.MEDIUM,
      proposedLeastPrivilegeTarget: `${grantee}: REVOKE TRUNCATE (RLS does not apply to TRUNCATE)`,
      notes: [
        "TRUNCATE is not exposed via PostgREST; risk is direct SQL / elevated misuse",
        "RLS does not protect TRUNCATE",
      ],
      privilegeRequiredByKnownRuntime: false,
      anonAuthenticatedApiReachable: false,
    };
  }

  if (privilege === "REFERENCES" || privilege === "TRIGGER") {
    return {
      category: TAXONOMY.EXCESSIVE_BUT_RLS_CONSTRAINED,
      action: ACTION.REVOKE_CANDIDATE,
      severity: SEVERITY.LOW,
      proposedLeastPrivilegeTarget: `${grantee}: REVOKE ${privilege}`,
      notes: ["not required for PostgREST app/Edge paths"],
      privilegeRequiredByKnownRuntime: false,
      anonAuthenticatedApiReachable: false,
    };
  }

  if (grantee === "anon") {
    if (objectName === "contact_messages" && (privilege === "INSERT" || privilege === "SELECT")) {
      return {
        category: TAXONOMY.UNKNOWN_FOUNDER_DECISION,
        action: ACTION.NEEDS_FOUNDER_DECISION,
        severity: SEVERITY.MEDIUM,
        proposedLeastPrivilegeTarget: "anon INSERT only if public contact form remains product intent",
        notes: ["no app consumer in this repo; may be marketing-site"],
        privilegeRequiredByKnownRuntime: false,
        anonAuthenticatedApiReachable: true,
      };
    }
    if (privilege === "SELECT" && objectName === "subscriptions") {
      return {
        category: TAXONOMY.EXCESSIVE_BUT_RLS_CONSTRAINED,
        action: ACTION.REVOKE_CANDIDATE,
        severity: SEVERITY.MEDIUM,
        proposedLeastPrivilegeTarget: "anon: no subscriptions privileges",
        notes: ["RLS select-own exists for public role but no browser anon consumer; billing is SoT"],
        privilegeRequiredByKnownRuntime: false,
        anonAuthenticatedApiReachable: true,
      };
    }
    // anon DML/SELECT on auth-gated tables
    if (postgrestExposesPrivilege(privilege)) {
      const sev = DANGER_PRIVS.has(privilege) && SENSITIVE_TABLES.has(objectName) ? SEVERITY.HIGH : SEVERITY.MEDIUM;
      return {
        category: policyOk ? TAXONOMY.EXCESSIVE_BUT_RLS_CONSTRAINED : TAXONOMY.EXCESSIVE_HIGH_RISK,
        action: ACTION.REVOKE_CANDIDATE,
        severity: sev,
        proposedLeastPrivilegeTarget: `anon: REVOKE ${privilege} on ${objectName}`,
        notes: [
          policyOk ? "RLS policy may allow if signed-out path exists — no known anon consumer" : "no matching RLS policy; PostgREST would fail but privilege is still excessive",
          "browser signed-out uses anon key; signed-in uses authenticated",
        ],
        privilegeRequiredByKnownRuntime: false,
        anonAuthenticatedApiReachable: apiReachable,
      };
    }
  }

  if (grantee === "authenticated" || grantee === "PUBLIC") {
    if (requiredByRuntime) {
      return {
        category: TAXONOMY.REQUIRED_RUNTIME,
        action: issue === "privilege_only_in_a" ? ACTION.ADD_TO_REPO_PROVENANCE : ACTION.KEEP,
        severity: SEVERITY.LOW,
        proposedLeastPrivilegeTarget: `${grantee}: KEEP ${privilege} (app/user-JWT Edge path + RLS policy)`,
        notes: [
          "required for PostgREST + RLS policy path",
          issue === "privilege_only_in_a" ? "present in production; add explicit GRANT to migration provenance" : null,
        ].filter(Boolean),
        privilegeRequiredByKnownRuntime: true,
        anonAuthenticatedApiReachable: true,
      };
    }
    if (objectName === "subscriptions" && privilege === "SELECT" && policyOk) {
      return {
        category: TAXONOMY.EXCESSIVE_BUT_RLS_CONSTRAINED,
        action: ACTION.NEEDS_FOUNDER_DECISION,
        severity: SEVERITY.MEDIUM,
        proposedLeastPrivilegeTarget: "authenticated: prefer no direct subscriptions SELECT; entitlement via billing / get_effective_tier",
        notes: [
          "select-own RLS policy exists but no browser .from('subscriptions')",
          "Edge writes use service_role; billing is authoritative SoT",
        ],
        privilegeRequiredByKnownRuntime: false,
        anonAuthenticatedApiReachable: true,
      };
    }
    if (postgrestExposesPrivilege(privilege) && !policyOk) {
      return {
        category: TAXONOMY.EXCESSIVE_BUT_RLS_CONSTRAINED,
        action: objectName === "subscriptions" ? ACTION.NEEDS_FOUNDER_DECISION : ACTION.REVOKE_CANDIDATE,
        severity: SENSITIVE_TABLES.has(objectName) ? SEVERITY.HIGH : SEVERITY.MEDIUM,
        proposedLeastPrivilegeTarget: `${grantee}: REVOKE ${privilege} on ${objectName} (no RLS policy for this command)`,
        notes: [
          "GRANT present but no RLS policy for command — PostgREST writes fail closed",
          objectName === "subscriptions" ? "founder decision: whether any client write privilege should remain" : "safe revoke candidate with regression tests",
        ],
        privilegeRequiredByKnownRuntime: false,
        anonAuthenticatedApiReachable: true,
      };
    }
    if (postgrestExposesPrivilege(privilege) && policyOk && !hasApp && !hasEdgeUserJwt) {
      return {
        category: TAXONOMY.UNKNOWN_FOUNDER_DECISION,
        action: ACTION.NEEDS_FOUNDER_DECISION,
        severity: SEVERITY.MEDIUM,
        proposedLeastPrivilegeTarget: `${grantee}: decide KEEP for legacy dual-model vs REVOKE until disposition`,
        notes: ["RLS would allow; no active app/user-JWT Edge consumer in this repo (ADR 0007 disposition open)"],
        privilegeRequiredByKnownRuntime: false,
        anonAuthenticatedApiReachable: true,
      };
    }
  }

  if (issue === "privilege_only_in_a") {
    return {
      category: TAXONOMY.REPOSITORY_PROVENANCE_GAP,
      action: ACTION.ADD_TO_REPO_PROVENANCE,
      severity: SEVERITY.LOW,
      proposedLeastPrivilegeTarget: "document intentional production privilege in migrations if KEEP",
      notes: ["present in production, absent from migration-only reconstruction"],
      privilegeRequiredByKnownRuntime: false,
      anonAuthenticatedApiReachable: apiReachable,
    };
  }

  if (issue === "privilege_only_in_b") {
    return {
      category: TAXONOMY.REPOSITORY_PROVENANCE_GAP,
      action: ACTION.NEEDS_MORE_EVIDENCE,
      severity: SEVERITY.LOW,
      proposedLeastPrivilegeTarget: "repository-only privilege; confirm whether production should gain it or repo should drop default",
      notes: ["present in migration-only, absent from production"],
      privilegeRequiredByKnownRuntime: false,
      anonAuthenticatedApiReachable: false,
    };
  }

  return {
    category: TAXONOMY.UNKNOWN_FOUNDER_DECISION,
    action: ACTION.NEEDS_FOUNDER_DECISION,
    severity: SEVERITY.MEDIUM,
    proposedLeastPrivilegeTarget: "needs founder/security review",
    notes: ["unclassified"],
    privilegeRequiredByKnownRuntime: false,
    anonAuthenticatedApiReachable: apiReachable,
  };
}

function classifyFunctionGrant({ schema, objectName, grantee, privilege, issue, fnMeta, consumers }) {
  const notes = [];
  if (schema === "storage" || isExtensionFunction(objectName)) {
    return {
      category: TAXONOMY.EXPECTED_PLATFORM_DEFAULT,
      action: ACTION.PLATFORM_EXPECTED,
      severity: SEVERITY.INFORMATIONAL,
      proposedLeastPrivilegeTarget: "PLATFORM_EXPECTED — extension/storage function EXECUTE",
      notes: ["platform/extension function"],
      privilegeRequiredByKnownRuntime: false,
      anonAuthenticatedApiReachable: false,
      triggerOnly: false,
      securityDefiner: Boolean(fnMeta?.securityDefiner),
    };
  }

  const triggerOnly = Boolean(consumers.triggerOnly) || fnMeta?.returnType === "trigger";
  const securityDefiner = Boolean(fnMeta?.securityDefiner);
  const intended = new Set(consumers.intendedRoles || []);
  const isClient = CLIENT_ROLES.has(grantee);
  const hasCaller = (consumers.app || []).length + (consumers.edge || []).length + (consumers.ops || []).length > 0;

  if (grantee === "postgres") {
    return {
      category: TAXONOMY.EXPECTED_PLATFORM_DEFAULT,
      action: ACTION.PLATFORM_EXPECTED,
      severity: SEVERITY.INFORMATIONAL,
      proposedLeastPrivilegeTarget: "KEEP postgres EXECUTE",
      notes: ["owner/admin"],
      privilegeRequiredByKnownRuntime: false,
      anonAuthenticatedApiReachable: false,
      triggerOnly,
      securityDefiner,
    };
  }

  if (triggerOnly) {
    // Trigger execution does not require anon/authenticated EXECUTE
    if (grantee === "anon" || grantee === "authenticated" || grantee === "PUBLIC") {
      return {
        category: TAXONOMY.FUNCTION_EXECUTE_REVIEW,
        action: ACTION.REVOKE_CANDIDATE,
        severity: securityDefiner ? SEVERITY.MEDIUM : SEVERITY.LOW,
        proposedLeastPrivilegeTarget: `${grantee}: REVOKE EXECUTE (trigger-only; migration already targets postgres/service_role)`,
        notes: [
          "trigger-only function; table owners/trigger invoker path does not need client EXECUTE",
          securityDefiner ? "SECURITY DEFINER — prefer least EXECUTE surface" : "SECURITY INVOKER",
          "migration REVOKE ALL FROM public + GRANT postgres/service_role",
        ],
        privilegeRequiredByKnownRuntime: false,
        anonAuthenticatedApiReachable: true,
        triggerOnly: true,
        securityDefiner,
      };
    }
    if (grantee === "service_role") {
      return {
        category: TAXONOMY.REQUIRED_SERVICE_ROLE,
        action: ACTION.KEEP,
        severity: SEVERITY.LOW,
        proposedLeastPrivilegeTarget: "KEEP service_role EXECUTE (matches migration intent)",
        notes: ["aligned with migration GRANT"],
        privilegeRequiredByKnownRuntime: true,
        anonAuthenticatedApiReachable: false,
        triggerOnly: true,
        securityDefiner,
      };
    }
  }

  if (intended.has(grantee) || (grantee === "service_role" && intended.has("service_role"))) {
    return {
      category: grantee === "service_role" ? TAXONOMY.REQUIRED_SERVICE_ROLE : TAXONOMY.REQUIRED_RUNTIME,
      action: issue === "privilege_only_in_a" ? ACTION.ADD_TO_REPO_PROVENANCE : ACTION.KEEP,
      severity: SEVERITY.LOW,
      proposedLeastPrivilegeTarget: `KEEP ${grantee} EXECUTE`,
      notes: hasCaller ? ["known caller present"] : ["intended role per migration design"],
      privilegeRequiredByKnownRuntime: hasCaller || intended.has(grantee),
      anonAuthenticatedApiReachable: isClient,
      triggerOnly,
      securityDefiner,
    };
  }

  if (isClient && !intended.has(grantee) && !intended.has("PUBLIC")) {
    return {
      category: TAXONOMY.FUNCTION_EXECUTE_REVIEW,
      action: ACTION.REVOKE_CANDIDATE,
      severity: securityDefiner ? SEVERITY.HIGH : SEVERITY.MEDIUM,
      proposedLeastPrivilegeTarget: `${grantee}: REVOKE EXECUTE on ${objectName}`,
      notes: [
        "not in intended caller roles from migrations/consumers",
        securityDefiner ? "SECURITY DEFINER elevates impact of EXECUTE" : "SECURITY INVOKER",
      ],
      privilegeRequiredByKnownRuntime: false,
      anonAuthenticatedApiReachable: true,
      triggerOnly,
      securityDefiner,
    };
  }

  if (issue === "privilege_only_in_b" && isExtensionFunction(objectName)) {
    return {
      category: TAXONOMY.EXPECTED_PLATFORM_DEFAULT,
      action: ACTION.PLATFORM_EXPECTED,
      severity: SEVERITY.INFORMATIONAL,
      proposedLeastPrivilegeTarget: "local reconstruction extension grant noise",
      notes: ["pgcrypto-style function present in migration-only reconstruction"],
      privilegeRequiredByKnownRuntime: false,
      anonAuthenticatedApiReachable: false,
      triggerOnly,
      securityDefiner,
    };
  }

  return {
    category: TAXONOMY.FUNCTION_EXECUTE_REVIEW,
    action: ACTION.NEEDS_MORE_EVIDENCE,
    severity: SEVERITY.MEDIUM,
    proposedLeastPrivilegeTarget: "review EXECUTE grant",
    notes,
    privilegeRequiredByKnownRuntime: false,
    anonAuthenticatedApiReachable: isClient,
    triggerOnly,
    securityDefiner,
  };
}

function buildRecordFromGrant({ prod, schema, objectType, objectName, grantee, privilege, isGrantable, issue, presentIn, includeMatched = false }) {
  const id = stableId([schema, objectType, objectName, grantee, privilege, issue || "match"]);
  const isTable = objectType === "table" || objectType === "view";
  const isFn = objectType === "function";
  const meta = isTable ? tableMeta(prod, schema, objectName) : null;
  const fnMeta = isFn ? functionMeta(prod, schema, objectName) : null;
  const policies = isTable ? policiesFor(prod, schema, objectName) : [];
  const consumers = isTable ? consumersForTable(objectName) : consumersForFunction(objectName);
  const classified = isFn
    ? classifyFunctionGrant({ schema, objectName, grantee, privilege, issue, fnMeta, consumers })
    : classifyTableGrant({
      schema, objectName, grantee, privilege, issue,
      rlsEnabled: Boolean(meta?.rlsEnabled),
      policies, consumers,
    });

  const driftDirection = issue === "privilege_only_in_a" ? "production_only"
    : issue === "privilege_only_in_b" ? "migration_only_only"
      : issue === "grantable_state_mismatch" ? "grantable_mismatch"
        : includeMatched ? "match" : "unknown";

  return {
    id,
    schema,
    objectType,
    objectName,
    functionSignature: isFn ? objectName : null,
    grantee,
    privilege,
    isGrantable: Boolean(isGrantable),
    productionState: presentIn === "b" && issue === "privilege_only_in_b" ? "absent" : "present",
    migrationOnlyState: presentIn === "a" && issue === "privilege_only_in_a" ? "absent" : "present",
    driftDirection,
    driftIssue: issue || "match",
    rlsEnabled: isTable ? Boolean(meta?.rlsEnabled) : null,
    rlsForced: isTable ? Boolean(meta?.rlsForced) : null,
    policiesAffectingGrantee: policies
      .filter((p) => policyMatchesRole(p.roles, grantee) || policyMatchesRole(p.roles, "public"))
      .map((p) => ({ name: p.name, cmd: p.cmd, roles: p.roles })),
    securityDefiner: isFn ? Boolean(fnMeta?.securityDefiner) : null,
    searchPath: isFn ? (fnMeta?.searchPath ?? null) : null,
    returnType: isFn ? (fnMeta?.returnType ?? null) : null,
    appConsumers: consumers.app || [],
    edgeConsumers: consumers.edge || [],
    operationalConsumers: consumers.ops || [],
    serviceRoleUsed: (consumers.edge || []).length > 0 || (consumers.intendedRoles || []).includes("service_role"),
    anonAuthenticatedApiReachable: classified.anonAuthenticatedApiReachable,
    privilegeRequiredByKnownRuntime: classified.privilegeRequiredByKnownRuntime,
    triggerOnly: classified.triggerOnly ?? false,
    primaryCategory: classified.category,
    severity: classified.severity,
    confidence: classified.category === TAXONOMY.UNKNOWN_FOUNDER_DECISION || classified.action === ACTION.NEEDS_MORE_EVIDENCE
      ? "medium"
      : classified.category === TAXONOMY.EXPECTED_PLATFORM_DEFAULT
        ? "high"
        : "high",
    proposedLeastPrivilegeTarget: classified.proposedLeastPrivilegeTarget,
    proposedLaterAction: classified.action,
    productionMutationRequired: classified.action === ACTION.REVOKE_CANDIDATE || classified.action === ACTION.NEEDS_FOUNDER_DECISION
      ? "yes_if_remediation_authorized"
      : classified.action === ACTION.ADD_TO_REPO_PROVENANCE
        ? "no"
        : "no",
    notes: classified.notes,
    evidencePaths: [
      "docs/database/production-schema/production-schema-catalog.json",
      "docs/database/reconstruction/migration_only-schema.json",
      "docs/database/schema-drift-report.json",
      "docs/database/SCHEMA_DRIFT_REFRESH_PR2B.md",
      "docs/security/RLS_COVERAGE_INVENTORY.md",
    ],
  };
}

function collectGrantMismatches(driftReport) {
  return (driftReport.records || []).filter(
    (r) => r.compareSurface === "migration_only" && r.class === "grant_mismatch"
  );
}

function collectMatchedCriticalGrants(prod, mig) {
  const prodMap = new Map((prod.grants || []).map((g) => [grantIdentityKey(g), g]));
  const migMap = new Map((mig.grants || []).map((g) => [grantIdentityKey(g), g]));
  const out = [];
  for (const [key, g] of prodMap) {
    if (g.schema !== "public") continue;
    if (g.objectType !== "table" && g.objectType !== "view" && g.objectType !== "function") continue;
    const name = baseName(g.objectName);
    const critical = CRITICAL_TABLES.includes(name)
      || name === "protect_admin_subscriptions"
      || ["claim_stripe_webhook_event", "release_stripe_webhook_event", "log_admin_entitlement_bypass",
        "issue_admin_bootstrap_token", "claim_admin_bootstrap", "get_effective_tier",
        "assert_feature_allowed", "promote_to_admin", "list_admins"].includes(name);
    if (!critical) continue;
    if (!migMap.has(key)) continue; // mismatches handled separately
    out.push(g);
  }
  return out;
}

export function buildGrantSecurityInventory({ prod, mig, driftReport }) {
  const mismatches = collectGrantMismatches(driftReport);
  const records = [];

  for (const r of mismatches) {
    const d = r.details || {};
    records.push(buildRecordFromGrant({
      prod,
      schema: d.schema || r.schema,
      objectType: d.objectType || (r.objectType || "").replace(/^grant:/, ""),
      objectName: d.objectName || r.name,
      grantee: d.grantee,
      privilege: d.privilege,
      isGrantable: d.isGrantable,
      issue: d.issue,
      presentIn: d.presentIn,
    }));
  }

  // Matched critical grants (decision package completeness — e.g. subscriptions)
  for (const g of collectMatchedCriticalGrants(prod, mig)) {
    records.push(buildRecordFromGrant({
      prod,
      schema: g.schema,
      objectType: g.objectType,
      objectName: g.objectName,
      grantee: g.grantee,
      privilege: g.privilege,
      isGrantable: g.isGrantable,
      issue: "match",
      presentIn: "both",
      includeMatched: true,
    }));
  }

  // Stable sort
  records.sort((a, b) => a.id.localeCompare(b.id));

  const byCategory = {};
  const bySeverity = {};
  const byAction = {};
  const bySchema = {};
  for (const rec of records) {
    byCategory[rec.primaryCategory] = (byCategory[rec.primaryCategory] || 0) + 1;
    bySeverity[rec.severity] = (bySeverity[rec.severity] || 0) + 1;
    byAction[rec.proposedLaterAction] = (byAction[rec.proposedLaterAction] || 0) + 1;
    bySchema[rec.schema] = (bySchema[rec.schema] || 0) + 1;
  }

  const mismatchOnly = records.filter((r) => r.driftIssue !== "match");
  const publicMismatch = mismatchOnly.filter((r) => r.schema === "public");
  const storageMismatch = mismatchOnly.filter((r) => r.schema === "storage");

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      epic: "Phase 8.1 / Epic 6 PR 2C",
      authority: ["docs/adr/0006-database-schema-source-of-truth.md", "docs/adr/0007-legacy-schema-disposition.md"],
      compareSurface: "production_vs_migration_only",
      mutationAuthorized: false,
      note: "Classification only. No GRANT/REVOKE executed or authorized by this artifact. Founder FD-* decisions accepted for documentation; remediation remains separately authorized.",
      productionCapturedAt: prod.meta?.capturedAt ?? null,
      migrationOnlyReconstruction: mig.reconstruction?.success ?? null,
      founderDecisions: {
        "FD-SUB-CLIENT-WRITES": "ACCEPTED",
        "FD-DEFAULT-BROAD-GRANTS": "ACCEPTED",
        "FD-LEGACY-DUAL-MODEL-GRANTS": "ACCEPTED",
        "FD-RPC-EXECUTE-PUBLIC": "ACCEPTED",
      },
      founderDecisionBinding: "Recommended targets/answers in docs/database/GRANT_SECURITY_DECISIONS_PR2C.md are binding; GRANT/REVOKE and PR 2D remain unauthorized.",
    },
    summary: {
      totalRecords: records.length,
      grantMismatchRecords: mismatchOnly.length,
      matchedCriticalRecordsIncluded: records.length - mismatchOnly.length,
      publicSchemaMismatches: publicMismatch.length,
      storagePlatformMismatches: storageMismatch.length,
      byCategory,
      bySeverity,
      byAction,
      bySchema,
    },
    records,
  };
}

function main() {
  const prod = loadJson("docs/database/production-schema/production-schema-catalog.json");
  const mig = loadJson("docs/database/reconstruction/migration_only-schema.json");
  const driftReport = loadJson("docs/database/schema-drift-report.json");
  const inventory = buildGrantSecurityInventory({ prod, mig, driftReport });
  const outPath = join(root, "docs/database/grant-security-inventory-pr2c.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(inventory, null, 2) + "\n");
  console.log(`Wrote ${outPath} (${inventory.summary.totalRecords} records; ${inventory.summary.grantMismatchRecords} mismatches)`);
  return inventory;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main();
