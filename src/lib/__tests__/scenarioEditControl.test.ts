import { describe, expect, it } from "vitest";
import { resolveScenarioEditControl } from "@/lib/scenarioEditControl";

describe("resolveScenarioEditControl", () => {
  it("allows edit for entitled Professional owners", () => {
    expect(
      resolveScenarioEditControl({
        canUpdateScenario: true,
        isEntitlementPending: false,
        entitlementStatus: "entitled",
      })
    ).toEqual({ allowed: true });
  });

  it("allows edit for free Analytical owners", () => {
    expect(
      resolveScenarioEditControl({
        canUpdateScenario: true,
        isEntitlementPending: false,
        entitlementStatus: "free",
      })
    ).toEqual({ allowed: true });
  });

  it("blocks edit for read_only subscribers", () => {
    const control = resolveScenarioEditControl({
      canUpdateScenario: false,
      isEntitlementPending: false,
      entitlementStatus: "read_only",
    });
    expect(control.allowed).toBe(false);
    expect(control.title).toMatch(/read-only/i);
  });

  it("blocks edit while entitlement is loading or unresolved", () => {
    expect(
      resolveScenarioEditControl({
        canUpdateScenario: true,
        isEntitlementPending: true,
        entitlementStatus: "free",
      })
    ).toEqual({ allowed: false });
  });
});
