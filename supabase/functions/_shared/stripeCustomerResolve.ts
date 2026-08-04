/**
 * A Stripe customer is eligible for application binding only when its immutable
 * application user id matches exactly. Email addresses are not an ownership signal.
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
  if (matches.length === 1) return { kind: "unique", customerId: matches[0].id };
  return { kind: "ambiguous" };
}

export function stripeCustomerMetadataSearchQuery(userId: string): string {
  return `metadata['user_id']:'${userId}'`;
}
