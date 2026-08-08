/**
 * Epic 6 PR 2D — migration-only privilege contract (no CI GRANT ALL overlay).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  removeDockerContainer,
  startPostgresContainer,
  waitForPostgresReady,
} from "../../lib/postgresDockerReadiness.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../../..");
const CONTAINER = "settlerate-schema-pr2d-grants";
const PORT = 54343;
const DB = "pr2d_grants";
const USER = "postgres";
const PASS = "postgres";

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: "pipe", encoding: "utf8", ...opts }).trim();
}

const MINIMAL_STUB = `
CREATE SCHEMA IF NOT EXISTS auth;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE OR REPLACE FUNCTION extensions.gen_random_bytes(p_len integer)
RETURNS bytea LANGUAGE sql IMMUTABLE AS $$ SELECT public.gen_random_bytes(p_len); $$;
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  email character varying(255),
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE SCHEMA IF NOT EXISTS storage;
CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY, name text NOT NULL, public boolean NOT NULL DEFAULT false,
  file_size_limit bigint, allowed_mime_types text[]
);
CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id), name text, owner uuid,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(), metadata jsonb DEFAULT '{}'::jsonb
);
CREATE OR REPLACE FUNCTION storage.foldername(name text) RETURNS text[]
LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array(name, '/'); $$;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'anon');
$$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'postgres';
  END IF;
END
$$;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT SELECT ON auth.users TO authenticated, service_role;
GRANT authenticated TO authenticator;
`;

describe("PR 2D migration-only grant least privilege", () => {
  let client;

  beforeAll(async () => {
    startPostgresContainer({
      containerName: CONTAINER,
      password: PASS,
      hostPort: PORT,
      exec: run,
    });
    await waitForPostgresReady({ containerName: CONTAINER, user: USER, exec: run });
    run(`docker exec ${CONTAINER} psql -U ${USER} -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${DB};"`);
    run(`docker exec ${CONTAINER} psql -U ${USER} -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB};"`);

    client = new pg.Client({
      host: "127.0.0.1",
      port: PORT,
      user: USER,
      password: PASS,
      database: DB,
    });
    await client.connect();
    await client.query(MINIMAL_STUB);

    const migrationDir = join(root, "supabase/migrations");
    const files = readdirSync(migrationDir).filter((f) => f.endsWith(".sql")).sort();
    expect(files.some((f) => f.includes("epic6_pr2d_grant_least_privilege"))).toBe(true);

    for (const file of files) {
      await client.query(readFileSync(join(migrationDir, file), "utf8"));
    }
  }, 180_000);

  afterAll(async () => {
    try {
      await client?.end();
    } catch {
      /* ignore */
    }
    removeDockerContainer(CONTAINER, run);
  });

  it("applies privilege SQL assertions from epic6_pr2d_grant_privileges.sql", async () => {
    const sql = readFileSync(join(root, "supabase/tests/epic6_pr2d_grant_privileges.sql"), "utf8");
    await expect(client.query(sql)).resolves.toBeTruthy();
  });

  it("keeps protect_admin triggers wired after privilege remediation", async () => {
    const { rows } = await client.query(`
      SELECT t.tgname
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'subscriptions'
        AND NOT t.tgisinternal
        AND t.tgname LIKE 'trg_protect_admin_subscriptions%'
      ORDER BY 1
    `);
    expect(rows.map((r) => r.tgname)).toEqual([
      "trg_protect_admin_subscriptions_ins",
      "trg_protect_admin_subscriptions_upd",
    ]);
  });

  it("does not disable subscriptions RLS", async () => {
    const { rows } = await client.query(`
      SELECT c.relrowsecurity AS rls_enabled
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'subscriptions'
    `);
    expect(rows[0]?.rls_enabled).toBe(true);
  });
});
