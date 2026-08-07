#!/usr/bin/env node
/**
 * Epic 6 PR 1 — read-only production (or any externally reachable) schema
 * capture. Supports two mutually exclusive auth transports:
 *
 *   1. SCHEMA_CAPTURE_DATABASE_URL  — direct Postgres connection (pg),
 *      forced into BEGIN READ ONLY.
 *   2. --linked                     — Supabase CLI Management API via
 *      `supabase db query --linked` (temporary login role). Each statement
 *      is allowlisted (SELECT/SHOW only) and wrapped in
 *      `BEGIN READ ONLY; …; COMMIT;` so the *current* transaction is
 *      read-only (not merely `default_transaction_read_only`).
 *
 * Introspects pg_catalog/information_schema only, and writes a sanitized,
 * normalized catalog JSON artifact. Never mutates the target database,
 * never selects row payloads (only allowlisted COUNT(*)), and never logs
 * connection strings. See docs/adr/0006-database-schema-source-of-truth.md §6.
 *
 * Usage:
 *   SCHEMA_CAPTURE_DATABASE_URL=postgres://... \
 *     node scripts/schema/captureFromDatabase.mjs \
 *       --surface production \
 *       --out docs/database/production-schema/production-schema-catalog.json \
 *       [--project-ref vpcxzbaxhpucvevnkalo] \
 *       [--git-sha $(git rev-parse HEAD)]
 *
 *   # Or, when CLI is already linked/authenticated to SettleRate:
 *   node scripts/schema/captureFromDatabase.mjs \
 *       --linked \
 *       --surface production \
 *       --out docs/database/production-schema/production-schema-catalog.json \
 *       --project-ref vpcxzbaxhpucvevnkalo
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import pg from "pg";

import { buildCatalog } from "./lib/catalogSql.mjs";
import { createLinkedQueryClient, LINKED_READ_ONLY_PROTECTIONS } from "./lib/linkedQueryClient.mjs";
import { normalizeCatalog, stableStringify } from "./lib/normalize.mjs";
import { assertCatalogIsSafeToWrite, assertNoHighConfidenceSecrets, requireDatabaseUrlEnv } from "./lib/sanitize.mjs";

const VALID_SURFACES = new Set(["production", "migration_only", "harness"]);
const TOOLING_VERSION = "epic6-pr1-schema-capture/1.1.1";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");

export function parseArgs(argv) {
  const args = { surface: null, out: null, projectRef: null, gitSha: null, linked: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--surface") args.surface = argv[++i];
    else if (arg === "--out") args.out = argv[++i];
    else if (arg === "--project-ref") args.projectRef = argv[++i];
    else if (arg === "--git-sha") args.gitSha = argv[++i];
    else if (arg === "--linked") args.linked = true;
    else throw new Error(`Unrecognized argument: ${arg}`);
  }
  if (!args.surface || !VALID_SURFACES.has(args.surface)) {
    throw new Error(`--surface is required and must be one of: ${[...VALID_SURFACES].join(", ")}`);
  }
  if (!args.out) {
    throw new Error("--out <path> is required");
  }
  return args;
}

function detectGitSha() {
  try {
    return execSync("git rev-parse HEAD", { stdio: "pipe", encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function detectNodeVersion() {
  return process.version;
}

function detectLinkedProjectRef() {
  const path = join(root, "supabase/.temp/project-ref");
  if (!existsSync(path)) return null;
  try {
    // Dynamic import of fs read — keep sync and never throw secrets.
    return readFileSync(path, "utf8").trim() || null;
  } catch {
    return null;
  }
}

async function detectPostgresServerVersion(client) {
  const { rows } = await client.query("SHOW server_version");
  // SHOW returns either { server_version } (pg) or { server_version } / first column.
  const row = rows[0] ?? {};
  return row.server_version ?? Object.values(row)[0] ?? null;
}

async function detectPgClientVersion() {
  try {
    const pkg = await import("pg/package.json", { with: { type: "json" } });
    return pkg.default?.version ?? null;
  } catch {
    return null;
  }
}

/**
 * Connect and force a read-only transaction for the entire capture. Never
 * logs `databaseUrl` — not in errors, not in stdout.
 */
async function withReadOnlyPgClient(databaseUrl, fn) {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query("SET default_transaction_read_only = on");
    await client.query("BEGIN READ ONLY");
    try {
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    }
  } finally {
    await client.end();
  }
}

async function withLinkedReadOnlyClient(projectRef, fn) {
  const client = createLinkedQueryClient({ projectRef });
  // Linked transport sets read-only per statement inside query().
  return fn(client);
}

export async function captureFromDatabase({ surface, out, projectRef, gitSha, linked }) {
  const resolvedProjectRef = projectRef ?? (linked ? detectLinkedProjectRef() : null);
  const useLinked = Boolean(linked);

  if (!useLinked && !process.env.SCHEMA_CAPTURE_DATABASE_URL) {
    throw new Error(
      "Neither SCHEMA_CAPTURE_DATABASE_URL nor --linked was provided. " +
        "For production capture: set SCHEMA_CAPTURE_DATABASE_URL to a read-only Postgres URL, " +
        "or run with --linked when `supabase` CLI is authenticated and linked to SettleRate."
    );
  }

  const captureFn = async (client) => {
    const catalog = await buildCatalog(client, { schemas: ["public", "storage"] });
    const postgresServer = await detectPostgresServerVersion(client);
    return { catalog, postgresServer };
  };

  let rawCatalog;
  let authMethod;
  if (useLinked) {
    authMethod = "supabase_db_query_linked";
    rawCatalog = await withLinkedReadOnlyClient(resolvedProjectRef, captureFn);
  } else {
    authMethod = "SCHEMA_CAPTURE_DATABASE_URL_pg_readonly";
    const databaseUrl = requireDatabaseUrlEnv("SCHEMA_CAPTURE_DATABASE_URL");
    rawCatalog = await withReadOnlyPgClient(databaseUrl, captureFn);
  }

  const normalizedSections = normalizeCatalog(rawCatalog.catalog);

  const artifact = {
    meta: {
      surface,
      capturedAt: new Date().toISOString(),
      gitSha: gitSha ?? detectGitSha(),
      projectRef: resolvedProjectRef,
      tooling: {
        version: TOOLING_VERSION,
        node: detectNodeVersion(),
        pg: useLinked ? null : await detectPgClientVersion(),
        postgresServer: rawCatalog.postgresServer,
        authMethod,
        readOnlyProtections: useLinked
          ? [...LINKED_READ_ONLY_PROTECTIONS]
          : [
              "SET default_transaction_read_only = on",
              "BEGIN READ ONLY",
              "catalogSql SELECT-only",
            ],
      },
      readOnly: true,
      schemas: ["public", "storage"],
    },
    ...normalizedSections,
  };

  // Belt-and-suspenders: structured scan first (key-aware), then a raw-text
  // high-confidence scan of the fully serialized artifact before it ever
  // touches disk.
  assertCatalogIsSafeToWrite(artifact);
  const serialized = stableStringify(artifact);
  assertNoHighConfidenceSecrets(serialized, `capture output (${out})`);

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${serialized}\n`, "utf8");

  const redactedFunctionCount = artifact.functions.filter((f) => f.definitionRedacted).length;

  return {
    outPath: out,
    tableCount: artifact.tables.length,
    functionCount: artifact.functions.length,
    redactedFunctionCount,
    authMethod,
    projectRef: resolvedProjectRef,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await captureFromDatabase(args);
  process.stdout.write(
    `Wrote ${result.outPath} (${result.tableCount} tables, ${result.functionCount} functions` +
      `${result.redactedFunctionCount ? `, ${result.redactedFunctionCount} function definition(s) redacted` : ""}` +
      `; auth=${result.authMethod}; projectRef=${result.projectRef ?? "null"})\n`
  );
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
