import { describe, expect, it } from "vitest";
import { resolveComparisonUpdateControl } from "@/lib/comparisonUpdateControl";

describe("resolveComparisonUpdateControl", () => {
  it("allows rename for entitled Professional users", () => {
    expect(
      resolveComparisonUpdateControl({
        canUpdateComparison: true,
        isEntitlementPending: false,
        entitlementStatus: "entitled",
      })
    ).toEqual({ allowed: true });
  });

  it("blocks rename for read_only subscribers", () => {
    const control = resolveComparisonUpdateControl({
      canUpdateComparison: false,
      isEntitlementPending: false,
      entitlementStatus: "read_only",
    });
    expect(control.allowed).toBe(false);
    expect(control.title).toMatch(/read-only/i);
  });

  it("blocks rename while entitlement is loading or unresolved", () => {
    expect(
      resolveComparisonUpdateControl({
        canUpdateComparison: true,
        isEntitlementPending: true,
        entitlementStatus: "entitled",
      })
    ).toEqual({ allowed: false });
  });

  it("blocks rename for free Analytical users", () => {
    const control = resolveComparisonUpdateControl({
      canUpdateComparison: false,
      isEntitlementPending: false,
      entitlementStatus: "free",
    });
    expect(control.allowed).toBe(false);
    expect(control.title).toMatch(/Professional/i);
  });
});
