/**
 * Unified UI capabilities — mirrors server entitlement decisions only.
 * Does not grant access from localStorage, simulated tiers, or client Stripe status.
 */

import { useAdmin } from "@/hooks/useAdmin";
import { useSubscription } from "@/hooks/useSubscription";
import { canEditLockedRatesCapability } from "@/lib/adminLockedRateCapability";
import { resolveEffectiveFeatureAccess } from "@/lib/entitlementLoading";

export function useCapabilities() {
  const { isAdmin: realIsAdmin, isLoading: adminLoading } = useAdmin();
  const {
    isLoading: subLoading,
    isPro,
    features: resolvedFeatures,
    planCode,
    entitlementStatus,
    cancelAtPeriodEnd,
    subscriptionEnd,
    scenarioCount,
    isAdminBypass,
    isEntitlementPending,
    isEntitlementResolved,
    isUsageRefreshPending,
  } = useSubscription();

  const isScenarioMutationBlocked = isEntitlementPending || isUsageRefreshPending;

  const features = resolveEffectiveFeatureAccess({
    isEntitlementPending,
    resolvedFeatures,
  });

  const isLoading = adminLoading || subLoading || isEntitlementPending;
  const hasPaid = isEntitlementPending ? false : isPro;
  const canEditLockedRates = canEditLockedRatesCapability({
    realIsAdmin,
    adminLoading,
    isEntitlementPending,
  });

  return {
    isLoading,
    isEntitlementPending,
    isEntitlementResolved,
    isUsageRefreshPending,
    isScenarioMutationBlocked,
    realIsAdmin,
    isAdmin: realIsAdmin,
    hasPaid,
    tier: planCode === "professional" ? "pro" : "free",
    planCode,
    entitlementStatus,
    cancelAtPeriodEnd,
    subscriptionEnd,
    scenarioCount,
    isAdminBypass,
    isSimulating: false,
    canSimulate: false,
    canUsePro: hasPaid,
    canEditLockedRates,
    canModel: features.canModel,
    canCompare: features.canCompareInSession,
    canSave: features.canSaveScenario,
    canExport: features.canExportPdf,
    canViewIncomeContext: features.canViewIncomeContext,
    canVersion: features.canSaveComparison,
    canSaveComparison: features.canSaveComparison,
    canCreateShare: features.canCreateShare,
    canUpdateScenario: features.canUpdateScenario,
    canDuplicateScenario: features.canDuplicateScenario,
    canUpdateComparison: features.canSaveComparison,
    atScenarioLimit: features.atScenarioLimit,
    scenarioLimit: features.scenarioLimit,
    scenariosRemaining: features.scenariosRemaining,
  };
}
