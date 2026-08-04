import { describe, expect, it } from "vitest";
import { canEditLockedRatesCapability } from "@/lib/adminLockedRateCapability";

describe("canEditLockedRatesCapability", () => {
  it("grants locked-rate editing only to server-verified admin when resolved", () => {
    expect(
      canEditLockedRatesCapability({
        realIsAdmin: true,
        adminLoading: false,
        isEntitlementPending: false,
      })
    ).toBe(true);
  });

  it("denies Professional non-admin users", () => {
    expect(
      canEditLockedRatesCapability({
        realIsAdmin: false,
        adminLoading: false,
        isEntitlementPending: false,
      })
    ).toBe(false);
  });

  it("denies while admin role or entitlement is unresolved", () => {
    expect(
      canEditLockedRatesCapability({
        realIsAdmin: true,
        adminLoading: true,
        isEntitlementPending: false,
      })
    ).toBe(false);
    expect(
      canEditLockedRatesCapability({
        realIsAdmin: true,
        adminLoading: false,
        isEntitlementPending: true,
      })
    ).toBe(false);
  });

  it("cannot be forged from client simulation flags alone", () => {
    expect(
      canEditLockedRatesCapability({
        realIsAdmin: false,
        adminLoading: false,
        isEntitlementPending: false,
      })
    ).toBe(false);
  });
});
