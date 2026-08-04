import { describe, expect, it } from "vitest";
import {
  resolveStripeCustomerByUserId,
  stripeCustomerMetadataSearchQuery,
} from "../../../supabase/functions/_shared/stripeCustomerResolve";

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
