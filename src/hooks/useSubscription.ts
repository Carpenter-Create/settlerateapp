import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  SubscriptionState,
  SubscriptionTier,
  FeatureAccess,
} from "@/lib/stripe";
import {
  EntitlementDecision,
  EntitlementStatus,
  FeatureAccessFlags,
  PlanCode,
  evaluateEntitlement,
  featureAccessFromDecision,
  planCodeToLegacyTier,
} from "@/lib/entitlementContract";
import { useCallback, useEffect } from "react";

interface CheckSubscriptionResponse {
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
  is_admin?: boolean;
  is_admin_bypass?: boolean;
  plan_code?: PlanCode;
  entitlement_status?: EntitlementStatus;
  cancel_at_period_end?: boolean;
  price_id?: string | null;
  stripe_status?: string | null;
  features?: FeatureAccessFlags;
  scenario_count?: number;
  legacy_tier?: "free" | "pro";
  error?: string;
}

export interface EntitlementState extends SubscriptionState {
  planCode: PlanCode;
  entitlementStatus: EntitlementStatus;
  cancelAtPeriodEnd: boolean;
  isAdminBypass: boolean;
  scenarioCount: number;
  features: FeatureAccessFlags;
  decision: EntitlementDecision;
}

function flagsToLegacyFeatureAccess(flags: FeatureAccessFlags): FeatureAccess {
  return {
    canModel: flags.canModel,
    canCompare: flags.canCompareInSession,
    canSave: flags.canSaveScenario,
    canExport: flags.canExportPdf,
    canViewIncomeContext: flags.canViewIncomeContext,
    canVersion: flags.canSaveComparison,
  };
}

async function checkSubscription(accessToken: string): Promise<EntitlementState> {
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

  const decision: EntitlementDecision = {
    planCode: data.plan_code ?? (data.subscribed ? "professional" : "analytical"),
    entitlementStatus: data.entitlement_status ?? (data.subscribed ? "entitled" : "free"),
    isAdminBypass: Boolean(data.is_admin_bypass ?? data.is_admin),
    cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
    currentPeriodEndsAt: data.subscription_end,
    priceId: data.price_id ?? null,
    stripeStatus: data.stripe_status ?? null,
    hasProfessionalAccess: Boolean(data.subscribed),
  };

  const scenarioCount = data.scenario_count ?? 0;
  const features =
    data.features ??
    featureAccessFromDecision(decision, { scenarioCount });

  const tier: SubscriptionTier =
    data.legacy_tier ?? planCodeToLegacyTier(decision.planCode);

  return {
    tier,
    isSubscribed: decision.hasProfessionalAccess,
    productId: data.product_id,
    subscriptionEnd: data.subscription_end,
    planCode: decision.planCode,
    entitlementStatus: decision.entitlementStatus,
    cancelAtPeriodEnd: decision.cancelAtPeriodEnd,
    isAdminBypass: decision.isAdminBypass,
    scenarioCount,
    features,
    decision,
  };
}

function freeState(): EntitlementState {
  const decision = evaluateEntitlement({ stripeStatus: null, priceId: null });
  const features = featureAccessFromDecision(decision, { scenarioCount: 0 });
  return {
    tier: "free",
    isSubscribed: false,
    productId: null,
    subscriptionEnd: null,
    planCode: "analytical",
    entitlementStatus: "free",
    cancelAtPeriodEnd: false,
    isAdminBypass: false,
    scenarioCount: 0,
    features,
    decision,
  };
}

export function useSubscription() {
  const { user, session, isAnonymous } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async (): Promise<EntitlementState> => {
      if (!session?.access_token || isAnonymous) {
        return freeState();
      }
      return checkSubscription(session.access_token);
    },
    enabled: !!user,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (session?.access_token && !isAnonymous) {
      queryClient.invalidateQueries({ queryKey: ["subscription", user?.id] });
    }
  }, [session?.access_token, isAnonymous, user?.id, queryClient]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["subscription", user?.id] });
  }, [queryClient, user?.id]);

  const state = query.data ?? freeState();
  const featureAccess = flagsToLegacyFeatureAccess(state.features);

  return {
    ...query,
    tier: state.tier,
    isPro: state.isSubscribed,
    isAdvisor: false, // advisor is not an active entitlement tier
    subscriptionEnd: state.subscriptionEnd,
    planCode: state.planCode,
    entitlementStatus: state.entitlementStatus,
    cancelAtPeriodEnd: state.cancelAtPeriodEnd,
    isAdminBypass: state.isAdminBypass,
    scenarioCount: state.scenarioCount,
    features: state.features,
    decision: state.decision,
    featureAccess,
    refresh,
  };
}

/**
 * Hook to check if a specific feature is available (UI mirror of server decision).
 */
export function useFeatureAccess() {
  const { featureAccess, isPro, tier, isLoading, features } = useSubscription();
  return { ...featureAccess, isPro, tier, isLoading, features };
}
