import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildGrantSecurityInventory } from "../buildGrantSecurityInventory.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function load(rel) {
  return JSON.parse(readFileSync(join(root, rel), "utf8"));
}

describe("grant security inventory (Epic 6 PR 2C)", () => {
  const inventory = buildGrantSecurityInventory({
    prod: load("docs/database/production-schema/production-schema-catalog.json"),
    mig: load("docs/database/reconstruction/migration_only-schema.json"),
    driftReport: load("docs/database/schema-drift-report.json"),
  });

  it("analyzes all migration_only grant_mismatch records", () => {
    const drift = load("docs/database/schema-drift-report.json");
    const expected = drift.records.filter(
      (r) => r.compareSurface === "migration_only" && r.class === "grant_mismatch"
    ).length;
    expect(inventory.summary.grantMismatchRecords).toBe(expected);
    expect(expected).toBeGreaterThan(0);
  });

  it("includes subscriptions decision rows for anon/authenticated/service_role", () => {
    const subs = inventory.records.filter((r) => r.objectName === "subscriptions" && r.objectType === "table");
    expect(subs.length).toBeGreaterThanOrEqual(21);
    expect(subs.some((r) => r.grantee === "anon" && r.privilege === "TRUNCATE")).toBe(true);
    expect(subs.some((r) => r.grantee === "service_role" && r.privilege === "INSERT")).toBe(true);
  });

  it("flags protect_admin_subscriptions anon/authenticated EXECUTE as revoke candidates", () => {
    const rows = inventory.records.filter(
      (r) =>
        r.objectType === "function" &&
        r.objectName.startsWith("protect_admin_subscriptions") &&
        (r.grantee === "anon" || r.grantee === "authenticated") &&
        r.privilege === "EXECUTE"
    );
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const r of rows) {
      expect(r.proposedLaterAction).toBe("REVOKE_CANDIDATE");
      expect(r.triggerOnly).toBe(true);
      expect(r.securityDefiner).toBe(true);
    }
  });

  it("never authorizes mutation", () => {
    expect(inventory.meta.mutationAuthorized).toBe(false);
    expect(inventory.records.every((r) => r.evidencePaths?.length)).toBe(true);
  });

  it("records accepted founder FD-* decisions without authorizing remediation", () => {
    expect(inventory.meta.founderDecisions).toEqual({
      "FD-SUB-CLIENT-WRITES": "ACCEPTED",
      "FD-DEFAULT-BROAD-GRANTS": "ACCEPTED",
      "FD-LEGACY-DUAL-MODEL-GRANTS": "ACCEPTED",
      "FD-RPC-EXECUTE-PUBLIC": "ACCEPTED",
    });
    expect(inventory.meta.mutationAuthorized).toBe(false);
  });

  it("committed JSON artifact stays in sync when present", () => {
    const committed = load("docs/database/grant-security-inventory-pr2c.json");
    expect(committed.summary.grantMismatchRecords).toBe(inventory.summary.grantMismatchRecords);
    expect(committed.summary.publicSchemaMismatches).toBe(inventory.summary.publicSchemaMismatches);
  });
});
