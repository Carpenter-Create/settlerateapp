/**
 * Runtime adapter for Stripe customer resolution.
 *
 * Pure helpers/types: `@settlerate/core/customer-resolution` (via Edge deno.json).
 * Orchestration (`resolveCheckoutCustomer` + deps): retained here — invokes
 * async injected I/O (ADR 0005 runtime-specific).
 */

export {
  resolveStripeCustomerByUserId,
  stripeCustomerMetadataSearchQuery,
} from "@settlerate/core/customer-resolution";

export type {
  StripeCustomerLike,
  StripeCustomerResolution,
  CheckoutCustomerResolution,
} from "@settlerate/core/customer-resolution";

import {
  resolveStripeCustomerByUserId,
  type CheckoutCustomerResolution,
  type StripeCustomerLike,
} from "@settlerate/core/customer-resolution";

export interface CheckoutCustomerResolutionDeps {
  getBillingCustomerId: (userId: string) => Promise<string | null | undefined>;
  findCustomersByUserMetadata: (userId: string) => Promise<readonly StripeCustomerLike[]>;
  isCustomerBoundToOtherUser: (customerId: string, userId: string) => Promise<boolean>;
  createCustomer: (input: { email: string; userId: string }) => Promise<string>;
}

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
