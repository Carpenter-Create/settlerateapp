import { describe, it, expect } from "vitest";
import { calculateAssumption, type AssumptionInputs } from "@/lib/assumption";
import { assertWithinTolerance } from "./helpers";
import bmA02 from "./fixtures/BM-A02.json";

describe("assumption.benchmark — active regression", () => {
  it("BM-A02 second-loan gap financing", () => {
    const inputs = bmA02.inputs as AssumptionInputs;
    const results = calculateAssumption(inputs);
    const expected = bmA02.expected;

    assertWithinTolerance(results.gapAmount, expected.gapAmount as number);
    assertWithinTolerance(results.assumedPaymentPi, expected.assumedPaymentPi as number);
    assertWithinTolerance(results.gapPayment, expected.gapPayment as number);
    assertWithinTolerance(results.paymentTotal, expected.paymentTotal as number);
    assertWithinTolerance(results.interestTotal, expected.financingCostOverHorizon as number);
    assertWithinTolerance(results.ltvRatio, expected.ltvRatio as number);
  });
});

describe("assumption.benchmark — pending v2.0.0", () => {
  it.todo(
    "BM-A02 calculateScenario dispatch — DEF-001 — Phase 2: persistence and comparison must use calculateAssumption results"
  );
});
