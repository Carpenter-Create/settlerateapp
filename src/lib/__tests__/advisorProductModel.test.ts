import { describe, expect, it } from "vitest";
import {
  evaluateEntitlement,
  featureAccessFromDecision,
  resolvePlanCodeFromPrice,
  type PlanCode,
} from "@/lib/entitlementContract";
import {
  getTierFromProductId,
  isLegacyAdvisorPriceId,
  LEGACY_ADVISOR_PRODUCT_ID,
} from "@/lib/stripe";
import { canEditLockedRatesCapability } from "@/lib/adminLockedRateCapability";

const advisorPrice = "price_1Sod5F3ppKk8xETzl9EDOR6I";
const proPrice = "price_1Sod4a3ppKk8xETz9TzPFn8P";
const future = new Date("2026-12-01T00:00:00.000Z");

describe("advisor product model removal", () => {
  it("recognizes only analytical and professional as active plan codes", () => {
    const codes: PlanCode[] = ["analytical", "professional"];
    expect(codes).toHaveLength(2);
    expect(resolvePlanCodeFromPrice(null)).toBe("analytical");
    expect(resolvePlanCodeFromPrice(advisorPrice)).toBe("analytical");
    expect(resolvePlanCodeFromPrice(proPrice)).toBe("professional");
  });

  it("maps legacy Advisor price to Analytical/free without Professional access", () => {
    const decision = evaluateEntitlement({
      stripeStatus: "active",
      priceId: advisorPrice,
      currentPeriodEndsAt: future,
      now: new Date("2026-08-04T12:00:00.000Z"),
    });
    expect(decision.planCode).toBe("analytical");
    expect(decision.entitlementStatus).toBe("free");
    expect(decision.hasProfessionalAccess).toBe(false);

    const features = featureAccessFromDecision(decision, { scenarioCount: 0 });
    expect(features.canExportPdf).toBe(false);
    expect(features.canSaveComparison).toBe(false);
  });

  it("maps legacy Advisor product id to free tier", () => {
    expect(getTierFromProductId(LEGACY_ADVISOR_PRODUCT_ID)).toBe("free");
    expect(isLegacyAdvisorPriceId(advisorPrice)).toBe(true);
    expect(isLegacyAdvisorPriceId(proPrice)).toBe(false);
  });

  it("does not grant admin locked-rate editing from forged client flags", () => {
    expect(
      canEditLockedRatesCapability({
        realIsAdmin: false,
        adminLoading: false,
        isEntitlementPending: false,
      })
    ).toBe(false);
  });

  it("grants locked-rate editing only to server-verified admin when resolved", () => {
    expect(
      canEditLockedRatesCapability({
        realIsAdmin: true,
        adminLoading: false,
        isEntitlementPending: false,
      })
    ).toBe(true);
  });

  it("does not grant Professional access from legacy Advisor metadata alone", () => {
    const decision = evaluateEntitlement({
      stripeStatus: "active",
      priceId: advisorPrice,
      currentPeriodEndsAt: future,
      isAdmin: false,
    });
    expect(decision.isAdminBypass).toBe(false);
    expect(decision.hasProfessionalAccess).toBe(false);
  });
});
