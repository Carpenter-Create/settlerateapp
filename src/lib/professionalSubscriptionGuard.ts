/**
 * Checkout guards for preventing overlapping Professional subscriptions.
 *
 * Keep in sync with supabase/functions/_shared/professionalSubscriptionGuard.ts.
 */
export const CHECKOUT_BLOCKING_SUBSCRIPTION_STATUSES = [
  "active",
  "trialing",
  "past_due",
  "unpaid",
] as const;

interface BillingRowLike {
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
}

interface StripeSubscriptionLike {
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

export function billingRowBlocksCheckout(billing: BillingRowLike | null | undefined): boolean {
  return Boolean(
    billing?.stripe_subscription_id && hasCheckoutBlockingStatus(billing.subscription_status)
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
