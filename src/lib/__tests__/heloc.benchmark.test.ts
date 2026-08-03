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

describe("heloc.benchmark — remediation scope", () => {
  it("BM-H04 rejects unsupported amortizing draw periods", () => {
    const inputs = { ...(bmH02.inputs as HelocInputs), interestOnlyDraw: false };
    expect(() => calculateHeloc(inputs)).toThrow(/interestOnlyDraw must be true/);
  });
});
