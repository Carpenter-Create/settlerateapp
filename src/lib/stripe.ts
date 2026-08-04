/**
 * Stripe Configuration for SettleRate
 * 
 * Products and pricing for subscription access.
 * Do not modify these values without updating Stripe dashboard.
 */

// SettleRate Pro - Professional Access tier
export const STRIPE_PRO_MONTHLY_PRICE_ID = "price_1Sod4a3ppKk8xETz9TzPFn8P";
export const STRIPE_PRO_ANNUAL_PRICE_ID = "price_1Sod513ppKk8xETzwcEPnT51";
export const STRIPE_PRO_PRODUCT_ID = "prod_TmBRSW3mqUk9l9";

// SettleRate Advisor - Future tier (not surfaced in UI)
export const STRIPE_ADVISOR_MONTHLY_PRICE_ID = "price_1Sod5F3ppKk8xETzl9EDOR6I";
export const STRIPE_ADVISOR_ANNUAL_PRICE_ID = "price_1Sod5S3ppKk8xETzmky1P3Pr";
export const STRIPE_ADVISOR_PRODUCT_ID = "prod_TmBSkiojosKhTo";

// Pricing values (in cents for Stripe, display values for UI)
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

// Subscription tiers
export type SubscriptionTier = "free" | "pro" | "advisor";

export interface SubscriptionState {
  tier: SubscriptionTier;
  isSubscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
}

/**
 * Feature access based on subscription tier
 */
export interface FeatureAccess {
  canModel: boolean;
  canCompare: boolean;
  canSave: boolean;
  canExport: boolean;
  canViewIncomeContext: boolean;
  canVersion: boolean;
}

/**
 * Legacy helper. Prefer featureAccessFromDecision / check-subscription.
 * Advisor tier no longer grants features (compatibility alias only).
 */
export function getFeatureAccess(tier: SubscriptionTier): FeatureAccess {
  switch (tier) {
    case "pro":
      return {
        canModel: true,
        canCompare: true,
        canSave: true,
        canExport: true,
        canViewIncomeContext: true,
        canVersion: true,
      };
    case "advisor":
    case "free":
    default:
      return {
        canModel: true,
        canCompare: true,
        // Analytical may save up to the free limit (enforced server-side)
        canSave: tier === "free" || tier === "advisor",
        canExport: false,
        canViewIncomeContext: false,
        canVersion: false,
      };
  }
}

/**
 * Determine subscription tier from Stripe product ID
 */
export function getTierFromProductId(productId: string | null): SubscriptionTier {
  if (!productId) return "free";
  
  // Check for Pro product (both monthly and annual share product IDs in similar namespace)
  if (productId === STRIPE_PRO_PRODUCT_ID || productId === "prod_TmBRGPUBjfB7DR") {
    return "pro";
  }
  
  // Check for Advisor product
  if (productId === STRIPE_ADVISOR_PRODUCT_ID || productId === "prod_TmBSkiojosKhTo") {
    return "advisor";
  }
  
  return "free";
}
