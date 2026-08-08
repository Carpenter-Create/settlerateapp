#!/usr/bin/env node
/**
 * Epic 8 billing recovery tool (dry-run / apply).
 *
 * Authority: docs/adr/0009-billing-recovery-guarantee.md
 *
 * Defaults hard-block production project vpcxzbaxhpucvevnkalo.
 * Staging-only apply under Epic 8: gkhbalfpxjtleypbabjo + sk_test_.
 *
 * Usage:
 *   node scripts/billing/recoverBilling.mjs --mode=dry_run --user=<uuid>
 *   node scripts/billing/recoverBilling.mjs --mode=apply --user=<uuid> --confirm-staging-apply
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   STRIPE_SECRET_KEY (optional; if set must be sk_test_ for this Epic)
 *   RECOVERY_ALLOWED_PROJECT_REF (default: gkhbalfpxjtleypbabjo)
 */
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import {
  assertRecoveryEnvironmentTarget,
  diffBillingState,
  isProposedBillingStale,
  reconstructBillingFromEvidence,
} from "../../packages/core/src/billing/billingRecovery.ts";

const PRODUCTION_REF = "vpcxzbaxhpucvevnkalo";
const DEFAULT_STAGING_REF = "gkhbalfpxjtleypbabjo";

function parseArgs(argv) {
  const out = {
    mode: "dry_run",
    userId: null,
    customerId: null,
    confirmStagingApply: false,
  };
  for (const arg of argv) {
    if (arg.startsWith("--mode=")) out.mode = arg.slice("--mode=".length);
    else if (arg.startsWith("--user=")) out.userId = arg.slice("--user=".length);
    else if (arg.startsWith("--customer=")) out.customerId = arg.slice("--customer=".length);
    else if (arg === "--confirm-staging-apply") out.confirmStagingApply = true;
  }
  return out;
}

function projectRefFromUrl(url) {
  try {
    const host = new URL(url).hostname;
    const m = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

function rowToEvidence(row) {
  return {
    eventId: row.event_id,
    eventType: row.event_type,
    eventCreated: Number(row.event_created),
    livemode: Boolean(row.livemode),
    eventPayload: row.event_payload,
    appliedSubscriptionSource: row.applied_subscription_source,
  };
}

function currentFromBilling(row) {
  if (!row) return null;
  return {
    stripeCustomerId: row.stripe_customer_id ?? null,
    stripeSubscriptionId: row.stripe_subscription_id ?? null,
    subscriptionStatus: row.subscription_status ?? null,
    priceId: row.price_id ?? null,
    productId: row.product_id ?? null,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    currentPeriodEndIso: row.current_period_end ?? null,
    planCode: row.plan_code ?? "analytical",
    entitlementStatus: row.entitlement_status ?? "free",
    lastStripeEventId: row.last_stripe_event_id ?? null,
    lastStripeEventAtIso: row.last_stripe_event_at ?? null,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
  const allowedRef = process.env.RECOVERY_ALLOWED_PROJECT_REF || DEFAULT_STAGING_REF;

  if (!supabaseUrl || !serviceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(2);
  }

  if (!["dry_run", "apply"].includes(args.mode)) {
    console.error("mode must be dry_run or apply");
    process.exit(2);
  }

  if (!args.userId && !args.customerId) {
    console.error("Provide --user=<uuid> and/or --customer=<cus_…>");
    process.exit(2);
  }

  const projectRef = projectRefFromUrl(supabaseUrl);
  if (!projectRef) {
    console.error("Could not parse project ref from SUPABASE_URL — fail closed");
    process.exit(2);
  }

  // Epic 8 absolute fence: no production targeting (read or write), no CLI bypass.
  if (projectRef === PRODUCTION_REF) {
    console.error(
      JSON.stringify({
        result: "blocked",
        reason: "production_project_blocked",
        projectRef,
      })
    );
    process.exit(3);
  }

  const envCheck = assertRecoveryEnvironmentTarget({
    projectRef,
    allowedProjectRef: allowedRef,
    stripeSecretPrefix: stripeKey || null,
  });
  if (!envCheck.ok) {
    console.error(JSON.stringify({ result: "blocked", reason: envCheck.reason, projectRef }));
    process.exit(3);
  }

  if (args.mode === "apply" && !args.confirmStagingApply) {
    console.error("apply requires --confirm-staging-apply");
    process.exit(2);
  }

  if (args.mode === "apply" && process.env.BILLING_RECOVERY_ALLOW_APPLY !== "staging") {
    console.error(
      JSON.stringify({
        result: "blocked",
        reason: "set_BILLING_RECOVERY_ALLOW_APPLY=staging_for_apply",
      })
    );
    process.exit(3);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let billingQuery = supabase.from("billing").select("*");
  if (args.userId) billingQuery = billingQuery.eq("user_id", args.userId);
  if (args.customerId) billingQuery = billingQuery.eq("stripe_customer_id", args.customerId);
  const { data: billingRow, error: billingErr } = await billingQuery.maybeSingle();
  if (billingErr) {
    console.error("billing read failed", billingErr.message);
    process.exit(1);
  }

  const userId = args.userId || billingRow?.user_id;
  const customerId = args.customerId || billingRow?.stripe_customer_id;

  if (!userId) {
    console.error("Unable to resolve user_id for scope");
    process.exit(2);
  }

  // Admin bypass parity
  const { data: adminRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  let evidenceQuery = supabase
    .from("stripe_event_evidence")
    .select(
      "event_id, event_type, event_created, livemode, event_payload, applied_subscription_source"
    )
    .order("event_created", { ascending: true })
    .order("event_id", { ascending: true });

  // Prefer customer-scoped evidence via ledger join when possible
  const { data: ledgerRows } = await supabase
    .from("stripe_webhook_events")
    .select("event_id")
    .or(
      [
        customerId ? `stripe_customer_id.eq.${customerId}` : null,
        `app_user_id.eq.${userId}`,
      ]
        .filter(Boolean)
        .join(",")
    );

  const eventIds = (ledgerRows ?? []).map((r) => r.event_id);
  if (eventIds.length > 0) {
    evidenceQuery = evidenceQuery.in("event_id", eventIds);
  } else {
    // No ledger scope — fail closed rather than scanning all evidence
    const report = {
      result: "unresolved",
      reason: "no_scoped_ledger_events",
      projectRef,
      userId,
      customerId: customerId ?? null,
    };
    await supabase.rpc("insert_billing_recovery_run", {
      p_environment: projectRef === DEFAULT_STAGING_REF ? "staging" : "unknown",
      p_project_ref: projectRef,
      p_mode: args.mode,
      p_scope: { userId, customerId },
      p_evidence_event_ids: [],
      p_result: "unresolved",
      p_proposed_summary: {},
      p_applied_summary: {},
      p_unresolved: [report],
      p_details: { tool: "recoverBilling.mjs" },
    });
    console.log(JSON.stringify(report, null, 2));
    process.exit(4);
  }

  const { data: evidenceRows, error: evidenceErr } = await evidenceQuery;
  if (evidenceErr) {
    console.error("evidence read failed", evidenceErr.message);
    process.exit(1);
  }

  const reconstruction = reconstructBillingFromEvidence(
    (evidenceRows ?? []).map(rowToEvidence),
    { isAdmin: Boolean(adminRole), requireTestMode: true }
  );

  const current = currentFromBilling(billingRow);
  const diffs =
    reconstruction.status === "reconstructed" && reconstruction.proposed
      ? diffBillingState(current, reconstruction.proposed)
      : [];

  // ADR 0009 §6: same stale protection as live webhook before apply
  const staleRelativeToCurrent =
    reconstruction.status === "reconstructed" &&
    reconstruction.proposed != null &&
    isProposedBillingStale(current, reconstruction.proposed);

  const summary = {
    result:
      reconstruction.status === "reconstructed"
        ? staleRelativeToCurrent
          ? "skipped_stale"
          : diffs.length === 0
            ? "noop"
            : "success"
        : reconstruction.status === "noop"
          ? "noop"
          : "unresolved",
    mode: args.mode,
    projectRef,
    userId,
    customerId: customerId ?? null,
    evidenceCount: evidenceRows?.length ?? 0,
    evidenceEventIds: (evidenceRows ?? []).map((r) => r.event_id),
    reconstructionStatus: reconstruction.status,
    unresolvedReasons: reconstruction.unresolvedReasons,
    appliedEventIds: reconstruction.appliedEventIds,
    skippedEventIds: reconstruction.skippedEventIds,
    staleRelativeToCurrent,
    current,
    proposed: reconstruction.proposed,
    diffs,
  };

  if (
    args.mode === "apply" &&
    reconstruction.status === "reconstructed" &&
    reconstruction.proposed &&
    diffs.length > 0 &&
    !staleRelativeToCurrent
  ) {
    const p = reconstruction.proposed;
    const { error: applyErr } = await supabase.from("billing").upsert(
      {
        user_id: userId,
        stripe_customer_id: p.stripeCustomerId,
        stripe_subscription_id: p.stripeSubscriptionId,
        subscription_status: p.subscriptionStatus,
        price_id: p.priceId,
        product_id: p.productId,
        cancel_at_period_end: p.cancelAtPeriodEnd,
        plan_code: p.planCode,
        entitlement_status: p.entitlementStatus,
        current_period_end: p.currentPeriodEndIso,
        last_stripe_event_id: p.lastStripeEventId,
        last_stripe_event_at: p.lastStripeEventAtIso,
      },
      { onConflict: "user_id" }
    );
    if (applyErr) {
      await supabase.rpc("insert_billing_recovery_run", {
        p_environment: "staging",
        p_project_ref: projectRef,
        p_mode: "apply",
        p_scope: { userId, customerId },
        p_evidence_event_ids: summary.evidenceEventIds,
        p_result: "failed",
        p_proposed_summary: { proposed: p, diffs },
        p_applied_summary: {},
        p_unresolved: [],
        p_details: { error: applyErr.message, tool: "recoverBilling.mjs" },
      });
      console.error("apply failed", applyErr.message);
      process.exit(1);
    }
    summary.applied = true;
  } else {
    summary.applied = false;
  }

  await supabase.rpc("insert_billing_recovery_run", {
    p_environment: projectRef === DEFAULT_STAGING_REF ? "staging" : "unknown",
    p_project_ref: projectRef,
    p_mode: args.mode,
    p_scope: { userId, customerId },
    p_evidence_event_ids: summary.evidenceEventIds,
    p_result: summary.result,
    p_proposed_summary: {
      proposed: summary.proposed,
      diffs,
      reconstructionStatus: reconstruction.status,
    },
    p_applied_summary: { applied: summary.applied, diffCount: diffs.length },
    p_unresolved: reconstruction.unresolvedReasons,
    p_details: { tool: "recoverBilling.mjs" },
  });

  // Never print event payloads
  console.log(JSON.stringify(summary, null, 2));
  if (summary.result === "unresolved") process.exit(4);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
