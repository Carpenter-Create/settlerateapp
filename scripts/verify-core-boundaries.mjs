#!/usr/bin/env node
/**
 * Epic 5 — static scan of packages/core library source for forbidden imports,
 * plus compatibility-shim purity / runtime-adapter architecture checks.
 *
 * Scans packages/core/src library surface (excludes *.test.ts). Deno proofs
 * under packages/core/deno/ are excluded — they may use Deno.test / node:assert.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const coreSrc = join(root, "packages/core/src");

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

/** Runtime-only symbols that must not appear as exports/definitions in core. */
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
    re: /:\s*Request\b|\bRequest\s*[;,\)\|]/,
    label: "must not type against Request (DOM/Fetch — keep in adapters)",
    fileIncludes: "/origin/",
  },
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".ts") && !p.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

const files = walk(coreSrc);
const violations = [];

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

/** Compatibility shims must remain pure re-exports (Epic 5 PR 2+). */
function stripTsComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .trim();
}

function assertPureReExport(filePath, expectedFrom) {
  const body = stripTsComments(readFileSync(filePath, "utf8"));
  const match = /^export\s+\*\s+from\s+["']([^"']+)["']\s*;?\s*$/.exec(body);
  if (!match || match[1] !== expectedFrom) {
    violations.push(
      `${relative(root, filePath)}: must purely re-export ${expectedFrom}`
    );
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

assertPureReExport(
  join(root, "src/lib/entitlementContract.ts"),
  "@settlerate/core/entitlement"
);
assertPureReExport(
  join(root, "supabase/functions/_shared/entitlementContract.ts"),
  "../../../packages/core/src/entitlement/entitlementContract.ts"
);
assertPureReExport(
  join(root, "src/lib/checkoutMaintenance.ts"),
  "@settlerate/core/checkout-maintenance"
);
assertPureReExport(
  join(root, "supabase/functions/_shared/checkoutMaintenance.ts"),
  "../../../packages/core/src/checkout/checkoutMaintenance.ts"
);
assertPureReExport(
  join(root, "src/lib/professionalSubscriptionGuard.ts"),
  "@settlerate/core/subscription-guard"
);
assertPureReExport(
  join(root, "supabase/functions/_shared/professionalSubscriptionGuard.ts"),
  "../../../packages/core/src/checkout/professionalSubscriptionGuard.ts"
);
assertPureReExport(
  join(root, "src/lib/observabilityRedaction.ts"),
  "@settlerate/core/observability-redaction"
);
assertPureReExport(
  join(root, "supabase/functions/_shared/observabilityRedaction.ts"),
  "../../../packages/core/src/observability/observabilityRedaction.ts"
);

assertBillingRuntimeAdapter(
  join(root, "src/lib/stripeBillingSnapshot.ts"),
  "@settlerate/core/billing-snapshot"
);
assertBillingRuntimeAdapter(
  join(root, "supabase/functions/_shared/stripeBillingSnapshot.ts"),
  "../../../packages/core/src/billing/stripeBillingSnapshot.ts"
);

assertCustomerRuntimeAdapter(
  join(root, "supabase/functions/_shared/stripeCustomerResolve.ts"),
  "../../../packages/core/src/billing/stripeCustomerResolve.ts"
);
assertAppOriginRuntimeAdapter(
  join(root, "supabase/functions/_shared/appOrigin.ts"),
  "../../../packages/core/src/origin/appOrigin.ts"
);
assertEdgeObservabilityRuntimeAdapter(
  join(root, "supabase/functions/_shared/observability.ts"),
  "../../../packages/core/src/observability/edgeObservability.ts"
);

if (violations.length > 0) {
  console.error("packages/core boundary violations:");
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log(`packages/core boundary check OK (${files.length} library files)`);
