/**
 * Final architecture proof: `@settlerate/core/subscription-guard`.
 * Full coverage: packages/core/src/checkout/professionalSubscriptionGuard.test.ts
 */
import { describe, expect, it } from "vitest";
import {
  billingRowBlocksCheckout,
  checkoutIdempotencyKey,
} from "@settlerate/core/subscription-guard";

describe("professionalSubscriptionGuard canonical package import", () => {
  it("resolves guard helpers via package subpath", () => {
    expect(
      billingRowBlocksCheckout(
        {
          stripe_subscription_id: "sub_1",
          subscription_status: "active",
          price_id: "price_pro",
        },
        (priceId) => priceId === "price_pro"
      )
    ).toBe(true);
    expect(checkoutIdempotencyKey("user", "price")).toBe("checkout_user_price");
  });
});
