import { describe, expect, it } from "vitest";
import {
  PROFESSIONAL_PRICE_IDS,
  PROFESSIONAL_PRODUCT_IDS,
  SANDBOX_RETIRED_PROFESSIONAL_PRICE_IDS,
  evaluateEntitlement,
} from "@settlerate/core/entitlement";
import {
  extractInvoiceSubscriptionId,
  extractSubscriptionPeriodEnd,
  extractSubscriptionPeriodStart,
  mapSubscriptionToBillingSnapshot,
} from "@settlerate/core/billing-snapshot";
import * as billingSnapshot from "@settlerate/core/billing-snapshot";

const proMonthlyPrice = PROFESSIONAL_PRICE_IDS[0];
const proProductId = PROFESSIONAL_PRODUCT_IDS[0];
const now = new Date("2026-08-04T12:00:00.000Z");
const periodStartUnix = Math.floor(new Date("2026-08-04T00:00:00.000Z").getTime() / 1000);
const periodEndUnix = Math.floor(new Date("2026-09-04T00:00:00.000Z").getTime() / 1000);

describe("stripeBillingSnapshot — Basil/Dahlia period mapping", () => {
  it("reads item-level period fields when top-level current_period_end is absent", () => {
    const subscription = {
      // Dahlia/Basil payload: no top-level period fields
      items: {
        data: [
          {
            current_period_start: periodStartUnix,
            current_period_end: periodEndUnix,
            price: { id: proMonthlyPrice, product: proProductId },
          },
        ],
      },
    };

    expect(extractSubscriptionPeriodEnd(subscription)).toBe(periodEndUnix);
    expect(extractSubscriptionPeriodStart(subscription)).toBe(periodStartUnix);
  });

  it("falls back to legacy top-level period fields when items omit them", () => {
    const subscription = {
      current_period_start: periodStartUnix,
      current_period_end: periodEndUnix,
      items: { data: [{ price: { id: proMonthlyPrice } }] },
    };

    expect(extractSubscriptionPeriodEnd(subscription)).toBe(periodEndUnix);
    expect(extractSubscriptionPeriodStart(subscription)).toBe(periodStartUnix);
  });

  it("prefers item-level period over stale top-level values", () => {
    const subscription = {
      current_period_end: periodEndUnix - 10_000,
      items: {
        data: [{ current_period_end: periodEndUnix }],
      },
    };

    expect(extractSubscriptionPeriodEnd(subscription)).toBe(periodEndUnix);
  });

  it("returns null safely when items are missing and no legacy period exists", () => {
    expect(extractSubscriptionPeriodEnd({})).toBeNull();
    expect(extractSubscriptionPeriodEnd({ items: { data: [] } })).toBeNull();
    expect(extractSubscriptionPeriodEnd(null)).toBeNull();
    expect(extractSubscriptionPeriodStart(undefined)).toBeNull();
  });

  it("maps active Professional Basil payload to entitled with non-null period end", () => {
    const subscription = {
      items: {
        data: [
          {
            current_period_start: periodStartUnix,
            current_period_end: periodEndUnix,
            price: { id: proMonthlyPrice, product: proProductId },
          },
        ],
      },
    };

    const periodEnd = extractSubscriptionPeriodEnd(subscription);
    expect(periodEnd).toBe(periodEndUnix);
    expect(periodEnd).not.toBeNull();

    const decision = evaluateEntitlement({
      stripeStatus: "active",
      priceId: proMonthlyPrice,
      productId: proProductId,
      currentPeriodEndsAt: new Date(periodEnd! * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      now,
    });

    expect(decision.entitlementStatus).toBe("entitled");
    expect(decision.planCode).toBe("professional");
    expect(decision.hasProfessionalAccess).toBe(true);
    expect(decision.currentPeriodEndsAt).toBe(new Date(periodEndUnix * 1000).toISOString());
  });

  it("does not grant entitled when Basil payload has no period on items (regression of prior defect)", () => {
    const periodEnd = extractSubscriptionPeriodEnd({
      items: {
        data: [{ price: { id: proMonthlyPrice } }],
      },
    });
    expect(periodEnd).toBeNull();

    const decision = evaluateEntitlement({
      stripeStatus: "active",
      priceId: proMonthlyPrice,
      currentPeriodEndsAt: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      now,
    });
    expect(decision.entitlementStatus).toBe("free");
  });
});

describe("stripeBillingSnapshot — invoice subscription mapping", () => {
  it("reads invoice.paid subscription from parent.subscription_details.subscription", () => {
    const invoice = {
      parent: {
        type: "subscription_details",
        subscription_details: {
          subscription: "sub_paid_1",
        },
      },
    };

    expect(extractInvoiceSubscriptionId(invoice)).toBe("sub_paid_1");
  });

  it("reads invoice.payment_failed subscription from parent.subscription_details.subscription", () => {
    const invoice = {
      parent: {
        type: "subscription_details",
        subscription_details: {
          subscription: { id: "sub_failed_1" },
        },
      },
    };

    expect(extractInvoiceSubscriptionId(invoice)).toBe("sub_failed_1");
  });

  it("falls back to legacy invoice.subscription when parent path is absent", () => {
    expect(extractInvoiceSubscriptionId({ subscription: "sub_legacy_1" })).toBe("sub_legacy_1");
    expect(extractInvoiceSubscriptionId({ subscription: { id: "sub_legacy_2" } })).toBe(
      "sub_legacy_2"
    );
  });

  it("returns null when subscription reference is missing (safe skip)", () => {
    expect(extractInvoiceSubscriptionId({})).toBeNull();
    expect(
      extractInvoiceSubscriptionId({
        parent: { type: "quote_details", subscription_details: null },
      })
    ).toBeNull();
    expect(extractInvoiceSubscriptionId(null)).toBeNull();
  });

  it("prefers parent.subscription_details over legacy invoice.subscription", () => {
    const invoice = {
      subscription: "sub_legacy",
      parent: {
        type: "subscription_details",
        subscription_details: { subscription: "sub_parent" },
      },
    };
    expect(extractInvoiceSubscriptionId(invoice)).toBe("sub_parent");
  });
});


describe("stripeBillingSnapshot — mapSubscriptionToBillingSnapshot", () => {
  it("maps status, cancel_at_period_end, and object customer/product IDs", () => {
    const snapshot = mapSubscriptionToBillingSnapshot({
      id: "sub_obj",
      customer: { id: "cus_obj" },
      status: "past_due",
      cancel_at_period_end: true,
      items: {
        data: [
          {
            current_period_end: 1_700_000_000,
            price: { id: "price_x", product: { id: "prod_x" } },
          },
        ],
      },
    });
    expect(snapshot).toMatchObject({
      subscriptionId: "sub_obj",
      stripeCustomerId: "cus_obj",
      subscriptionStatus: "past_due",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: 1_700_000_000,
      priceId: "price_x",
      productId: "prod_x",
    });
  });

  it("maps string customer/subscription/product IDs", () => {
    const snapshot = mapSubscriptionToBillingSnapshot({
      id: "sub_str",
      customer: "cus_str",
      status: "active",
      cancel_at_period_end: false,
      items: {
        data: [{ price: { id: "price_y", product: "prod_y" } }],
      },
    });
    expect(snapshot.subscriptionId).toBe("sub_str");
    expect(snapshot.stripeCustomerId).toBe("cus_str");
    expect(snapshot.productId).toBe("prod_y");
    expect(snapshot.cancelAtPeriodEnd).toBe(false);
  });
});

describe("stripeBillingSnapshot — core architecture boundary", () => {
  it("does not export resolveSubscriptionBillingSnapshot from billing-snapshot", () => {
    expect(
      Object.prototype.hasOwnProperty.call(
        billingSnapshot,
        "resolveSubscriptionBillingSnapshot"
      )
    ).toBe(false);
    expect(
      "resolveSubscriptionBillingSnapshot" in billingSnapshot
    ).toBe(false);
  });
});

describe("stripeBillingSnapshot — catalog and advisor invariants unchanged", () => {
  it("does not alter allowlisted Professional prices or advisor denial", () => {
    expect(PROFESSIONAL_PRICE_IDS).toEqual([
      "price_1U0t2QC56u2NxRItya8dElyg",
      "price_1U0t2jC56u2NxRItM185AYK9",
    ]);
    expect(PROFESSIONAL_PRODUCT_IDS).toEqual(["prod_V0usthAF9WnoGJ"]);

    const advisor = evaluateEntitlement({
      stripeStatus: "active",
      priceId: "price_1Sod5F3ppKk8xETzl9EDOR6I",
      currentPeriodEndsAt: new Date(periodEndUnix * 1000).toISOString(),
      now,
    });
    expect(advisor.entitlementStatus).toBe("free");
    expect(advisor.hasProfessionalAccess).toBe(false);

    for (const sandboxPrice of SANDBOX_RETIRED_PROFESSIONAL_PRICE_IDS) {
      const retired = evaluateEntitlement({
        stripeStatus: "active",
        priceId: sandboxPrice,
        currentPeriodEndsAt: new Date(periodEndUnix * 1000).toISOString(),
        now,
      });
      expect(retired.hasProfessionalAccess).toBe(false);
      expect(retired.planCode).toBe("analytical");
    }
  });
});
