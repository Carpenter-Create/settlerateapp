#!/usr/bin/env node
/**
 * Production deploy gate (ADR 0014).
 *
 * Modes:
 *   plan  — enumerate pending migrations / print plan; never mutates
 *   apply — refused unless ALLOW_PRODUCTION_DEPLOY=true AND
 *           PRODUCTION_DEPLOY_CONFIRM=founder-authorized-production-deploy
 *
 * Epic 9 must keep apply blocked. This tool never runs db push itself;
 * even when apply is unlocked it only emits an execution plan JSON for a
 * separately authorized operator package.
 */
import { writeFileSync } from "node:fs";
import {
  compareMigrationLedgers,
  defaultMigrationsDir,
  listRepositoryMigrationVersions,
} from "./migrationLedger.mjs";
import { fetchRemoteMigrationVersions } from "./fetchRemoteMigrationVersions.mjs";
import {
  PRODUCTION_SUPABASE_REF,
  STAGING_SUPABASE_REF,
  assertRoleProjectRef,
} from "./projectRefs.mjs";

function argValue(argv, name) {
  const i = argv.indexOf(name);
  if (i === -1) return null;
  return argv[i + 1] ?? null;
}

function applyUnlocked() {
  return (
    process.env.ALLOW_PRODUCTION_DEPLOY === "true" &&
    process.env.PRODUCTION_DEPLOY_CONFIRM ===
      "founder-authorized-production-deploy"
  );
}

async function main() {
  const argv = process.argv.slice(2);
  const mode = argValue(argv, "--mode") || "plan";
  const projectRef = argValue(argv, "--project-ref") || PRODUCTION_SUPABASE_REF;
  const gitSha = argValue(argv, "--git-sha") || process.env.GITHUB_SHA || null;
  const requireStagingVerified = !argv.includes("--allow-unverified-sha");

  const gate = assertRoleProjectRef("production", projectRef);
  if (!gate.ok) {
    console.error(JSON.stringify({ ok: false, error: gate.reason }));
    process.exit(1);
  }

  // Refuse staging ref even if somehow passed role checks elsewhere
  if (projectRef === STAGING_SUPABASE_REF) {
    console.error(JSON.stringify({ ok: false, error: "production_gate_got_staging_ref" }));
    process.exit(1);
  }

  if (mode !== "plan" && mode !== "apply") {
    console.error(JSON.stringify({ ok: false, error: `unknown_mode:${mode}` }));
    process.exit(2);
  }

  const stagingVerified = process.env.STAGING_VERIFIED_SHA || "";
  if (requireStagingVerified) {
    if (!gitSha || !stagingVerified || stagingVerified !== gitSha) {
      console.error(
        JSON.stringify({
          ok: false,
          error: "unverified_sha_cannot_be_promoted",
          gitSha,
          stagingVerifiedSha: stagingVerified || null,
        }),
      );
      process.exit(1);
    }
  }

  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error(JSON.stringify({ ok: false, error: "SUPABASE_ACCESS_TOKEN_missing" }));
    process.exit(1);
  }

  const repoVersions = listRepositoryMigrationVersions(defaultMigrationsDir());
  const targetVersions = await fetchRemoteMigrationVersions(projectRef, {
    accessToken: token,
  });
  const comparison = compareMigrationLedgers(repoVersions, targetVersions, {
    mode: "tip_anchored",
  });

  if (comparison.status === "diverged") {
    const report = {
      ok: false,
      mode,
      error: "migration_ledger_diverged",
      projectRef,
      gitSha,
      comparison,
      mutation: "none",
    };
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const irreversibleRisk =
    "Database migrations are forward-fix only. Pending versions cannot be auto-rolled back.";

  if (mode === "apply") {
    if (!applyUnlocked()) {
      const report = {
        ok: false,
        mode: "apply",
        error: "production_apply_blocked",
        detail:
          "Set ALLOW_PRODUCTION_DEPLOY=true and PRODUCTION_DEPLOY_CONFIRM=founder-authorized-production-deploy only under a separate founder package. Epic 9 must not unlock apply.",
        projectRef,
        gitSha,
        comparison,
        mutation: "none",
        irreversibleRisk,
      };
      console.log(JSON.stringify(report, null, 2));
      process.exit(1);
    }
    // Even when unlocked, this Epic tooling does not mutate — emits plan only.
    const report = {
      ok: false,
      mode: "apply",
      error: "production_apply_not_implemented_in_epic9_tooling",
      detail:
        "Apply remains a separate founder-authorized execution package. Gate refused mutation.",
      projectRef,
      gitSha,
      comparison,
      mutation: "none",
      irreversibleRisk,
      plannedSteps: [
        "assert production project ref",
        "show pending migrations",
        "founder-approved migration apply package",
        "Edge deploy from same SHA",
        "SPA via Vercel Git same SHA",
        "post-deploy verification",
      ],
    };
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  // plan mode
  const report = {
    ok: true,
    mode: "plan",
    projectRef,
    gitSha,
    stagingVerifiedSha: stagingVerified || null,
    comparison,
    pendingMigrations: comparison.pending,
    historicalTargetOnlyCount: comparison.historicalTargetOnly?.length ?? 0,
    notes: [
      "No production mutation performed.",
      "Tip-anchored ledger mode: pre-tip historical version skew is audited, not repaired.",
      "Naive supabase db push to production is forbidden.",
      "Epic 8 migration 20260808200000 must not be applied without Epic 8 production activation package.",
      "Phase 7B remains paused; CHECKOUT_MAINTENANCE must remain true in production.",
    ],
    irreversibleRisk,
    mutation: "none",
    next: "Require separate founder authorization to unlock apply package.",
  };

  const out = argValue(argv, "--out");
  const text = JSON.stringify(report, null, 2);
  if (out) writeFileSync(out, `${text}\n`);
  console.log(text);
}

main().catch((err) => {
  console.error(String(err?.stack || err));
  process.exit(1);
});
