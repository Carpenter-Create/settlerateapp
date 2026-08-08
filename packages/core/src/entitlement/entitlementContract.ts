/**
 * Canonical entitlement contract (`@settlerate/core/entitlement`).
 *
 * Authority: docs/adr/0005-shared-package-architecture.md (Epic 5 PR 2).
 * SQL RPCs (`evaluate_entitlement`, `feature_allowed`) remain authoritative
 * for grants. This TypeScript evaluator is the parity/UI/Edge contract only.
 *
 * Client code may mirror decisions for UI only — never grant access from
 * client-supplied plan, Stripe status, success URLs, or localStorage.
 *
 * Inherited behavior (do not “fix” during extraction): when
 * `BillingEntitlementInput.now` is omitted, `evaluateEntitlement` uses
 * `new Date()`. Callers that need determinism must inject `now`.
 */

/** Active plan codes. Advisor is not an active tier. */
export type PlanCode = "analytical" | "professional";

export type EntitlementStatus =
  | "entitled"
  | "trial_entitled"
  | "read_only"
  | "free"
  | "denied";

export type ProtectedFeature =
  | "scenario_create"
  | "scenario_update"
  | "scenario_duplicate"
  | "comparison_create"
  | "pdf_export"
  | "share_create"
  | "income_context"
  | "billing_manage";

/** Stripe subscription statuses we map explicitly. */
export type StripeSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "canceled"
  | "paused"
  | "none"
  | string;

export const FREE_SCENARIO_LIMIT = 2;
export const PROFESSIONAL_TRIAL_DAYS = 7;

/** Allowlisted Professional price IDs (server must reject others). Live catalog. */
export const PROFESSIONAL_PRICE_IDS = [
  "price_1U0t2QC56u2NxRItya8dElyg", // monthly — lookup: settlerate_professional_monthly
  "price_1U0t2jC56u2NxRItM185AYK9", // annual — lookup: settlerate_professional_annual
] as const;

export const PROFESSIONAL_PRODUCT_IDS = ["prod_V0usthAF9WnoGJ"] as const;

/**
 * Epic 7 staging Stripe **test-mode** Professional catalog (livemode=false).
 * These IDs exist only in Stripe test mode on acct_1U0irnC56u2NxRIt.
 * They are grant-eligible so staging webhooks/entitlement work, but must never
 * be selected by create-checkout when `STRIPE_SECRET_KEY` is live (`sk_live_`).
 * Authority: docs/adr/0008-environment-topology.md; docs/staging/STAGING_STRIPE.md.
 */
export const STAGING_TEST_PROFESSIONAL_PRICE_IDS = [
  "price_1U2BGAC56u2NxRItx3etGK2q", // monthly — lookup: settlerate_professional_monthly_staging_test
  "price_1U2BGBC56u2NxRIt8cw5cx2m", // annual — lookup: settlerate_professional_annual_staging_test
] as const;

export const STAGING_TEST_PROFESSIONAL_PRODUCT_IDS = ["prod_V2FlK0MVh9ZmBh"] as const;

/**
 * Retired sandbox Professional price IDs — never grant features after Phase 7B.
 * Kept for regression tests and inventory (must stay out of PROFESSIONAL_PRICE_IDS
 * and STAGING_TEST_PROFESSIONAL_PRICE_IDS).
 */
export const SANDBOX_RETIRED_PROFESSIONAL_PRICE_IDS = [
  "price_1U0k4DC2Fmi7ZUCbSniiEewZ",
  "price_1U0kFVC2Fmi7ZUCb6g0mXIRC",
] as const;

export const SANDBOX_RETIRED_PROFESSIONAL_PRODUCT_IDS = [
  "prod_V0lUMpnsvxSxP1",
] as const;

/** Deleted-account Professional price IDs — never grant features. */
export const LEGACY_DELETED_PROFESSIONAL_PRICE_IDS = [
  "price_1Sod4a3ppKk8xETz9TzPFn8P",
  "price_1Sod513ppKk8xETzwcEPnT51",
] as const;

/** Legacy Advisor Stripe IDs — never grant features. */
export const LEGACY_ADVISOR_PRICE_IDS = [
  "price_1Sod5F3ppKk8xETzl9EDOR6I",
  "price_1Sod5S3ppKk8xETzmky1P3Pr",
] as const;

export interface BillingEntitlementInput {
  stripeStatus: StripeSubscriptionStatus | null | undefined;
  priceId: string | null | undefined;
  productId?: string | null | undefined;
  currentPeriodEndsAt?: string | Date | null | undefined;
  cancelAtPeriodEnd?: boolean | null | undefined;
  /** Server-verified admin via user_roles / has_role only. */
  isAdmin?: boolean;
  /** Wall clock for period-end evaluation (injectable for tests). */
  now?: Date;
}

export interface EntitlementDecision {
  planCode: PlanCode;
  entitlementStatus: EntitlementStatus;
  isAdminBypass: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEndsAt: string | null;
  priceId: string | null;
  stripeStatus: string | null;
  /** True when status is active/trialing with allowlisted Professional price. */
  hasProfessionalAccess: boolean;
}

export interface FeatureAccessFlags {
  canModel: boolean;
  /** In-session modeling comparisons (not saved). */
  canCompareInSession: boolean;
  canSaveScenario: boolean;
  canUpdateScenario: boolean;
  canDuplicateScenario: boolean;
  canSaveComparison: boolean;
  canExportPdf: boolean;
  canCreateShare: boolean;
  canViewIncomeContext: boolean;
  canManageBilling: boolean;
  scenarioLimit: number | null;
  scenariosRemaining: number | null;
  atScenarioLimit: boolean;
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isAllowlistedProfessionalPrice(priceId: string | null | undefined): boolean {
  if (!priceId) return false;
  return (
    (PROFESSIONAL_PRICE_IDS as readonly string[]).includes(priceId) ||
    (STAGING_TEST_PROFESSIONAL_PRICE_IDS as readonly string[]).includes(priceId)
  );
}

/** True when the Edge Stripe secret is test-mode (`sk_test_…`). */
export function isStripeTestSecretKey(stripeSecretKey: string | null | undefined): boolean {
  return typeof stripeSecretKey === "string" && stripeSecretKey.trim().startsWith("sk_test_");
}

/**
 * Default monthly/annual price map for create-checkout.
 * Test secrets → staging test catalog; otherwise live catalog only.
 */
export function resolveCheckoutPriceByType(
  priceType: "monthly" | "annual",
  stripeSecretKey: string | null | undefined
): string {
  if (isStripeTestSecretKey(stripeSecretKey)) {
    return priceType === "monthly"
      ? STAGING_TEST_PROFESSIONAL_PRICE_IDS[0]
      : STAGING_TEST_PROFESSIONAL_PRICE_IDS[1];
  }
  return priceType === "monthly" ? PROFESSIONAL_PRICE_IDS[0] : PROFESSIONAL_PRICE_IDS[1];
}

/**
 * Rejects cross-mode price selection: live keys may only charge live prices;
 * test keys may only charge staging test prices (plus never retired sandbox).
 */
export function isPriceAllowedForStripeSecret(
  priceId: string | null | undefined,
  stripeSecretKey: string | null | undefined
): boolean {
  if (!priceId || !isAllowlistedProfessionalPrice(priceId)) return false;
  const isTestPrice = (STAGING_TEST_PROFESSIONAL_PRICE_IDS as readonly string[]).includes(priceId);
  if (isStripeTestSecretKey(stripeSecretKey)) return isTestPrice;
  return !isTestPrice;
}

export function resolvePlanCodeFromPrice(priceId: string | null | undefined): PlanCode {
  return isAllowlistedProfessionalPrice(priceId) ? "professional" : "analytical";
}

/**
 * Map verified Stripe subscription status (+ allowlisted price) to entitlement.
 * cancel_at_period_end does not revoke while status remains active/trialing
 * and currentPeriodEndsAt is still in the future.
 */
export function evaluateEntitlement(input: BillingEntitlementInput): EntitlementDecision {
  const now = input.now ?? new Date();
  const periodEnd = toDate(input.currentPeriodEndsAt);
  const cancelAtPeriodEnd = Boolean(input.cancelAtPeriodEnd);
  const priceId = input.priceId ?? null;
  const stripeStatus = input.stripeStatus ?? null;

  if (input.isAdmin) {
    return {
      planCode: "professional",
      entitlementStatus: "entitled",
      isAdminBypass: true,
      cancelAtPeriodEnd: false,
      currentPeriodEndsAt: periodEnd?.toISOString() ?? null,
      priceId,
      stripeStatus,
      hasProfessionalAccess: true,
    };
  }

  const professionalPrice = isAllowlistedProfessionalPrice(priceId);
  // Null period end must not perpetuate Professional access
  const periodStillValid = periodEnd != null && periodEnd.getTime() > now.getTime();

  let entitlementStatus: EntitlementStatus;
  let planCode: PlanCode = "analytical";

  switch (stripeStatus) {
    case "active":
      if (professionalPrice && periodStillValid) {
        entitlementStatus = "entitled";
        planCode = "professional";
      } else {
        entitlementStatus = "free";
      }
      break;
    case "trialing":
      if (professionalPrice && periodStillValid) {
        entitlementStatus = "trial_entitled";
        planCode = "professional";
      } else {
        entitlementStatus = "free";
      }
      break;
    case "past_due":
    case "unpaid":
      entitlementStatus = "read_only";
      planCode = professionalPrice ? "professional" : "analytical";
      break;
    case "incomplete":
    case "incomplete_expired":
    case "canceled":
    case "paused":
    case "none":
    case null:
      entitlementStatus = "free";
      break;
    default:
      entitlementStatus = "free";
      break;
  }

  const hasProfessionalAccess =
    entitlementStatus === "entitled" || entitlementStatus === "trial_entitled";

  return {
    planCode,
    entitlementStatus,
    isAdminBypass: false,
    cancelAtPeriodEnd: cancelAtPeriodEnd && (stripeStatus === "active" || stripeStatus === "trialing"),
    currentPeriodEndsAt: periodEnd?.toISOString() ?? null,
    priceId,
    stripeStatus,
    hasProfessionalAccess,
  };
}

/**
 * Whether a protected feature is allowed for the given entitlement.
 * scenario_create / scenario_duplicate also require scenarioCount < limit when free.
 */
export function isFeatureAllowed(
  decision: EntitlementDecision,
  feature: ProtectedFeature,
  options?: { scenarioCount?: number }
): boolean {
  const status = decision.entitlementStatus;
  const count = options?.scenarioCount ?? 0;

  if (status === "denied") {
    return feature === "billing_manage";
  }

  switch (feature) {
    case "billing_manage":
      return true;
    case "scenario_update":
      return status === "entitled" || status === "trial_entitled" || status === "free";
    case "scenario_create":
    case "scenario_duplicate":
      if (status === "entitled" || status === "trial_entitled") return true;
      if (status === "free") return count < FREE_SCENARIO_LIMIT;
      return false;
    case "comparison_create":
    case "pdf_export":
    case "share_create":
    case "income_context":
      return status === "entitled" || status === "trial_entitled";
    default:
      return false;
  }
}

export function featureAccessFromDecision(
  decision: EntitlementDecision,
  options?: { scenarioCount?: number }
): FeatureAccessFlags {
  const count = options?.scenarioCount ?? 0;
  const unlimited = decision.hasProfessionalAccess;
  const underFreeLimit = count < FREE_SCENARIO_LIMIT;

  return {
    canModel: true,
    canCompareInSession: true,
    // "can save" means may create another scenario (over-limit free users keep existing rows)
    canSaveScenario: isFeatureAllowed(decision, "scenario_create", { scenarioCount: count }),
    canUpdateScenario: isFeatureAllowed(decision, "scenario_update"),
    canDuplicateScenario: isFeatureAllowed(decision, "scenario_duplicate", { scenarioCount: count }),
    canSaveComparison: isFeatureAllowed(decision, "comparison_create"),
    canExportPdf: isFeatureAllowed(decision, "pdf_export"),
    canCreateShare: isFeatureAllowed(decision, "share_create"),
    canViewIncomeContext: isFeatureAllowed(decision, "income_context"),
    canManageBilling: isFeatureAllowed(decision, "billing_manage"),
    scenarioLimit: unlimited ? null : FREE_SCENARIO_LIMIT,
    scenariosRemaining: unlimited ? null : Math.max(0, FREE_SCENARIO_LIMIT - count),
    atScenarioLimit: !unlimited && !underFreeLimit,
  };
}

/**
 * Legacy UI tier alias. Advisor is never returned as an active grant.
 * Map: professional → "pro", analytical → "free".
 */
export function planCodeToLegacyTier(planCode: PlanCode): "free" | "pro" {
  return planCode === "professional" ? "pro" : "free";
}
