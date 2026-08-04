/**
 * Stripe Billing snapshot helpers for Basil/Dahlia API shapes.
 *
 * From 2025-03-31.basil onward:
 * - Subscription period fields live on subscription items, not the top-level Subscription.
 * - Invoice → subscription reference lives under parent.subscription_details.
 *
 * Legacy top-level fields are retained as fallbacks for older webhook API versions.
 */

export interface StripeSubscriptionItemLike {
  current_period_end?: number | null;
  current_period_start?: number | null;
  price?: {
    id?: string | null;
    product?: string | { id?: string | null } | null;
  } | null;
}

export interface StripeSubscriptionLike {
  id?: string | null;
  customer?: string | { id?: string | null } | null;
  status?: string | null;
  cancel_at_period_end?: boolean | null;
  current_period_end?: number | null;
  current_period_start?: number | null;
  items?: {
    data?: StripeSubscriptionItemLike[] | null;
  } | null;
}

export interface StripeInvoiceLike {
  subscription?: string | { id?: string | null } | null;
  parent?: {
    type?: string | null;
    subscription_details?: {
      subscription?: string | { id?: string | null } | null;
    } | null;
  } | null;
}

function asUnixSeconds(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asObjectId(value: string | { id?: string | null } | null | undefined): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (value && typeof value === "object" && typeof value.id === "string" && value.id.length > 0) {
    return value.id;
  }
  return null;
}

export interface StripeSubscriptionBillingSnapshot {
  subscriptionId: string | null;
  stripeCustomerId: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  priceId: string | null;
  productId: string | null;
}

/**
 * Maps the current Stripe Subscription object into the fields persisted by billing.
 * Callers must pass a retrieved subscription rather than trust a webhook's object snapshot.
 */
export function mapSubscriptionToBillingSnapshot(
  subscription: StripeSubscriptionLike | null | undefined
): StripeSubscriptionBillingSnapshot {
  const firstItem = subscription?.items?.data?.[0];

  return {
    subscriptionId: asObjectId(subscription?.id),
    stripeCustomerId: asObjectId(subscription?.customer),
    subscriptionStatus: subscription?.status ?? null,
    currentPeriodEnd: extractSubscriptionPeriodEnd(subscription),
    cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
    priceId: firstItem?.price?.id ?? null,
    productId: asObjectId(firstItem?.price?.product),
  };
}

/**
 * Prefer item-level period end (Basil/Dahlia); fall back to top-level for older payloads.
 * Returns null when items are missing and no legacy field is present.
 */
export function extractSubscriptionPeriodEnd(
  subscription: StripeSubscriptionLike | null | undefined
): number | null {
  if (!subscription) return null;
  const itemEnd = asUnixSeconds(subscription.items?.data?.[0]?.current_period_end);
  if (itemEnd != null) return itemEnd;
  return asUnixSeconds(subscription.current_period_end);
}

/**
 * Prefer item-level period start (Basil/Dahlia); fall back to top-level for older payloads.
 */
export function extractSubscriptionPeriodStart(
  subscription: StripeSubscriptionLike | null | undefined
): number | null {
  if (!subscription) return null;
  const itemStart = asUnixSeconds(subscription.items?.data?.[0]?.current_period_start);
  if (itemStart != null) return itemStart;
  return asUnixSeconds(subscription.current_period_start);
}

/**
 * Resolve the Stripe subscription id from an invoice event object.
 * Prefer parent.subscription_details.subscription; fall back to legacy invoice.subscription.
 */
export function extractInvoiceSubscriptionId(
  invoice: StripeInvoiceLike | null | undefined
): string | null {
  if (!invoice) return null;

  const parent = invoice.parent;
  if (parent?.type === "subscription_details" || parent?.subscription_details != null) {
    const fromParent = asObjectId(parent.subscription_details?.subscription);
    if (fromParent) return fromParent;
  }

  return asObjectId(invoice.subscription);
}
