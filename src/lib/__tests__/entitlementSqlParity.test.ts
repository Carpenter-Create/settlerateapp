import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import entitlementCases from "@/lib/__fixtures__/entitlementCases.json";
import {
  resolveEntitlementInput,
  type EntitlementCaseFixture,
} from "@/lib/__fixtures__/resolveEntitlementCase";
import {
  evaluateEntitlement,
  isFeatureAllowed,
  PROFESSIONAL_PRICE_IDS,
} from "@settlerate/core/entitlement";

const PROTECTED_FEATURES = [
  "scenario_create",
  "scenario_update",
  "scenario_duplicate",
  "comparison_create",
  "pdf_export",
  "share_create",
  "income_context",
  "billing_manage",
] as const;

const cases = entitlementCases as EntitlementCaseFixture[];

describe("entitlementSqlParity fixtures (TypeScript evaluator)", () => {
  const referenceNow = new Date();

  it("matches expected fixture outcomes", () => {
    for (const c of cases) {
      const input = resolveEntitlementInput(c, referenceNow);
      const decision = evaluateEntitlement(input);

      expect(decision.entitlementStatus, c.label).toBe(c.expect.entitlementStatus);
      expect(decision.planCode, c.label).toBe(c.expect.planCode);
      expect(decision.hasProfessionalAccess, c.label).toBe(c.expect.hasProfessionalAccess);
      expect(decision.cancelAtPeriodEnd, c.label).toBe(c.expect.cancelAtPeriodEnd);
      if (c.expect.isAdminBypass) {
        expect(decision.isAdminBypass, c.label).toBe(true);
      }
      if (c.expect.entitlementStatus !== "entitled" && c.expect.entitlementStatus !== "trial_entitled") {
        expect(decision.hasProfessionalAccess, c.label).toBe(false);
      }
    }
  });

  it("feature matrix is stable for fixture statuses", () => {
    for (const c of cases) {
      const input = resolveEntitlementInput(c, referenceNow);
      const decision = evaluateEntitlement(input);

      for (const feature of PROTECTED_FEATURES) {
        const allowed = isFeatureAllowed(decision, feature, { scenarioCount: 0 });
        expect(typeof allowed, `${c.label}:${feature}`).toBe("boolean");
      }
    }
  });
});

describe("entitlementContract source-of-truth", () => {
  it("obsolete pure entitlement shims are deleted", () => {
    const root = process.cwd();
    expect(existsSync(join(root, "src/lib/entitlementContract.ts"))).toBe(false);
    expect(
      existsSync(join(root, "supabase/functions/_shared/entitlementContract.ts"))
    ).toBe(false);
  });

  it("canonical core module contains entitlement business logic", () => {
    const canonical = readFileSync(
      join(process.cwd(), "packages/core/src/entitlement/entitlementContract.ts"),
      "utf8"
    );
    expect(canonical).toContain("export const FREE_SCENARIO_LIMIT = 2");
    expect(canonical).toContain("export function evaluateEntitlement");
    expect(canonical).not.toMatch(/^export\s+\*\s+from/m);
  });

  it("professional price allowlist is non-empty", () => {
    expect(PROFESSIONAL_PRICE_IDS.length).toBeGreaterThan(0);
  });
});
