/**
 * Server-controlled Checkout maintenance gate for Phase 7B cutover.
 *
 * Authority: Supabase Edge Function secret/env `CHECKOUT_MAINTENANCE` only.
 * Client request bodies, headers, and query params must never enable or disable this.
 *
 * Keep in sync with src/lib/checkoutMaintenance.ts.
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
