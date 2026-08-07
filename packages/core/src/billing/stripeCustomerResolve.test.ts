import { describe, expect, it } from "vitest";
import {
  resolveStripeCustomerByUserId,
  stripeCustomerMetadataSearchQuery,
} from "@settlerate/core/customer-resolution";
import * as customerResolution from "@settlerate/core/customer-resolution";

const USER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

describe("resolveStripeCustomerByUserId", () => {
  it("returns none when no customer has matching user metadata", () => {
    expect(
      resolveStripeCustomerByUserId(
        [{ id: "cus_other", metadata: { user_id: USER_B } }],
        USER_A
      )
    ).toEqual({ kind: "none" });
  });

  it("returns none for missing or empty metadata", () => {
    expect(
      resolveStripeCustomerByUserId([{ id: "cus_1", metadata: null }], USER_A)
    ).toEqual({ kind: "none" });
    expect(
      resolveStripeCustomerByUserId([{ id: "cus_2", metadata: {} }], USER_A)
    ).toEqual({ kind: "none" });
    expect(
      resolveStripeCustomerByUserId(
        [{ id: "cus_3", metadata: { user_id: undefined } }],
        USER_A
      )
    ).toEqual({ kind: "none" });
  });

  it("ignores wrong metadata.user_id values", () => {
    expect(
      resolveStripeCustomerByUserId(
        [
          { id: "cus_wrong", metadata: { user_id: USER_B } },
          { id: "cus_email_only", metadata: { email: "a@example.com" } },
        ],
        USER_A
      )
    ).toEqual({ kind: "none" });
  });

  it("returns the unique matching customer id", () => {
    expect(
      resolveStripeCustomerByUserId(
        [
          { id: "cus_other", metadata: { user_id: USER_B } },
          { id: "cus_user_a", metadata: { user_id: USER_A } },
        ],
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

  it("requires exact metadata.user_id equality (no substring/prefix match)", () => {
    expect(
      resolveStripeCustomerByUserId(
        [{ id: "cus_prefix", metadata: { user_id: `${USER_A}-extra` } }],
        USER_A
      )
    ).toEqual({ kind: "none" });
  });
});

describe("stripeCustomerMetadataSearchQuery", () => {
  it("uses a metadata-only Stripe search query with exact format", () => {
    expect(stripeCustomerMetadataSearchQuery(USER_A)).toBe(
      `metadata['user_id']:'${USER_A}'`
    );
  });

  it("does not escape or rewrite the user id (preserves current semantics)", () => {
    const odd = "user-with-'quote";
    expect(stripeCustomerMetadataSearchQuery(odd)).toBe(
      `metadata['user_id']:'${odd}'`
    );
  });
});

describe("customer-resolution core architecture boundary", () => {
  it("does not export resolveCheckoutCustomer or CheckoutCustomerResolutionDeps", () => {
    expect(
      Object.prototype.hasOwnProperty.call(customerResolution, "resolveCheckoutCustomer")
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(
        customerResolution,
        "CheckoutCustomerResolutionDeps"
      )
    ).toBe(false);
    expect("resolveCheckoutCustomer" in customerResolution).toBe(false);
  });
});
