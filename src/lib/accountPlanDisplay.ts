import type { EntitlementStatus, PlanCode } from "@/lib/entitlementContract";

/** Plan identity from canonical planCode (not current feature access). */
export function planLabelFromCode(planCode: PlanCode): string {
  return planCode === "professional" ? "Professional" : "Analytical";
}

/**
 * Access condition label separate from plan identity.
 * null when no additional condition badge is needed.
 */
export function accountAccessConditionLabel(
  entitlementStatus: EntitlementStatus
): string | null {
  if (entitlementStatus === "read_only") return "Read-only";
  return null;
}

/** Factual plan description; never implies Analytical unless planCode is analytical. */
export function accountPlanDescription(
  planCode: PlanCode,
  entitlementStatus: EntitlementStatus
): string {
  if (planCode === "professional") {
    if (entitlementStatus === "read_only") {
      return "Professional access is restricted until payment succeeds. Existing scenarios remain readable and deletable.";
    }
    if (entitlementStatus === "trial_entitled") {
      return "Full Professional access during the active trial, including exports, saved scenarios, and income-context views.";
    }
    return "Full access including exports, saved scenarios, and income-context views.";
  }
  return "Core mortgage modeling with up to 3 saved scenarios. Upgrade for extended features.";
}

export function accountPlanBadgeVariant(
  planCode: PlanCode
): "default" | "secondary" {
  return planCode === "professional" ? "default" : "secondary";
}
