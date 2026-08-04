import { describe, expect, it } from "vitest";
import {
  evaluateEntitlement,
  featureAccessFromDecision,
  type FeatureAccessFlags,
} from "@/lib/entitlementContract";
import {
  isAuthenticatedEntitlementPending,
  resolveEffectiveFeatureAccess,
  unresolvedFeatureAccess,
} from "@/lib/entitlementLoading";

const PRO_PRICE = "price_1Sod4a3ppKk8xETz9TzPFn8P";
const future = new Date("2026-12-01T00:00:00.000Z");

function resolvedFeatures(
  stripeStatus: string | null,
  priceId: string | null,
  scenarioCount: number,
  options?: { periodEnd?: Date | null; isAdmin?: boolean }
): FeatureAccessFlags {
  const decision = evaluateEntitlement({
    stripeStatus,
    priceId,
    currentPeriodEndsAt: options?.periodEnd ?? future,
    isAdmin: options?.isAdmin,
    now: new Date("2026-08-04T12:00:00.000Z"),
  });
  return featureAccessFromDecision(decision, { scenarioCount });
}

describe("entitlementLoading", () => {
  it("marks authenticated subscription fetch as pending until success", () => {
    expect(
      isAuthenticatedEntitlementPending({
        hasUser: true,
        isAnonymous: false,
        isSubscriptionLoading: true,
        isSubscriptionSuccess: false,
      })
    ).toBe(true);
    expect(
      isAuthenticatedEntitlementPending({
        hasUser: true,
        isAnonymous: false,
        isSubscriptionLoading: false,
        isSubscriptionSuccess: true,
      })
    ).toBe(false);
    expect(
      isAuthenticatedEntitlementPending({
        hasUser: false,
        isAnonymous: false,
        isSubscriptionLoading: true,
        isSubscriptionSuccess: false,
      })
    ).toBe(false);
  });

  it("fail-closed unresolved state disables create, duplicate, and paid features", () => {
    const flags = unresolvedFeatureAccess();
    expect(flags.canSaveScenario).toBe(false);
    expect(flags.canDuplicateScenario).toBe(false);
    expect(flags.canSaveComparison).toBe(false);
    expect(flags.canExportPdf).toBe(false);
    expect(flags.canCreateShare).toBe(false);
    expect(flags.canViewIncomeContext).toBe(false);
    expect(flags.canModel).toBe(true);
    expect(flags.canCompareInSession).toBe(true);
  });

  it("loading state cannot create, duplicate, or use paid features", () => {
    const professional = resolvedFeatures("active", PRO_PRICE, 0);
    const effective = resolveEffectiveFeatureAccess({
      isEntitlementPending: true,
      resolvedFeatures: professional,
    });
    expect(effective.canSaveScenario).toBe(false);
    expect(effective.canDuplicateScenario).toBe(false);
    expect(effective.canExportPdf).toBe(false);
    expect(effective.canSaveComparison).toBe(false);
  });

  it("resolved free user below limit receives create and duplicate", () => {
    const flags = resolvedFeatures(null, null, 2);
    const effective = resolveEffectiveFeatureAccess({
      isEntitlementPending: false,
      resolvedFeatures: flags,
    });
    expect(effective.canSaveScenario).toBe(true);
    expect(effective.canDuplicateScenario).toBe(true);
    expect(effective.atScenarioLimit).toBe(false);
  });

  it("resolved free user at limit does not receive create or duplicate", () => {
    const flags = resolvedFeatures(null, null, 3);
    const effective = resolveEffectiveFeatureAccess({
      isEntitlementPending: false,
      resolvedFeatures: flags,
    });
    expect(effective.canSaveScenario).toBe(false);
    expect(effective.canDuplicateScenario).toBe(false);
    expect(effective.atScenarioLimit).toBe(true);
  });

  it("resolved Professional user receives applicable paid capabilities", () => {
    const flags = resolvedFeatures("active", PRO_PRICE, 10);
    const effective = resolveEffectiveFeatureAccess({
      isEntitlementPending: false,
      resolvedFeatures: flags,
    });
    expect(effective.canSaveScenario).toBe(true);
    expect(effective.canDuplicateScenario).toBe(true);
    expect(effective.canExportPdf).toBe(true);
    expect(effective.canSaveComparison).toBe(true);
  });
});
