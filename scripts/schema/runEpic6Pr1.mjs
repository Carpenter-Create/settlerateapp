#!/usr/bin/env node
/**
 * Epic 6 PR 1 orchestrator: runs both local reconstructions
 * (migration_only, harness) and then builds the drift report, assuming a
 * production catalog artifact has already been placed at
 * docs/database/production-schema/production-schema-catalog.json by a
 * separately authorized, separately run `npm run schema:capture` against a
 * real production read-only connection.
 *
 * This script never requires production credentials itself and never
 * attempts to reach production — it is safe to run in CI. If the
 * production artifact is absent, the drift report is still produced (with
 * `sources.production: false` and an explanatory note), so this can be
 * used to validate the migration_only/harness/types comparisons alone.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import process from "node:process";

import { reconstructLocal } from "./reconstructLocal.mjs";
import { buildDriftReport } from "./buildDriftReport.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const PRODUCTION_CATALOG_PATH = join(root, "docs/database/production-schema/production-schema-catalog.json");

export async function runEpic6Pr1() {
  const productionAvailable = existsSync(PRODUCTION_CATALOG_PATH);
  if (!productionAvailable) {
    process.stdout.write(
      "[schema:epic6-pr1] No production catalog found at docs/database/production-schema/production-schema-catalog.json.\n" +
        "[schema:epic6-pr1] Proceeding without production comparison (CI-safe; production capture is a separate, separately authorized step).\n"
    );
  }

  process.stdout.write("[schema:epic6-pr1] Reconstructing migration_only (TRUE migration-only reconstruction)...\n");
  const migrationOnlyResult = await reconstructLocal({ mode: "migration_only" });
  process.stdout.write(
    `[schema:epic6-pr1] migration_only reconstruction: ${migrationOnlyResult.success ? "SUCCEEDED" : `FAILED at ${migrationOnlyResult.failedAtMigration ?? "capture step"}`}\n`
  );

  process.stdout.write("[schema:epic6-pr1] Reconstructing harness (TEST-HARNESS reconstruction)...\n");
  const harnessResult = await reconstructLocal({ mode: "harness" });
  process.stdout.write(
    `[schema:epic6-pr1] harness reconstruction: ${harnessResult.success ? "SUCCEEDED" : `FAILED at ${harnessResult.failedAtMigration ?? "capture step"}`}\n`
  );

  process.stdout.write("[schema:epic6-pr1] Building drift report...\n");
  const driftResult = buildDriftReport();
  process.stdout.write(
    `[schema:epic6-pr1] Drift report written (${driftResult.totalRecords} classified records):\n` +
      `  ${driftResult.driftReportJsonPath}\n  ${driftResult.driftReportMdPath}\n  ${driftResult.summaryPath}\n  ${driftResult.fingerprintPath}\n`
  );

  return { productionAvailable, migrationOnlyResult, harnessResult, driftResult };
}

async function main() {
  await runEpic6Pr1();
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
