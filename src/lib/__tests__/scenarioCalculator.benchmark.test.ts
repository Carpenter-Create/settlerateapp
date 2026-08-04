import { describe, it, expect } from "vitest";
import { calculateScenario } from "@/lib/scenarioCalculator";
import { calculateMortgage, type MortgageInputs } from "@/lib/mortgage";
import { calculateHeloc, type HelocInputs } from "@/lib/heloc";
import { calculateAssumption, type AssumptionInputs } from "@/lib/assumption";
import { assertWithinTolerance } from "./helpers";
import bmP01 from "./fixtures/BM-P01.json";
import bmH02 from "./fixtures/BM-H02.json";
import bmA02 from "./fixtures/BM-A02.json";

describe("scenarioCalculator.benchmark — active dispatch regression", () => {
  it("BM-P01 purchase dispatches to mortgage calculator", () => {
    const inputs = bmP01.inputs as MortgageInputs;
    const unified = calculateScenario(inputs);
    const mortgage = calculateMortgage(inputs);

    assertWithinTolerance(
      unified.monthlyPaymentPrimary,
      mortgage.monthlyPrincipalInterest
    );
    assertWithinTolerance(unified.totalInterest, mortgage.totalInterest);
    expect(unified.type).toBe("purchase");
  });

  it("BM-H02 HELOC dispatches to heloc calculator", () => {
    const helocInputs = bmH02.inputs as HelocInputs;
    const inputs: MortgageInputs = {
      ...(bmP01.inputs as MortgageInputs),
      mode: "heloc",
      heloc: helocInputs,
    };
    const unified = calculateScenario(inputs);
    const heloc = calculateHeloc(helocInputs);

    expect(unified.type).toBe("heloc");
    assertWithinTolerance(unified.monthlyPaymentPrimary, heloc.paymentRepay);
    assertWithinTolerance(unified.totalInterest, heloc.interestTotal);
    assertWithinTolerance(unified.totalCost, heloc.costTotal);
    assertWithinTolerance(unified.financingCostOverHorizon, heloc.costTotal);
    expect(unified.decisionHorizonMonths).toBe(heloc.timelineMonthsTotal);
  });

  it("BM-A02 assumption dispatches to assumption calculator", () => {
    const assumptionInputs = bmA02.inputs as AssumptionInputs;
    const inputs: MortgageInputs = {
      ...(bmP01.inputs as MortgageInputs),
      mode: "assumption",
      assumption: assumptionInputs,
    };
    const unified = calculateScenario(inputs);
    const assumption = calculateAssumption(assumptionInputs);

    expect(unified.type).toBe("assumption");
    assertWithinTolerance(unified.monthlyPaymentPrimary, assumption.paymentTotal);
    assertWithinTolerance(unified.totalInterest, assumption.interestTotal);
    assertWithinTolerance(unified.financingCostOverHorizon, assumption.costTotal);
    expect(unified.decisionHorizonMonths).toBe(assumptionInputs.assumed.remainingMonths);
  });
});

describe("scenarioCalculator.benchmark — pending v2.0.0 cross-type normalization", () => {
  it.todo(
    "BM-C01 comparison normalization — DEF-001, DEF-003 — Phase 5: financingCostOverHorizon ranks BM-P01 lowest among P01/H02/A02"
  );

  it.todo(
    "BM-C02 all-in monthly secondary — DEF-003 — Phase 5: winner must not be determined by allInMonthlyHousingPayment alone"
  );

  it("BM-C03 exposes principal reduction separately from financing cost", () => {
    const unified = calculateScenario(bmP01.inputs as MortgageInputs);
    expect(unified.principalReductionOverHorizon).toBeCloseTo(unified.principalAmount, 2);
    expect(unified.financingCostOverHorizon).toBeCloseTo(unified.totalInterest, 2);
    expect(unified.decisionHorizonMonths).toBe(unified.payoffMonths);
  });
});

describe("scenarioCalculator.benchmark — v1.0.0 totalCost semantics on unified purchase path", () => {
  it("unified totalCost still reflects v1.0.0 principal+interest semantics for purchase (baseline)", () => {
    const inputs = bmP01.inputs as MortgageInputs;
    const unified = calculateScenario(inputs);

    expect(unified.totalCost).toBeCloseTo(
      unified.principalAmount + unified.totalInterest,
      0
    );
  });
});
