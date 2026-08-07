import { readFileSync } from "node:fs";
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

function stripTsComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .trim();
}

function assertPureReExport(filePath: string, expectedFrom: string): void {
  const body = stripTsComments(readFileSync(filePath, "utf8"));
  const match = /^export\s+\*\s+from\s+["']([^"']+)["']\s*;?\s*$/.exec(body);
  expect(match, `${filePath} must be a pure re-export`).not.toBeNull();
  expect(match?.[1]).toBe(expectedFrom);
}

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
  it("app and Edge paths are pure re-export shims to canonical core", () => {
    const root = process.cwd();
    assertPureReExport(
      join(root, "src/lib/entitlementContract.ts"),
      "@settlerate/core/entitlement"
    );
    assertPureReExport(
      join(root, "supabase/functions/_shared/entitlementContract.ts"),
      "../../../packages/core/src/entitlement/entitlementContract.ts"
    );
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
