/**
 * Hook for unified user capabilities
 * 
 * Combines admin status, advisor role, subscription tier,
 * and admin testing mode into a single source of truth.
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useSubscription } from "@/hooks/useSubscription";
import { useEffectiveAccess, getEffectiveTier } from "@/hooks/useEffectiveAccess";
import { supabase } from "@/integrations/supabase/client";
import { getFeatureAccessWithAdminBypass } from "@/lib/authz";

export function useCapabilities() {
  const { user, isAnonymous } = useAuth();
  const { isAdmin: realIsAdmin, isLoading: adminLoading } = useAdmin();
  const { tier: realTier, isLoading: subLoading } = useSubscription();
  const { effectiveRole, effectiveTier, isSimulating, canSimulate } = useEffectiveAccess();

  // Check for advisor role in user_roles table
  const advisorQuery = useQuery({
    queryKey: ["advisor-role", user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user?.id) return false;

      // If admin, they have advisor capabilities
      if (realIsAdmin) return true;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "advisor")
        .maybeSingle();

      if (error) {
        return false;
      }

      return data !== null;
    },
    enabled: !!user?.id && !isAnonymous && !adminLoading,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = adminLoading || subLoading || advisorQuery.isLoading;

  // Compute effective values based on simulation state
  const isAdmin = realIsAdmin && effectiveRole === "admin";
  const tier = getEffectiveTier(realTier, realIsAdmin, isSimulating, effectiveTier);
  
  const isAdvisor = isAdmin || advisorQuery.data || false;
  const hasPaid = tier === "pro" || tier === "advisor";

  // Feature access - respects simulation mode
  const featureAccess = getFeatureAccessWithAdminBypass(tier, isAdmin);

  return {
    isLoading,
    // Real values (for testing panel visibility)
    realIsAdmin,
    // Effective values (for feature gating)
    isAdmin,
    isAdvisor,
    hasPaid,
    tier,
    // Simulation state
    isSimulating,
    canSimulate,
    // Unified capability flags
    canUsePro: isAdmin || hasPaid,
    canUseAdvisor: isAdmin || isAdvisor,
    canApproveAdvisors: isAdmin,
    // Feature-level access
    ...featureAccess,
  };
}
