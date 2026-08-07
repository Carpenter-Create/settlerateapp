/**
 * Deno import-map resolution proof for Epic 5 PR 3 package subpaths.
 *
 * Run: npm run test:core-deno-scaffold
 */
import { strict as assert } from "node:assert";
import {
  CHECKOUT_MAINTENANCE_CODE,
  isCheckoutMaintenanceEnabled,
  checkoutMaintenancePayload,
} from "@settlerate/core/checkout-maintenance";
import {
  CHECKOUT_BLOCKING_SUBSCRIPTION_STATUSES,
  billingRowBlocksCheckout,
  checkoutIdempotencyKey,
} from "@settlerate/core/subscription-guard";
import { scrubString, redactExtra } from "@settlerate/core/observability-redaction";
import {
  mapSubscriptionToBillingSnapshot,
  extractSubscriptionPeriodEnd,
} from "@settlerate/core/billing-snapshot";
import * as billingSnapshot from "@settlerate/core/billing-snapshot";

Deno.test("@settlerate/core/checkout-maintenance resolves", () => {
  assert.equal(isCheckoutMaintenanceEnabled("YES"), true);
  assert.equal(checkoutMaintenancePayload().code, CHECKOUT_MAINTENANCE_CODE);
});

Deno.test("@settlerate/core/subscription-guard resolves", () => {
  assert.ok(CHECKOUT_BLOCKING_SUBSCRIPTION_STATUSES.includes("past_due"));
  assert.equal(
    billingRowBlocksCheckout(
      {
        price_id: "price_p",
        stripe_subscription_id: "sub_1",
        subscription_status: "active",
      },
      (id) => id === "price_p"
    ),
    true
  );
  assert.equal(checkoutIdempotencyKey("u", "p"), "checkout_u_p");
});

Deno.test("@settlerate/core/observability-redaction resolves", () => {
  assert.equal(scrubString("Bearer abc.def"), "[REDACTED]");
  assert.deepEqual(redactExtra({ user_id: "u1", password: "x" }), { user_id: "u1" });
});

Deno.test("@settlerate/core/billing-snapshot resolves without resolve orchestration", () => {
  const end = extractSubscriptionPeriodEnd({ current_period_end: 123 });
  assert.equal(end, 123);
  const snap = mapSubscriptionToBillingSnapshot({
    id: "sub_1",
    status: "active",
    cancel_at_period_end: false,
    items: { data: [{ price: { id: "price_1", product: "prod_1" } }] },
  });
  assert.equal(snap.subscriptionId, "sub_1");
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      billingSnapshot,
      "resolveSubscriptionBillingSnapshot"
    ),
    false
  );
});
