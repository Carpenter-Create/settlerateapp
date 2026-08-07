#!/usr/bin/env node
/**
 * Epic 6 PR 1 — local ephemeral-Postgres schema reconstruction.
 *
 * Two distinct, never-conflated reconstructions (see ADR 0006 §2, §7 and
 * this PR's explicit constraint to distinguish them):
 *
 *   --mode migration_only
 *     TRUE migration-only reconstruction: a MINIMAL auth/storage stub
 *     (enough for auth.users / auth.uid() / storage.buckets|objects to
 *     exist) WITHOUT stubbing product tables, then every
 *     supabase/migrations/*.sql file in order. After Epic 6 PR 2A,
 *     `public.subscriptions` and the four production `profiles` columns are
 *     created by migration `20260112193137_*`, so this mode is expected to
 *     succeed without `00_auth_stub.sql`. Failure is still captured in the
 *     artifact (non-zero exit) if replay breaks again.
 *
 *   --mode harness
 *     TEST-HARNESS reconstruction: the full
 *     `supabase/tests/00_auth_stub.sql` (auth/storage/test helpers — no
 *     longer stubs `public.subscriptions` after PR 2A), then all
 *     migrations — but WITHOUT the CI-only post-migration GRANT ALL overlay
 *     / `FORCE ROW LEVEL SECURITY` that scripts/test-entitlement-sql.mjs
 *     applies purely so its SQL assertions can run under `SET ROLE`. That
 *     overlay is test convenience, not schema truth.
 *
 * Output: docs/database/reconstruction/<mode>-schema.json
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import process from "node:process";
import pg from "pg";

import {
  removeDockerContainer,
  startPostgresContainer,
  waitForPostgresReady,
} from "../lib/postgresDockerReadiness.mjs";
import { buildCatalog } from "./lib/catalogSql.mjs";
import { normalizeCatalog, stableStringify } from "./lib/normalize.mjs";
import { assertCatalogIsSafeToWrite, assertNoHighConfidenceSecrets } from "./lib/sanitize.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");

const CONTAINER_NAME = "settlerate-schema-capture";
const DB_NAME = "settlerate_schema_capture";
const DB_USER = "postgres";
const DB_PASS = "postgres";
const DB_PORT = 54339;

const VALID_MODES = new Set(["migration_only", "harness"]);

/**
 * Minimal auth/storage stub for TRUE migration-only reconstruction.
 * Derived from supabase/tests/00_auth_stub.sql but deliberately narrowed to
 * only what repo migrations structurally require to apply at all (auth
 * schema/table, auth.uid()/jwt()/role(), storage schema/tables, roles,
 * pgcrypto/extensions scaffolding, and the base grants migrations rely on
 * existing before their own GRANT statements run). It intentionally OMITS:
 *   - product tables (including `public.subscriptions` — owned by migrations)
 *   - the `test` schema helper functions (test-only, not migration-required)
 */
const MINIMAL_MIGRATION_ONLY_STUB = `
-- Epic 6 minimal migration-only stub (NOT applied in production).
-- Enables repo migrations that reference auth.users / auth.uid() / storage.*
-- WITHOUT stubbing product tables (subscriptions comes from migrations).

CREATE SCHEMA IF NOT EXISTS auth;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS extensions;

CREATE OR REPLACE FUNCTION extensions.gen_random_bytes(p_len integer)
RETURNS bytea
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.gen_random_bytes(p_len);
$$;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  email character varying(255),
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean NOT NULL DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT string_to_array(name, '/');
$$;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'anon');
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'postgres';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT SELECT ON auth.users TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, authenticated, service_role;
GRANT authenticated TO authenticator;
`;

export function parseArgs(argv) {
  const args = { mode: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--mode") args.mode = argv[++i];
    else throw new Error(`Unrecognized argument: ${arg}`);
  }
  if (!args.mode || !VALID_MODES.has(args.mode)) {
    throw new Error(`--mode is required and must be one of: ${[...VALID_MODES].join(", ")}`);
  }
  return args;
}

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: "pipe", encoding: "utf8", ...opts }).trim();
}

function assertDockerAvailable() {
  try {
    run("docker info >/dev/null 2>&1");
  } catch {
    throw new Error("Docker is required for scripts/schema/reconstructLocal.mjs");
  }
}

async function ensureDockerPostgres() {
  assertDockerAvailable();
  startPostgresContainer({ containerName: CONTAINER_NAME, password: DB_PASS, hostPort: DB_PORT, exec: run });
  await waitForPostgresReady({
    containerName: CONTAINER_NAME,
    user: DB_USER,
    exec: run,
    onAttemptFailure: ({ attempt, lastError }) => {
      if (attempt === 0 || attempt % 10 === 0) {
        process.stderr.write(`[schema:reconstruct] waiting for Postgres (${attempt + 1}): ${lastError}\n`);
      }
    },
  });
  run(`docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${DB_NAME};"`);
  run(`docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME};"`);
}

function cleanupDockerPostgres() {
  removeDockerContainer(CONTAINER_NAME, run);
}

function listMigrationFiles() {
  const migrationDir = join(root, "supabase/migrations");
  return readdirSync(migrationDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => ({ name: f, path: join(migrationDir, f) }));
}

/**
 * Apply SQL files one at a time, stopping (but not throwing) at the first
 * failure so callers can still capture whatever schema state exists.
 */
async function applySqlFilesBestEffort(client, files) {
  const applied = [];
  for (const file of files) {
    const sql = readFileSync(file.path, "utf8");
    try {
      await client.query(sql);
      applied.push({ file: file.name, status: "applied" });
    } catch (error) {
      applied.push({ file: file.name, status: "failed", error: error.message });
      // A failing multi-statement simple-query string aborts only its own
      // implicit transaction; defensively reset connection state in case a
      // prior explicit BEGIN was left open by the failing file itself.
      await client.query("ROLLBACK").catch(() => {});
      return { success: false, applied, failedAt: file.name, error: error.message };
    }
  }
  return { success: true, applied, failedAt: null, error: null };
}

async function setUpMigrationOnly(client) {
  await client.query(MINIMAL_MIGRATION_ONLY_STUB);
  return applySqlFilesBestEffort(client, listMigrationFiles());
}

async function setUpHarness(client) {
  const stubPath = join(root, "supabase/tests/00_auth_stub.sql");
  const stubSql = readFileSync(stubPath, "utf8");
  await client.query(stubSql);
  // Deliberately WITHOUT the CI-only post-migration GRANT ALL overlay /
  // ALTER TABLE ... FORCE ROW LEVEL SECURITY that
  // scripts/test-entitlement-sql.mjs applies after this point — that
  // overlay exists solely so SET ROLE-based SQL assertions can run and is
  // not part of the schema itself.
  return applySqlFilesBestEffort(client, listMigrationFiles());
}

function detectGitSha() {
  try {
    return execSync("git rev-parse HEAD", { stdio: "pipe", encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

async function detectPgClientVersion() {
  try {
    const pkg = await import("pg/package.json", { with: { type: "json" } });
    return pkg.default?.version ?? null;
  } catch {
    return null;
  }
}

export async function reconstructLocal({ mode }) {
  await ensureDockerPostgres();
  try {
    const client = new pg.Client({
      host: "127.0.0.1",
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
    });
    await client.connect();

    try {
      const setupResult = mode === "migration_only" ? await setUpMigrationOnly(client) : await setUpHarness(client);

      // Best-effort catalog capture regardless of setup success, so a
      // partial reconstruction still yields evidence of what DID apply.
      let catalog = null;
      let captureError = null;
      try {
        await client.query("SET default_transaction_read_only = on");
        await client.query("BEGIN READ ONLY");
        catalog = await buildCatalog(client, { schemas: ["public", "storage"], includeRowCounts: false });
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        captureError = error.message;
      }

      const postgresServer = await client
        .query("SHOW server_version")
        .then((r) => r.rows[0]?.server_version ?? null)
        .catch(() => null);

      const normalizedCatalog = catalog ? normalizeCatalog(catalog) : null;

      const artifact = {
        meta: {
          surface: mode === "migration_only" ? "migration_only" : "harness",
          capturedAt: new Date().toISOString(),
          gitSha: detectGitSha(),
          projectRef: null,
          tooling: {
            node: process.version,
            pg: await detectPgClientVersion(),
            postgresServer,
          },
          readOnly: true,
          schemas: ["public", "storage"],
        },
        reconstruction: {
          mode,
          success: setupResult.success && captureError === null,
          failedAtMigration: setupResult.failedAt,
          error: setupResult.error ?? captureError,
          appliedMigrations: setupResult.applied,
        },
        tables: normalizedCatalog?.tables ?? [],
        views: normalizedCatalog?.views ?? [],
        enums: normalizedCatalog?.enums ?? [],
        functions: normalizedCatalog?.functions ?? [],
        triggers: normalizedCatalog?.triggers ?? [],
        constraints: normalizedCatalog?.constraints ?? [],
        indexes: normalizedCatalog?.indexes ?? [],
        policies: normalizedCatalog?.policies ?? [],
        grants: normalizedCatalog?.grants ?? [],
        extensions: normalizedCatalog?.extensions ?? [],
        migrationVersions: normalizedCatalog?.migrationVersions ?? [],
        rowCounts: [],
      };

      assertCatalogIsSafeToWrite(artifact);
      const serialized = stableStringify(artifact);
      assertNoHighConfidenceSecrets(serialized, `reconstruction output (${mode})`);

      const outPath = join(root, "docs/database/reconstruction", `${mode}-schema.json`);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, `${serialized}\n`, "utf8");

      return { outPath, success: artifact.reconstruction.success, failedAtMigration: artifact.reconstruction.failedAtMigration };
    } finally {
      await client.end();
    }
  } finally {
    cleanupDockerPostgres();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await reconstructLocal(args);
  if (result.success) {
    process.stdout.write(`Wrote ${result.outPath} (reconstruction succeeded)\n`);
  } else {
    process.stdout.write(
      `Wrote ${result.outPath} (reconstruction FAILED at ${result.failedAtMigration ?? "capture step"})\n`
    );
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
