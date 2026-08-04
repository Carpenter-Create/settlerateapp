export interface ComparisonUpdateControl {
  allowed: boolean;
  title?: string;
}

/**
 * Comparison rename/metadata updates require comparison_create on the server
 * (enforce_comparison_write_entitlement on INSERT/UPDATE).
 */
export function resolveComparisonUpdateControl(options: {
  canUpdateComparison: boolean;
  isEntitlementPending: boolean;
  entitlementStatus: string;
}): ComparisonUpdateControl {
  if (options.isEntitlementPending) {
    return { allowed: false };
  }
  if (options.canUpdateComparison) {
    return { allowed: true };
  }
  if (options.entitlementStatus === "read_only") {
    return {
      allowed: false,
      title: "Comparisons are read-only until billing is updated.",
    };
  }
  return {
    allowed: false,
    title: "Comparison updates require Professional access.",
  };
}
