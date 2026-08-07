/**
 * Final architecture proof: `@settlerate/core/checkout-maintenance`.
 * Full coverage: packages/core/src/checkout/checkoutMaintenance.test.ts
 */
import { describe, expect, it } from "vitest";
import {
  CHECKOUT_MAINTENANCE_CODE,
  checkoutMaintenancePayload,
  isCheckoutMaintenanceEnabled,
} from "@settlerate/core/checkout-maintenance";

describe("checkoutMaintenance canonical package import", () => {
  it("resolves enable parsing and payload via package subpath", () => {
    expect(isCheckoutMaintenanceEnabled("true")).toBe(true);
    expect(isCheckoutMaintenanceEnabled("maybe")).toBe(false);
    expect(checkoutMaintenancePayload()).toEqual({
      error: "Checkout temporarily unavailable",
      code: CHECKOUT_MAINTENANCE_CODE,
    });
  });
});
