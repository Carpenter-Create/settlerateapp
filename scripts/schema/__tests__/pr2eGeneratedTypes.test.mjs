import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

  it("clears generated_types_mismatch in the drift report", () => {
    const mismatches = (drift.records || []).filter(
      (r) => r.class === "generated_types_mismatch"
    );
    expect(mismatches).toEqual([]);
    expect(drift.summary?.byClass?.generated_types_mismatch ?? 0).toBe(0);
  });
});
