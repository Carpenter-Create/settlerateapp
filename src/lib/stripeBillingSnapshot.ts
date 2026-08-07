/**
 * Runtime adapter + compatibility surface for Stripe billing snapshots.
 *
 * Pure mappers/types: `@settlerate/core/billing-snapshot`
 * Orchestration (`resolveSubscriptionBillingSnapshot`): retained here —
 * awaits an injected retrieve callback (ADR 0005 runtime-specific).
 *
 * Deletion condition for the re-export surface: remove when all importers use
 * `@settlerate/core/billing-snapshot` for pure symbols and a dedicated runtime
 * adapter path for orchestration (Epic 5 PR 6).
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
  const retrievedSubscription = await retrieve(eventSubscription.id);
  return mapSubscriptionToBillingSnapshot(retrievedSubscription);
}
