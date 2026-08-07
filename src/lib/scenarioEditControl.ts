import type { EntitlementStatus } from "@settlerate/core/entitlement";

export interface ScenarioEditControl {
  allowed: boolean;
  title?: string;
}

export function resolveScenarioEditControl(options: {
  canUpdateScenario: boolean;
  isEntitlementPending: boolean;
  entitlementStatus: EntitlementStatus;
}): ScenarioEditControl {
  if (options.isEntitlementPending) {
    return { allowed: false };
  }
  if (options.canUpdateScenario) {
    return { allowed: true };
  }
  if (options.entitlementStatus === "read_only") {
    return {
      allowed: false,
      title: "Scenarios are read-only until billing is updated.",
    };
  }
  return { allowed: false };
}
