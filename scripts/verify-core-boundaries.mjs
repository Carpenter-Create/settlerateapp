#!/usr/bin/env node
/**
 * Epic 5 PR 6 — final architecture boundary scan.
 *
 * Proves:
 * - packages/core has no app/Edge/runtime contamination
 * - migrated pure logic is not reimplemented outside core
 * - no temporary relative Edge → packages/core bridges remain in TS sources
 * - runtime-only symbols remain outside core
 * - package exports remain explicit (no wildcard)
 * - Edge deno.json maps all canonical subpaths
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const coreSrc = join(root, "packages/core/src");
const violations = [];

const FORBIDDEN = [
  { re: /from\s+["']@\//, label: "application @/ alias" },
  { re: /from\s+["'][^"']*\/src\//, label: "import path containing /src/" },
  { re: /from\s+["'][^"']*supabase\/functions/, label: "supabase/functions import" },
  { re: /from\s+["']react(?:-dom)?["']/, label: "react import" },
  { re: /from\s+["']@supabase\//, label: "Supabase client import" },
  { re: /from\s+["']stripe["']/, label: "Stripe SDK import" },
  { re: /from\s+["']@sentry\//, label: "Sentry SDK import" },
  { re: /from\s+["']npm:@sentry\//, label: "Sentry Deno npm import" },
  { re: /from\s+["']node:/, label: "Node built-in import" },
  {
    re: /from\s+["'](?:fs|path|crypto|process|child_process|url|os|http|https)["']/,
    label: "Node core module import",
  },
  { re: /\bDeno\./, label: "Deno global usage" },
  { re: /from\s+["']npm:/, label: "Deno npm: specifier" },
  { re: /\bprocess\.env\b/, label: "process.env usage" },
  { re: /\bimport\.meta\.env\b/, label: "import.meta.env usage" },
  { re: /\bcrypto\.randomUUID\b/, label: "crypto.randomUUID usage" },
];

const CORE_FORBIDDEN_DEFINITIONS = [
  {
    re: /export\s+async\s+function\s+resolveSubscriptionBillingSnapshot/,
    label: "must not export resolveSubscriptionBillingSnapshot (runtime orchestration)",
  },
  {
    re: /export\s+async\s+function\s+resolveCheckoutCustomer/,
    label: "must not export resolveCheckoutCustomer (runtime orchestration)",
  },
  {
    re: /export\s+interface\s+CheckoutCustomerResolutionDeps/,
    label: "must not export CheckoutCustomerResolutionDeps (runtime deps)",
  },
  {
    re: /export\s+function\s+generateRequestId/,
    label: "must not export generateRequestId (nondeterministic runtime)",
  },
  {
    re: /export\s+function\s+buildScenarioData/,
    label: "must not export buildScenarioData (server PDF adapter)",
  },
  {
    re: /export\s+function\s+buildCanonicalScenarioExport/,
    label: "must not export buildCanonicalScenarioExport (client application)",
  },
  {
    re: /:\s*Request\b|\bRequest\b/,
    label: "must not type against Request (DOM/Fetch - keep in adapters)",
    fileIncludes: "/origin/",
  },
  {
    re: /\bnew\s+Date\s*\(/,
    label: "must not use new Date() (export-summary must stay deterministic)",
    fileIncludes: "/exports/",
  },
  {
    re: /\bDate\.now\s*\(/,
    label: "must not use Date.now() (export-summary must stay deterministic)",
    fileIncludes: "/exports/",
  },
];

const EXPECTED_PACKAGE_EXPORTS = [
  ".",
  "./entitlement",
  "./checkout-maintenance",
  "./subscription-guard",
  "./observability-redaction",
  "./billing-snapshot",
  "./customer-resolution",
  "./app-origin",
  "./edge-observability",
  "./export-summary",
];

const EDGE_FUNCTIONS_WITH_DENO_JSON = [
  "check-subscription",
  "create-checkout",
  "customer-portal",
  "stripe-webhook",
  "generate-pdf",
  "export-share",
];

const CORE_SUBPATH_TARGETS = {
  "@settlerate/core": "packages/core/src/index.ts",
  "@settlerate/core/entitlement":
    "packages/core/src/entitlement/entitlementContract.ts",
  "@settlerate/core/checkout-maintenance":
    "packages/core/src/checkout/checkoutMaintenance.ts",
  "@settlerate/core/subscription-guard":
    "packages/core/src/checkout/professionalSubscriptionGuard.ts",
  "@settlerate/core/observability-redaction":
    "packages/core/src/observability/observabilityRedaction.ts",
  "@settlerate/core/billing-snapshot":
    "packages/core/src/billing/stripeBillingSnapshot.ts",
  "@settlerate/core/customer-resolution":
    "packages/core/src/billing/stripeCustomerResolve.ts",
  "@settlerate/core/app-origin": "packages/core/src/origin/appOrigin.ts",
  "@settlerate/core/edge-observability":
    "packages/core/src/observability/edgeObservability.ts",
  "@settlerate/core/export-summary":
    "packages/core/src/exports/derivedExportSummary.ts",
};

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".ts") && !p.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

function walkAllTs(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkAllTs(p));
    else if (p.endsWith(".ts") || p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const files = walk(coreSrc);

for (const file of files) {
  const rel = relative(root, file);
  const text = readFileSync(file, "utf8");
  for (const rule of FORBIDDEN) {
    if (rule.re.test(text)) {
      violations.push(`${rel}: ${rule.label}`);
    }
  }
  for (const rule of CORE_FORBIDDEN_DEFINITIONS) {
    if (rule.fileIncludes && !file.replace(/\\/g, "/").includes(rule.fileIncludes)) {
      continue;
    }
    if (rule.re.test(text)) {
      violations.push(`${rel}: ${rule.label}`);
    }
  }
}

function assertBillingRuntimeAdapter(filePath, coreFrom) {
  const text = readFileSync(filePath, "utf8");
  const rel = relative(root, filePath);
  if (!/export\s+async\s+function\s+resolveSubscriptionBillingSnapshot/.test(text)) {
    violations.push(`${rel}: must retain resolveSubscriptionBillingSnapshot locally`);
  }
  if (!text.includes(coreFrom)) {
    violations.push(`${rel}: must import pure billing symbols from ${coreFrom}`);
  }
  if (/export\s+function\s+mapSubscriptionToBillingSnapshot\s*\(/.test(text)) {
    violations.push(
      `${rel}: must not redefine mapSubscriptionToBillingSnapshot (re-export from core)`
    );
  }
}

function assertCustomerRuntimeAdapter(filePath, coreFrom) {
  const text = readFileSync(filePath, "utf8");
  const rel = relative(root, filePath);
  if (!/export\s+async\s+function\s+resolveCheckoutCustomer/.test(text)) {
    violations.push(`${rel}: must retain resolveCheckoutCustomer locally`);
  }
  if (!/export\s+interface\s+CheckoutCustomerResolutionDeps/.test(text)) {
    violations.push(`${rel}: must retain CheckoutCustomerResolutionDeps locally`);
  }
  if (!text.includes(coreFrom)) {
    violations.push(`${rel}: must import pure customer-resolution symbols from ${coreFrom}`);
  }
  if (/export\s+function\s+resolveStripeCustomerByUserId\s*\(/.test(text)) {
    violations.push(
      `${rel}: must not redefine resolveStripeCustomerByUserId (re-export from core)`
    );
  }
}

function assertAppOriginRuntimeAdapter(filePath, coreFrom) {
  const text = readFileSync(filePath, "utf8");
  const rel = relative(root, filePath);
  if (!/export\s+function\s+resolveAppOrigin\s*\(\s*req:\s*Request/.test(text)) {
    violations.push(`${rel}: must retain resolveAppOrigin(req: Request)`);
  }
  if (!text.includes(coreFrom)) {
    violations.push(`${rel}: must import pure app-origin symbols from ${coreFrom}`);
  }
  if (/export\s+function\s+resolveAppOriginFromOriginHeader\s*\(/.test(text)) {
    violations.push(
      `${rel}: must not redefine resolveAppOriginFromOriginHeader (re-export from core)`
    );
  }
}

function assertEdgeObservabilityRuntimeAdapter(filePath, coreFrom) {
  const text = readFileSync(filePath, "utf8");
  const rel = relative(root, filePath);
  if (!/export\s+function\s+generateRequestId\s*\(/.test(text)) {
    violations.push(`${rel}: must retain generateRequestId locally`);
  }
  if (!/\bcrypto\.randomUUID\b/.test(text)) {
    violations.push(`${rel}: generateRequestId must continue using crypto.randomUUID`);
  }
  if (!text.includes(coreFrom)) {
    violations.push(`${rel}: must import deterministic edge-observability from ${coreFrom}`);
  }
  if (/export\s+function\s+isEdgeObservabilityEnabled\s*\(/.test(text)) {
    violations.push(
      `${rel}: must not redefine isEdgeObservabilityEnabled (re-export from core)`
    );
  }
  if (/export\s+function\s+buildEdgeExtra\s*\(/.test(text)) {
    violations.push(`${rel}: must not redefine buildEdgeExtra (re-export from core)`);
  }
}

function assertDeletedPureShim(relPath) {
  if (existsSync(join(root, relPath))) {
    violations.push(`${relPath}: obsolete pure compatibility shim must be deleted`);
  }
}

assertDeletedPureShim("src/lib/entitlementContract.ts");
assertDeletedPureShim("src/lib/checkoutMaintenance.ts");
assertDeletedPureShim("src/lib/professionalSubscriptionGuard.ts");
assertDeletedPureShim("src/lib/observabilityRedaction.ts");
assertDeletedPureShim("supabase/functions/_shared/entitlementContract.ts");
assertDeletedPureShim("supabase/functions/_shared/checkoutMaintenance.ts");
assertDeletedPureShim("supabase/functions/_shared/professionalSubscriptionGuard.ts");
assertDeletedPureShim("supabase/functions/_shared/observabilityRedaction.ts");

assertBillingRuntimeAdapter(
  join(root, "src/lib/stripeBillingSnapshot.ts"),
  "@settlerate/core/billing-snapshot"
);
assertBillingRuntimeAdapter(
  join(root, "supabase/functions/_shared/stripeBillingSnapshot.ts"),
  "@settlerate/core/billing-snapshot"
);
assertCustomerRuntimeAdapter(
  join(root, "supabase/functions/_shared/stripeCustomerResolve.ts"),
  "@settlerate/core/customer-resolution"
);
assertAppOriginRuntimeAdapter(
  join(root, "supabase/functions/_shared/appOrigin.ts"),
  "@settlerate/core/app-origin"
);
assertEdgeObservabilityRuntimeAdapter(
  join(root, "supabase/functions/_shared/observability.ts"),
  "@settlerate/core/edge-observability"
);

function assertExportSummaryDelegation() {
  const canonical = join(
    root,
    "packages/core/src/exports/derivedExportSummary.ts"
  );
  const client = join(root, "src/lib/exports/exportContract.ts");
  const server = join(
    root,
    "supabase/functions/generate-pdf/mapDerivedForExport.ts"
  );

  const canonicalText = readFileSync(canonical, "utf8");
  if (!/export\s+function\s+mapDerivedExportSummary/.test(canonicalText)) {
    violations.push(
      `${relative(root, canonical)}: must export mapDerivedExportSummary`
    );
  }

  const clientText = readFileSync(client, "utf8");
  if (!clientText.includes("@settlerate/core/export-summary")) {
    violations.push(
      `${relative(root, client)}: must import canonical @settlerate/core/export-summary`
    );
  }
  if (!/mapDerivedExportSummary\s*\(/.test(clientText)) {
    violations.push(
      `${relative(root, client)}: exportSummaryFromDerivedJson must delegate to mapDerivedExportSummary`
    );
  }
  if (/const isLegacyFlat\s*=/.test(clientText)) {
    violations.push(
      `${relative(root, client)}: must not reimplement isLegacyFlat (delegate to core)`
    );
  }
  if (!/export\s+function\s+buildCanonicalScenarioExport/.test(clientText)) {
    violations.push(
      `${relative(root, client)}: must retain buildCanonicalScenarioExport application-side`
    );
  }

  const serverText = readFileSync(server, "utf8");
  if (!serverText.includes("@settlerate/core/export-summary")) {
    violations.push(
      `${relative(root, server)}: must import canonical @settlerate/core/export-summary`
    );
  }
  if (!/mapDerivedExportSummary\s*\(/.test(serverText)) {
    violations.push(
      `${relative(root, server)}: mapDerivedForExport must delegate to mapDerivedExportSummary`
    );
  }
  if (/const isLegacyFlat\s*=/.test(serverText)) {
    violations.push(
      `${relative(root, server)}: must not reimplement isLegacyFlat (delegate to core)`
    );
  }
  if (!/export\s+function\s+buildScenarioData/.test(serverText)) {
    violations.push(
      `${relative(root, server)}: must retain buildScenarioData server-side`
    );
  }
}

assertExportSummaryDelegation();

function assertNoRelativeCoreBridges() {
  const scanRoots = [
    join(root, "src"),
    join(root, "supabase/functions"),
  ];
  const bridgeRe = /from\s+["'][^"']*packages\/core\/src[^"']*["']/;
  for (const scanRoot of scanRoots) {
    for (const file of walkAllTs(scanRoot)) {
      const rel = relative(root, file).replace(/\\/g, "/");
      // deno.json is not TS; tests may mention historical paths in strings —
      // only flag actual import/export from relative packages/core bridges.
      const text = readFileSync(file, "utf8");
      if (bridgeRe.test(text)) {
        violations.push(
          `${rel}: temporary relative packages/core bridge must be removed (use @settlerate/core/<subpath>)`
        );
      }
    }
  }
}

assertNoRelativeCoreBridges();

function assertPackageExportsExplicit() {
  const pkg = JSON.parse(
    readFileSync(join(root, "packages/core/package.json"), "utf8")
  );
  const exports = pkg.exports ?? {};
  if ("./*" in exports) {
    violations.push("packages/core/package.json: wildcard package export is forbidden");
  }
  for (const key of EXPECTED_PACKAGE_EXPORTS) {
    if (!(key in exports)) {
      violations.push(`packages/core/package.json: missing explicit export ${key}`);
    }
  }
}

assertPackageExportsExplicit();

function assertEdgeDenoImportMaps() {
  for (const fn of EDGE_FUNCTIONS_WITH_DENO_JSON) {
    const denoPath = join(root, "supabase/functions", fn, "deno.json");
    if (!existsSync(denoPath)) {
      violations.push(`supabase/functions/${fn}/deno.json: missing Edge import map`);
      continue;
    }
    const cfg = JSON.parse(readFileSync(denoPath, "utf8"));
    const imports = cfg.imports ?? {};
    for (const [specifier, targetRel] of Object.entries(CORE_SUBPATH_TARGETS)) {
      const mapped = imports[specifier];
      if (typeof mapped !== "string") {
        violations.push(
          `supabase/functions/${fn}/deno.json: missing import ${specifier}`
        );
        continue;
      }
      // Resolve mapped path relative to the deno.json directory.
      const abs = resolve(join(root, "supabase/functions", fn), mapped);
      const expectedAbs = resolve(root, targetRel);
      if (abs !== expectedAbs) {
        violations.push(
          `supabase/functions/${fn}/deno.json: ${specifier} must resolve to ${targetRel}`
        );
      }
      if (!existsSync(abs)) {
        violations.push(
          `supabase/functions/${fn}/deno.json: ${specifier} target missing on disk`
        );
      }
    }
  }

  const shared = join(root, "supabase/functions/deno.json");
  if (!existsSync(shared)) {
    violations.push("supabase/functions/deno.json: missing shared Edge import map for proofs");
  } else {
    const cfg = JSON.parse(readFileSync(shared, "utf8"));
    for (const specifier of Object.keys(CORE_SUBPATH_TARGETS)) {
      if (!(specifier in (cfg.imports ?? {}))) {
        violations.push(
          `supabase/functions/deno.json: missing import ${specifier}`
        );
      }
    }
  }
}

assertEdgeDenoImportMaps();

function assertNoKeepInSyncMirrors() {
  const scanRoots = [
    join(root, "src/lib"),
    join(root, "supabase/functions/_shared"),
    join(root, "packages/core/src"),
  ];
  for (const scanRoot of scanRoots) {
    for (const file of walkAllTs(scanRoot)) {
      const text = readFileSync(file, "utf8");
      if (/Keep in sync/i.test(text)) {
        violations.push(
          `${relative(root, file)}: obsolete Keep in sync mirror comment remains`
        );
      }
    }
  }
}

assertNoKeepInSyncMirrors();

if (violations.length > 0) {
  console.error("packages/core boundary violations:");
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log(`packages/core boundary check OK (${files.length} library files)`);
