/**
 * Unified UI capabilities — mirrors server entitlement decisions only.
 * Does not grant access from localStorage, simulated tiers, or client Stripe status.
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";

export function useCapabilities() {
  const { user, isAnonymous } = useAuth();
  const { isAdmin: realIsAdmin, isLoading: adminLoading } = useAdmin();
  const {
    isLoading: subLoading,
    isPro,
    features,
    planCode,
    entitlementStatus,
    cancelAtPeriodEnd,
    subscriptionEnd,
    scenarioCount,
    isAdminBypass,
  } = useSubscription();

  // Advisor role is retained for compatibility only — does not grant features
  const advisorQuery = useQuery({
    queryKey: ["advisor-role", user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "advisor")
        .maybeSingle();
      if (error) return false;
      return data !== null;
    },
    enabled: !!user?.id && !isAnonymous && !adminLoading,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = adminLoading || subLoading || advisorQuery.isLoading;
  const hasPaid = isPro;
  const isAdvisorRole = Boolean(advisorQuery.data);

  return {
    isLoading,
    realIsAdmin,
    isAdmin: realIsAdmin,
    isAdvisor: isAdvisorRole,
    hasPaid,
    tier: planCode === "professional" ? "pro" : "free",
    planCode,
    entitlementStatus,
    cancelAtPeriodEnd,
    subscriptionEnd,
    scenarioCount,
    isAdminBypass,
    // Simulation removed from entitlement path (Phase 6)
    isSimulating: false,
    canSimulate: false,
    canUsePro: hasPaid,
    canUseAdvisor: false, // not an active tier
    canApproveAdvisors: realIsAdmin,
    // Feature-level access (mirror of check-subscription)
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
    atScenarioLimit: features.atScenarioLimit,
    scenarioLimit: features.scenarioLimit,
    scenariosRemaining: features.scenariosRemaining,
  };
}
