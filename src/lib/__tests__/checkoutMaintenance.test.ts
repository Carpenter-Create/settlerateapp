/**
 * Compatibility proof: `@/lib/checkoutMaintenance` re-exports canonical core.
 * Full coverage: packages/core/src/checkout/checkoutMaintenance.test.ts
 */
import { describe, expect, it } from "vitest";
import {
  CHECKOUT_MAINTENANCE_CODE,
  checkoutMaintenancePayload,
  isCheckoutMaintenanceEnabled,
} from "@/lib/checkoutMaintenance";

describe("checkoutMaintenance app compatibility shim", () => {
  it("resolves enable parsing and payload via @/lib re-export", () => {
    expect(isCheckoutMaintenanceEnabled("true")).toBe(true);
    expect(isCheckoutMaintenanceEnabled("maybe")).toBe(false);
    expect(checkoutMaintenancePayload()).toEqual({
      error: "Checkout temporarily unavailable",
      code: CHECKOUT_MAINTENANCE_CODE,
    });
  });
});
