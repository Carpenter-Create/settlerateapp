import {
  evaluateEntitlement,
  featureAccessFromDecision,
  type FeatureAccessFlags,
} from "@/lib/entitlementContract";

/** Fail-closed feature flags while subscription/usage is unresolved. */
export function unresolvedFeatureAccess(): FeatureAccessFlags {
  return {
    canModel: true,
    canCompareInSession: true,
    canSaveScenario: false,
    canUpdateScenario: false,
    canDuplicateScenario: false,
    canSaveComparison: false,
    canExportPdf: false,
    canCreateShare: false,
    canViewIncomeContext: false,
    canManageBilling: true,
    scenarioLimit: null,
    scenariosRemaining: null,
    atScenarioLimit: false,
  };
}

export function isAuthenticatedEntitlementPending(options: {
  hasUser: boolean;
  isAnonymous: boolean;
  isSubscriptionLoading: boolean;
  isSubscriptionSuccess: boolean;
}): boolean {
  if (!options.hasUser || options.isAnonymous) return false;
  return options.isSubscriptionLoading || !options.isSubscriptionSuccess;
}

export function isUsageRefreshPending(options: {
  hasUser: boolean;
  isAnonymous: boolean;
  isSubscriptionSuccess: boolean;
  isSubscriptionFetching: boolean;
}): boolean {
  if (!options.hasUser || options.isAnonymous) return false;
  return options.isSubscriptionSuccess && options.isSubscriptionFetching;
}

export function isEntitlementStatePending(options: {
  hasUser: boolean;
  isAnonymous: boolean;
  isSubscriptionLoading: boolean;
  isSubscriptionSuccess: boolean;
  isSubscriptionFetching: boolean;
}): boolean {
  return (
    isAuthenticatedEntitlementPending({
      hasUser: options.hasUser,
      isAnonymous: options.isAnonymous,
      isSubscriptionLoading: options.isSubscriptionLoading,
      isSubscriptionSuccess: options.isSubscriptionSuccess,
    }) ||
    isUsageRefreshPending({
      hasUser: options.hasUser,
      isAnonymous: options.isAnonymous,
      isSubscriptionSuccess: options.isSubscriptionSuccess,
      isSubscriptionFetching: options.isSubscriptionFetching,
    })
  );
}

export function resolveEffectiveFeatureAccess(options: {
  isEntitlementPending: boolean;
  resolvedFeatures: FeatureAccessFlags;
}): FeatureAccessFlags {
  if (options.isEntitlementPending) {
    return unresolvedFeatureAccess();
  }
  return options.resolvedFeatures;
}

/** Placeholder decision for unresolved authenticated sessions (not used for grants). */
export function unresolvedEntitlementDecision() {
  return evaluateEntitlement({ stripeStatus: null, priceId: null });
}

export function buildAnonymousEntitlementState() {
  const decision = evaluateEntitlement({ stripeStatus: null, priceId: null });
  const features = featureAccessFromDecision(decision, { scenarioCount: 0 });
  return {
    tier: "free" as const,
    isSubscribed: false,
    productId: null,
    subscriptionEnd: null,
    planCode: decision.planCode,
    entitlementStatus: decision.entitlementStatus,
    cancelAtPeriodEnd: false,
    isAdminBypass: false,
    scenarioCount: 0,
    features,
    decision,
  };
}

export function buildUnresolvedEntitlementState() {
  return {
    tier: "free" as const,
    isSubscribed: false,
    productId: null,
    subscriptionEnd: null,
    planCode: "analytical" as const,
    entitlementStatus: "free" as const,
    cancelAtPeriodEnd: false,
    isAdminBypass: false,
    scenarioCount: 0,
    features: unresolvedFeatureAccess(),
    decision: unresolvedEntitlementDecision(),
  };
}
