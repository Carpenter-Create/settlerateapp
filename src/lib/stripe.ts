/**
 * Stripe Configuration for SettleRate
 *
 * Customer plans: SettleRate Free (internal analytical) and SettleRate Professional (paid).
 * Legacy Advisor product IDs resolve to free — see LEGACY_ADVISOR_* in entitlementContract.
 */

import { LEGACY_ADVISOR_PRICE_IDS } from "@settlerate/core/entitlement";

export const STRIPE_PRO_MONTHLY_PRICE_ID = "price_1U0t2QC56u2NxRItya8dElyg";
export const STRIPE_PRO_ANNUAL_PRICE_ID = "price_1U0t2jC56u2NxRItM185AYK9";
export const STRIPE_PRO_PRODUCT_ID = "prod_V0usthAF9WnoGJ";
export const STRIPE_PRO_MONTHLY_LOOKUP_KEY = "settlerate_professional_monthly";
export const STRIPE_PRO_ANNUAL_LOOKUP_KEY = "settlerate_professional_annual";

/** @deprecated Legacy Advisor product — maps to free/analytical only. */
export const LEGACY_ADVISOR_PRODUCT_ID = "prod_TmBSkiojosKhTo";

export const PRICING = {
  pro: {
    monthly: {
      amount: 1900,
      display: 19,
      interval: "month" as const,
    },
    annual: {
      amount: 19000,
      display: 190,
      interval: "year" as const,
    },
  },
} as const;

/** Legacy UI tier alias aligned with planCodeToLegacyTier. */
export type SubscriptionTier = "free" | "pro";

export interface SubscriptionState {
  tier: SubscriptionTier;
  isSubscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
}

export interface FeatureAccess {
  canModel: boolean;
  canCompare: boolean;
  canSave: boolean;
  canExport: boolean;
  canViewIncomeContext: boolean;
  canVersion: boolean;
}

/**
 * @deprecated Prefer featureAccessFromDecision / check-subscription.
 */
export function getFeatureAccess(tier: SubscriptionTier): FeatureAccess {
  if (tier === "pro") {
    return {
      canModel: true,
      canCompare: true,
      canSave: true,
      canExport: true,
      canViewIncomeContext: true,
      canVersion: true,
    };
  }
  return {
    canModel: true,
    canCompare: true,
    canSave: true,
    canExport: false,
    canViewIncomeContext: false,
    canVersion: false,
  };
}

/**
 * Legacy product-id mapping. Advisor product resolves to free.
 */
export function getTierFromProductId(productId: string | null): SubscriptionTier {
  if (!productId) return "free";

  if (productId === STRIPE_PRO_PRODUCT_ID) {
    return "pro";
  }

  if (productId === LEGACY_ADVISOR_PRODUCT_ID) {
    return "free";
  }

  return "free";
}

export function isLegacyAdvisorPriceId(priceId: string | null | undefined): boolean {
  if (!priceId) return false;
  return (LEGACY_ADVISOR_PRICE_IDS as readonly string[]).includes(priceId);
}
