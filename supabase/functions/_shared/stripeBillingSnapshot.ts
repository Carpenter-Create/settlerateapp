/**
 * Runtime adapter + compatibility surface for Stripe billing snapshots.
 *
 * Pure mappers/types: packages/core billing-snapshot (temporary relative bridge).
 * Orchestration (`resolveSubscriptionBillingSnapshot`): retained here —
 * awaits an injected retrieve callback (ADR 0005 runtime-specific).
 *
 * Deletion condition for the relative bridge / re-export surface: remove when
 * Edge Functions resolve `@settlerate/core/billing-snapshot` via an approved
 * Deno/Supabase import map and CI proves Deno + deploy graph without this
 * path (Epic 5 PR 6). Orchestration may remain in an Edge adapter indefinitely.
 */

export {
  mapSubscriptionToBillingSnapshot,
  extractSubscriptionPeriodEnd,
  extractSubscriptionPeriodStart,
  extractInvoiceSubscriptionId,
} from "../../../packages/core/src/billing/stripeBillingSnapshot.ts";

export type {
  StripeSubscriptionItemLike,
  StripeSubscriptionLike,
  StripeInvoiceLike,
  StripeSubscriptionBillingSnapshot,
} from "../../../packages/core/src/billing/stripeBillingSnapshot.ts";

import {
  mapSubscriptionToBillingSnapshot,
  type StripeSubscriptionBillingSnapshot,
  type StripeSubscriptionLike,
} from "../../../packages/core/src/billing/stripeBillingSnapshot.ts";

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
