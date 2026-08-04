import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { refetchEntitlementUsage } from "@/lib/entitlementUsageRefresh";

/** Central hook for refreshing authoritative scenario_count after usage mutations. */
export function useInvalidateEntitlementUsage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useCallback(async () => {
    await refetchEntitlementUsage(queryClient, user?.id);
  }, [queryClient, user?.id]);
}
