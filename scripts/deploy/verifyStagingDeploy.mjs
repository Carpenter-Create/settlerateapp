#!/usr/bin/env node
/**
 * Deterministic staging post-deploy checks (no production data copy).
 * Fail closed if production project is targeted or Stripe appears live.
 */
import { writeFileSync } from "node:fs";
import {
  PRODUCTION_SUPABASE_REF,
  STAGING_SUPABASE_REF,
  STAGING_VERCEL_PROJECT,
  assertRoleProjectRef,
} from "./projectRefs.mjs";
import { fetchRemoteMigrationVersions } from "./fetchRemoteMigrationVersions.mjs";
import {
  compareMigrationLedgers,
  defaultMigrationsDir,
  listRepositoryMigrationVersions,
} from "./migrationLedger.mjs";

const STAGING_ORIGIN =
  process.env.STAGING_APP_ORIGIN || "https://settlerate-app-staging.vercel.app";

function argValue(argv, name) {
  const i = argv.indexOf(name);
  if (i === -1) return null;
  return argv[i + 1] ?? null;
}

async function listFunctions(projectRef, token) {
  const url = `https://api.supabase.com/v1/projects/${projectRef}/functions`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "User-Agent": "SettleRate-Epic9/1.0",
    },
  });
  if (!res.ok) {
    throw new Error(`functions_list_failed:http_${res.status}`);
  }
  return res.json();
}

async function main() {
  const argv = process.argv.slice(2);
  const projectRef = argValue(argv, "--project-ref") || STAGING_SUPABASE_REF;
  const gate = assertRoleProjectRef("staging", projectRef);
  if (!gate.ok) {
    console.error(JSON.stringify({ ok: false, error: gate.reason }));
    process.exit(1);
  }
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error("SUPABASE_ACCESS_TOKEN_missing");
    process.exit(1);
  }

  const checks = [];
  const fail = (id, detail) => {
    checks.push({ id, ok: false, detail });
  };
  const pass = (id, detail) => {
    checks.push({ id, ok: true, detail });
  };

  // 1) Migration ledger aligned or pending-only (not diverged); prefer aligned post-deploy
  const repo = listRepositoryMigrationVersions(defaultMigrationsDir());
  const remote = await fetchRemoteMigrationVersions(projectRef, { accessToken: token });
  const comparison = compareMigrationLedgers(repo, remote);
  if (comparison.status === "diverged") {
    fail("migration_ledger", comparison.reasons.join(";"));
  } else if (comparison.status === "pending") {
    fail("migration_ledger", `pending_remain:${comparison.pending.join(",")}`);
  } else {
    pass("migration_ledger", `aligned tip=${comparison.targetTip}`);
  }

  // 2) Edge functions present on staging
  const fns = await listFunctions(projectRef, token);
  const names = new Set(
    (Array.isArray(fns) ? fns : []).map((f) => f.slug || f.name).filter(Boolean),
  );
  const required = [
    "check-subscription",
    "create-checkout",
    "customer-portal",
    "admin-assign-advisor",
    "stripe-webhook",
    "generate-pdf",
    "export-share",
  ];
  const missing = required.filter((n) => !names.has(n));
  if (missing.length) fail("edge_functions", `missing:${missing.join(",")}`);
  else pass("edge_functions", `count=${names.size}`);

  // 3) SPA origin reachable (HTML)
  try {
    const res = await fetch(STAGING_ORIGIN, {
      headers: { "User-Agent": "SettleRate-Epic9/1.0" },
      redirect: "follow",
    });
    if (!res.ok) fail("spa_origin", `http_${res.status}`);
    else pass("spa_origin", `${STAGING_ORIGIN} http_${res.status}`);
  } catch (e) {
    fail("spa_origin", String(e));
  }

  // 4) Explicit production non-target assertions
  if (projectRef === PRODUCTION_SUPABASE_REF) {
    fail("production_isolation", "staging verify pointed at production");
  } else {
    pass(
      "production_isolation",
      `target=${projectRef} production=${PRODUCTION_SUPABASE_REF} vercel=${STAGING_VERCEL_PROJECT}`,
    );
  }

  // 5) Stripe mode probe via public SPA env is not available; document expectation.
  // Soft check: staging origin must not be production host.
  if (/settlerate\.com$/.test(new URL(STAGING_ORIGIN).hostname) && !STAGING_ORIGIN.includes("staging")) {
    fail("stripe_host_guard", "origin looks like production host");
  } else {
    pass("stripe_host_guard", "staging origin accepted (Stripe test required in env ops)");
  }

  const ok = checks.every((c) => c.ok);
  const report = {
    ok,
    role: "staging",
    projectRef,
    gitSha: process.env.DEPLOY_GIT_SHA || process.env.GITHUB_SHA || null,
    stagingOrigin: STAGING_ORIGIN,
    comparison,
    checks,
  };
  const out = argValue(argv, "--out");
  const text = JSON.stringify(report, null, 2);
  if (out) writeFileSync(out, `${text}\n`);
  console.log(text);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(String(err?.stack || err));
  process.exit(1);
});
