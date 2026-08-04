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

export interface CheckoutCustomerResolutionDeps {
  getBillingCustomerId: (userId: string) => Promise<string | null | undefined>;
  findCustomersByUserMetadata: (userId: string) => Promise<readonly StripeCustomerLike[]>;
  isCustomerBoundToOtherUser: (customerId: string, userId: string) => Promise<boolean>;
  createCustomer: (input: { email: string; userId: string }) => Promise<string>;
}

export type CheckoutCustomerResolution =
  | { kind: "resolved"; customerId: string; requiresBillingMapUpsert: boolean }
  | { kind: "ambiguous" }
  | { kind: "bound_elsewhere" };

/**
 * Resolves checkout ownership from the app's billing map or Stripe metadata only.
 * Email is passed solely to create a new Stripe customer; it is never a lookup key.
 */
export async function resolveCheckoutCustomer(
  input: { userId: string; email: string },
  deps: CheckoutCustomerResolutionDeps
): Promise<CheckoutCustomerResolution> {
  const mappedCustomerId = await deps.getBillingCustomerId(input.userId);
  if (mappedCustomerId) {
    return {
      kind: "resolved",
      customerId: mappedCustomerId,
      requiresBillingMapUpsert: false,
    };
  }

  const metadataResolution = resolveStripeCustomerByUserId(
    await deps.findCustomersByUserMetadata(input.userId),
    input.userId
  );
  if (metadataResolution.kind === "ambiguous") return { kind: "ambiguous" };

  if (metadataResolution.kind === "unique") {
    if (await deps.isCustomerBoundToOtherUser(metadataResolution.customerId, input.userId)) {
      return { kind: "bound_elsewhere" };
    }
    return {
      kind: "resolved",
      customerId: metadataResolution.customerId,
      requiresBillingMapUpsert: true,
    };
  }

  return {
    kind: "resolved",
    customerId: await deps.createCustomer(input),
    requiresBillingMapUpsert: true,
  };
}
