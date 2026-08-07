/**
 * Deno import-map resolution proof for Epic 5 PR 4 package subpaths.
 *
 * Run: npm run test:core-deno-scaffold
 */
import { strict as assert } from "node:assert";
import {
  resolveStripeCustomerByUserId,
  stripeCustomerMetadataSearchQuery,
} from "@settlerate/core/customer-resolution";
import * as customerResolution from "@settlerate/core/customer-resolution";
import {
  DEFAULT_APP_ORIGIN,
  resolveAppOriginFromOriginHeader,
} from "@settlerate/core/app-origin";
import {
  isEdgeObservabilityEnabled,
  buildEdgeExtra,
} from "@settlerate/core/edge-observability";
import * as edgeObservability from "@settlerate/core/edge-observability";

const USER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

Deno.test("@settlerate/core/customer-resolution resolves without orchestration", () => {
  assert.deepEqual(
    resolveStripeCustomerByUserId(
      [{ id: "cus_1", metadata: { user_id: USER } }],
      USER
    ),
    { kind: "unique", customerId: "cus_1" }
  );
  assert.equal(
    stripeCustomerMetadataSearchQuery(USER),
    `metadata['user_id']:'${USER}'`
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(customerResolution, "resolveCheckoutCustomer"),
    false
  );
});

Deno.test("@settlerate/core/app-origin resolves without Request", () => {
  assert.equal(
    resolveAppOriginFromOriginHeader("https://app.settlerate.com"),
    "https://app.settlerate.com"
  );
  assert.equal(resolveAppOriginFromOriginHeader(null), DEFAULT_APP_ORIGIN);
  assert.equal(
    resolveAppOriginFromOriginHeader("https://vpcxzbaxhpucvevnkalo.lovable.app"),
    DEFAULT_APP_ORIGIN
  );
});

Deno.test("@settlerate/core/edge-observability resolves without generateRequestId", () => {
  assert.equal(isEdgeObservabilityEnabled("  "), false);
  assert.equal(isEdgeObservabilityEnabled("https://dsn.example/1"), true);
  const extra = buildEdgeExtra({
    function_name: "stripe-webhook",
    request_id: "r1",
    secret: "nope",
  });
  assert.deepEqual(extra, { function_name: "stripe-webhook", request_id: "r1" });
  assert.equal(
    Object.prototype.hasOwnProperty.call(edgeObservability, "generateRequestId"),
    false
  );
});
