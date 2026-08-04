/**
 * Canonical entitlement contract (Phase 6).
 *
 * Server-side evaluation (DB RPCs + edge functions) is authoritative.
 * Client code may mirror decisions for UI only — never grant access from
 * client-supplied plan, Stripe status, success URLs, or localStorage.
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

export const FREE_SCENARIO_LIMIT = 3;
export const PROFESSIONAL_TRIAL_DAYS = 7;

/** Allowlisted Professional price IDs (server must reject others). */
export const PROFESSIONAL_PRICE_IDS = [
  "price_1Sod4a3ppKk8xETz9TzPFn8P", // monthly
  "price_1Sod513ppKk8xETzwcEPnT51", // annual
] as const;

export const PROFESSIONAL_PRODUCT_IDS = [
  "prod_TmBRSW3mqUk9l9",
  "prod_TmBRGPUBjfB7DR", // legacy product id retained for mapping only
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
  return (PROFESSIONAL_PRICE_IDS as readonly string[]).includes(priceId);
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
  const periodStillValid = !periodEnd || periodEnd.getTime() > now.getTime();

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
