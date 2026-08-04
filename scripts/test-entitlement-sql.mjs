#!/usr/bin/env node
/**
 * Applies repo migrations to ephemeral Postgres and runs Phase 6 SQL + parity checks.
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

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

async function ensureDockerPostgres() {
  try {
    run("docker info >/dev/null 2>&1");
  } catch {
    throw new Error("Docker is required for test:entitlement-sql");
  }

  const existing = run(`docker ps -a --filter name=^/${containerName}$ --format '{{.Names}}'`);
  if (existing === containerName) {
    const running = run(`docker ps --filter name=^/${containerName}$ --format '{{.Names}}'`);
    if (running !== containerName) {
      run(`docker start ${containerName}`);
    }
  } else {
    run(
      `docker run -d --name ${containerName} -e POSTGRES_PASSWORD=${dbPass} -p ${dbPort}:5432 postgres:16-alpine`
    );
  }

  for (let i = 0; i < 30; i++) {
    try {
      run(`docker exec ${containerName} pg_isready -U ${dbUser} -d postgres`, { stdio: "pipe" });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
      if (i === 29) throw new Error("Postgres container failed to become ready");
    }
  }

  run(
    `docker exec ${containerName} psql -U ${dbUser} -d postgres -c "DROP DATABASE IF EXISTS ${dbName};"`
  );
  run(
    `docker exec ${containerName} psql -U ${dbUser} -d postgres -c "CREATE DATABASE ${dbName};"`
  );
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
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;
    GRANT USAGE ON SCHEMA test TO authenticated, service_role;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA test TO authenticated, service_role;
    REVOKE ALL ON FUNCTION public.log_admin_entitlement_bypass(uuid, text, text, jsonb) FROM authenticated;
  `);
}

async function runSqlAssertions(client) {
  process.stdout.write("Running phase6_entitlement.sql assertions...\n");
  await psqlFile(client, join(root, "supabase/tests/phase6_entitlement.sql"));
}

async function runConcurrentLimitTest(client) {
  const userId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
  await client.query(`INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
    userId,
    "concurrent@test.local",
  ]);

  await client.query(`SELECT set_config('app.skip_scenario_entitlement', '1', true)`);
  for (let i = 0; i < 2; i++) {
    await client.query(
      `INSERT INTO public.scenarios (user_id, name, scenario_type, inputs, derived)
       VALUES ($1, $2, 'purchase', '{}'::jsonb, '{}'::jsonb)`,
      [userId, `Concurrent seed ${i + 1}`]
    );
  }
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

  if (count > 3) {
    throw new Error(`Concurrent limit failed: count=${count}, results=${a},${b}`);
  }
  if (a !== "ok" && b !== "ok") {
    throw new Error(`Concurrent limit: expected one success, got ${a}, ${b}`);
  }
  process.stdout.write(`Concurrent limit OK (count=${count}, results=${a}/${b})\n`);
}

async function runParityTests(client) {
  const { evaluateEntitlement, isFeatureAllowed } = await import(
    join(root, "src/lib/entitlementContract.ts")
  );
  const cases = JSON.parse(
    readFileSync(join(root, "src/lib/__fixtures__/entitlementCases.json"), "utf8")
  );

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
    } else if (c.billing) {
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
          c.billing.subscription_status,
          c.billing.price_id,
          c.billing.current_period_end,
          c.billing.cancel_at_period_end ?? false,
        ]
      );
    }

    const { rows } = await client.query(`SELECT public.evaluate_entitlement($1::uuid) AS d`, [
      c.userId,
    ]);
    const sqlDecision = rows[0].d;

    const tsDecision = evaluateEntitlement({
      stripeStatus: c.billing?.subscription_status ?? null,
      priceId: c.billing?.price_id ?? null,
      currentPeriodEndsAt: c.billing?.current_period_end ?? null,
      cancelAtPeriodEnd: c.billing?.cancel_at_period_end ?? false,
      isAdmin: c.isAdmin ?? false,
      now: new Date(c.now),
    });

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

function verifyDenoMirror() {
  const src = readFileSync(join(root, "src/lib/entitlementContract.ts"), "utf8");
  const deno = readFileSync(
    join(root, "supabase/functions/_shared/entitlementContract.ts"),
    "utf8"
  );
  const srcHash = createHash("sha256").update(src).digest("hex");
  const denoHash = createHash("sha256").update(deno).digest("hex");
  if (srcHash !== denoHash) {
    throw new Error("entitlementContract.ts Deno mirror is out of sync with src/lib");
  }
  process.stdout.write("Deno mirror sync OK\n");
}

async function main() {
  verifyDenoMirror();
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
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
