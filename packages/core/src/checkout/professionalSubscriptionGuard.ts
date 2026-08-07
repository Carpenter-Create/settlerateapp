/**
 * Checkout guards for preventing overlapping Professional subscriptions.
 *
 * Canonical: `@settlerate/core/subscription-guard`
 * Authority: docs/adr/0005-shared-package-architecture.md (Epic 5 PR 3).
 *
 * Allowlist callback is injected by callers — this module has no Stripe SDK
 * dependency and does not read environment.
 */
export const CHECKOUT_BLOCKING_SUBSCRIPTION_STATUSES = [
  "active",
  "trialing",
  "past_due",
  "unpaid",
] as const;

export interface BillingRowLike {
  price_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
}

/** Structural subscription shape for checkout-block scanning (not the billing-snapshot type). */
export interface StripeSubscriptionLike {
  status?: string | null;
  items?: {
    data?: Array<{
      price?: {
        id?: string | null;
      } | null;
    }> | null;
  } | null;
}

function hasCheckoutBlockingStatus(status: string | null | undefined): boolean {
  return CHECKOUT_BLOCKING_SUBSCRIPTION_STATUSES.includes(
    status as (typeof CHECKOUT_BLOCKING_SUBSCRIPTION_STATUSES)[number]
  );
}

export function billingRowBlocksCheckout(
  billing: BillingRowLike | null | undefined,
  isAllowlistedPrice: (priceId: string | null | undefined) => boolean
): boolean {
  return Boolean(
    billing?.stripe_subscription_id &&
      hasCheckoutBlockingStatus(billing.subscription_status) &&
      isAllowlistedPrice(billing.price_id)
  );
}

export function stripeSubscriptionsBlockCheckout(
  subscriptions: StripeSubscriptionLike[] | null | undefined,
  isAllowlistedPrice: (priceId: string | null | undefined) => boolean
): boolean {
  return Boolean(
    subscriptions?.some(
      (subscription) =>
        hasCheckoutBlockingStatus(subscription.status) &&
        subscription.items?.data?.some((item) => isAllowlistedPrice(item.price?.id))
    )
  );
}

export function checkoutIdempotencyKey(userId: string, priceId: string): string {
  return `checkout_${userId}_${priceId}`;
}
