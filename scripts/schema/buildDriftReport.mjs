#!/usr/bin/env node
/**
 * Epic 6 PR 1 — assembles the machine-readable and human-readable drift
 * report from whatever capture/reconstruction artifacts are present on
 * disk. Never connects to any database itself; pure artifact assembly, so
 * it never requires production credentials.
 *
 * Reads (each optional — missing inputs are reported, not fatal):
 *   - docs/database/production-schema/production-schema-catalog.json
 *   - docs/database/reconstruction/migration_only-schema.json
 *   - docs/database/reconstruction/harness-schema.json
 *   - src/integrations/supabase/types.ts
 *
 * Writes:
 *   - docs/database/schema-drift-report.json
 *   - docs/database/SCHEMA_DRIFT_REPORT.md
 *   - docs/database/production-schema/production-schema-summary.json
 *   - docs/database/production-schema/production-schema-fingerprint.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

import {
  compareCatalogs,
  compareTables,
  compareViews,
  compareEnums,
  compareFunctions,
  compareTriggers,
  compareConstraints,
  compareIndexes,
  comparePolicies,
  compareGrants,
  compareTypesAgainstCatalog,
  summarizeDriftRecords,
  DRIFT_CLASSES,
} from "./lib/compareDrift.mjs";
import { normalizeCatalog, stableStringify } from "./lib/normalize.mjs";
import { fingerprintCatalogObjects, fingerprintCatalogContent } from "./lib/fingerprint.mjs";
import { parseSupabaseTypes } from "./lib/parseTypes.mjs";
import { assertCatalogIsSafeToWrite, assertNoHighConfidenceSecrets } from "./lib/sanitize.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");

const PRODUCTION_CATALOG_PATH = join(root, "docs/database/production-schema/production-schema-catalog.json");
const MIGRATION_ONLY_PATH = join(root, "docs/database/reconstruction/migration_only-schema.json");
const HARNESS_PATH = join(root, "docs/database/reconstruction/harness-schema.json");
const TYPES_PATH = join(root, "src/integrations/supabase/types.ts");

const DRIFT_REPORT_JSON_PATH = join(root, "docs/database/schema-drift-report.json");
const DRIFT_REPORT_MD_PATH = join(root, "docs/database/SCHEMA_DRIFT_REPORT.md");
const SUMMARY_PATH = join(root, "docs/database/production-schema/production-schema-summary.json");
const FINGERPRINT_PATH = join(root, "docs/database/production-schema/production-schema-fingerprint.json");

function loadJsonIfExists(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function countSection(catalog, key) {
  return catalog ? (catalog[key]?.length ?? 0) : null;
}

function buildProductionSummary(production) {
  if (!production) {
    return {
      status: "not_captured",
      note: "No docs/database/production-schema/production-schema-catalog.json present. Run npm run schema:capture with SCHEMA_CAPTURE_DATABASE_URL set to a read-only production connection (Epic 6 PR 1, separately authorized) to populate it.",
    };
  }
  return {
    status: "captured",
    capturedAt: production.meta?.capturedAt ?? null,
    gitSha: production.meta?.gitSha ?? null,
    projectRef: production.meta?.projectRef ?? null,
    counts: {
      tables: countSection(production, "tables"),
      views: countSection(production, "views"),
      enums: countSection(production, "enums"),
      functions: countSection(production, "functions"),
      triggers: countSection(production, "triggers"),
      constraints: countSection(production, "constraints"),
      indexes: countSection(production, "indexes"),
      policies: countSection(production, "policies"),
      grants: countSection(production, "grants"),
      extensions: countSection(production, "extensions"),
      migrationVersions: countSection(production, "migrationVersions"),
      rowCounts: countSection(production, "rowCounts"),
    },
  };
}

function buildProductionFingerprint(production) {
  if (!production) {
    return {
      status: "not_captured",
      note: "No production catalog available; per-object fingerprints cannot be computed.",
    };
  }
  const normalized = normalizeCatalog(production);
  return {
    status: "captured",
    capturedAt: production.meta?.capturedAt ?? null,
    catalogContentFingerprint: fingerprintCatalogContent(normalized),
    perObject: fingerprintCatalogObjects(normalized),
  };
}

function compareAgainstProduction(production, reconstruction, surfaceLabel) {
  if (!production || !reconstruction) return [];
  return compareCatalogs(production, reconstruction, surfaceLabel);
}

/**
 * Informational (non-classified) delta between the two repo reconstructions
 * themselves — neither side is "production", so this is not run through the
 * ADR 0006 §3 classification scheme. Its purpose is to make the
 * TRUE-migration vs TEST-HARNESS distinction legible.
 *
 * Post–Epic 6 PR 2A: migration-only reconstructs successfully without a
 * product-table `subscriptions` stub. Remaining harness-only deltas (if any)
 * are non-canonical for repository drift.
 */
function compareHarnessStubDelta(migrationOnly, harness) {
  if (!migrationOnly || !harness) return null;
  const label = "harness_vs_migration_only";
  const records = [
    ...compareTables(migrationOnly.tables, harness.tables, label).filter((r) => r.class !== DRIFT_CLASSES.MATCH),
    ...compareViews(migrationOnly.views, harness.views, label).filter((r) => r.class !== DRIFT_CLASSES.MATCH),
    ...compareEnums(migrationOnly.enums, harness.enums, label).filter((r) => r.class !== DRIFT_CLASSES.MATCH),
    ...compareFunctions(migrationOnly.functions, harness.functions, label).filter((r) => r.class !== DRIFT_CLASSES.MATCH),
    ...compareTriggers(migrationOnly.triggers, harness.triggers, label).filter((r) => r.class !== DRIFT_CLASSES.MATCH),
    ...compareConstraints(migrationOnly.constraints, harness.constraints, label).filter((r) => r.class !== DRIFT_CLASSES.MATCH),
    ...compareIndexes(migrationOnly.indexes, harness.indexes, label).filter((r) => r.class !== DRIFT_CLASSES.MATCH),
    ...comparePolicies(migrationOnly.policies, harness.policies, label).filter((r) => r.class !== DRIFT_CLASSES.MATCH),
    ...compareGrants(migrationOnly.grants, harness.grants, label).filter((r) => r.class !== DRIFT_CLASSES.MATCH),
  ];
  return records.map((r) => ({
    ...r,
    note: "Harness vs migration-only delta (informational). Not canonical repository drift; migration_only is the principal repo surface after PR 2A.",
  }));
}

const HIGH_PRIORITY_CANDIDATE_NAMES = [
  "subscriptions",
  "profiles",
  "admin_bootstrap_tokens",
  "stripe_webhook_events",
  "entitlement_bypass_log",
  "user_comparisons",
  "saved_comparisons",
  "pdf_exports",
  "export_files",
  "export_shares",
  "advisor_access_requests",
  "advisor_profiles",
];

function renderReconstructionEvidence(meta, migrationOnly, harness) {
  const lines = [];
  lines.push("## Reconstruction evidence (retain BOTH)");
  lines.push("");
  lines.push(
    "ADR 0006 requires both a TRUE migration-only reconstruction and a TEST-HARNESS reconstruction. Harness success does **not** prove migration-only reproducibility."
  );
  lines.push("");

  const mo = migrationOnly?.reconstruction;
  lines.push("### A. Migration-only (TRUE reconstruction)");
  lines.push("");
  if (!migrationOnly) {
    lines.push("_Artifact missing._");
  } else if (mo?.success) {
    lines.push("- Result: **SUCCEEDED**");
    lines.push(`- Applied migrations: ${mo.appliedMigrations?.length ?? "unknown"}`);
    lines.push(`- Tables reconstructed: ${migrationOnly.tables?.length ?? 0}`);
  } else {
    lines.push("- Result: **FAILED** (this failure is retained evidence — do not patch around it)");
    lines.push(`- Failed at migration: \`${mo?.failedAtMigration ?? "unknown"}\``);
    lines.push(`- Why: ${mo?.error ?? meta.migrationOnlyStatus ?? "see reconstruction artifact"}`);
    lines.push(
      `- Catalog successfully reconstructed before failure: ${migrationOnly.tables?.length ?? 0} tables, ${migrationOnly.functions?.length ?? 0} functions, ${migrationOnly.policies?.length ?? 0} policies (partial catalog captured after the failing migration stopped apply)`
    );
    lines.push(
      `- Applied migrations before failure: ${(mo?.appliedMigrations ?? []).length}`
    );
  }
  lines.push("");

  const h = harness?.reconstruction;
  lines.push("### B. Harness (TEST-HARNESS reconstruction)");
  lines.push("");
  if (!harness) {
    lines.push("_Artifact missing._");
  } else if (h?.success) {
    lines.push("- Result: **SUCCEEDED**");
    if (mo?.success) {
      lines.push(
        "- Post–PR 2A: migration-only also succeeds; harness is retained for comparison only and is **not** the canonical repository surface."
      );
      lines.push(
        "- `supabase/tests/00_auth_stub.sql` no longer creates a product-table `public.subscriptions` stub (removed in PR 2A)."
      );
    } else {
      lines.push(
        "- Why harness can succeed when migration-only fails: `supabase/tests/00_auth_stub.sql` may supply prerequisite auth/test state that is **not** created by migrations."
      );
      lines.push(
        "- This does **not** prove that git migrations alone can rebuild an equivalent catalog."
      );
    }
    lines.push(`- Tables reconstructed: ${harness.tables?.length ?? 0}`);
  } else {
    lines.push("- Result: **FAILED**");
    lines.push(`- Failed at: \`${h?.failedAtMigration ?? "unknown"}\``);
    lines.push(`- Error: ${h?.error ?? meta.harnessStatus ?? ""}`);
  }
  lines.push("");
  return lines;
}

function renderCandidateResolutions(records, production) {
  const lines = [];
  lines.push("## High-priority candidate resolutions (evidence only)");
  lines.push("");
  lines.push(
    "Object disposition remains governed by ADR 0007. `INTENTIONAL_LEGACY_MAP` is empty unless a disposition has been accepted. Advisor objects are **not** classified removable while ADR 0011 is unresolved."
  );
  lines.push("");
  lines.push("| Candidate | In production | Drift classes observed | ADR 0007 status |");
  lines.push("|---|---|---|---|");

  const nonMatch = records.filter((r) => r.class !== DRIFT_CLASSES.MATCH);
  for (const name of HIGH_PRIORITY_CANDIDATE_NAMES) {
    const inProd =
      production?.tables?.some((t) => t.name === name) ||
      production?.functions?.some((f) => f.name === name) ||
      false;
    const related = nonMatch.filter(
      (r) => r.name === name || r.name.startsWith(`${name}.`) || r.name.startsWith(`${name}(`)
    );
    const classes = [...new Set(related.map((r) => r.class))].sort();
    lines.push(
      `| \`${name}\` | ${inProd ? "yes" : production ? "no" : "unknown"} | ${classes.length ? classes.map((c) => `\`${c}\``).join(", ") : "(no non-match records)"} | unknown_founder_decision (no accepted disposition) |`
    );
  }
  lines.push("");
  lines.push(
    "Also review grant_mismatch / policy_rls_mismatch / function_rpc_mismatch class totals in the Summary for privilege, RLS/policy, and RPC surface drift."
  );
  lines.push("");
  return lines;
}

function renderMarkdown({ meta, summary, records, harnessStubDelta, productionSummary, migrationOnly, harness, production }) {
  const lines = [];
  lines.push("# Schema Drift Report");
  lines.push("");
  lines.push(`Generated: ${meta.generatedAt}`);
  lines.push("");
  lines.push(
    "Authority: `docs/adr/0006-database-schema-source-of-truth.md`, `docs/adr/0007-legacy-schema-disposition.md`. This report is evidence only — no mutation is authorized by its contents (`mutationRecommendation` is always `NONE`)."
  );
  lines.push("");
  lines.push("## Source availability");
  lines.push("");
  lines.push("| Surface | Available | Notes |");
  lines.push("|---|---|---|");
  lines.push(`| production (A) | ${meta.sources.production ? "yes" : "**no**"} | ${productionSummary.status === "not_captured" ? productionSummary.note : `projectRef=${productionSummary.projectRef ?? "n/a"}; captured ${productionSummary.capturedAt}`} |`);
  lines.push(`| migration_only (B, TRUE reconstruction) | ${meta.sources.migrationOnly ? "yes" : "**no**"} | ${meta.migrationOnlyStatus ?? ""} |`);
  lines.push(`| harness (TEST-HARNESS reconstruction) | ${meta.sources.harness ? "yes" : "**no**"} | ${meta.harnessStatus ?? ""} |`);
  lines.push(`| types.ts (C, derived) | ${meta.sources.types ? "yes" : "**no**"} | never authoritative (ADR 0006 §1.5) |`);
  lines.push("");

  lines.push(...renderReconstructionEvidence(meta, migrationOnly, harness));

  lines.push("## Summary");
  lines.push("");
  lines.push(`Total classified drift records: **${summary.totalRecords}**. High-priority non-match records: **${summary.highPriorityNonMatchCount}**.`);
  lines.push("");
  lines.push("| Class | Count |");
  lines.push("|---|---|");
  for (const [cls, count] of Object.entries(summary.byClass).sort()) {
    lines.push(`| \`${cls}\` | ${count} |`);
  }
  lines.push("");
  lines.push("| Compare surface | Count |");
  lines.push("|---|---|");
  for (const [surface, count] of Object.entries(summary.bySurface).sort()) {
    lines.push(`| \`${surface}\` | ${count} |`);
  }
  lines.push("");

  const nonMatch = records.filter((r) => r.class !== DRIFT_CLASSES.MATCH);
  const highPriority = nonMatch.filter((r) => r.highPriority);
  const grantMismatches = nonMatch.filter((r) => r.class === DRIFT_CLASSES.GRANT_MISMATCH);

  lines.push("## Grant mismatches");
  lines.push("");
  lines.push(`Total \`grant_mismatch\` records: **${grantMismatches.length}**.`);
  lines.push("");
  if (grantMismatches.length === 0) {
    lines.push("_None recorded._");
  } else {
    const byIssue = {};
    for (const r of grantMismatches) {
      const issue = r.details?.issue ?? "unknown";
      byIssue[issue] = (byIssue[issue] ?? 0) + 1;
    }
    lines.push("| Issue | Count |");
    lines.push("|---|---|");
    for (const [issue, count] of Object.entries(byIssue).sort()) {
      lines.push(`| \`${issue}\` | ${count} |`);
    }
    lines.push("");
    lines.push(
      "Privilege identity compared: schema + object type + object identity (function signature where applicable) + grantee + privilege type + is_grantable."
    );
    lines.push("");
    lines.push(
      "After Epic 6 PR 2D tip migration (`20260808020000_*`), new `privilege_only_in_a` grant rows for revoked client privileges are **approved remediation pending production application** — not a regression. See `docs/database/GRANT_REMEDIATION_PR2D.md`. Production capture is unchanged until a founder-authorized apply."
    );
  }
  lines.push("");

  lines.push(...renderCandidateResolutions(records, production));

  lines.push("## High-priority findings");
  lines.push("");
  if (highPriority.length === 0) {
    lines.push("_None recorded (either no drift, or no comparable surfaces available yet)._");
  } else {
    lines.push("| Object | Surface | Class | Consumers |");
    lines.push("|---|---|---|---|");
    for (const r of highPriority) {
      lines.push(
        `| \`${r.objectType}:${r.schema}.${r.name}\` | ${r.compareSurface} | \`${r.class}\` | ${r.consumers.join(", ") || "—"} |`
      );
    }
  }
  lines.push("");

  lines.push("## All classified findings");
  lines.push("");
  if (nonMatch.length === 0) {
    lines.push("_None recorded (either no drift, or no comparable surfaces available yet)._");
  } else {
    lines.push("| Object | Surface | Class | High priority |");
    lines.push("|---|---|---|---|");
    for (const r of nonMatch) {
      lines.push(
        `| \`${r.objectType}:${r.schema}.${r.name}\` | ${r.compareSurface} | \`${r.class}\` | ${r.highPriority ? "yes" : ""} |`
      );
    }
  }
  lines.push("");

  lines.push("## TEST-HARNESS-only delta (informational, not classified)");
  lines.push("");
  lines.push(
    "Informational delta between harness and migration-only reconstructions. After PR 2A, migration-only is the principal repository surface; harness-only differences are **not** canonical production drift. Empty delta means the two reconstructions agree structurally for compared categories."
  );
  lines.push("");
  if (!harnessStubDelta) {
    lines.push("_Not available — requires both reconstruction artifacts._");
  } else if (harnessStubDelta.length === 0) {
    lines.push("_No delta detected between the two reconstructions._");
  } else {
    lines.push("| Object | Class |");
    lines.push("|---|---|");
    for (const r of harnessStubDelta) {
      lines.push(`| \`${r.objectType}:${r.schema}.${r.name}\` | \`${r.class}\` |`);
    }
  }
  lines.push("");

  return lines.join("\n");
}

export function buildDriftReport() {
  const production = loadJsonIfExists(PRODUCTION_CATALOG_PATH);
  const migrationOnlyArtifact = loadJsonIfExists(MIGRATION_ONLY_PATH);
  const harnessArtifact = loadJsonIfExists(HARNESS_PATH);
  const typesAvailable = existsSync(TYPES_PATH);
  const parsedTypes = typesAvailable ? parseSupabaseTypes(readFileSync(TYPES_PATH, "utf8")) : null;

  const migrationOnly = migrationOnlyArtifact;
  const harness = harnessArtifact;

  const records = [
    ...compareAgainstProduction(production, migrationOnly, "migration_only"),
    ...compareAgainstProduction(production, harness, "harness"),
  ];

  if (parsedTypes) {
    const typesSourceCatalog = production ?? migrationOnly ?? harness;
    const typesSourceLabel = production ? "production" : migrationOnly ? "migration_only" : harness ? "harness" : null;
    if (typesSourceCatalog && typesSourceLabel) {
      records.push(...compareTypesAgainstCatalog(typesSourceCatalog, parsedTypes, typesSourceLabel));
    }
  }

  const harnessStubDelta = compareHarnessStubDelta(migrationOnly, harness);

  const summary = summarizeDriftRecords(records);

  const meta = {
    generatedAt: new Date().toISOString(),
    sources: {
      production: Boolean(production),
      migrationOnly: Boolean(migrationOnly),
      harness: Boolean(harness),
      types: typesAvailable,
    },
    migrationOnlyStatus: migrationOnly
      ? migrationOnly.reconstruction?.success
        ? "reconstruction succeeded"
        : `reconstruction FAILED at ${migrationOnly.reconstruction?.failedAtMigration ?? "unknown step"}`
      : "not run — run `npm run schema:reconstruct -- --mode migration_only`",
    harnessStatus: harness
      ? harness.reconstruction?.success
        ? "reconstruction succeeded"
        : `reconstruction FAILED at ${harness.reconstruction?.failedAtMigration ?? "unknown step"}`
      : "not run — run `npm run schema:reconstruct -- --mode harness`",
  };

  const productionSummary = buildProductionSummary(production);
  const productionFingerprint = buildProductionFingerprint(production);

  const driftReportJson = {
    meta,
    summary,
    records,
    harnessStubDelta: harnessStubDelta ?? [],
  };

  const markdown = renderMarkdown({
    meta,
    summary,
    records,
    harnessStubDelta,
    productionSummary,
    migrationOnly,
    harness,
    production,
  });

  for (const artifact of [driftReportJson, productionSummary, productionFingerprint]) {
    assertCatalogIsSafeToWrite(artifact);
  }
  assertNoHighConfidenceSecrets(markdown, "SCHEMA_DRIFT_REPORT.md");

  for (const path of [DRIFT_REPORT_JSON_PATH, SUMMARY_PATH, FINGERPRINT_PATH]) {
    mkdirSync(dirname(path), { recursive: true });
  }

  writeFileSync(DRIFT_REPORT_JSON_PATH, `${stableStringify(driftReportJson)}\n`, "utf8");
  writeFileSync(DRIFT_REPORT_MD_PATH, `${markdown}\n`, "utf8");
  writeFileSync(SUMMARY_PATH, `${stableStringify(productionSummary)}\n`, "utf8");
  writeFileSync(FINGERPRINT_PATH, `${stableStringify(productionFingerprint)}\n`, "utf8");

  return {
    driftReportJsonPath: DRIFT_REPORT_JSON_PATH,
    driftReportMdPath: DRIFT_REPORT_MD_PATH,
    summaryPath: SUMMARY_PATH,
    fingerprintPath: FINGERPRINT_PATH,
    totalRecords: summary.totalRecords,
  };
}

async function main() {
  const result = buildDriftReport();
  process.stdout.write(
    `Wrote drift report (${result.totalRecords} classified records):\n  ${result.driftReportJsonPath}\n  ${result.driftReportMdPath}\n  ${result.summaryPath}\n  ${result.fingerprintPath}\n`
  );
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
