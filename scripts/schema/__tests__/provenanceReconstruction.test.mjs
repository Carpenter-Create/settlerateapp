/**
 * Epic 6 PR 2A — prove migration-only reconstruction no longer depends on
 * the harness subscriptions stub, and that scoped structural parity holds
 * against the production-backed definitions restored in
 * 20260112193137_restore_subscriptions_profiles_provenance.sql.
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
const CONTAINER = "settlerate-schema-pr2a-provenance";
const PORT = 54342;
const DB = "pr2a_provenance";
const USER = "postgres";
const PASS = "postgres";

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: "pipe", encoding: "utf8", ...opts }).trim();
}

/** Same minimal auth/storage stub as reconstructLocal migration_only (no product tables). */
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
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, authenticated, service_role;
GRANT authenticated TO authenticator;
`;

describe("PR 2A migration-only provenance reconstruction", () => {
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

    // Assert stub did NOT create subscriptions — test harness must not be required.
    const pre = await client.query(
      `SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = 'subscriptions'`
    );
    expect(pre.rowCount).toBe(0);

    const migrations = readdirSync(join(root, "supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    expect(migrations.some((f) => f.startsWith("20260112193137_"))).toBe(true);

    for (const file of migrations) {
      const sql = readFileSync(join(root, "supabase/migrations", file), "utf8");
      try {
        await client.query(sql);
      } catch (error) {
        throw new Error(`Migration failed at ${file}: ${error.message}`);
      }
    }
  }, 300_000);

  afterAll(async () => {
    await client?.end().catch(() => {});
    removeDockerContainer(CONTAINER, run);
  });

  it("applies the full migration chain without 00_auth_stub subscriptions", async () => {
    const { rows } = await client.query(
      `SELECT 1 AS ok FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = 'subscriptions'`
    );
    expect(rows).toHaveLength(1);
  });

  it("matches production-backed subscriptions column shape (scoped)", async () => {
    const { rows } = await client.query(`
      SELECT column_name, is_nullable, column_default, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'subscriptions'
      ORDER BY ordinal_position
    `);
    const byName = Object.fromEntries(rows.map((r) => [r.column_name, r]));
    for (const col of [
      "id",
      "user_id",
      "stripe_subscription_id",
      "stripe_customer_id",
      "plan_key",
      "status",
      "current_period_end",
      "cancel_at_period_end",
      "created_at",
      "updated_at",
    ]) {
      expect(byName[col], col).toBeTruthy();
    }
    expect(byName.stripe_subscription_id.is_nullable).toBe("NO");
    expect(byName.stripe_customer_id.is_nullable).toBe("NO");
    expect(byName.plan_key.is_nullable).toBe("NO");
    expect(byName.status.is_nullable).toBe("NO");
    expect(byName.created_at.is_nullable).toBe("NO");
  });

  it("enables RLS and keeps subscriptions_select_own", async () => {
    const { rows: rls } = await client.query(`
      SELECT c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'subscriptions'
    `);
    expect(rls[0].rls_enabled).toBe(true);
    expect(rls[0].rls_forced).toBe(false);

    const { rows: policies } = await client.query(`
      SELECT policyname, cmd FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'subscriptions'
    `);
    expect(policies.map((p) => p.policyname)).toContain("subscriptions_select_own");
  });

  it("attaches protect_admin triggers from the subsequent migration (not lost)", async () => {
    const { rows } = await client.query(`
      SELECT t.tgname
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'subscriptions' AND NOT t.tgisinternal
      ORDER BY t.tgname
    `);
    const names = rows.map((r) => r.tgname);
    expect(names).toContain("trg_protect_admin_subscriptions_ins");
    expect(names).toContain("trg_protect_admin_subscriptions_upd");
    expect(names).toContain("update_subscriptions_updated_at");
  });

  it("includes the four production profiles columns with expected nullability/defaults", async () => {
    const { rows } = await client.query(`
      SELECT column_name, is_nullable, column_default, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles'
        AND column_name IN ('stripe_customer_id','plan_key','plan_status','current_period_end')
      ORDER BY column_name
    `);
    const byName = Object.fromEntries(rows.map((r) => [r.column_name, r]));
    expect(byName.stripe_customer_id.is_nullable).toBe("YES");
    expect(byName.plan_key.is_nullable).toBe("NO");
    expect(byName.plan_status.is_nullable).toBe("NO");
    expect(byName.current_period_end.is_nullable).toBe("YES");
    expect(byName.plan_key.column_default).toMatch(/core/);
    expect(byName.plan_status.column_default).toMatch(/active/);

    const { rows: uniq } = await client.query(`
      SELECT 1 FROM pg_constraint
      WHERE conname = 'profiles_stripe_customer_id_key'
        AND conrelid = 'public.profiles'::regclass
    `);
    expect(uniq).toHaveLength(1);
  });
});
