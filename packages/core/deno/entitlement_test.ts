/**
 * Deno import-map resolution proof for @settlerate/core/entitlement (Epic 5 PR 2).
 *
 * Run: npm run test:core-deno-scaffold
 */
import { strict as assert } from "node:assert";
import {
  FREE_SCENARIO_LIMIT,
  PROFESSIONAL_TRIAL_DAYS,
  evaluateEntitlement,
  isFeatureAllowed,
  PROFESSIONAL_PRICE_IDS,
} from "@settlerate/core/entitlement";

const now = new Date("2026-08-04T12:00:00.000Z");
const future = "2026-09-01T00:00:00.000Z";

Deno.test("@settlerate/core/entitlement resolves via packages/core/deno.json", () => {
  assert.equal(FREE_SCENARIO_LIMIT, 2);
  assert.equal(PROFESSIONAL_TRIAL_DAYS, 7);
  const d = evaluateEntitlement({
    stripeStatus: "active",
    priceId: PROFESSIONAL_PRICE_IDS[0],
    currentPeriodEndsAt: future,
    now,
  });
  assert.equal(d.entitlementStatus, "entitled");
  assert.equal(isFeatureAllowed(d, "pdf_export"), true);
});
