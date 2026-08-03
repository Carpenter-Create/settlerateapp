import { describe, it, expect } from "vitest";
import { calculateHeloc, type HelocInputs } from "@/lib/heloc";
import { assertWithinTolerance } from "./helpers";
import bmH02 from "./fixtures/BM-H02.json";

describe("heloc.benchmark — active regression", () => {
  it("BM-H02 interest-only draws capped at credit limit", () => {
    const inputs = bmH02.inputs as HelocInputs;
    const results = calculateHeloc(inputs);
    const expected = bmH02.expected;

    assertWithinTolerance(results.balanceEndDraw, expected.balanceEndDraw as number);
    assertWithinTolerance(results.paymentRepay, expected.paymentRepay as number);
    assertWithinTolerance(results.interestTotal, expected.financingCostOverHorizon as number);
    expect(results.timelineMonthsTotal).toBe(expected.timelineMonthsTotal);
  });
});

describe("heloc.benchmark — pending v2.0.0", () => {
  it.todo(
    "BM-H04 interest-only-only remediation scope — DEF-010 — Phase 2: enforce interestOnlyDraw=true in UI; reject or hide non-IO draw option"
  );

  it.todo(
    "BM-H02 financingCostOverHorizon via calculateScenario dispatch — DEF-001 — Phase 2: scenario save/load must use calculateHeloc, not calculateMortgage"
  );
});
