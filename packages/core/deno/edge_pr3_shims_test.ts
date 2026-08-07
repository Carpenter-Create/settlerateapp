/**
 * Deno resolution proof for Edge compatibility shims/adapters (Epic 5 PR 3).
 *
 * Run: npm run test:core-deno-scaffold
 */
import { strict as assert } from "node:assert";
import {
  isCheckoutMaintenanceEnabled,
} from "../../../supabase/functions/_shared/checkoutMaintenance.ts";
import {
  checkoutIdempotencyKey,
} from "../../../supabase/functions/_shared/professionalSubscriptionGuard.ts";
import {
  scrubString,
} from "../../../supabase/functions/_shared/observabilityRedaction.ts";
import {
  mapSubscriptionToBillingSnapshot,
  resolveSubscriptionBillingSnapshot,
} from "../../../supabase/functions/_shared/stripeBillingSnapshot.ts";

Deno.test("Edge checkout maintenance shim resolves", () => {
  assert.equal(isCheckoutMaintenanceEnabled("on"), true);
});

Deno.test("Edge subscription guard shim resolves", () => {
  assert.equal(checkoutIdempotencyKey("a", "b"), "checkout_a_b");
});

Deno.test("Edge observability redaction shim resolves", () => {
  assert.ok(scrubString("test@example.com").includes("REDACTED"));
});

Deno.test("Edge billing adapter retains resolve and uses core mapper", async () => {
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
  assert.equal(snap.subscriptionStatus, "active");
});
