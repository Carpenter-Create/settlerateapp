/**
 * Runtime adapter + compatibility surface for Stripe customer resolution.
 *
 * Pure helpers/types: packages/core customer-resolution (temporary relative bridge).
 * Orchestration (`resolveCheckoutCustomer` + deps): retained here — invokes
 * async injected I/O (ADR 0005 runtime-specific).
 *
 * Deletion condition for the relative bridge / re-export surface: remove when
 * Edge Functions resolve `@settlerate/core/customer-resolution` via an approved
 * Deno/Supabase import map and CI proves Deno + deploy graph without this
 * path (Epic 5 PR 6). Orchestration may remain in an Edge adapter indefinitely.
 */

export {
  resolveStripeCustomerByUserId,
  stripeCustomerMetadataSearchQuery,
} from "../../../packages/core/src/billing/stripeCustomerResolve.ts";

export type {
  StripeCustomerLike,
  StripeCustomerResolution,
  CheckoutCustomerResolution,
} from "../../../packages/core/src/billing/stripeCustomerResolve.ts";

import {
  resolveStripeCustomerByUserId,
  type CheckoutCustomerResolution,
  type StripeCustomerLike,
} from "../../../packages/core/src/billing/stripeCustomerResolve.ts";

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
