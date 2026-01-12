/**
 * Hook for unified user capabilities
 * 
 * Combines admin status, advisor role, and subscription tier
 * into a single source of truth for feature gating.
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { getFeatureAccessWithAdminBypass } from "@/lib/authz";

export function useCapabilities() {
  const { user, isAnonymous } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const { tier, isLoading: subLoading } = useSubscription();

  // Check for advisor role in user_roles table
  const advisorQuery = useQuery({
    queryKey: ["advisor-role", user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user?.id) return false;

      // If admin, they have advisor capabilities
      if (isAdmin) return true;

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
  const isAdvisor = isAdmin || advisorQuery.data || false;
  const hasPaid = tier === "pro" || tier === "advisor";

  // Feature access with admin bypass
  const featureAccess = getFeatureAccessWithAdminBypass(tier, isAdmin);

  return {
    isLoading,
    isAdmin,
    isAdvisor,
    hasPaid,
    tier,
    // Unified capability flags
    canUsePro: isAdmin || hasPaid,
    canUseAdvisor: isAdmin || isAdvisor,
    canApproveAdvisors: isAdmin,
    // Feature-level access
    ...featureAccess,
  };
}
