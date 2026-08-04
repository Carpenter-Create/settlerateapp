import { describe, expect, it } from "vitest";
import { resolveDuplicateScenarioControl } from "@/lib/duplicateScenarioControl";

describe("resolveDuplicateScenarioControl", () => {
  it("allows duplicate for eligible Professional users", () => {
    expect(
      resolveDuplicateScenarioControl({
        canDuplicateScenario: true,
        isEntitlementPending: false,
        atScenarioLimit: false,
        entitlementStatus: "entitled",
      })
    ).toEqual({ allowed: true });
  });

  it("allows duplicate for free users below the scenario limit", () => {
    expect(
      resolveDuplicateScenarioControl({
        canDuplicateScenario: true,
        isEntitlementPending: false,
        atScenarioLimit: false,
        entitlementStatus: "free",
      })
    ).toEqual({ allowed: true });
  });

  it("blocks duplicate for free users at the scenario limit", () => {
    const control = resolveDuplicateScenarioControl({
      canDuplicateScenario: false,
      isEntitlementPending: false,
      atScenarioLimit: true,
      entitlementStatus: "free",
    });
    expect(control.allowed).toBe(false);
    expect(control.title).toMatch(/limit/i);
  });

  it("blocks duplicate for read_only subscribers", () => {
    const control = resolveDuplicateScenarioControl({
      canDuplicateScenario: false,
      isEntitlementPending: false,
      atScenarioLimit: false,
      entitlementStatus: "read_only",
    });
    expect(control.allowed).toBe(false);
    expect(control.title).toMatch(/read-only/i);
  });

  it("blocks duplicate while entitlement is loading", () => {
    expect(
      resolveDuplicateScenarioControl({
        canDuplicateScenario: true,
        isEntitlementPending: true,
        atScenarioLimit: false,
        entitlementStatus: "free",
      })
    ).toEqual({ allowed: false });
  });
});
