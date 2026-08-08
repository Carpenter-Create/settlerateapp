/**
 * Deterministic billing reconstruction from durable Stripe event evidence.
 *
 * Authority: docs/adr/0009-billing-recovery-guarantee.md
 * Canonical: `@settlerate/core/billing-recovery`
 *
 * Pure / runtime-neutral. No DB, Stripe, or network I/O.
 */

import {
  evaluateEntitlement,
  resolvePlanCodeFromPrice,
  type EntitlementStatus,
  type PlanCode,
} from "../entitlement/entitlementContract.ts";
import {
  mapSubscriptionToBillingSnapshot,
  type StripeSubscriptionLike,
} from "./stripeBillingSnapshot.ts";

/** Event types the live stripe-webhook handler applies billing for. */
export const BILLING_RECOVERY_HANDLED_EVENT_TYPES = [
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "checkout.session.completed",
  "invoice.paid",
  "invoice.payment_failed",
] as const;

export type BillingRecoveryHandledEventType =
  (typeof BILLING_RECOVERY_HANDLED_EVENT_TYPES)[number];

export interface BillingRecoveryEvidenceRecord {
  eventId: string;
  eventType: string;
  /** Stripe event.created (unix seconds). */
  eventCreated: number;
  livemode: boolean;
  /** Layer A: verified Event JSON (must include type/data when used). */
  eventPayload: Record<string, unknown>;
  /**
   * Layer B: post-retrieve Subscription JSON used at apply time.
   * Required for offline parity on retrieve-first paths (ADR 0009 §3/§6).
   */
  appliedSubscriptionSource: Record<string, unknown> | null;
}

export interface ReconstructedBillingState {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  priceId: string | null;
  productId: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEndIso: string | null;
  planCode: PlanCode;
  entitlementStatus: EntitlementStatus;
  lastStripeEventId: string | null;
  lastStripeEventAtIso: string | null;
}

export type BillingReconstructionStatus =
  | "reconstructed"
  | "unresolved"
  | "noop";

export interface BillingReconstructionResult {
  status: BillingReconstructionStatus;
  proposed: ReconstructedBillingState | null;
  unresolvedReasons: string[];
  appliedEventIds: string[];
  skippedEventIds: string[];
}

export interface ReconstructBillingOptions {
  /** When true, no billing row is proposed (live admin bypass). */
  isAdmin?: boolean;
  /** Reject livemode=true evidence (staging drills). Default true. */
  requireTestMode?: boolean;
  /**
   * When true, retrieve-first handled events without Layer B are unresolved.
   * Default true (offline recovery). Set false only for labeled external-reconcile
   * experiments that intentionally map Event data.object (not Epic 8 default).
   */
  requireAppliedSubscriptionSource?: boolean;
}

function isHandledEventType(eventType: string): boolean {
  return (BILLING_RECOVERY_HANDLED_EVENT_TYPES as readonly string[]).includes(
    eventType
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function extractSubscriptionFromEventPayload(
  eventPayload: Record<string, unknown>
): StripeSubscriptionLike | null {
  const data = asRecord(eventPayload.data);
  const object = asRecord(data?.object);
  if (!object) return null;

  // Subscription events: object is the subscription
  if (typeof object.object === "string" && object.object === "subscription") {
    return object as StripeSubscriptionLike;
  }
  if (typeof object.status === "string" && object.items) {
    return object as StripeSubscriptionLike;
  }

  // checkout.session.completed — subscription may be an id string only
  if (typeof object.object === "string" && object.object === "checkout.session") {
    return null;
  }

  // invoice — subscription id only on many payloads
  if (typeof object.object === "string" && object.object === "invoice") {
    return null;
  }

  return null;
}

function compareEvidence(
  a: BillingRecoveryEvidenceRecord,
  b: BillingRecoveryEvidenceRecord
): number {
  if (a.eventCreated !== b.eventCreated) return a.eventCreated - b.eventCreated;
  return a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0;
}

function emptyProposed(): ReconstructedBillingState {
  return {
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStatus: null,
    priceId: null,
    productId: null,
    cancelAtPeriodEnd: false,
    currentPeriodEndIso: null,
    planCode: "analytical",
    entitlementStatus: "free",
    lastStripeEventId: null,
    lastStripeEventAtIso: null,
  };
}

/**
 * Fold durable evidence into a proposed billing/entitlement state.
 * Fail closed with unresolvedReasons when evidence is insufficient.
 */
export function reconstructBillingFromEvidence(
  evidence: BillingRecoveryEvidenceRecord[],
  options: ReconstructBillingOptions = {}
): BillingReconstructionResult {
  const requireTestMode = options.requireTestMode !== false;
  const requireAppliedSubscriptionSource =
    options.requireAppliedSubscriptionSource !== false;
  const unresolvedReasons: string[] = [];
  const appliedEventIds: string[] = [];
  const skippedEventIds: string[] = [];

  if (!Array.isArray(evidence) || evidence.length === 0) {
    return {
      status: "unresolved",
      proposed: null,
      unresolvedReasons: ["no_evidence"],
      appliedEventIds,
      skippedEventIds,
    };
  }

  for (const row of evidence) {
    if (!row?.eventId || typeof row.eventCreated !== "number") {
      unresolvedReasons.push("malformed_evidence_row");
      continue;
    }
    if (!asRecord(row.eventPayload)) {
      unresolvedReasons.push(`malformed_event_payload:${row.eventId}`);
    }
    if (requireTestMode && row.livemode === true) {
      unresolvedReasons.push(`livemode_true:${row.eventId}`);
    }
  }

  if (unresolvedReasons.length > 0) {
    return {
      status: "unresolved",
      proposed: null,
      unresolvedReasons,
      appliedEventIds,
      skippedEventIds,
    };
  }

  if (options.isAdmin) {
    return {
      status: "noop",
      proposed: null,
      unresolvedReasons: ["admin_bypass_no_billing_apply"],
      appliedEventIds,
      skippedEventIds: evidence.map((e) => e.eventId),
    };
  }

  const ordered = [...evidence].sort(compareEvidence);
  let proposed: ReconstructedBillingState | null = null;
  let lastEventUnix = 0;

  for (const row of ordered) {
    if (!isHandledEventType(row.eventType)) {
      skippedEventIds.push(row.eventId);
      continue;
    }

    const hasLayerB =
      row.appliedSubscriptionSource != null &&
      asRecord(row.appliedSubscriptionSource) != null;

    if (!hasLayerB && requireAppliedSubscriptionSource) {
      // Retrieve-first live path: without Layer B this event cannot justify
      // offline apply (ADR 0009 §6). Skip it; do not invent from data.object.
      skippedEventIds.push(row.eventId);
      continue;
    }

    const source = hasLayerB
      ? (row.appliedSubscriptionSource as StripeSubscriptionLike)
      : extractSubscriptionFromEventPayload(row.eventPayload);

    if (!source) {
      skippedEventIds.push(row.eventId);
      continue;
    }

    const snapshot = mapSubscriptionToBillingSnapshot(source);
    if (!snapshot.subscriptionStatus || !snapshot.subscriptionId) {
      skippedEventIds.push(row.eventId);
      continue;
    }

    if (proposed?.lastStripeEventAtIso) {
      if (row.eventCreated < lastEventUnix) {
        skippedEventIds.push(row.eventId);
        continue;
      }
    }

    const planCode = resolvePlanCodeFromPrice(snapshot.priceId);
    // Parity with live stripe-webhook: omit `now` so evaluateEntitlement uses
    // wall clock at mapping time (ADR 0009 §6 entitlement-mapping rules).
    const decision = evaluateEntitlement({
      stripeStatus: snapshot.subscriptionStatus,
      priceId: snapshot.priceId,
      productId: snapshot.productId,
      currentPeriodEndsAt:
        snapshot.currentPeriodEnd != null
          ? new Date(snapshot.currentPeriodEnd * 1000).toISOString()
          : null,
      cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
    });

    proposed = {
      stripeCustomerId: snapshot.stripeCustomerId,
      stripeSubscriptionId: snapshot.subscriptionId,
      subscriptionStatus: snapshot.subscriptionStatus,
      priceId: snapshot.priceId,
      productId: snapshot.productId,
      cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
      currentPeriodEndIso:
        snapshot.currentPeriodEnd != null
          ? new Date(snapshot.currentPeriodEnd * 1000).toISOString()
          : null,
      planCode,
      entitlementStatus: decision.entitlementStatus,
      lastStripeEventId: row.eventId,
      lastStripeEventAtIso: new Date(row.eventCreated * 1000).toISOString(),
    };
    lastEventUnix = row.eventCreated;
    appliedEventIds.push(row.eventId);
  }

  if (!proposed) {
    const reasons =
      unresolvedReasons.length > 0
        ? unresolvedReasons
        : skippedEventIds.length > 0
          ? ["insufficient_applied_subscription_evidence"]
          : ["no_applicable_billing_events"];
    return {
      status: "unresolved",
      proposed: null,
      unresolvedReasons: reasons,
      appliedEventIds,
      skippedEventIds,
    };
  }

  return {
    status: "reconstructed",
    proposed,
    unresolvedReasons: [],
    appliedEventIds,
    skippedEventIds,
  };
}

export interface BillingStateDiff {
  field: keyof ReconstructedBillingState;
  current: unknown;
  proposed: unknown;
}

export function diffBillingState(
  current: Partial<ReconstructedBillingState> | null | undefined,
  proposed: ReconstructedBillingState
): BillingStateDiff[] {
  const fields: (keyof ReconstructedBillingState)[] = [
    "stripeCustomerId",
    "stripeSubscriptionId",
    "subscriptionStatus",
    "priceId",
    "productId",
    "cancelAtPeriodEnd",
    "currentPeriodEndIso",
    "planCode",
    "entitlementStatus",
    "lastStripeEventId",
    "lastStripeEventAtIso",
  ];

  const diffs: BillingStateDiff[] = [];
  for (const field of fields) {
    const cur = current?.[field] ?? null;
    const next = proposed[field];
    if (cur !== next) {
      diffs.push({ field, current: cur, proposed: next });
    }
  }
  return diffs;
}

/**
 * ADR 0009 §6 stale guard for recovery apply: same rule as live webhook —
 * do not let an older proposed `lastStripeEventAt` overwrite newer billing.
 */
export function isProposedBillingStale(
  current: Partial<ReconstructedBillingState> | null | undefined,
  proposed: ReconstructedBillingState
): boolean {
  if (!current?.lastStripeEventAtIso || !proposed.lastStripeEventAtIso) {
    return false;
  }
  const currentMs = new Date(current.lastStripeEventAtIso).getTime();
  const proposedMs = new Date(proposed.lastStripeEventAtIso).getTime();
  if (Number.isNaN(currentMs) || Number.isNaN(proposedMs)) {
    return false;
  }
  const currentUnix = Math.floor(currentMs / 1000);
  const proposedUnix = Math.floor(proposedMs / 1000);
  return proposedUnix < currentUnix;
}

/** Guard helpers for operational tooling (pure). */
export function assertRecoveryEnvironmentTarget(input: {
  projectRef: string | null | undefined;
  allowedProjectRef: string;
  stripeSecretPrefix?: string | null;
}): { ok: true } | { ok: false; reason: string } {
  const ref = (input.projectRef ?? "").trim();
  if (!ref) {
    return { ok: false, reason: "missing_project_ref" };
  }
  if (ref !== input.allowedProjectRef) {
    return { ok: false, reason: `project_ref_mismatch:${ref}` };
  }
  const key = input.stripeSecretPrefix ?? "";
  if (key && !key.startsWith("sk_test_")) {
    return { ok: false, reason: "stripe_secret_not_test_mode" };
  }
  return { ok: true };
}

export { emptyProposed as emptyReconstructedBillingState };
