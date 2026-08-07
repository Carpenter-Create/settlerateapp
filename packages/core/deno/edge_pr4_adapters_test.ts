/**
 * Deno resolution proof for Edge PR 4 compatibility adapters.
 *
 * Run: npm run test:core-deno-scaffold
 */
import { strict as assert } from "node:assert";
import {
  resolveStripeCustomerByUserId,
  resolveCheckoutCustomer,
} from "../../../supabase/functions/_shared/stripeCustomerResolve.ts";
import {
  DEFAULT_APP_ORIGIN,
  resolveAppOrigin,
  resolveAppOriginFromOriginHeader,
} from "../../../supabase/functions/_shared/appOrigin.ts";
import {
  isEdgeObservabilityEnabled,
  buildEdgeExtra,
  generateRequestId,
} from "../../../supabase/functions/_shared/observability.ts";

const USER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

Deno.test("Edge customer-resolution adapter retains resolveCheckoutCustomer", async () => {
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

Deno.test("Edge app-origin adapter delegates Request Origin to core", () => {
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

Deno.test("Edge observability adapter retains generateRequestId", () => {
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
