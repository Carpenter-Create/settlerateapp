import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import bmP06 from "./fixtures/BM-P06.json";
import bmP01 from "./fixtures/BM-P01.json";
import { calculateMortgage, type MortgageInputs } from "@/lib/mortgage";
import {
  calculateRefinanceBreakEven,
  generateRefiRateSensitivity,
} from "@/lib/rateSensitivity";
import { createScenarioData } from "@/lib/scenarioContract";
import bmP03 from "./fixtures/BM-P03.json";
import bmR04 from "./fixtures/BM-R04.json";
import bmR05 from "./fixtures/BM-R05.json";

describe("financingCost.composition — pending v2.0.0 methodology", () => {
  it("BM-P06 financing cost excludes principal", () => {
    const base = bmP03.inputsBase as unknown as MortgageInputs;
    const inputs: MortgageInputs = {
      ...base,
      purchase: { ...base.purchase, downPayment: 19 },
    };
    const results = calculateMortgage(inputs);
    expect(results.financingCostOverHorizon).toBeCloseTo(
      bmP06.expected.financingCostOverHorizon,
      2
    );
    expect(results.financingCostOverHorizon).not.toBeCloseTo(results.totalCost, 0);
  });

  it("BM-P03 high-LTV financing cost includes mortgage insurance premiums", () => {
    const base = bmP03.inputsBase as unknown as MortgageInputs;
    const results = calculateMortgage({
      ...base,
      purchase: { ...base.purchase, downPayment: 19 },
    });
    expect(results.financingCostOverHorizon - results.totalInterest).toBeCloseTo(54000, 2);
  });

  it("BM-C03 principal reduction is reported separately", () => {
    const results = calculateMortgage(bmP01.inputs as MortgageInputs);
    expect(results.principalReductionOverHorizon).toBeCloseTo(results.loanAmount, 2);
    expect(results.financingCostOverHorizon).toBeCloseTo(results.totalInterest, 2);
  });
});

describe("financingCost.composition — v1.0.0 baseline (documents incorrect totalCost semantics)", () => {
  it("BM-P06 reference: v1.0.0 totalCost includes principal", () => {
    const inputs = bmP01.inputs as MortgageInputs;
    const results = calculateMortgage(inputs);

    expect(results.totalCost).toBeGreaterThan(results.totalInterest);
    expect(results.totalCost - results.totalInterest).toBeCloseTo(results.loanAmount, 0);
  });

  it("BM-R06 rateSensitivity source contains no synthetic +1% current rate", () => {
    const sourcePath = resolve(
      process.cwd(),
      "src/lib/rateSensitivity.ts"
    );
    const source = readFileSync(sourcePath, "utf-8");

    expect(source).not.toContain("baseRate + 1.0");
    expect(bmP06.expected.loanAmountPlusInterestMustNotEqualFinancingCostLabel).toBe(true);
  });
});

describe("financingCost.composition — pending break-even behavior", () => {
  it("BM-R04 computes break-even from explicit current-loan inputs", () => {
    const inputs = bmR04.inputs as unknown as MortgageInputs;
    const results = calculateMortgage(inputs);
    expect(calculateRefinanceBreakEven(inputs, results.monthlyPrincipalInterest)).toBe(
      bmR04.expected.breakEvenMonths
    );
  });

  it("BM-R05 omits break-even without current-loan inputs", () => {
    const inputs = {
      ...(bmP01.inputs as MortgageInputs),
      mode: "refinance" as const,
      refinance: {
        ...(bmP01.inputs as MortgageInputs).refinance,
        ...bmR05.inputs.refinance,
      },
    };
    const results = calculateMortgage(inputs);
    expect(calculateRefinanceBreakEven(inputs, results.monthlyPrincipalInterest)).toBeNull();
    const sensitivity = generateRefiRateSensitivity(createScenarioData("Refinance", inputs));
    expect(sensitivity.breakEvenMonths).toBeNull();
    expect(sensitivity.narrative).not.toContain("break-even");
  });

  it("does not calculate break-even when monthly savings are non-positive", () => {
    const inputs = bmR04.inputs as unknown as MortgageInputs;
    expect(calculateRefinanceBreakEven(inputs, 3000)).toBeNull();
  });
});
