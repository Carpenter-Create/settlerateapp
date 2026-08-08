import { describe, expect, it } from "vitest";
import {
  assertRecoveryEnvironmentTarget,
  diffBillingState,
  reconstructBillingFromEvidence,
  type BillingRecoveryEvidenceRecord,
} from "./billingRecovery.ts";

const STAGING_PRICE = "price_1U2BGAC56u2NxRItx3etGK2q";
const STAGING_PRODUCT = "prod_V2FlK0MVh9ZmBh";

function subSource(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_test_1",
    object: "subscription",
    customer: "cus_test_1",
    status: "active",
    cancel_at_period_end: false,
    items: {
      data: [
        {
          current_period_end: 1_900_000_000,
          price: { id: STAGING_PRICE, product: STAGING_PRODUCT },
        },
      ],
    },
    ...overrides,
  };
}

function evidence(
  partial: Partial<BillingRecoveryEvidenceRecord> &
    Pick<BillingRecoveryEvidenceRecord, "eventId" | "eventType" | "eventCreated">
): BillingRecoveryEvidenceRecord {
  return {
    livemode: false,
    eventPayload: {
      id: partial.eventId,
      type: partial.eventType,
      created: partial.eventCreated,
      livemode: false,
      data: { object: subSource() },
    },
    appliedSubscriptionSource: subSource(),
    ...partial,
  };
}

describe("reconstructBillingFromEvidence", () => {
  it("reconstructs entitled professional from Layer B evidence", () => {
    const result = reconstructBillingFromEvidence([
      evidence({
        eventId: "evt_1",
        eventType: "customer.subscription.created",
        eventCreated: 1_700_000_000,
      }),
    ]);

    expect(result.status).toBe("reconstructed");
    expect(result.proposed?.entitlementStatus).toBe("entitled");
    expect(result.proposed?.planCode).toBe("professional");
    expect(result.proposed?.priceId).toBe(STAGING_PRICE);
    expect(result.proposed?.lastStripeEventId).toBe("evt_1");
  });

  it("is idempotent when the same event is present once", () => {
    const row = evidence({
      eventId: "evt_dup",
      eventType: "customer.subscription.updated",
      eventCreated: 1_700_000_100,
    });
    const a = reconstructBillingFromEvidence([row]);
    const b = reconstructBillingFromEvidence([row]);
    expect(a.proposed).toEqual(b.proposed);
  });

  it("applies newer event over older when out of order in input", () => {
    const older = evidence({
      eventId: "evt_old",
      eventType: "customer.subscription.updated",
      eventCreated: 1_700_000_000,
      appliedSubscriptionSource: subSource({ status: "active" }),
    });
    const newer = evidence({
      eventId: "evt_new",
      eventType: "customer.subscription.updated",
      eventCreated: 1_700_000_500,
      appliedSubscriptionSource: subSource({
        status: "canceled",
        items: {
          data: [
            {
              current_period_end: 1_700_000_400,
              price: { id: STAGING_PRICE, product: STAGING_PRODUCT },
            },
          ],
        },
      }),
    });

    const result = reconstructBillingFromEvidence([newer, older]);
    expect(result.status).toBe("reconstructed");
    expect(result.proposed?.subscriptionStatus).toBe("canceled");
    expect(result.proposed?.lastStripeEventId).toBe("evt_new");
    expect(result.appliedEventIds).toEqual(["evt_old", "evt_new"]);
  });

  it("orders by event.created so input order cannot revive stale status", () => {
    const newer = evidence({
      eventId: "evt_new",
      eventType: "customer.subscription.updated",
      eventCreated: 1_700_000_500,
      appliedSubscriptionSource: subSource({ status: "active" }),
    });
    const older = evidence({
      eventId: "evt_old",
      eventType: "customer.subscription.updated",
      eventCreated: 1_700_000_000,
      appliedSubscriptionSource: subSource({ status: "past_due" }),
    });

    const forward = reconstructBillingFromEvidence([older, newer]);
    const reversed = reconstructBillingFromEvidence([newer, older]);
    expect(forward.proposed?.subscriptionStatus).toBe("active");
    expect(reversed.proposed?.subscriptionStatus).toBe("active");
    expect(forward.proposed).toEqual(reversed.proposed);
    expect(forward.appliedEventIds).toEqual(["evt_old", "evt_new"]);
    expect(reversed.appliedEventIds).toEqual(["evt_old", "evt_new"]);
  });

  it("fails closed when no evidence", () => {
    const result = reconstructBillingFromEvidence([]);
    expect(result.status).toBe("unresolved");
    expect(result.unresolvedReasons).toContain("no_evidence");
    expect(result.proposed).toBeNull();
  });

  it("fails closed on livemode true", () => {
    const result = reconstructBillingFromEvidence([
      evidence({
        eventId: "evt_live",
        eventType: "customer.subscription.created",
        eventCreated: 1_700_000_000,
        livemode: true,
      }),
    ]);
    expect(result.status).toBe("unresolved");
    expect(result.unresolvedReasons.some((r) => r.startsWith("livemode_true"))).toBe(
      true
    );
  });

  it("fails closed when handled events lack Layer B (default)", () => {
    const result = reconstructBillingFromEvidence([
      evidence({
        eventId: "evt_no_b",
        eventType: "customer.subscription.created",
        eventCreated: 1_700_000_000,
        appliedSubscriptionSource: null,
      }),
    ]);
    expect(result.status).toBe("unresolved");
    expect(result.unresolvedReasons).toContain(
      "insufficient_applied_subscription_evidence"
    );
  });

  it("admin bypass yields noop without proposing entitlement", () => {
    const result = reconstructBillingFromEvidence(
      [
        evidence({
          eventId: "evt_admin",
          eventType: "customer.subscription.created",
          eventCreated: 1_700_000_000,
        }),
      ],
      { isAdmin: true }
    );
    expect(result.status).toBe("noop");
    expect(result.proposed).toBeNull();
  });

  it("malformed payload fails closed", () => {
    const result = reconstructBillingFromEvidence([
      {
        eventId: "evt_bad",
        eventType: "customer.subscription.created",
        eventCreated: 1,
        livemode: false,
        eventPayload: null as unknown as Record<string, unknown>,
        appliedSubscriptionSource: subSource(),
      },
    ]);
    expect(result.status).toBe("unresolved");
  });
});

describe("diffBillingState", () => {
  it("reports field differences", () => {
    const proposed = reconstructBillingFromEvidence([
      evidence({
        eventId: "evt_1",
        eventType: "customer.subscription.created",
        eventCreated: 1_700_000_000,
      }),
    ]).proposed!;
    const diffs = diffBillingState(
      { entitlementStatus: "free", planCode: "analytical" },
      proposed
    );
    expect(diffs.some((d) => d.field === "entitlementStatus")).toBe(true);
  });

  it("empty diff when already matching", () => {
    const proposed = reconstructBillingFromEvidence([
      evidence({
        eventId: "evt_1",
        eventType: "customer.subscription.created",
        eventCreated: 1_700_000_000,
      }),
    ]).proposed!;
    expect(diffBillingState(proposed, proposed)).toEqual([]);
  });

  it("treats equivalent timestamp strings as equal", () => {
    const proposed = reconstructBillingFromEvidence([
      evidence({
        eventId: "evt_1",
        eventType: "customer.subscription.created",
        eventCreated: 1_700_000_000,
      }),
    ]).proposed!;
    const current = {
      ...proposed,
      currentPeriodEndIso: proposed.currentPeriodEndIso?.replace("Z", "+00:00") ?? null,
      lastStripeEventAtIso: proposed.lastStripeEventAtIso?.replace("Z", "+00:00") ?? null,
    };
    expect(diffBillingState(current, proposed)).toEqual([]);
  });
});

describe("assertRecoveryEnvironmentTarget", () => {
  it("accepts staging project + test key", () => {
    expect(
      assertRecoveryEnvironmentTarget({
        projectRef: "gkhbalfpxjtleypbabjo",
        allowedProjectRef: "gkhbalfpxjtleypbabjo",
        stripeSecretPrefix: "sk_test_abc",
      })
    ).toEqual({ ok: true });
  });

  it("rejects production project ref", () => {
    const r = assertRecoveryEnvironmentTarget({
      projectRef: "vpcxzbaxhpucvevnkalo",
      allowedProjectRef: "gkhbalfpxjtleypbabjo",
      stripeSecretPrefix: "sk_test_abc",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects live stripe secret", () => {
    const r = assertRecoveryEnvironmentTarget({
      projectRef: "gkhbalfpxjtleypbabjo",
      allowedProjectRef: "gkhbalfpxjtleypbabjo",
      stripeSecretPrefix: "sk_live_abc",
    });
    expect(r.ok).toBe(false);
  });
});
