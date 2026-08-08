#!/usr/bin/env node
/**
 * Epic 6 PR 2E — regenerate src/integrations/supabase/types.ts from a fresh
 * migration-only reconstruction (ADR 0006: types are derived, never SoT).
 *
 * Does not connect to production. Does not mutate production.
 *
 * Usage: node scripts/schema/generateTypesFromMigrationOnly.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import process from "node:process";
import {
  reconstructLocal,
  cleanupKeptReconstructionDb,
} from "./reconstructLocal.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const TYPES_PATH = join(root, "src/integrations/supabase/types.ts");

async function main() {
  const result = await reconstructLocal({ mode: "migration_only", keepDb: true });
  if (!result.success) {
    throw new Error(
      `migration_only reconstruction failed at ${result.failedAtMigration ?? "unknown"}; refusing to generate types`
    );
  }

  try {
    const types = execFileSync(
      "npx",
      [
        "supabase",
        "gen",
        "types",
        "typescript",
        "--db-url",
        result.dbUrl,
        "--schema",
        "public",
      ],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
    if (!types.includes("export type Database")) {
      throw new Error("supabase gen types output missing Database export");
    }
    if (
      !types.includes("admin_bootstrap_tokens") ||
      !types.includes("stripe_webhook_events") ||
      !types.includes("entitlement_bypass_log")
    ) {
      throw new Error(
        "generated types missing one or more PR 2E target tables (admin_bootstrap_tokens / stripe_webhook_events / entitlement_bypass_log)"
      );
    }
    writeFileSync(TYPES_PATH, types.endsWith("\n") ? types : `${types}\n`, "utf8");
    process.stdout.write(`Wrote ${TYPES_PATH}\n`);
  } finally {
    cleanupKeptReconstructionDb();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  try {
    cleanupKeptReconstructionDb();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
