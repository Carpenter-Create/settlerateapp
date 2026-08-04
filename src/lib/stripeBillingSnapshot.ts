/**
 * Stripe Billing snapshot helpers for Basil/Dahlia API shapes.
 *
 * Keep in sync with supabase/functions/_shared/stripeBillingSnapshot.ts
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
