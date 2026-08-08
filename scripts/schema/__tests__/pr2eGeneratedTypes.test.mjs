import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stripExtensionFunctionNoise } from "../generateTypesFromMigrationOnly.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("PR 2E generated types reconciliation", () => {
  const types = readFileSync(join(root, "src/integrations/supabase/types.ts"), "utf8");
  const drift = JSON.parse(
    readFileSync(join(root, "docs/database/schema-drift-report.json"), "utf8")
  );

  it("includes the three previously missing public tables", () => {
    for (const name of [
      "admin_bootstrap_tokens",
      "stripe_webhook_events",
      "entitlement_bypass_log",
    ]) {
      expect(types).toContain(`${name}:`);
    }
  });

  it("includes admin bootstrap RPCs from migrations", () => {
    expect(types).toContain("issue_admin_bootstrap_token");
    expect(types).toContain("claim_admin_bootstrap");
  });

  it("does not advertise disposable pgcrypto RPC noise", () => {
    for (const name of ["dearmor", "gen_salt", "pgp_armor_headers", "gen_random_uuid"]) {
      expect(types).not.toContain(`      ${name}:`);
    }
  });

  it("stripExtensionFunctionNoise removes pgcrypto entries only", () => {
    const sample = `    Functions: {
      claim_admin_bootstrap: { Args: { p_token: string }; Returns: boolean }
      dearmor: { Args: { "": string }; Returns: string }
      gen_salt: { Args: { "": string }; Returns: string }
      get_effective_tier: { Args: { target_user_id: string }; Returns: string }
    }`;
    const stripped = stripExtensionFunctionNoise(sample);
    expect(stripped).toContain("claim_admin_bootstrap");
    expect(stripped).toContain("get_effective_tier");
    expect(stripped).not.toContain("dearmor");
    expect(stripped).not.toContain("gen_salt");
  });

  it("clears generated_types_mismatch in the drift report", () => {
    const mismatches = (drift.records || []).filter(
      (r) => r.class === "generated_types_mismatch"
    );
    expect(mismatches).toEqual([]);
    expect(drift.summary?.byClass?.generated_types_mismatch ?? 0).toBe(0);
  });
});
