/**
 * Runtime-adapter coverage for resolveSubscriptionBillingSnapshot.
 * Pure mapper coverage: packages/core/src/billing/stripeBillingSnapshot.test.ts
 */
import { describe, expect, it, vi } from "vitest";
import {
  extractSubscriptionPeriodEnd,
  mapSubscriptionToBillingSnapshot,
  resolveSubscriptionBillingSnapshot,
} from "@/lib/stripeBillingSnapshot";
import * as coreBilling from "@settlerate/core/billing-snapshot";

const periodEndUnix = Math.floor(new Date("2026-09-04T00:00:00.000Z").getTime() / 1000);

describe("stripeBillingSnapshot runtime adapter", () => {
  it("retains resolveSubscriptionBillingSnapshot and maps via core", async () => {
    const staleEventSubscription = {
      id: "sub_current",
      customer: "cus_current",
      status: "active",
      cancel_at_period_end: false,
      items: {
        data: [
          {
            current_period_end: periodEndUnix,
            price: { id: "price_stale", product: "prod_stale" },
          },
        ],
      },
    };
    const retrievedSubscription = {
      id: "sub_current",
      customer: { id: "cus_current" },
      status: "canceled",
      cancel_at_period_end: true,
      items: {
        data: [
          {
            current_period_end: periodEndUnix + 86_400,
            price: { id: "price_current", product: { id: "prod_current" } },
          },
        ],
      },
    };

    const retrieve = vi.fn().mockResolvedValue(retrievedSubscription);
    const billingSnapshot = await resolveSubscriptionBillingSnapshot(
      staleEventSubscription,
      retrieve
    );

    expect(retrieve).toHaveBeenCalledOnce();
    expect(retrieve).toHaveBeenCalledWith("sub_current");
    expect(billingSnapshot).toMatchObject({
      subscriptionId: "sub_current",
      stripeCustomerId: "cus_current",
      subscriptionStatus: "canceled",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: periodEndUnix + 86_400,
      priceId: "price_current",
      productId: "prod_current",
    });
    expect(billingSnapshot).toEqual(
      mapSubscriptionToBillingSnapshot(retrievedSubscription)
    );
  });

  it("re-exports pure helpers from core while keeping resolve runtime-only", () => {
    expect(extractSubscriptionPeriodEnd({ current_period_end: periodEndUnix })).toBe(
      periodEndUnix
    );
    expect(
      Object.prototype.hasOwnProperty.call(
        coreBilling,
        "resolveSubscriptionBillingSnapshot"
      )
    ).toBe(false);
    expect(typeof resolveSubscriptionBillingSnapshot).toBe("function");
  });
});
