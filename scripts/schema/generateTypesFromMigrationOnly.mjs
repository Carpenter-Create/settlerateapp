#!/usr/bin/env node
/**
 * Epic 6 PR 2E — regenerate src/integrations/supabase/types.ts from a fresh
 * migration-only reconstruction (ADR 0006: types are derived, never SoT).
 *
 * Does not connect to production. Does not mutate production.
 *
 * Usage: node scripts/schema/generateTypesFromMigrationOnly.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import process from "node:process";
import {
  reconstructLocal,
  cleanupKeptReconstructionDb,
} from "./reconstructLocal.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const TYPES_PATH = join(root, "src/integrations/supabase/types.ts");

/**
 * pgcrypto (and similar) install into `public` on disposable reconstruction,
 * but production PostgREST does not expose them as SettleRate RPCs. Strip
 * these from generated Functions so the client contract stays app-owned.
 */
const EXTENSION_FUNCTION_NOISE = new Set([
  "armor",
  "crypt",
  "dearmor",
  "decrypt",
  "decrypt_iv",
  "digest",
  "encrypt",
  "encrypt_iv",
  "gen_random_bytes",
  "gen_random_uuid",
  "gen_salt",
  "hmac",
  "pgp_armor_headers",
  "pgp_key_id",
  "pgp_pub_decrypt",
  "pgp_pub_decrypt_bytea",
  "pgp_pub_encrypt",
  "pgp_pub_encrypt_bytea",
  "pgp_sym_decrypt",
  "pgp_sym_decrypt_bytea",
  "pgp_sym_encrypt",
  "pgp_sym_encrypt_bytea",
]);

/**
 * Remove top-level `name: { ... }` entries from the public Functions block
 * when `name` is extension noise. Brace-balanced so nested Args objects survive.
 */
export function stripExtensionFunctionNoise(typesSource) {
  const marker = "    Functions: {";
  const start = typesSource.indexOf(marker);
  if (start < 0) return typesSource;
  const bodyStart = start + marker.length;
  let i = bodyStart;
  let depth = 1;
  while (i < typesSource.length && depth > 0) {
    const ch = typesSource[i++];
    if (ch === "{") depth += 1;
    else if (ch === "}") depth -= 1;
  }
  const functionsEnd = i - 1; // position of closing `}` of Functions
  const before = typesSource.slice(0, bodyStart);
  const body = typesSource.slice(bodyStart, functionsEnd);
  const after = typesSource.slice(functionsEnd);

  const kept = [];
  let cursor = 0;
  while (cursor < body.length) {
    const rest = body.slice(cursor);
    const m = rest.match(/^\s*([A-Za-z_][A-Za-z0-9_]*):\s*\{/);
    if (!m) {
      kept.push(rest);
      break;
    }
    const name = m[1];
    const entryStart = cursor + m.index;
    let j = entryStart + m[0].length;
    let d = 1;
    while (j < body.length && d > 0) {
      const ch = body[j++];
      if (ch === "{") d += 1;
      else if (ch === "}") d -= 1;
    }
    // consume trailing comma/whitespace after the entry
    let end = j;
    while (end < body.length && /[\s,]/.test(body[end])) end += 1;
    if (!EXTENSION_FUNCTION_NOISE.has(name)) {
      kept.push(body.slice(entryStart, j));
      // preserve a single trailing comma+newline style from original when present
      const trail = body.slice(j, end);
      kept.push(trail.includes(",") ? ",\n" : trail);
    }
    cursor = end;
  }

  let newBody = kept.join("");
  // tidy trailing comma before Functions close
  newBody = newBody.replace(/,\s*$/, "\n");
  if (newBody.length && !newBody.endsWith("\n")) newBody += "\n";
  return before + newBody + after;
}

async function main() {
  const result = await reconstructLocal({ mode: "migration_only", keepDb: true });
  if (!result.success) {
    throw new Error(
      `migration_only reconstruction failed at ${result.failedAtMigration ?? "unknown"}; refusing to generate types`
    );
  }

  try {
    let types = execFileSync(
      "npx",
      [
        "supabase",
        "gen",
        "types",
        "typescript",
        "--db-url",
        result.dbUrl,
        "--schema",
        "public",
      ],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
    types = stripExtensionFunctionNoise(types);
    if (!types.includes("export type Database")) {
      throw new Error("supabase gen types output missing Database export");
    }
    if (
      !types.includes("admin_bootstrap_tokens") ||
      !types.includes("stripe_webhook_events") ||
      !types.includes("entitlement_bypass_log")
    ) {
      throw new Error(
        "generated types missing one or more PR 2E target tables (admin_bootstrap_tokens / stripe_webhook_events / entitlement_bypass_log)"
      );
    }
    for (const noise of ["dearmor:", "gen_salt:", "pgp_armor_headers:", "gen_random_uuid:"]) {
      if (types.includes(`      ${noise}`)) {
        throw new Error(`extension RPC noise still present in types: ${noise}`);
      }
    }
    writeFileSync(TYPES_PATH, types.endsWith("\n") ? types : `${types}\n`, "utf8");
    process.stdout.write(`Wrote ${TYPES_PATH}\n`);
  } finally {
    cleanupKeptReconstructionDb();
  }
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    try {
      cleanupKeptReconstructionDb();
    } catch {
      /* ignore */
    }
    process.exit(1);
  });
}
