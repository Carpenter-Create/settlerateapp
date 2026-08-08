#!/usr/bin/env node
/**
 * Applies repo migrations to ephemeral Postgres and runs:
 * - Epic 4 PR 1 RLS inventory + core owner/non-owner/anon matrix
 * - Epic 1 admin bootstrap (creates approved admin fixture)
 * - Epic 4 PR 2 remaining relations + administrative path matrix
 * - Epic 1 legacy trigger removal / admin RPC return types
 * - Phase 6 entitlement + function-grant SQL assertions
 * - Concurrent free-tier limit + TS↔SQL entitlement parity
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  removeDockerContainer,
  startPostgresContainer,
  waitForPostgresReady,
} from "./lib/postgresDockerReadiness.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const containerName = "settlerate-entitlement-test";
const dbName = "settlerate_entitlement_test";
const dbUser = "postgres";
const dbPass = "postgres";
const dbPort = 54329;

const PROTECTED_FEATURES = [
  "scenario_create",
  "scenario_update",
  "scenario_duplicate",
  "comparison_create",
  "pdf_export",
  "share_create",
  "income_context",
  "billing_manage",
];

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: "pipe", encoding: "utf8", ...opts }).trim();
}

function psqlFile(client, filePath) {
  const sql = readFileSync(filePath, "utf8");
  return client.query(sql);
}

function assertDockerAvailable() {
  try {
    run("docker info >/dev/null 2>&1");
  } catch {
    throw new Error("Docker is required for test:entitlement-sql");
  }
}

async function ensureDockerPostgres() {
  assertDockerAvailable();

  startPostgresContainer({
    containerName,
    password: dbPass,
    hostPort: dbPort,
    exec: run,
  });

  await waitForPostgresReady({
    containerName,
    user: dbUser,
    exec: run,
    onAttemptFailure: ({ attempt, lastError }) => {
      if (attempt === 0 || attempt % 10 === 0) {
        process.stderr.write(
          `[test:entitlement-sql] waiting for Postgres (${attempt + 1}): ${lastError}\n`
        );
      }
    },
  });

  run(
    `docker exec ${containerName} psql -U ${dbUser} -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${dbName};"`
  );
  run(
    `docker exec ${containerName} psql -U ${dbUser} -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${dbName};"`
  );
}

function cleanupDockerPostgres() {
  removeDockerContainer(containerName, run);
}

async function applyMigrations(client) {
  await psqlFile(client, join(root, "supabase/tests/00_auth_stub.sql"));

  const migrationDir = join(root, "supabase/migrations");
  const files = readdirSync(migrationDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    process.stdout.write(`Applying migration ${file}...\n`);
    await psqlFile(client, join(migrationDir, file));
  }

  await client.query(`
    GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
    -- Test-only: grant anon table DML so anonymous denials are attributable to
    -- RLS / privilege checks under SET ROLE anon, not missing GRANT (ADR 0004 §5).
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
    -- Test-only: storage.objects is outside the public GRANT ALL overlay.
    GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated, service_role;
    GRANT SELECT ON storage.buckets TO anon, authenticated, service_role;
    GRANT USAGE ON SCHEMA test TO authenticated, service_role, anon;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA test TO authenticated, service_role, anon;
    ALTER TABLE public.scenarios FORCE ROW LEVEL SECURITY;
  `);
}

async function runSqlAssertions(client) {
  // Epic 4 PR 1 must run before Epic 1 / Phase 6 fixtures so admin and
  // entitlement seeds cannot contaminate the core RLS matrix.
  // Inject the committed catalog fingerprint (never derived from the live
  // query during the assertion itself).
  const expectedCatalogFp = readFileSync(
    join(root, "supabase/tests/fixtures/epic4_pr1_rls_catalog.sha256"),
    "utf8"
  ).trim();
  if (!/^[a-f0-9]{64}$/.test(expectedCatalogFp)) {
    throw new Error("Invalid epic4_pr1_rls_catalog.sha256 fixture");
  }
  await client.query(`SELECT set_config('test.epic4_pr1_expected_catalog_fp', $1, false)`, [
    expectedCatalogFp,
  ]);
  process.stdout.write("Running epic4_pr1_core_rls.sql assertions...\n");
  await psqlFile(client, join(root, "supabase/tests/epic4_pr1_core_rls.sql"));

  // epic1_admin_bootstrap.sql requires a true zero-admin starting state.
  // Once it creates an admin, that admin can never be fully removed again in
  // this test run (public.protect_admin_role_deletion_trigger), so
  // epic1_remove_admin_trigger.sql runs later and reuses that admin.
  // Epic 4 PR 2 admin-path matrix consumes the same approved bootstrap admin
  // and must run before Phase 6 entitlement fixtures contaminate assumptions.
  process.stdout.write("Running epic1_admin_bootstrap.sql assertions...\n");
  await psqlFile(client, join(root, "supabase/tests/epic1_admin_bootstrap.sql"));
  process.stdout.write("Running epic4_pr2_remaining_rls.sql assertions...\n");
  await psqlFile(client, join(root, "supabase/tests/epic4_pr2_remaining_rls.sql"));
  process.stdout.write("Running epic1_remove_admin_trigger.sql assertions...\n");
  await psqlFile(client, join(root, "supabase/tests/epic1_remove_admin_trigger.sql"));
  process.stdout.write("Running fix_admin_rpc_return_types.sql assertions...\n");
  await psqlFile(client, join(root, "supabase/tests/fix_admin_rpc_return_types.sql"));
  process.stdout.write("Running phase6_entitlement.sql assertions...\n");
  await psqlFile(client, join(root, "supabase/tests/phase6_entitlement.sql"));
  process.stdout.write("Running phase6_function_grants.sql assertions...\n");
  await psqlFile(client, join(root, "supabase/tests/phase6_function_grants.sql"));

  // Epic 6 PR 2D privilege contract: the CI GRANT ALL overlay above is for
  // RLS SET ROLE matrices (ADR 0004) and re-introduces privileges that the
  // tip migration removes. Re-apply the PR 2D migration so privilege
  // assertions see the repository least-privilege target without undoing
  // earlier RLS behavioral coverage.
  process.stdout.write("Re-applying Epic 6 PR 2D grant remediation for privilege assertions...\n");
  await psqlFile(
    client,
    join(root, "supabase/migrations/20260808020000_epic6_pr2d_grant_least_privilege.sql")
  );
  // Epic 8 tables are not in the PR 2D migration; re-apply Epic 8 revoke/grant
  // before PR 2D structural assertions that now include those relations.
  process.stdout.write("Re-applying Epic 8 stripe event evidence migration for privilege assertions...\n");
  await psqlFile(
    client,
    join(root, "supabase/migrations/20260808200000_epic8_stripe_event_evidence.sql")
  );
  process.stdout.write("Running epic6_pr2d_grant_privileges.sql assertions...\n");
  await psqlFile(client, join(root, "supabase/tests/epic6_pr2d_grant_privileges.sql"));

  // Epic 6 PR 2F: re-apply tip EXECUTE remediation after any overlay noise,
  // then assert the RPC privilege contract.
  process.stdout.write("Re-applying Epic 6 PR 2F RPC EXECUTE remediation...\n");
  await psqlFile(
    client,
    join(root, "supabase/migrations/20260808030000_epic6_pr2f_rpc_execute_least_privilege.sql")
  );
  process.stdout.write("Running epic6_pr2f_rpc_execute.sql assertions...\n");
  await psqlFile(client, join(root, "supabase/tests/epic6_pr2f_rpc_execute.sql"));

  process.stdout.write("Re-applying Epic 6 PR 2H legacy share RPC EXECUTE remediation...\n");
  await psqlFile(
    client,
    join(root, "supabase/migrations/20260808040000_epic6_pr2h_legacy_share_rpc_execute.sql")
  );
  process.stdout.write("Running epic6_pr2h_legacy_share_rpc.sql assertions...\n");
  await psqlFile(client, join(root, "supabase/tests/epic6_pr2h_legacy_share_rpc.sql"));

  process.stdout.write("Running epic8_billing_recovery.sql assertions...\n");
  await psqlFile(client, join(root, "supabase/tests/epic8_billing_recovery.sql"));
}

async function runConcurrentLimitTest(client) {
  const userId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
  await client.query(`INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
    userId,
    "concurrent@test.local",
  ]);

  // Free limit is 2: seed 1, then two concurrent creates → one success, one deny, final count 2.
  await client.query(`SELECT set_config('app.skip_scenario_entitlement', '1', true)`);
  await client.query(
    `INSERT INTO public.scenarios (user_id, name, scenario_type, inputs, derived)
     VALUES ($1, $2, 'purchase', '{}'::jsonb, '{}'::jsonb)`,
    [userId, "Concurrent seed 1"]
  );
  await client.query(`SELECT set_config('app.skip_scenario_entitlement', '0', true)`);

  const insertSql = `INSERT INTO public.scenarios (user_id, name, scenario_type, inputs, derived)
    VALUES ($1, $2, 'purchase', '{}'::jsonb, '{}'::jsonb)`;

  const attempt = async (label) => {
    const c = new pg.Client({
      host: "127.0.0.1",
      port: dbPort,
      user: dbUser,
      password: dbPass,
      database: dbName,
    });
    await c.connect();
    await c.query(`SELECT test.set_auth($1::uuid)`, [userId]);
    try {
      await c.query(insertSql, [userId, label]);
      return "ok";
    } catch (err) {
      return err.message.includes("ENTITLEMENT_DENIED") ? "denied" : err.message;
    } finally {
      await c.end();
    }
  };

  const [a, b] = await Promise.all([attempt("Concurrent A"), attempt("Concurrent B")]);
  const { rows } = await client.query(
    `SELECT count(*)::int AS n FROM public.scenarios WHERE user_id = $1`,
    [userId]
  );
  const count = rows[0].n;

  if (count > 2) {
    throw new Error(`Concurrent limit failed: count=${count}, results=${a},${b}`);
  }
  if (a !== "ok" && b !== "ok") {
    throw new Error(`Concurrent limit: expected one success, got ${a}, ${b}`);
  }
  process.stdout.write(`Concurrent limit OK (count=${count}, results=${a}/${b})\n`);
}

async function runParityTests(client) {
  // Canonical implementation (Epic 5 PR 2) — not the compatibility shims.
  const { evaluateEntitlement, isFeatureAllowed } = await import(
    join(root, "packages/core/src/entitlement/entitlementContract.ts")
  );
  const { resolveBillingRow, resolveEntitlementInput } = await import(
    join(root, "src/lib/__fixtures__/resolveEntitlementCase.ts")
  );
  const cases = JSON.parse(
    readFileSync(join(root, "src/lib/__fixtures__/entitlementCases.json"), "utf8")
  );

  const { rows: nowRows } = await client.query(`SELECT now() AS n`);
  const referenceNow = nowRows[0].n;

  for (const c of cases) {
    await client.query(`INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
      c.userId,
      `${c.label.replace(/\s+/g, "-")}@test.local`,
    ]);

    if (c.isAdmin) {
      await client.query(
        `INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'admin') ON CONFLICT DO NOTHING`,
        [c.userId]
      );
      await client.query(`DELETE FROM public.billing WHERE user_id = $1`, [c.userId]);
    } else if (c.billing === null) {
      await client.query(`DELETE FROM public.user_roles WHERE user_id = $1`, [c.userId]);
      await client.query(`DELETE FROM public.billing WHERE user_id = $1`, [c.userId]);
    } else if (c.billing) {
      const row = resolveBillingRow(c, referenceNow);
      await client.query(
        `INSERT INTO public.billing (user_id, subscription_status, price_id, current_period_end, cancel_at_period_end)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO UPDATE SET
           subscription_status = EXCLUDED.subscription_status,
           price_id = EXCLUDED.price_id,
           current_period_end = EXCLUDED.current_period_end,
           cancel_at_period_end = EXCLUDED.cancel_at_period_end`,
        [
          c.userId,
          row.subscription_status,
          row.price_id,
          row.current_period_end,
          row.cancel_at_period_end,
        ]
      );
    }

    const { rows } = await client.query(`SELECT public.evaluate_entitlement($1::uuid) AS d`, [
      c.userId,
    ]);
    const sqlDecision = rows[0].d;

    const tsDecision = evaluateEntitlement(resolveEntitlementInput(c, referenceNow));

    for (const key of [
      "entitlementStatus",
      "planCode",
      "hasProfessionalAccess",
      "cancelAtPeriodEnd",
    ]) {
      const sqlVal = sqlDecision[key];
      const tsVal = tsDecision[key];
      if (sqlVal !== tsVal && Boolean(sqlVal) !== Boolean(tsVal)) {
        throw new Error(`Parity mismatch [${c.label}] ${key}: SQL=${sqlVal} TS=${tsVal}`);
      }
      if (typeof sqlVal === "boolean" && sqlVal !== tsVal) {
        throw new Error(`Parity mismatch [${c.label}] ${key}: SQL=${sqlVal} TS=${tsVal}`);
      }
      if (typeof sqlVal === "string" && sqlVal !== tsVal) {
        throw new Error(`Parity mismatch [${c.label}] ${key}: SQL=${sqlVal} TS=${tsVal}`);
      }
    }

    if (c.expect.isAdminBypass) {
      if (sqlDecision.isAdminBypass !== true || tsDecision.isAdminBypass !== true) {
        throw new Error(`Parity mismatch [${c.label}] isAdminBypass`);
      }
    }

    for (const feature of PROTECTED_FEATURES) {
      const { rows: countRows } = await client.query(
        `SELECT count(*)::int AS n FROM public.scenarios WHERE user_id = $1`,
        [c.userId]
      );
      const scenarioCount = countRows[0].n;
      const { rows: fr } = await client.query(
        `SELECT public.feature_allowed($1::uuid, $2, NULL) AS allowed`,
        [c.userId, feature]
      );
      const sqlAllowed = fr[0].allowed;
      const tsAllowed = isFeatureAllowed(tsDecision, feature, { scenarioCount });
      if (sqlAllowed !== tsAllowed) {
        throw new Error(
          `Feature parity mismatch [${c.label}] ${feature}: SQL=${sqlAllowed} TS=${tsAllowed}`
        );
      }
    }
  }

  process.stdout.write(`Parity OK (${cases.length} fixtures × features)\n`);
}

function stripTsComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .trim();
}

/**
 * Source-of-truth gate (Epic 5 PR 6 final architecture).
 * Pure entitlement logic lives only in core; obsolete shims are deleted.
 */
function verifyEntitlementSourceOfTruth() {
  const canonical = join(
    root,
    "packages/core/src/entitlement/entitlementContract.ts"
  );
  const appShim = join(root, "src/lib/entitlementContract.ts");
  const edgeShim = join(
    root,
    "supabase/functions/_shared/entitlementContract.ts"
  );

  const canonicalSrc = readFileSync(canonical, "utf8");
  if (!canonicalSrc.includes("export const FREE_SCENARIO_LIMIT = 2")) {
    throw new Error("canonical entitlementContract missing FREE_SCENARIO_LIMIT");
  }
  if (!canonicalSrc.includes("export function evaluateEntitlement")) {
    throw new Error("canonical entitlementContract missing evaluateEntitlement");
  }
  if (/^export\s+\*\s+from/m.test(stripTsComments(canonicalSrc))) {
    throw new Error("canonical entitlementContract must not be a re-export shim");
  }

  if (existsSync(appShim)) {
    throw new Error("obsolete app entitlement shim must be deleted");
  }
  if (existsSync(edgeShim)) {
    throw new Error("obsolete Edge entitlement shim must be deleted");
  }

  process.stdout.write("Entitlement source-of-truth (canonical core only) OK\n");
}

async function main() {
  verifyEntitlementSourceOfTruth();
  try {
    await ensureDockerPostgres();

    const client = new pg.Client({
      host: "127.0.0.1",
      port: dbPort,
      user: dbUser,
      password: dbPass,
      database: dbName,
    });
    await client.connect();

    try {
      await applyMigrations(client);
      await runSqlAssertions(client);
      await runConcurrentLimitTest(client);
      await runParityTests(client);
      process.stdout.write("\n✓ test:entitlement-sql passed\n");
    } finally {
      await client.end();
    }
  } finally {
    cleanupDockerPostgres();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
