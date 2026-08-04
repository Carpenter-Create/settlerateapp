import { describe, expect, it, vi } from "vitest";
import {
  resolveCheckoutCustomer,
  resolveStripeCustomerByUserId,
  stripeCustomerMetadataSearchQuery,
  type CheckoutCustomerResolutionDeps,
} from "../../../supabase/functions/_shared/stripeCustomerResolve";

const USER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const EMAIL_A = "user-a@example.com";

function makeCheckoutDeps(
  overrides: Partial<CheckoutCustomerResolutionDeps> = {}
): CheckoutCustomerResolutionDeps {
  return {
    getBillingCustomerId: vi.fn(async () => null),
    findCustomersByUserMetadata: vi.fn(async () => []),
    isCustomerBoundToOtherUser: vi.fn(async () => false),
    createCustomer: vi.fn(async () => "cus_created"),
    ...overrides,
  };
}

describe("resolveStripeCustomerByUserId", () => {
  it("returns none when no customer has matching user metadata", () => {
    expect(
      resolveStripeCustomerByUserId(
        [{ id: "cus_other", metadata: { user_id: USER_B } }],
        USER_A
      )
    ).toEqual({ kind: "none" });
  });

  it("returns the unique matching customer", () => {
    expect(
      resolveStripeCustomerByUserId(
        [{ id: "cus_user_a", metadata: { user_id: USER_A } }],
        USER_A
      )
    ).toEqual({ kind: "unique", customerId: "cus_user_a" });
  });

  it("fails closed when multiple customers have matching user metadata", () => {
    expect(
      resolveStripeCustomerByUserId(
        [
          { id: "cus_user_a_1", metadata: { user_id: USER_A } },
          { id: "cus_user_a_2", metadata: { user_id: USER_A } },
        ],
        USER_A
      )
    ).toEqual({ kind: "ambiguous" });
  });

  it("uses a metadata-only Stripe search query", () => {
    expect(stripeCustomerMetadataSearchQuery(USER_A)).toBe(
      `metadata['user_id']:'${USER_A}'`
    );
  });
});

describe("resolveCheckoutCustomer", () => {
  it("returns the billing map customer without searching or creating", async () => {
    const deps = makeCheckoutDeps({
      getBillingCustomerId: vi.fn(async () => "cus_mapped"),
    });

    await expect(resolveCheckoutCustomer({ userId: USER_A, email: EMAIL_A }, deps)).resolves.toEqual({
      kind: "resolved",
      customerId: "cus_mapped",
      requiresBillingMapUpsert: false,
    });
    expect(deps.findCustomersByUserMetadata).not.toHaveBeenCalled();
    expect(deps.createCustomer).not.toHaveBeenCalled();
  });

  it("uses and repairs a unique metadata-bound customer", async () => {
    const deps = makeCheckoutDeps({
      findCustomersByUserMetadata: vi.fn(async () => [
        { id: "cus_metadata", metadata: { user_id: USER_A } },
      ]),
    });

    await expect(resolveCheckoutCustomer({ userId: USER_A, email: EMAIL_A }, deps)).resolves.toEqual({
      kind: "resolved",
      customerId: "cus_metadata",
      requiresBillingMapUpsert: true,
    });
    expect(deps.isCustomerBoundToOtherUser).toHaveBeenCalledWith("cus_metadata", USER_A);
    expect(deps.createCustomer).not.toHaveBeenCalled();
  });

  it("creates a customer when no metadata-bound customer exists", async () => {
    const deps = makeCheckoutDeps();

    await expect(resolveCheckoutCustomer({ userId: USER_A, email: EMAIL_A }, deps)).resolves.toEqual({
      kind: "resolved",
      customerId: "cus_created",
      requiresBillingMapUpsert: true,
    });
    expect(deps.createCustomer).toHaveBeenCalledWith({ userId: USER_A, email: EMAIL_A });
  });

  it("fails closed when metadata search finds multiple customers", async () => {
    const deps = makeCheckoutDeps({
      findCustomersByUserMetadata: vi.fn(async () => [
        { id: "cus_1", metadata: { user_id: USER_A } },
        { id: "cus_2", metadata: { user_id: USER_A } },
      ]),
    });

    await expect(resolveCheckoutCustomer({ userId: USER_A, email: EMAIL_A }, deps)).resolves.toEqual({
      kind: "ambiguous",
    });
    expect(deps.createCustomer).not.toHaveBeenCalled();
  });

  it("ignores a stranger customer sharing the email because email is not a lookup dependency", async () => {
    const deps = makeCheckoutDeps({
      findCustomersByUserMetadata: vi.fn(async () => [
        { id: "cus_stranger", metadata: { user_id: USER_B } },
      ]),
    });

    await expect(
      resolveCheckoutCustomer({ userId: USER_A, email: "shared@example.com" }, deps)
    ).resolves.toMatchObject({ kind: "resolved", customerId: "cus_created" });
    expect(deps.findCustomersByUserMetadata).toHaveBeenCalledWith(USER_A);
    expect(deps.createCustomer).toHaveBeenCalledWith({
      userId: USER_A,
      email: "shared@example.com",
    });
    expect(deps).not.toHaveProperty("findCustomersByEmail");
  });
});
