/**
 * Epic 5 PR 6 — final Edge/Deno package-resolution proof.
 *
 * Uses the same import-map configuration as Supabase Edge Functions
 * (`supabase/functions/deno.json` or a per-function deno.json).
 *
 * Run via: npm run test:core-deno-scaffold
 */
import { strict as assert } from "node:assert";
import {
  FREE_SCENARIO_LIMIT,
  PROFESSIONAL_TRIAL_DAYS,
  evaluateEntitlement,
  PROFESSIONAL_PRICE_IDS,
} from "@settlerate/core/entitlement";
import { isCheckoutMaintenanceEnabled } from "@settlerate/core/checkout-maintenance";
import { checkoutIdempotencyKey } from "@settlerate/core/subscription-guard";
import { scrubString } from "@settlerate/core/observability-redaction";
import { mapSubscriptionToBillingSnapshot } from "@settlerate/core/billing-snapshot";
import {
  mapSubscriptionToBillingSnapshot as mapFromAdapter,
  resolveSubscriptionBillingSnapshot,
} from "../_shared/stripeBillingSnapshot.ts";
import {
  resolveStripeCustomerByUserId,
  resolveCheckoutCustomer,
} from "../_shared/stripeCustomerResolve.ts";
import {
  DEFAULT_APP_ORIGIN,
  resolveAppOrigin,
  resolveAppOriginFromOriginHeader,
} from "../_shared/appOrigin.ts";
import {
  isEdgeObservabilityEnabled,
  buildEdgeExtra,
  generateRequestId,
} from "../_shared/observability.ts";
import { mapDerivedExportSummary } from "@settlerate/core/export-summary";
import {
  mapDerivedForExport,
  buildScenarioData,
} from "../generate-pdf/mapDerivedForExport.ts";

const now = new Date("2026-08-04T12:00:00.000Z");
const future = "2026-09-01T00:00:00.000Z";
const USER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

Deno.test("Edge resolves @settlerate/core/entitlement", () => {
  assert.equal(FREE_SCENARIO_LIMIT, 2);
  assert.equal(PROFESSIONAL_TRIAL_DAYS, 7);
  const d = evaluateEntitlement({
    stripeStatus: "trialing",
    priceId: PROFESSIONAL_PRICE_IDS[0],
    currentPeriodEndsAt: future,
    now,
  });
  assert.equal(d.entitlementStatus, "trial_entitled");
});

Deno.test("Edge resolves @settlerate/core/checkout-maintenance", () => {
  assert.equal(isCheckoutMaintenanceEnabled("on"), true);
});

Deno.test("Edge resolves @settlerate/core/subscription-guard", () => {
  assert.equal(checkoutIdempotencyKey("a", "b"), "checkout_a_b");
});

Deno.test("Edge resolves @settlerate/core/observability-redaction", () => {
  assert.ok(scrubString("test@example.com").includes("REDACTED"));
});

Deno.test("Edge billing runtime adapter retains resolve and uses core mapper", async () => {
  const retrieved = {
    id: "sub_x",
    customer: "cus_x",
    status: "active",
    cancel_at_period_end: false,
    items: { data: [{ current_period_end: 99, price: { id: "price_x" } }] },
  };
  const snap = await resolveSubscriptionBillingSnapshot(
    { id: "sub_x", status: "canceled" },
    async () => retrieved
  );
  assert.deepEqual(snap, mapSubscriptionToBillingSnapshot(retrieved));
  assert.deepEqual(snap, mapFromAdapter(retrieved));
});

Deno.test("Edge customer-resolution runtime adapter retains resolveCheckoutCustomer", async () => {
  assert.deepEqual(
    resolveStripeCustomerByUserId(
      [{ id: "cus_1", metadata: { user_id: USER } }],
      USER
    ),
    { kind: "unique", customerId: "cus_1" }
  );
  const result = await resolveCheckoutCustomer(
    { userId: USER, email: "a@example.com" },
    {
      getBillingCustomerId: async () => "cus_mapped",
      findCustomersByUserMetadata: async () => [],
      isCustomerBoundToOtherUser: async () => false,
      createCustomer: async () => "cus_new",
    }
  );
  assert.deepEqual(result, {
    kind: "resolved",
    customerId: "cus_mapped",
    requiresBillingMapUpsert: false,
  });
});

Deno.test("Edge app-origin runtime adapter retains resolveAppOrigin(Request)", () => {
  const req = new Request("https://example.invalid/", {
    headers: { origin: "http://localhost:5173" },
  });
  assert.equal(resolveAppOrigin(req), "http://localhost:5173");
  assert.equal(
    resolveAppOrigin(req),
    resolveAppOriginFromOriginHeader(req.headers.get("origin"))
  );
  const missing = new Request("https://example.invalid/");
  assert.equal(resolveAppOrigin(missing), DEFAULT_APP_ORIGIN);
});

Deno.test("Edge observability runtime adapter retains generateRequestId", () => {
  assert.equal(isEdgeObservabilityEnabled(null), false);
  assert.deepEqual(
    buildEdgeExtra({ function_name: "export-share", request_id: "r", loan: 1 }),
    { function_name: "export-share", request_id: "r" }
  );
  const id = generateRequestId();
  assert.match(
    id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  );
});

Deno.test("Edge export-summary canonical + generate-pdf adapter resolve", () => {
  const derived = {
    activeSnapshot: {
      calculatorVersion: "2.0.0",
      summary: { financingCostOverHorizon: 10, totalInterest: 10 },
    },
  };
  const coreMapped = mapDerivedExportSummary(derived, "active");
  const adapterMapped = mapDerivedForExport(derived, "active");
  assert.equal(coreMapped.financingCostOverHorizon, 10);
  assert.equal(adapterMapped.financingCostOverHorizon, 10);
  assert.equal(typeof buildScenarioData, "function");
});
