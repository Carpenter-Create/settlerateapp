import { describe, it, expect } from "vitest";
import { calculateMortgage, type MortgageInputs } from "@/lib/mortgage";
import { assertWithinTolerance, DEFAULT_MONETARY_TOLERANCE } from "./helpers";
import bmP01 from "./fixtures/BM-P01.json";
import bmP03 from "./fixtures/BM-P03.json";
import bmP05 from "./fixtures/BM-P05.json";
import bmR01 from "./fixtures/BM-R01.json";

function buildPurchaseInputs(
  downPayment: number,
  overrides: Partial<MortgageInputs["shared"]> = {}
): MortgageInputs {
  const base = bmP03.inputsBase as unknown as MortgageInputs;
  return {
    ...base,
    purchase: {
      ...base.purchase,
      downPayment,
    },
    shared: {
      ...base.shared,
      ...overrides,
    },
  };
}

describe("mortgage.benchmark — active regression (calculator v1.0.0 paths)", () => {
  it("BM-P01 standard 30-year purchase", () => {
    const inputs = bmP01.inputs as MortgageInputs;
    const results = calculateMortgage(inputs);
    const expected = bmP01.expected;

    assertWithinTolerance(results.loanAmount, expected.loanAmount as number);
    assertWithinTolerance(
      results.monthlyPrincipalInterest,
      expected.monthlyPrincipalInterest as number
    );
    assertWithinTolerance(results.totalInterest, expected.totalInterest as number);
    expect(results.payoffMonths).toBe(expected.payoffMonths);
    assertWithinTolerance(results.ltvRatio, expected.ltvRatio as number);
    expect(results.requiresPMI).toBe(expected.requiresPMI);
  });

  it("BM-P03 PMI boundary — 19% down requires PMI when estimates included", () => {
    const inputs = buildPurchaseInputs(19);
    const results = calculateMortgage(inputs);
    const variant = bmP03.variants.highLtv;

    assertWithinTolerance(results.loanAmount, variant.loanAmount);
    assertWithinTolerance(results.ltvRatio, variant.ltvRatio);
    expect(results.requiresPMI).toBe(variant.requiresPMI);
    assertWithinTolerance(results.monthlyPMI, variant.monthlyPMI);
    assertWithinTolerance(results.totalInterest, variant.totalInterest);
  });

  it("BM-P03 PMI boundary — 20% down at threshold does not require PMI", () => {
    const inputs = buildPurchaseInputs(20);
    const results = calculateMortgage(inputs);
    const variant = bmP03.variants.atThreshold;

    assertWithinTolerance(results.loanAmount, variant.loanAmount);
    assertWithinTolerance(results.ltvRatio, variant.ltvRatio);
    expect(results.requiresPMI).toBe(variant.requiresPMI);
    expect(results.monthlyPMI).toBe(variant.monthlyPMI);
  });

  it("BM-R01 rate-and-term refinance", () => {
    const inputs = bmR01.inputs as MortgageInputs;
    const results = calculateMortgage(inputs);
    const expected = bmR01.expected;

    assertWithinTolerance(results.loanAmount, expected.loanAmount as number);
    assertWithinTolerance(
      results.monthlyPrincipalInterest,
      expected.monthlyPrincipalInterest as number
    );
    assertWithinTolerance(results.totalInterest, expected.totalInterest as number);
    assertWithinTolerance(results.ltvRatio, expected.ltvRatio as number);
  });
});

describe("mortgage.benchmark — pending v2.0.0 target behavior", () => {
  it.todo(
    "BM-P05 one-time principal at origination — DEF-007 — Phase 2: apply $10,000 lump sum at month 1; expect totalInterest ≈ 404312.79 and payoffMonths 332"
  );

  it.todo(
    "BM-P01 financingCostOverHorizon — Phase 2: expose financing cost metric equal to interest (+ MI/fees when applicable), excluding principal"
  );
});

describe("mortgage.benchmark — v1.0.0 defect documentation (non-regression)", () => {
  it("BM-P05 current code ignores one-time principal (baseline)", () => {
    const withLump = bmP05.inputs as MortgageInputs;
    const withoutLump: MortgageInputs = {
      ...withLump,
      shared: { ...withLump.shared, oneTimePrincipalPayment: null },
    };
    const lumpResults = calculateMortgage(withLump);
    const baseResults = calculateMortgage(withoutLump);

    expect(lumpResults.totalInterest).toBe(baseResults.totalInterest);
    expect(lumpResults.payoffMonths).toBe(baseResults.payoffMonths);
  });

  it("BM-P01 v1.0.0 totalCost incorrectly includes principal in cost semantics", () => {
    const inputs = bmP01.inputs as MortgageInputs;
    const results = calculateMortgage(inputs);
    const principalPlusInterest = results.loanAmount + results.totalInterest;

    expect(results.totalCost).toBeCloseTo(principalPlusInterest, 2);
    expect(results.totalCost).not.toBeCloseTo(results.totalInterest, 0);
  });
});
