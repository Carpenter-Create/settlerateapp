import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  SubscriptionState, 
  SubscriptionTier, 
  getTierFromProductId,
  getFeatureAccess,
  FeatureAccess 
} from "@/lib/stripe";
import { useCallback, useEffect } from "react";

interface CheckSubscriptionResponse {
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
  is_admin?: boolean;
  error?: string;
}

async function checkSubscription(accessToken: string): Promise<SubscriptionState> {
  const response = await fetch(
    `https://vpcxzbaxhpucvevnkalo.supabase.co/functions/v1/check-subscription`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to check subscription");
  }

  const data: CheckSubscriptionResponse = await response.json();
  
  // Admin users get full access regardless of Stripe status
  if (data.is_admin) {
    return {
      tier: "advisor" as SubscriptionTier, // Highest tier for admin
      isSubscribed: true,
      productId: "admin_access",
      subscriptionEnd: null,
    };
  }
  
  return {
    tier: data.subscribed ? getTierFromProductId(data.product_id) : "free",
    isSubscribed: data.subscribed,
    productId: data.product_id,
    subscriptionEnd: data.subscription_end,
  };
}

export function useSubscription() {
  const { user, session, isAnonymous } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async (): Promise<SubscriptionState> => {
      // Anonymous users are always free tier
      if (!session?.access_token || isAnonymous) {
        return {
          tier: "free",
          isSubscribed: false,
          productId: null,
          subscriptionEnd: null,
        };
      }

      return checkSubscription(session.access_token);
    },
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refresh every minute
    refetchOnWindowFocus: true,
  });

  // Refresh subscription when session changes
  useEffect(() => {
    if (session?.access_token && !isAnonymous) {
      queryClient.invalidateQueries({ queryKey: ["subscription", user?.id] });
    }
  }, [session?.access_token, isAnonymous, user?.id, queryClient]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["subscription", user?.id] });
  }, [queryClient, user?.id]);

  const tier: SubscriptionTier = query.data?.tier ?? "free";
  const featureAccess: FeatureAccess = getFeatureAccess(tier);

  return {
    ...query,
    tier,
    isPro: tier === "pro" || tier === "advisor",
    isAdvisor: tier === "advisor",
    subscriptionEnd: query.data?.subscriptionEnd ?? null,
    featureAccess,
    refresh,
  };
}

/**
 * Hook to check if a specific feature is available
 */
export function useFeatureAccess() {
  const { featureAccess, isPro, tier, isLoading } = useSubscription();
  return { ...featureAccess, isPro, tier, isLoading };
}
