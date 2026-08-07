/**
 * Runtime adapter for Stripe billing snapshots.
 *
 * Pure mappers/types: `@settlerate/core/billing-snapshot` (via Edge deno.json).
 * Orchestration (`resolveSubscriptionBillingSnapshot`): retained here —
 * awaits an injected retrieve callback (ADR 0005 runtime-specific).
 */

export {
  mapSubscriptionToBillingSnapshot,
  extractSubscriptionPeriodEnd,
  extractSubscriptionPeriodStart,
  extractInvoiceSubscriptionId,
} from "@settlerate/core/billing-snapshot";

export type {
  StripeSubscriptionItemLike,
  StripeSubscriptionLike,
  StripeInvoiceLike,
  StripeSubscriptionBillingSnapshot,
} from "@settlerate/core/billing-snapshot";

import {
  mapSubscriptionToBillingSnapshot,
  type StripeSubscriptionBillingSnapshot,
  type StripeSubscriptionLike,
} from "@settlerate/core/billing-snapshot";

/**
 * Retrieves the authoritative Subscription state before mapping billing fields.
 * Webhook event objects are delivery-time snapshots and can be stale.
 */
export async function resolveSubscriptionBillingSnapshot(
  eventSubscription: { id: string } & StripeSubscriptionLike,
  retrieve: (subscriptionId: string) => Promise<StripeSubscriptionLike>
): Promise<StripeSubscriptionBillingSnapshot> {
  const subscription = await retrieve(eventSubscription.id);
  return mapSubscriptionToBillingSnapshot(subscription);
}
