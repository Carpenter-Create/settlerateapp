import { describe, expect, it } from "vitest";
import {
  FREE_SCENARIO_LIMIT,
  PROFESSIONAL_PRICE_IDS,
  evaluateEntitlement,
  featureAccessFromDecision,
  isFeatureAllowed,
  planCodeToLegacyTier,
  resolvePlanCodeFromPrice,
} from "@/lib/entitlementContract";

const proPrice = PROFESSIONAL_PRICE_IDS[0];
const advisorPrice = "price_1Sod5F3ppKk8xETzl9EDOR6I";
const now = new Date("2026-08-04T12:00:00.000Z");
const future = "2026-09-01T00:00:00.000Z";
const past = "2026-07-01T00:00:00.000Z";

describe("entitlementContract", () => {
  it("maps only allowlisted professional prices", () => {
    expect(resolvePlanCodeFromPrice(proPrice)).toBe("professional");
    expect(resolvePlanCodeFromPrice(advisorPrice)).toBe("analytical");
    expect(resolvePlanCodeFromPrice("price_unknown")).toBe("analytical");
  });

  it("grants entitled for active professional subscription", () => {
    const d = evaluateEntitlement({
      stripeStatus: "active",
      priceId: proPrice,
      currentPeriodEndsAt: future,
      now,
    });
    expect(d.entitlementStatus).toBe("entitled");
    expect(d.planCode).toBe("professional");
    expect(d.hasProfessionalAccess).toBe(true);
  });

  it("grants trial_entitled for trialing professional subscription", () => {
    const d = evaluateEntitlement({
      stripeStatus: "trialing",
      priceId: proPrice,
      currentPeriodEndsAt: future,
      now,
    });
    expect(d.entitlementStatus).toBe("trial_entitled");
    expect(isFeatureAllowed(d, "pdf_export")).toBe(true);
  });

  it("keeps professional access when cancel_at_period_end while still active", () => {
    const d = evaluateEntitlement({
      stripeStatus: "active",
      priceId: proPrice,
      currentPeriodEndsAt: future,
      cancelAtPeriodEnd: true,
      now,
    });
    expect(d.entitlementStatus).toBe("entitled");
    expect(d.cancelAtPeriodEnd).toBe(true);
    expect(d.hasProfessionalAccess).toBe(true);
  });

  it("revokes when period end is in the past even if status still active", () => {
    const d = evaluateEntitlement({
      stripeStatus: "active",
      priceId: proPrice,
      currentPeriodEndsAt: past,
      cancelAtPeriodEnd: true,
      now,
    });
    expect(d.entitlementStatus).toBe("free");
    expect(d.hasProfessionalAccess).toBe(false);
  });

  it("does not grant professional when currentPeriodEndsAt is null", () => {
    const d = evaluateEntitlement({
      stripeStatus: "active",
      priceId: proPrice,
      currentPeriodEndsAt: null,
      now,
    });
    expect(d.entitlementStatus).toBe("free");
    expect(d.hasProfessionalAccess).toBe(false);
  });

  it("maps past_due and unpaid to read_only", () => {
    for (const stripeStatus of ["past_due", "unpaid"] as const) {
      const d = evaluateEntitlement({
        stripeStatus,
        priceId: proPrice,
        currentPeriodEndsAt: future,
        now,
      });
      expect(d.entitlementStatus).toBe("read_only");
      expect(isFeatureAllowed(d, "scenario_create")).toBe(false);
      expect(isFeatureAllowed(d, "scenario_update")).toBe(false);
      expect(isFeatureAllowed(d, "pdf_export")).toBe(false);
      expect(isFeatureAllowed(d, "billing_manage")).toBe(true);
    }
  });

  it("maps incomplete/canceled/paused/none to free analytical", () => {
    for (const stripeStatus of [
      "incomplete",
      "incomplete_expired",
      "canceled",
      "paused",
      "none",
      null,
    ] as const) {
      const d = evaluateEntitlement({
        stripeStatus,
        priceId: proPrice,
        now,
      });
      expect(d.entitlementStatus).toBe("free");
      expect(d.planCode).toBe("analytical");
    }
  });

  it("does not grant professional features for advisor price IDs", () => {
    const d = evaluateEntitlement({
      stripeStatus: "active",
      priceId: advisorPrice,
      currentPeriodEndsAt: future,
      now,
    });
    expect(d.entitlementStatus).toBe("free");
    expect(isFeatureAllowed(d, "pdf_export")).toBe(false);
  });

  it("admin bypass grants professional without billing mutation semantics", () => {
    const d = evaluateEntitlement({
      stripeStatus: "canceled",
      priceId: null,
      isAdmin: true,
      now,
    });
    expect(d.isAdminBypass).toBe(true);
    expect(d.entitlementStatus).toBe("entitled");
    expect(d.hasProfessionalAccess).toBe(true);
  });

  it("enforces free scenario limit of 3 for create/duplicate", () => {
    const d = evaluateEntitlement({
      stripeStatus: "none",
      priceId: null,
      now,
    });
    expect(isFeatureAllowed(d, "scenario_create", { scenarioCount: 2 })).toBe(true);
    expect(isFeatureAllowed(d, "scenario_create", { scenarioCount: 3 })).toBe(false);
    expect(isFeatureAllowed(d, "scenario_duplicate", { scenarioCount: 3 })).toBe(false);
    expect(isFeatureAllowed(d, "scenario_update", { scenarioCount: 3 })).toBe(true);
  });

  it("professional has unlimited scenarios and paid features", () => {
    const d = evaluateEntitlement({
      stripeStatus: "active",
      priceId: proPrice,
      currentPeriodEndsAt: future,
      now,
    });
    const flags = featureAccessFromDecision(d, { scenarioCount: 100 });
    expect(flags.canSaveScenario).toBe(true);
    expect(flags.canSaveComparison).toBe(true);
    expect(flags.canExportPdf).toBe(true);
    expect(flags.canCreateShare).toBe(true);
    expect(flags.canViewIncomeContext).toBe(true);
    expect(flags.scenarioLimit).toBeNull();
    expect(flags.atScenarioLimit).toBe(false);
  });

  it("analytical free access matrix", () => {
    const d = evaluateEntitlement({ stripeStatus: null, priceId: null, now });
    const flags = featureAccessFromDecision(d, { scenarioCount: 1 });
    expect(flags.canModel).toBe(true);
    expect(flags.canCompareInSession).toBe(true);
    expect(flags.canSaveScenario).toBe(true);
    expect(flags.canSaveComparison).toBe(false);
    expect(flags.canExportPdf).toBe(false);
    expect(flags.canCreateShare).toBe(false);
    expect(flags.canViewIncomeContext).toBe(false);
    expect(flags.scenarioLimit).toBe(FREE_SCENARIO_LIMIT);
    expect(planCodeToLegacyTier(d.planCode)).toBe("free");
  });
});
