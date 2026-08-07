import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { buildEdgeFunctionUrl } from "@/lib/edgeFunctionUrl";
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
  featureAccessFromDecision,
  planCodeToLegacyTier,
} from "@settlerate/core/entitlement";
import { useCallback, useEffect } from "react";
import {
  buildAnonymousEntitlementState,
  buildUnresolvedEntitlementState,
  isAuthenticatedEntitlementPending,
  isUsageRefreshPending,
} from "@/lib/entitlementLoading";
import { subscriptionQueryKey } from "@/lib/entitlementUsageRefresh";

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
    buildEdgeFunctionUrl(import.meta.env.VITE_SUPABASE_URL, "check-subscription"),
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
  return buildAnonymousEntitlementState();
}

function unresolvedState(): EntitlementState {
  return buildUnresolvedEntitlementState();
}

export function useSubscription() {
  const { user, session, isAnonymous } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: subscriptionQueryKey(user?.id),
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
      queryClient.invalidateQueries({ queryKey: subscriptionQueryKey(user?.id) });
    }
  }, [session?.access_token, isAnonymous, user?.id, queryClient]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: subscriptionQueryKey(user?.id) });
  }, [queryClient, user?.id]);

  const isEntitlementPending = isAuthenticatedEntitlementPending({
    hasUser: Boolean(user),
    isAnonymous,
    isSubscriptionLoading: query.isLoading,
    isSubscriptionSuccess: query.isSuccess,
  });

  const isUsageRefreshPendingFlag = isUsageRefreshPending({
    hasUser: Boolean(user),
    isAnonymous,
    isSubscriptionSuccess: query.isSuccess,
    isSubscriptionFetching: query.isFetching,
  });

  const state = query.data ?? (isEntitlementPending ? unresolvedState() : freeState());
  const isEntitlementResolved = !isEntitlementPending;
  const featureAccess = flagsToLegacyFeatureAccess(state.features);

  return {
    ...query,
    tier: state.tier,
    isPro: state.isSubscribed,
    subscriptionEnd: state.subscriptionEnd,
    planCode: state.planCode,
    entitlementStatus: state.entitlementStatus,
    cancelAtPeriodEnd: state.cancelAtPeriodEnd,
    isAdminBypass: state.isAdminBypass,
    scenarioCount: state.scenarioCount,
    features: state.features,
    decision: state.decision,
    featureAccess,
    isEntitlementResolved,
    isEntitlementPending,
    isUsageRefreshPending: isUsageRefreshPendingFlag,
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
