#!/usr/bin/env node
/**
 * Epic 5 — static scan of packages/core library source for forbidden imports,
 * plus entitlement compatibility-shim purity checks (PR 2+).
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
  { re: /from\s+["']node:/, label: "Node built-in import" },
  {
    re: /from\s+["'](?:fs|path|crypto|process|child_process|url|os|http|https)["']/,
    label: "Node core module import",
  },
  { re: /\bDeno\./, label: "Deno global usage" },
  { re: /from\s+["']npm:/, label: "Deno npm: specifier" },
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

assertPureReExport(
  join(root, "src/lib/entitlementContract.ts"),
  "@settlerate/core/entitlement"
);
assertPureReExport(
  join(root, "supabase/functions/_shared/entitlementContract.ts"),
  "../../../packages/core/src/entitlement/entitlementContract.ts"
);

if (violations.length > 0) {
  console.error("packages/core boundary violations:");
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log(`packages/core boundary check OK (${files.length} library files)`);
