import { describe, expect, it } from "vitest";
import {
  CHECKOUT_MAINTENANCE_CODE,
  checkoutMaintenancePayload,
  isCheckoutMaintenanceEnabled,
} from "@/lib/checkoutMaintenance";

describe("checkoutMaintenance", () => {
  it("is disabled when env is unset, empty, or unrecognized", () => {
    expect(isCheckoutMaintenanceEnabled(undefined)).toBe(false);
    expect(isCheckoutMaintenanceEnabled(null)).toBe(false);
    expect(isCheckoutMaintenanceEnabled("")).toBe(false);
    expect(isCheckoutMaintenanceEnabled("   ")).toBe(false);
    expect(isCheckoutMaintenanceEnabled("false")).toBe(false);
    expect(isCheckoutMaintenanceEnabled("0")).toBe(false);
    expect(isCheckoutMaintenanceEnabled("off")).toBe(false);
    expect(isCheckoutMaintenanceEnabled("no")).toBe(false);
    expect(isCheckoutMaintenanceEnabled("maybe")).toBe(false);
  });

  it("is enabled only for explicit server truthy values", () => {
    expect(isCheckoutMaintenanceEnabled("true")).toBe(true);
    expect(isCheckoutMaintenanceEnabled("TRUE")).toBe(true);
    expect(isCheckoutMaintenanceEnabled("  true  ")).toBe(true);
    expect(isCheckoutMaintenanceEnabled("1")).toBe(true);
    expect(isCheckoutMaintenanceEnabled("on")).toBe(true);
    expect(isCheckoutMaintenanceEnabled("yes")).toBe(true);
  });

  it("does not treat client-shaped strings as special beyond env parsing", () => {
    // Request bodies are never passed here; only env strings are authoritative.
    expect(isCheckoutMaintenanceEnabled('{"maintenance":false}')).toBe(false);
    expect(isCheckoutMaintenanceEnabled("maintenance=false")).toBe(false);
  });

  it("returns a fail-closed payload with CHECKOUT_MAINTENANCE", () => {
    expect(checkoutMaintenancePayload()).toEqual({
      error: "Checkout temporarily unavailable",
      code: CHECKOUT_MAINTENANCE_CODE,
    });
    expect(CHECKOUT_MAINTENANCE_CODE).toBe("CHECKOUT_MAINTENANCE");
  });
});
