import {
  FREE_SCENARIO_LIMIT,
  type EntitlementStatus,
} from "@/lib/entitlementContract";

export interface DuplicateScenarioControl {
  allowed: boolean;
  title?: string;
}

export function resolveDuplicateScenarioControl(options: {
  canDuplicateScenario: boolean;
  isEntitlementPending: boolean;
  atScenarioLimit: boolean;
  entitlementStatus: EntitlementStatus;
}): DuplicateScenarioControl {
  if (options.isEntitlementPending) {
    return { allowed: false };
  }
  if (!options.canDuplicateScenario) {
    if (options.entitlementStatus === "read_only") {
      return {
        allowed: false,
        title: "Scenarios are read-only until billing is updated.",
      };
    }
    if (options.atScenarioLimit) {
      return {
        allowed: false,
        title: `Free plan limit reached (${FREE_SCENARIO_LIMIT} saved scenarios).`,
      };
    }
    return { allowed: false };
  }
  return { allowed: true };
}
