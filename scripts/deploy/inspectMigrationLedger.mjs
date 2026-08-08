#!/usr/bin/env node
/**
 * Compare repository migration tip to a target environment ledger.
 * Fail closed on divergence. Never applies migrations.
 *
 * Usage:
 *   node scripts/deploy/inspectMigrationLedger.mjs --role staging|production
 *   node scripts/deploy/inspectMigrationLedger.mjs --role production --target-versions-file path
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  compareMigrationLedgers,
  defaultMigrationsDir,
  listRepositoryMigrationVersions,
  parseVersionListText,
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

function hasFlag(argv, name) {
  return argv.includes(name);
}

async function main() {
  const argv = process.argv.slice(2);
  const role = argValue(argv, "--role");
  if (role !== "staging" && role !== "production") {
    console.error("usage: --role staging|production [--project-ref REF]");
    process.exit(2);
  }

  const expectedRef =
    role === "staging" ? STAGING_SUPABASE_REF : PRODUCTION_SUPABASE_REF;
  const projectRef = argValue(argv, "--project-ref") || expectedRef;
  const gate = assertRoleProjectRef(role, projectRef);
  if (!gate.ok) {
    console.error(
      JSON.stringify({ ok: false, error: gate.reason, role, projectRef }, null, 2),
    );
    process.exit(1);
  }

  const repoVersions = listRepositoryMigrationVersions(defaultMigrationsDir());
  let targetVersions;
  const inline = argValue(argv, "--target-versions");
  const file = argValue(argv, "--target-versions-file");
  if (inline) {
    targetVersions = parseVersionListText(inline);
  } else if (file) {
    targetVersions = parseVersionListText(readFileSync(file, "utf8"));
  } else {
    targetVersions = await fetchRemoteMigrationVersions(projectRef);
  }

  // Staging: strict prefix. Production: tip-anchored (Epic 6 historical skew).
  const mode = role === "production" ? "tip_anchored" : "strict";
  const comparison = compareMigrationLedgers(repoVersions, targetVersions, {
    mode,
  });
  const report = {
    ok: comparison.status !== "diverged",
    role,
    projectRef,
    gitSha: process.env.DEPLOY_GIT_SHA || process.env.GITHUB_SHA || null,
    comparison,
    // Staging may apply pending when ledger is not diverged.
    stagingApplyEligible:
      role === "staging" && comparison.status !== "diverged",
    // Production apply is never authorized by this tool alone.
    productionApplyAuthorized: false,
    notes:
      mode === "tip_anchored"
        ? [
            "Production uses tip-anchored ledger comparison due to Epic 6 historical version skew.",
            "Naive supabase db push to production is forbidden — apply only explicit post-tip pending files under a founder package.",
          ]
        : [],
  };

  const text = JSON.stringify(report, null, 2);
  const out = argValue(argv, "--out");
  if (out) writeFileSync(out, `${text}\n`);
  console.log(text);

  if (comparison.status === "diverged") process.exit(1);
  if (hasFlag(argv, "--require-pending") && comparison.status !== "pending") {
    console.error("require_pending_not_met");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(String(err?.stack || err));
  process.exit(1);
});
