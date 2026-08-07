/**
 * Deno resolution proof for the Edge compatibility shim (Epic 5 PR 2).
 * Imports the same relative bridge used by supabase/functions/_shared.
 *
 * Run: npm run test:core-deno-scaffold
 */
import { strict as assert } from "node:assert";
import {
  FREE_SCENARIO_LIMIT,
  PROFESSIONAL_TRIAL_DAYS,
  evaluateEntitlement,
  PROFESSIONAL_PRICE_IDS,
} from "../../../supabase/functions/_shared/entitlementContract.ts";

const now = new Date("2026-08-04T12:00:00.000Z");
const future = "2026-09-01T00:00:00.000Z";

Deno.test("Edge entitlement shim resolves to canonical core", () => {
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
