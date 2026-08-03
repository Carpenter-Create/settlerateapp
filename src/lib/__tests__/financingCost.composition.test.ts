import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import bmP06 from "./fixtures/BM-P06.json";
import bmP01 from "./fixtures/BM-P01.json";
import { calculateMortgage, type MortgageInputs } from "@/lib/mortgage";

describe("financingCost.composition — pending v2.0.0 methodology", () => {
  it.todo(
    "BM-P06 financing cost excludes principal — DEF-001 — Phase 2: financingCostOverHorizon must equal interest + MI + fees, not loanAmount + interest"
  );

  it.todo(
    "BM-P03 high-LTV financing cost includes mortgage insurance premiums — DEF-008 — Phase 2: 464899.66 interest + 54000 MI = 518899.66"
  );

  it.todo(
    "BM-C03 principalReductionOverHorizon reported separately — Phase 2: must not be folded into financingCostOverHorizon"
  );
});

describe("financingCost.composition — v1.0.0 baseline (documents incorrect totalCost semantics)", () => {
  it("BM-P06 reference: v1.0.0 totalCost includes principal", () => {
    const inputs = bmP01.inputs as MortgageInputs;
    const results = calculateMortgage(inputs);

    expect(results.totalCost).toBeGreaterThan(results.totalInterest);
    expect(results.totalCost - results.totalInterest).toBeCloseTo(results.loanAmount, 0);
  });

  it("BM-R06 baseline: rateSensitivity source contains synthetic +1% rate pattern (pending removal)", () => {
    const sourcePath = resolve(
      process.cwd(),
      "src/lib/rateSensitivity.ts"
    );
    const source = readFileSync(sourcePath, "utf-8");

    expect(source).toContain("baseRate + 1.0");
    expect(bmP06.expected.loanAmountPlusInterestMustNotEqualFinancingCostLabel).toBe(true);
  });
});

describe("financingCost.composition — pending break-even behavior", () => {
  it.todo(
    "BM-R04 accurate break-even with current-loan inputs — DEF-009 — Phase 2: expect breakEvenMonths = 19 when current 7.5%/300mo vs new 6.5%/360mo and $6000 closing costs"
  );

  it.todo(
    "BM-R05 break-even omitted without current-loan inputs — DEF-009 — Phase 2: breakEvenMonths null and no break-even narrative"
  );

  it.todo(
    "BM-R06 remove synthetic current rate from break-even — DEF-009 — Phase 2: rateSensitivity.ts must not use baseRate + 1.0"
  );
});
