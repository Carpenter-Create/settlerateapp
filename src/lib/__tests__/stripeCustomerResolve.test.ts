/**
 * Runtime-adapter coverage for resolveCheckoutCustomer.
 * Pure matching/query coverage: packages/core/src/billing/stripeCustomerResolve.test.ts
 */
import { describe, expect, it, vi } from "vitest";
import {
  resolveCheckoutCustomer,
  resolveStripeCustomerByUserId,
  type CheckoutCustomerResolutionDeps,
} from "../../../supabase/functions/_shared/stripeCustomerResolve";
import * as coreCustomer from "@settlerate/core/customer-resolution";

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

describe("stripeCustomerResolve runtime adapter", () => {
  it("re-exports pure helpers from core", () => {
    expect(
      resolveStripeCustomerByUserId(
        [{ id: "cus_user_a", metadata: { user_id: USER_A } }],
        USER_A
      )
    ).toEqual({ kind: "unique", customerId: "cus_user_a" });
    expect(
      Object.prototype.hasOwnProperty.call(coreCustomer, "resolveCheckoutCustomer")
    ).toBe(false);
    expect(typeof resolveCheckoutCustomer).toBe("function");
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

  it("returns bound_elsewhere when the unique customer is owned by another user", async () => {
    const deps = makeCheckoutDeps({
      findCustomersByUserMetadata: vi.fn(async () => [
        { id: "cus_taken", metadata: { user_id: USER_A } },
      ]),
      isCustomerBoundToOtherUser: vi.fn(async () => true),
    });

    await expect(resolveCheckoutCustomer({ userId: USER_A, email: EMAIL_A }, deps)).resolves.toEqual({
      kind: "bound_elsewhere",
    });
    expect(deps.createCustomer).not.toHaveBeenCalled();
  });
});
