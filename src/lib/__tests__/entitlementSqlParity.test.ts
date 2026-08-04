import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import entitlementCases from "@/lib/__fixtures__/entitlementCases.json";
import {
  evaluateEntitlement,
  isFeatureAllowed,
  PROFESSIONAL_PRICE_IDS,
} from "@/lib/entitlementContract";

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

describe("entitlementSqlParity fixtures (TypeScript evaluator)", () => {
  it("matches expected fixture outcomes", () => {
    for (const c of entitlementCases) {
      const decision = evaluateEntitlement({
        stripeStatus: c.billing?.subscription_status ?? null,
        priceId: c.billing?.price_id ?? null,
        currentPeriodEndsAt: c.billing?.current_period_end ?? null,
        cancelAtPeriodEnd: c.billing?.cancel_at_period_end ?? false,
        isAdmin: c.isAdmin ?? false,
        now: new Date(c.now),
      });

      expect(decision.entitlementStatus, c.label).toBe(c.expect.entitlementStatus);
      expect(decision.planCode, c.label).toBe(c.expect.planCode);
      expect(decision.hasProfessionalAccess, c.label).toBe(c.expect.hasProfessionalAccess);
      expect(decision.cancelAtPeriodEnd, c.label).toBe(c.expect.cancelAtPeriodEnd);
      if (c.expect.isAdminBypass) {
        expect(decision.isAdminBypass, c.label).toBe(true);
      }
    }
  });

  it("feature matrix is stable for fixture statuses", () => {
    for (const c of entitlementCases) {
      const decision = evaluateEntitlement({
        stripeStatus: c.billing?.subscription_status ?? null,
        priceId: c.billing?.price_id ?? null,
        currentPeriodEndsAt: c.billing?.current_period_end ?? null,
        cancelAtPeriodEnd: c.billing?.cancel_at_period_end ?? false,
        isAdmin: c.isAdmin ?? false,
        now: new Date(c.now),
      });

      for (const feature of PROTECTED_FEATURES) {
        const allowed = isFeatureAllowed(decision, feature, { scenarioCount: 0 });
        expect(typeof allowed, `${c.label}:${feature}`).toBe("boolean");
      }
    }
  });
});

describe("entitlementContract mirror sync", () => {
  it("Deno shared module matches src/lib (byte-identical)", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/entitlementContract.ts"), "utf8");
    const deno = readFileSync(
      join(process.cwd(), "supabase/functions/_shared/entitlementContract.ts"),
      "utf8"
    );
    expect(createHash("sha256").update(deno).digest("hex")).toBe(
      createHash("sha256").update(src).digest("hex")
    );
  });

  it("professional price allowlist is non-empty", () => {
    expect(PROFESSIONAL_PRICE_IDS.length).toBeGreaterThan(0);
  });
});
