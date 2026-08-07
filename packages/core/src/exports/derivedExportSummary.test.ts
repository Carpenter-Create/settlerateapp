import { describe, expect, it } from "vitest";
import { mapDerivedExportSummary } from "@settlerate/core/export-summary";

describe("mapDerivedExportSummary — focused semantics", () => {
  it("falls back from missing requested original to available active", () => {
    const derived = {
      activeSnapshot: {
        calculatorVersion: "2.0.0",
        summary: { financingCostOverHorizon: 10, totalInterest: 10 },
      },
    };
    const mapped = mapDerivedExportSummary(derived, "original");
    expect(mapped.financingCostOverHorizon).toBe(10);
    expect(mapped.calculatorVersion).toBe("2.0.0");
    expect(mapped.snapshotSource).toBe("original");
  });

  it("falls back from missing requested active to available original", () => {
    const derived = {
      originalSnapshot: {
        calculatorVersion: "1.0.0",
        summary: { financingCostOverHorizon: 20, totalInterest: 20 },
      },
    };
    const mapped = mapDerivedExportSummary(derived, "active");
    expect(mapped.financingCostOverHorizon).toBe(20);
    expect(mapped.calculatorVersion).toBe("1.0.0");
  });

  it("detects legacy flat derived and maps indicators", () => {
    const mapped = mapDerivedExportSummary(
      { loanAmount: 100000, totalCost: 5000, totalInterest: 4000 },
      "active"
    );
    expect(mapped.isLegacyFlat).toBe(true);
    expect(mapped.principalAmount).toBe(100000);
    expect(mapped.legacyTotalCost).toBe(5000);
  });

  it("handles empty/malformed derived without throwing", () => {
    expect(mapDerivedExportSummary(null, "active").financingCostOverHorizon).toBe(0);
    expect(mapDerivedExportSummary(undefined, "active").calculatorVersion).toBe("unknown");
    expect(mapDerivedExportSummary("x", "active").isLegacyFlat).toBe(false);
  });

  it("preserves historical NaN handling (zero fallbacks; LTV stays NaN)", () => {
    // Historical LTV branch: null/non-number → null; NaN is typeof number so
    // it is returned as NaN (not coerced). Other numerics use readNumber → 0.
    const mapped = mapDerivedExportSummary(
      {
        activeSnapshot: {
          summary: {
            financingCostOverHorizon: Number.NaN,
            ltvRatio: Number.NaN,
            rateForComparison: Number.NaN,
          },
        },
      },
      "active"
    );
    expect(mapped.financingCostOverHorizon).toBe(0);
    expect(Number.isNaN(mapped.ltvRatio)).toBe(true);
    expect(mapped.rateForComparison).toBe(0);
  });

  it("preserves null LTV and zero rate fallback by default", () => {
    const mapped = mapDerivedExportSummary(
      { activeSnapshot: { summary: { ltvRatio: null } } },
      "active"
    );
    expect(mapped.ltvRatio).toBeNull();
    expect(mapped.rateForComparison).toBe(0);
  });

  it("honors rateForComparisonFallback when rate is absent", () => {
    const mapped = mapDerivedExportSummary(
      { activeSnapshot: { summary: {} } },
      "active",
      { rateForComparisonFallback: 6.25 }
    );
    expect(mapped.rateForComparison).toBe(6.25);
  });

  it("does not fabricate HELOC/assumption optional components", () => {
    const mapped = mapDerivedExportSummary(
      { activeSnapshot: { summary: { financingCostOverHorizon: 1 } } },
      "active"
    );
    expect(mapped.paymentDrawAvg).toBeNull();
    expect(mapped.assumedPaymentPi).toBeNull();
    expect(mapped.gapPayment).toBeNull();
    expect(mapped.gapAmount).toBeNull();
    expect(mapped.paymentRepay).toBeNull();
  });

  it("extracts persisted escrow optional fields when present", () => {
    const mapped = mapDerivedExportSummary(
      {
        activeSnapshot: {
          summary: {
            monthlyPropertyTax: 100,
            monthlyHomeInsurance: 50,
            monthlyPMI: 25,
            monthlyHOA: 10,
            monthlyTotal: 2000,
          },
        },
      },
      "active"
    );
    expect(mapped.monthlyPropertyTax).toBe(100);
    expect(mapped.monthlyHomeInsurance).toBe(50);
    expect(mapped.monthlyPMI).toBe(25);
    expect(mapped.monthlyHOA).toBe(10);
    expect(mapped.monthlyTotal).toBe(2000);
  });

  it("falls monthlyTotal back to monthlyPaymentPrimary", () => {
    const mapped = mapDerivedExportSummary(
      {
        activeSnapshot: {
          summary: { monthlyPrincipalInterest: 1500 },
        },
      },
      "active"
    );
    expect(mapped.monthlyPaymentPrimary).toBe(1500);
    expect(mapped.monthlyTotal).toBe(1500);
    expect(mapped.allInMonthlyHousingPayment).toBe(1500);
  });

  it("resolves principalAmount fallback order", () => {
    expect(
      mapDerivedExportSummary(
        { activeSnapshot: { summary: { principalAmount: 1, loanAmount: 2, balanceEndDraw: 3 } } },
        "active"
      ).principalAmount
    ).toBe(1);
    expect(
      mapDerivedExportSummary(
        { activeSnapshot: { summary: { loanAmount: 2, balanceEndDraw: 3 } } },
        "active"
      ).principalAmount
    ).toBe(2);
    expect(
      mapDerivedExportSummary(
        { activeSnapshot: { summary: { balanceEndDraw: 3 } } },
        "active"
      ).principalAmount
    ).toBe(3);
  });

  it("resolves calculator version precedence including unknown", () => {
    const withSelected = mapDerivedExportSummary(
      {
        activeCalculatorVersion: "root-active",
        originalCalculatorVersion: "root-original",
        activeSnapshot: { calculatorVersion: "snap-active", summary: {} },
        originalSnapshot: { calculatorVersion: "snap-original", summary: {} },
      },
      "original"
    );
    expect(withSelected.calculatorVersion).toBe("snap-original");
    expect(withSelected.activeCalculatorVersion).toBe("root-active");
    expect(withSelected.originalCalculatorVersion).toBe("root-original");

    const unknown = mapDerivedExportSummary({ activeSnapshot: { summary: {} } }, "active");
    expect(unknown.calculatorVersion).toBe("unknown");
    expect(unknown.activeCalculatorVersion).toBe("unknown");
  });
});
