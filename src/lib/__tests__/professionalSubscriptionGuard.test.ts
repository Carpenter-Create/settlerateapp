/**
 * Compatibility proof: `@/lib/professionalSubscriptionGuard` re-exports canonical core.
 * Full coverage: packages/core/src/checkout/professionalSubscriptionGuard.test.ts
 */
import { describe, expect, it } from "vitest";
import {
  billingRowBlocksCheckout,
  checkoutIdempotencyKey,
} from "@/lib/professionalSubscriptionGuard";

describe("professionalSubscriptionGuard app compatibility shim", () => {
  it("resolves guard helpers via @/lib re-export", () => {
    expect(
      billingRowBlocksCheckout(
        {
          price_id: "price_professional",
          stripe_subscription_id: "sub_1",
          subscription_status: "active",
        },
        (id) => id === "price_professional"
      )
    ).toBe(true);
    expect(checkoutIdempotencyKey("user_1", "price_x")).toBe("checkout_user_1_price_x");
  });
});
