/**
 * Compatibility proof: app path `@/lib/entitlementContract` re-exports the
 * canonical `@settlerate/core/entitlement` implementation (Epic 5 PR 2).
 *
 * Full behavioral coverage lives in
 * `packages/core/src/entitlement/entitlementContract.test.ts`.
 */
import { describe, expect, it } from "vitest";
import {
  FREE_SCENARIO_LIMIT,
  PROFESSIONAL_PRICE_IDS,
  PROFESSIONAL_TRIAL_DAYS,
  evaluateEntitlement,
  isFeatureAllowed,
} from "@/lib/entitlementContract";

const proMonthlyPrice = PROFESSIONAL_PRICE_IDS[0];
const now = new Date("2026-08-04T12:00:00.000Z");
const future = "2026-09-01T00:00:00.000Z";

describe("entitlementContract app compatibility shim", () => {
  it("resolves constants unchanged via @/lib re-export", () => {
    expect(FREE_SCENARIO_LIMIT).toBe(2);
    expect(PROFESSIONAL_TRIAL_DAYS).toBe(7);
    expect(PROFESSIONAL_PRICE_IDS.length).toBeGreaterThan(0);
  });

  it("evaluates entitlement through the shim to canonical core", () => {
    const d = evaluateEntitlement({
      stripeStatus: "active",
      priceId: proMonthlyPrice,
      currentPeriodEndsAt: future,
      now,
    });
    expect(d.entitlementStatus).toBe("entitled");
    expect(isFeatureAllowed(d, "pdf_export")).toBe(true);
  });
});
