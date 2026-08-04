import { describe, expect, it } from "vitest";
import {
  billingRowBlocksCheckout,
  checkoutIdempotencyKey,
  stripeSubscriptionsBlockCheckout,
} from "@/lib/professionalSubscriptionGuard";

const PROFESSIONAL_PRICE_ID = "price_professional";
const isAllowlistedProfessionalPrice = (priceId: string | null | undefined) =>
  priceId === PROFESSIONAL_PRICE_ID;

describe("professionalSubscriptionGuard", () => {
  it.each(["active", "trialing", "past_due", "unpaid"])(
    "blocks billing rows with a subscription id and %s status",
    (subscriptionStatus) => {
      expect(
        billingRowBlocksCheckout({
          stripe_subscription_id: "sub_professional",
          subscription_status: subscriptionStatus,
        })
      ).toBe(true);
    }
  );

  it("does not block billing rows without a subscription id or with a non-blocking status", () => {
    expect(
      billingRowBlocksCheckout({
        stripe_subscription_id: null,
        subscription_status: "active",
      })
    ).toBe(false);
    expect(
      billingRowBlocksCheckout({
        stripe_subscription_id: "sub_canceled",
        subscription_status: "canceled",
      })
    ).toBe(false);
  });

  it.each(["active", "trialing", "past_due", "unpaid"])(
    "blocks Stripe subscriptions with an allowlisted Professional price and %s status",
    (status) => {
      expect(
        stripeSubscriptionsBlockCheckout(
          [{ status, items: { data: [{ price: { id: PROFESSIONAL_PRICE_ID } }] } }],
          isAllowlistedProfessionalPrice
        )
      ).toBe(true);
    }
  );

  it("does not block canceled subscriptions, non-Professional prices, or malformed items", () => {
    expect(
      stripeSubscriptionsBlockCheckout(
        [
          { status: "canceled", items: { data: [{ price: { id: PROFESSIONAL_PRICE_ID } }] } },
          { status: "active", items: { data: [{ price: { id: "price_other" } }] } },
          { status: "active", items: { data: [{}] } },
        ],
        isAllowlistedProfessionalPrice
      )
    ).toBe(false);
  });

  it("creates a deterministic checkout idempotency key", () => {
    expect(checkoutIdempotencyKey("user_123", PROFESSIONAL_PRICE_ID)).toBe(
      "checkout_user_123_price_professional"
    );
  });
});
