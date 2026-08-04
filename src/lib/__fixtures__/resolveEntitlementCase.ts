/**
 * Resolves entitlement parity fixtures using offsets from a reference clock.
 * SQL harness uses database now(); Vitest uses Date at test start.
 */

export interface EntitlementBillingFixture {
  subscription_status: string;
  price_id: string | null;
  /** Days from reference now; null = explicit null period end */
  periodEndOffsetDays?: number | null;
  cancel_at_period_end?: boolean;
}

export interface EntitlementCaseFixture {
  label: string;
  userId: string;
  billing: EntitlementBillingFixture | null;
  isAdmin?: boolean;
  expect: {
    entitlementStatus: string;
    planCode: string;
    hasProfessionalAccess: boolean;
    cancelAtPeriodEnd: boolean;
    isAdminBypass?: boolean;
  };
}

export function resolvePeriodEnd(
  billing: EntitlementBillingFixture | null | undefined,
  referenceNow: Date
): string | null {
  if (!billing) return null;
  if (billing.periodEndOffsetDays === null) return null;
  if (typeof billing.periodEndOffsetDays === "number") {
    const d = new Date(referenceNow.getTime());
    d.setUTCDate(d.getUTCDate() + billing.periodEndOffsetDays);
    return d.toISOString();
  }
  return null;
}

export function resolveEntitlementInput(
  c: EntitlementCaseFixture,
  referenceNow: Date
) {
  return {
    stripeStatus: c.billing?.subscription_status ?? null,
    priceId: c.billing?.price_id ?? null,
    currentPeriodEndsAt: resolvePeriodEnd(c.billing, referenceNow),
    cancelAtPeriodEnd: c.billing?.cancel_at_period_end ?? false,
    isAdmin: c.isAdmin ?? false,
    now: referenceNow,
  };
}

export function resolveBillingRow(
  c: EntitlementCaseFixture,
  referenceNow: Date
): {
  subscription_status: string;
  price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
} | null {
  if (!c.billing) return null;
  return {
    subscription_status: c.billing.subscription_status,
    price_id: c.billing.price_id,
    current_period_end: resolvePeriodEnd(c.billing, referenceNow),
    cancel_at_period_end: c.billing.cancel_at_period_end ?? false,
  };
}
