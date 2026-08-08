#!/usr/bin/env node
/**
 * Epic 6 PR 2C — render founder decision package + human summary from
 * docs/database/grant-security-inventory-pr2c.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");

function loadInventory() {
  return JSON.parse(readFileSync(join(root, "docs/database/grant-security-inventory-pr2c.json"), "utf8"));
}

function byObject(records, name) {
  return records.filter((r) => r.objectName === name || (r.objectName || "").startsWith(`${name}(`));
}

function matrixLines(records, table) {
  const privs = ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"];
  const roles = ["anon", "authenticated", "service_role", "postgres"];
  const lines = [];
  lines.push("| Role | Privilege | Prod | Repo (migration_only) | Category | Action | Severity | Target |");
  lines.push("|---|---|---|---|---|---|---|---|");
  for (const role of roles) {
    for (const priv of privs) {
      const rec = records.find((r) => r.objectName === table && r.objectType === "table" && r.grantee === role && r.privilege === priv);
      if (!rec) continue;
      lines.push(
        `| \`${role}\` | \`${priv}\` | ${rec.productionState} | ${rec.migrationOnlyState} | \`${rec.primaryCategory}\` | \`${rec.proposedLaterAction}\` | ${rec.severity} | ${rec.proposedLeastPrivilegeTarget.replace(/\|/g, "/")} |`
      );
    }
  }
  return lines;
}

function topRisk(records, n = 10) {
  const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFORMATIONAL: 4 };
  const privRank = { TRUNCATE: 0, DELETE: 1, UPDATE: 2, INSERT: 3, EXECUTE: 4, SELECT: 5, REFERENCES: 6, TRIGGER: 7 };
  const sorted = [...records]
    .filter((r) => r.severity === "HIGH" || r.severity === "CRITICAL")
    .sort((a, b) =>
      (rank[a.severity] - rank[b.severity])
      || ((privRank[a.privilege] ?? 9) - (privRank[b.privilege] ?? 9))
      || a.objectName.localeCompare(b.objectName)
      || a.grantee.localeCompare(b.grantee)
    );
  // Prefer diversity across objects so the top list is reviewable.
  const picked = [];
  const seenObject = new Set();
  for (const r of sorted) {
    const key = `${r.schema}.${baseName(r.objectName)}`;
    if (seenObject.has(key) && picked.length < n) continue;
    seenObject.add(key);
    picked.push(r);
    if (picked.length >= n) break;
  }
  // Fill remaining slots if needed.
  for (const r of sorted) {
    if (picked.length >= n) break;
    if (picked.includes(r)) continue;
    picked.push(r);
  }
  return picked;
}

function baseName(objectName) {
  const paren = String(objectName).indexOf("(");
  return paren === -1 ? objectName : objectName.slice(0, paren);
}

export function renderMarkdown(inventory) {
  const { meta, summary, records } = inventory;
  const mismatch = records.filter((r) => r.driftIssue !== "match");
  const lines = [];

  lines.push("# Grant Security Decisions — Epic 6 PR 2C");
  lines.push("");
  lines.push(`**Phase:** 8.1 / Epic 6 PR 2C`);
  lines.push(`**Generated:** ${meta.generatedAt}`);
  lines.push(`**Status:** EVIDENCE / CLASSIFICATION ONLY — no GRANT/REVOKE executed`);
  lines.push(`**Authority:** ADR 0006, ADR 0007; post-PR2B drift baseline`);
  lines.push(`**Machine inventory:** \`docs/database/grant-security-inventory-pr2c.json\``);
  lines.push("");
  lines.push("This document converts production-vs-migration_only grant drift into a");
  lines.push("least-privilege decision package. **No privilege changes are authorized**");
  lines.push("by this PR.");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Summary counts");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("|---|---:|");
  lines.push(`| Total inventory records (mismatches + matched critical) | ${summary.totalRecords} |`);
  lines.push(`| Migration-only \`grant_mismatch\` analyzed | ${summary.grantMismatchRecords} |`);
  lines.push(`| Public-schema mismatches | ${summary.publicSchemaMismatches} |`);
  lines.push(`| Storage/platform mismatches | ${summary.storagePlatformMismatches} |`);
  lines.push(`| Matched critical grants included | ${summary.matchedCriticalRecordsIncluded} |`);
  lines.push("");
  lines.push("### By taxonomy category");
  lines.push("");
  lines.push("| Category | Count |");
  lines.push("|---|---:|");
  for (const [k, v] of Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1])) {
    lines.push(`| \`${k}\` | ${v} |`);
  }
  lines.push("");
  lines.push("### By severity");
  lines.push("");
  lines.push("| Severity | Count |");
  lines.push("|---|---:|");
  for (const sev of ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"]) {
    lines.push(`| ${sev} | ${summary.bySeverity[sev] || 0} |`);
  }
  lines.push("");
  lines.push("### By proposed later action");
  lines.push("");
  lines.push("| Action | Count |");
  lines.push("|---|---:|");
  for (const [k, v] of Object.entries(summary.byAction).sort((a, b) => b[1] - a[1])) {
    lines.push(`| \`${k}\` | ${v} |`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Exposure model (repository evidence)");
  lines.push("");
  lines.push("| Path | Role | Notes |");
  lines.push("|---|---|---|");
  lines.push("| Browser `src/integrations/supabase/client.ts` | `authenticated` when JWT present; else `anon` | Never holds service role |");
  lines.push("| Edge user-JWT paths | `authenticated` | `generate-pdf`, parts of `export-share` |");
  lines.push("| Edge service paths | `service_role` (RLS bypass) | `stripe-webhook`, `check-subscription`, `create-checkout`, `customer-portal` |");
  lines.push("| PostgREST table API | SELECT/INSERT/UPDATE/DELETE only | **TRUNCATE / REFERENCES / TRIGGER are not PostgREST operations** |");
  lines.push("| RLS | Filters row visibility for table DML/SELECT | **Does not protect TRUNCATE** |");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## `public.subscriptions` matrix");
  lines.push("");
  lines.push("Structural definition matches repository (PR 2A/2B). Grants currently **match**");
  lines.push("production and migration-only (broad privileges restored for parity).");
  lines.push("Billing remains authoritative; Edge `stripe-webhook` performs best-effort sync via **service_role**.");
  lines.push("RLS enabled; only policy `subscriptions_select_own` (SELECT).");
  lines.push("");
  lines.push(...matrixLines(records, "subscriptions"));
  lines.push("");
  lines.push("### Direct answers");
  lines.push("");
  lines.push("| Question | Answer |");
  lines.push("|---|---|");
  lines.push("| Does anon need SELECT? | **No** — no browser anon consumer; revoke candidate |");
  lines.push("| Does anon need INSERT/UPDATE/DELETE? | **No** — no write policy; no consumer; revoke candidate / founder confirm |");
  lines.push("| Does anon need TRUNCATE? | **No** — RLS does not apply; revoke candidate (HIGH on sensitive table) |");
  lines.push("| Does authenticated need INSERT/UPDATE/DELETE? | **No** for known runtime — no INSERT/UPDATE/DELETE policies; no `.from('subscriptions')` |");
  lines.push("| Does authenticated need TRUNCATE? | **No** |");
  lines.push("| Does anon/authenticated need REFERENCES/TRIGGER? | **No** |");
  lines.push("| What does service_role require? | **SELECT/INSERT/UPDATE** (upsert sync); DELETE optional; TRUNCATE/REFERENCES/TRIGGER not required |");
  lines.push("| postgres privileges? | Owner/admin semantics — informational KEEP / platform |");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## `protect_admin_subscriptions()` EXECUTE");
  lines.push("");
  lines.push("| Fact | Evidence |");
  lines.push("|---|---|");
  lines.push("| Kind | `RETURNS TRIGGER` |");
  lines.push("| SECURITY DEFINER | **yes** (`search_path=public`) |");
  lines.push("| Callers | Trigger-only on `subscriptions` BEFORE INSERT/UPDATE — **no** app/Edge `.rpc` |");
  lines.push("| Migration intent | `REVOKE ALL FROM public`; `GRANT EXECUTE` to `postgres`, `service_role` |");
  lines.push("| Production drift | EXECUTE also present for `anon` / `authenticated` (`privilege_only_in_a`) |");
  lines.push("| Trigger needs client EXECUTE? | **No** — trigger execution does not require anon/authenticated EXECUTE grants |");
  lines.push("| Conclusion | **REVOKE_CANDIDATE** for anon/authenticated EXECUTE; KEEP postgres/service_role |");
  lines.push("| Category | `function_execute_review` |");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Admin / bootstrap surfaces");
  lines.push("");
  lines.push("| Object | Conclusion |");
  lines.push("|---|---|");
  lines.push("| `admin_bootstrap_tokens` | RLS on, **no policies** (deny-all for clients). Broad anon/authenticated grants are excessive; service_role DML may be ops-needed via RPCs (SECURITY DEFINER). Prefer service_role/RPC-only; revoke client table privileges. |");
  lines.push("| `admin_audit_log` | Client SELECT only via admin RLS + admin UI uses RPCs. Prefer RPC path; revoke anon; limit authenticated to SELECT if direct reads remain. TRUNCATE revoke. |");
  lines.push("| `entitlement_bypass_log` | Written via SECURITY DEFINER RPC from Edge service — not direct `.from`. Client table privileges unnecessary. |");
  lines.push("| `stripe_webhook_events` | service_role + claim/release RPCs. No browser access. Revoke any client grants; KEEP service_role DML. |");
  lines.push("| `user_roles` | App authenticated reads; Edge service writes/reads. KEEP authenticated SELECT (+ admin policies); revoke anon; revoke TRUNCATE/REFERENCES/TRIGGER. |");
  lines.push("| Bootstrap / admin / webhook RPCs | Align EXECUTE to migration intent (`service_role` and/or `authenticated` only). Revoke PUBLIC/anon where not intended. |");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Billing / entitlement");
  lines.push("");
  lines.push("- `billing`: Edge **service_role** is required for write/read paths; authenticated SELECT-own policy exists but app does not `.from('billing')` (uses Edge + `get_effective_tier`). Prefer service_role DML + optional authenticated SELECT; revoke anon and TRUNCATE/REFERENCES/TRIGGER.");
  lines.push("- Entitlement RPCs (`evaluate_entitlement`, `feature_allowed`, `assert_feature_allowed`, `get_effective_tier`): KEEP authenticated/service_role EXECUTE per Phase 6 grants; revoke unintended PUBLIC/anon EXECUTE.");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Comparison / export grants");
  lines.push("");
  lines.push("Active path: `user_comparisons` + `pdf_exports`.");
  lines.push("Legacy dual models (`saved_comparisons` / items / versions / shares; `export_files` / `export_shares`) have RLS but **no app/Edge `.from` consumers**.");
  lines.push("**ADR 0007 disposition is not decided here** — grant actions for legacy tables are `NEEDS_FOUNDER_DECISION` or retain-until-disposition, while TRUNCATE/REFERENCES/TRIGGER remain confident `REVOKE_CANDIDATE`.");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Profiles / scenarios");
  lines.push("");
  lines.push("| Table | Runtime need | Recommendation |");
  lines.push("|---|---|---|");
  lines.push("| `profiles` | authenticated SELECT/UPDATE (+ INSERT policy) via `useProfile` | KEEP those; ADD_TO_REPO_PROVENANCE; revoke anon + TRUNCATE/REFERENCES/TRIGGER |");
  lines.push("| `scenarios` | authenticated CRUD via app + user-JWT Edge read | KEEP authenticated DML/SELECT matching RLS; revoke anon + TRUNCATE/REFERENCES/TRIGGER; service_role SELECT for `check-subscription` |");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Function EXECUTE matrix (priority)");
  lines.push("");
  lines.push("| Function | Intended roles | Drift / issue | Action |");
  lines.push("|---|---|---|---|");
  const priorityFns = [
    "protect_admin_subscriptions()",
    "claim_stripe_webhook_event",
    "release_stripe_webhook_event",
    "log_admin_entitlement_bypass",
    "issue_admin_bootstrap_token",
    "claim_admin_bootstrap",
    "get_effective_tier",
    "assert_feature_allowed",
    "promote_to_admin",
    "list_admins",
    "evaluate_entitlement",
    "is_professional_price",
  ];
  for (const key of priorityFns) {
    const rows = mismatch.filter((r) => r.objectType === "function" && (r.objectName === key || r.objectName.startsWith(key)));
    if (rows.length === 0) {
      lines.push(`| \`${key}\` | (see migrations) | no migration_only EXECUTE mismatch in inventory subset | review matched grants in JSON |`);
      continue;
    }
    const roles = [...new Set(rows.map((r) => `${r.grantee}:${r.proposedLaterAction}`))].join(", ");
    lines.push(`| \`${key}\` | per migration | ${rows.length} mismatch row(s) | ${roles} |`);
  }
  lines.push("");
  lines.push("Full per-signature rows are in the JSON inventory (`objectType=function`).");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Top highest-risk grant records");
  lines.push("");
  lines.push("| ID | Object | Grantee | Privilege | Severity | Action |");
  lines.push("|---|---|---|---|---|---|");
  for (const r of topRisk(records, 10)) {
    lines.push(`| \`${r.id}\` | \`${r.schema}.${r.objectName}\` | \`${r.grantee}\` | \`${r.privilege}\` | ${r.severity} | \`${r.proposedLaterAction}\` |`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Founder decision package");
  lines.push("");
  lines.push("Low-level PostgreSQL mechanics are pre-answered. Founder choices are limited to product/security posture.");
  lines.push("");

  const decisions = [
    {
      id: "FD-SUB-CLIENT-WRITES",
      surface: "public.subscriptions — anon/authenticated INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER (+ anon SELECT)",
      current: "Full privilege matrix granted to anon/authenticated (matches repo after PR 2A parity GRANT)",
      target: "No anon privileges; authenticated none (prefer) or SELECT-only if product insists on direct client reads; service_role SELECT/INSERT/UPDATE(+DELETE)",
      rationale: "No browser `.from('subscriptions')`; Edge sync is service_role; RLS has no write policies; TRUNCATE ignores RLS; billing is SoT",
      behaviorRisk: "None for current app if revoked — Edge sync and RPCs unaffected",
      mutationLater: "yes",
      recommended: "Approve revoke of anon/authenticated non-essential privileges on subscriptions",
    },
    {
      id: "FD-DEFAULT-BROAD-GRANTS",
      surface: "Active user-facing tables (profiles, scenarios, user_comparisons, pdf_exports, user_roles)",
      current: "Production has default-like ALL privileges for anon/authenticated/service_role; migration-only often only postgres until explicit GRANTs",
      target: "Explicit least privilege: authenticated privileges matching RLS policies; service_role as needed; revoke anon + TRUNCATE/REFERENCES/TRIGGER",
      rationale: "PostgREST needs table GRANT + RLS policy; current broad defaults are inherited privilege surface",
      behaviorRisk: "Low if authenticated policy-aligned privileges preserved; must regression-test app CRUD",
      mutationLater: "yes",
      recommended: "Approve move to explicit least privilege on active tables",
    },
    {
      id: "FD-LEGACY-DUAL-MODEL-GRANTS",
      surface: "saved_comparisons / comparison_* / export_files / export_shares (and advisor_access_requests grants)",
      current: "Broad production grants + RLS; no active app/Edge `.from` consumers",
      target: "Until ADR 0007/0011 disposition: revoke TRUNCATE/REFERENCES/TRIGGER confidently; defer SELECT/DML disposition with object removal decisions",
      rationale: "Grant cleanup ≠ object removal; avoid behavior surprises if latent clients exist outside this repo",
      behaviorRisk: "Unknown external/marketing clients for contact/advisor; dual models unused in-repo",
      mutationLater: "partial yes",
      recommended: "Approve TRUNCATE/REFERENCES/TRIGGER revokes now; keep DML/SELECT decisions tied to later disposition slices",
    },
    {
      id: "FD-RPC-EXECUTE-PUBLIC",
      surface: "Privileged RPC EXECUTE to PUBLIC/anon where migrations intend authenticated/service_role only",
      current: "Some production EXECUTE grants broader than migration least-privilege intent (and extension noise)",
      target: "EXECUTE only for intended roles; especially revoke anon/PUBLIC on SECURITY DEFINER privileged RPCs",
      rationale: "EXECUTE on SECURITY DEFINER is a direct privilege boundary",
      behaviorRisk: "Must ensure intended authenticated/service_role grants remain; test admin + entitlement + webhook paths",
      mutationLater: "yes",
      recommended: "Approve aligning EXECUTE to migration intent (revoke unintended anon/PUBLIC)",
    },
  ];

  for (const d of decisions) {
    lines.push(`### ${d.id}`);
    lines.push("");
    lines.push(`| Field | Value |`);
    lines.push(`|---|---|`);
    lines.push(`| Object / surface | ${d.surface} |`);
    lines.push(`| Current production state | ${d.current} |`);
    lines.push(`| Recommended target | ${d.target} |`);
    lines.push(`| Security rationale | ${d.rationale} |`);
    lines.push(`| Behavior risk if reduced | ${d.behaviorRisk} |`);
    lines.push(`| Production mutation required later? | ${d.mutationLater} |`);
    lines.push(`| Recommended answer | **${d.recommended}** |`);
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("## Proposed later remediation grouping (NOT AUTHORIZED)");
  lines.push("");
  lines.push("| Group | Description |");
  lines.push("|---|---|");
  lines.push("| **A** | Obvious safe provenance-only additions — document KEEP privileges in migrations (no prod revoke) |");
  lines.push("| **B** | Obvious safe privilege reductions — anon TRUNCATE/REFERENCES/TRIGGER; trigger-only EXECUTE to anon/authenticated |");
  lines.push("| **C** | Behavior-sensitive reductions — authenticated DML on active tables; RPC EXECUTE tightening — needs tests |");
  lines.push("| **D** | Platform/storage exclusions — do not chase storage/extension grant noise as app drift |");
  lines.push("| **E** | Founder decisions (FD-* above) |");
  lines.push("| **F** | Blocked by ADR 0007 / ADR 0011 — legacy dual-model/advisor object removal (grants may partially proceed in B) |");
  lines.push("");
  lines.push("### Illustrative later statements (NON-EXECUTABLE / NOT AUTHORIZED)");
  lines.push("");
  lines.push("```text");
  lines.push("-- NOT AUTHORIZED IN PR 2C. Illustrative only.");
  lines.push("-- REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.subscriptions FROM anon, authenticated;");
  lines.push("-- REVOKE INSERT, UPDATE, DELETE ON TABLE public.subscriptions FROM anon, authenticated;");
  lines.push("-- REVOKE ALL ON FUNCTION public.protect_admin_subscriptions() FROM anon, authenticated;");
  lines.push("-- Required tests: entitlement-sql, stripe-webhook paths, admin RPC suite, app scenario/profile CRUD.");
  lines.push("-- Rollback: re-GRANT the revoked privileges (exact prior matrix from production catalog).");
  lines.push("```");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Confident KEEP / REVOKE / provenance / platform");
  lines.push("");
  const keep = mismatch.filter((r) => r.proposedLaterAction === "KEEP").length;
  const matchedKeep = records.filter((r) => r.driftIssue === "match" && r.proposedLaterAction === "KEEP").length;
  lines.push(`- **KEEP (mismatches):** ${keep}; **KEEP (matched critical):** ${matchedKeep}`);
  lines.push(`- **REVOKE_CANDIDATE:** ${summary.byAction.REVOKE_CANDIDATE || 0}`);
  lines.push(`- **ADD_TO_REPO_PROVENANCE:** ${summary.byAction.ADD_TO_REPO_PROVENANCE || 0}`);
  lines.push(`- **PLATFORM_EXPECTED:** ${summary.byAction.PLATFORM_EXPECTED || 0}`);
  lines.push(`- **NEEDS_FOUNDER_DECISION:** ${summary.byAction.NEEDS_FOUNDER_DECISION || 0}`);
  lines.push(`- **NEEDS_MORE_EVIDENCE:** ${summary.byAction.NEEDS_MORE_EVIDENCE || 0}`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Confirmations");
  lines.push("");
  lines.push("- No production mutation occurred in PR 2C.");
  lines.push("- No GRANT/REVOKE executed.");
  lines.push("- No migrations created.");
  lines.push("- Harness-only differences did not drive conclusions.");
  lines.push("");

  return lines.join("\n");
}

function main() {
  const inventory = loadInventory();
  const md = renderMarkdown(inventory);
  const out = join(root, "docs/database/GRANT_SECURITY_DECISIONS_PR2C.md");
  writeFileSync(out, md + "\n");
  console.log(`Wrote ${out}`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main();
