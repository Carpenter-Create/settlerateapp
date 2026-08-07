/**
 * Server-controlled Checkout maintenance gate for Phase 7B cutover.
 *
 * Canonical: `@settlerate/core/checkout-maintenance`
 * Authority: docs/adr/0005-shared-package-architecture.md (Epic 5 PR 3).
 *
 * Callers inject the env string — this module never reads environment.
 * Client request bodies, headers, and query params must never enable or disable this.
 */

export const CHECKOUT_MAINTENANCE_CODE = "CHECKOUT_MAINTENANCE" as const;

/** Explicit enable values only. Unset / empty / other values → maintenance OFF. */
export function isCheckoutMaintenanceEnabled(
  envValue: string | null | undefined
): boolean {
  if (envValue == null) return false;
  const normalized = envValue.trim().toLowerCase();
  return (
    normalized === "true" ||
    normalized === "1" ||
    normalized === "on" ||
    normalized === "yes"
  );
}

export function checkoutMaintenancePayload(): {
  error: string;
  code: typeof CHECKOUT_MAINTENANCE_CODE;
} {
  return {
    error: "Checkout temporarily unavailable",
    code: CHECKOUT_MAINTENANCE_CODE,
  };
}
