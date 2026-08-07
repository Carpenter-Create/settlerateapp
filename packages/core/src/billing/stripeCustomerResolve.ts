/**
 * Pure Stripe customer-resolution helpers.
 *
 * Canonical: `@settlerate/core/customer-resolution`
 * Authority: docs/adr/0005-shared-package-architecture.md (Epic 5 PR 4).
 *
 * A Stripe customer is eligible for application binding only when its immutable
 * application user id matches exactly. Email addresses are not an ownership signal.
 *
 * Checkout orchestration (`resolveCheckoutCustomer`) remains in the Edge
 * runtime adapter — it invokes async injected I/O.
 */

export interface StripeCustomerLike {
  id: string;
  metadata?: Record<string, string | undefined> | null;
}

export type StripeCustomerResolution =
  | { kind: "none" }
  | { kind: "unique"; customerId: string }
  | { kind: "ambiguous" };

export function resolveStripeCustomerByUserId(
  customers: readonly StripeCustomerLike[],
  userId: string
): StripeCustomerResolution {
  const matches = customers.filter((customer) => customer.metadata?.user_id === userId);

  if (matches.length === 0) return { kind: "none" };
  if (matches.length === 1) return { kind: "unique", customerId: matches[0]!.id };
  return { kind: "ambiguous" };
}

export function stripeCustomerMetadataSearchQuery(userId: string): string {
  return `metadata['user_id']:'${userId}'`;
}

/** Structural checkout resolution result (orchestration stays runtime-side). */
export type CheckoutCustomerResolution =
  | { kind: "resolved"; customerId: string; requiresBillingMapUpsert: boolean }
  | { kind: "ambiguous" }
  | { kind: "bound_elsewhere" };
