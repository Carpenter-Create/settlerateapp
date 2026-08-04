import { describe, it, expect, vi, afterEach } from "vitest";
import type { MortgageInputs } from "@/lib/mortgage";
import { DEFAULT_HELOC_INPUTS } from "@/lib/heloc";
import { DEFAULT_ASSUMPTION_INPUTS } from "@/lib/assumption";
import {
  createScenarioData,
  CALCULATOR_VERSION,
  type ScenarioData,
} from "@/lib/scenarioContract";
import type { ScenarioCalculationSnapshot } from "@/lib/scenarioPersistence";
import {
  COMPARISON_TIE_TOLERANCE_USD,
  COMPARISON_FUNDING_EQUIVALENCE_TOLERANCE_USD,
  buildComparisonParticipant,
  buildComparisonParticipants,
} from "@/lib/comparisonContract";
import {
  determineComparisonWinner,
  determineComparisonWinnerFromParticipants,
} from "@/lib/comparisonWinner";
import {
  determineLowestCost,
  generateSummaryText,
  generateThreeWaySummaryText,
} from "@/lib/comparisonSummary";
import { buildComparisonLayout } from "@/lib/exports/exportLayout";
import bmP01 from "./fixtures/BM-P01.json";
import bmR01 from "./fixtures/BM-R01.json";
import bmH02 from "./fixtures/BM-H02.json";
import bmA02 from "./fixtures/BM-A02.json";
import bmC01 from "./fixtures/BM-C01.json";
import bmC02 from "./fixtures/BM-C02.json";

afterEach(() => {
  vi.restoreAllMocks();
});

function withId(scenario: ScenarioData, id: string, name?: string): ScenarioData {
  return { ...scenario, id, name: name ?? scenario.name };
}

function purchaseScenario(id = "purchase", name = "Purchase"): ScenarioData {
  return withId(
    createScenarioData(name, bmP01.inputs as MortgageInputs, "user-1"),
    id,
    name
  );
}

function refinanceScenario(id = "refinance", name = "Refinance"): ScenarioData {
  return withId(
    createScenarioData(name, bmR01.inputs as MortgageInputs, "user-1"),
    id,
    name
  );
}

function helocScenario(id = "heloc", name = "HELOC"): ScenarioData {
  const inputs: MortgageInputs = {
    ...(bmP01.inputs as MortgageInputs),
    mode: "heloc",
    heloc: {
      ...DEFAULT_HELOC_INPUTS,
      ...(bmH02.inputs as typeof DEFAULT_HELOC_INPUTS),
    },
  };
  return withId(createScenarioData(name, inputs, "user-1"), id, name);
}

function assumptionScenario(id = "assumption", name = "Assumption"): ScenarioData {
  const inputs: MortgageInputs = {
    ...(bmP01.inputs as MortgageInputs),
    mode: "assumption",
    assumption: {
      ...DEFAULT_ASSUMPTION_INPUTS,
      ...(bmA02.inputs as typeof DEFAULT_ASSUMPTION_INPUTS),
    },
  };
  return withId(createScenarioData(name, inputs, "user-1"), id, name);
}

function withStaleActive(scenario: ScenarioData): ScenarioData {
  const staleActive: ScenarioCalculationSnapshot = {
    ...scenario.activeSnapshot,
    calculatorVersion: "1.0.0",
    summary: {
      ...scenario.activeSnapshot.summary,
      financingCostOverHorizon: 999999,
      totalInterest: 999999,
    },
  };
  return {
    ...scenario,
    activeSnapshot: staleActive,
    activeCalculatorVersion: "1.0.0",
    calculatorVersion: "1.0.0",
  };
}

function withFinancing(
  scenario: ScenarioData,
  financingCost: number,
  horizonMonths: number,
  monthly?: number
): ScenarioData {
  const summary = {
    ...scenario.activeSnapshot.summary,
    financingCostOverHorizon: financingCost,
    decisionHorizonMonths: horizonMonths,
    allInMonthlyHousingPayment:
      monthly ?? scenario.activeSnapshot.summary.allInMonthlyHousingPayment,
  };
  return {
    ...scenario,
    activeSnapshot: { ...scenario.activeSnapshot, summary },
    results: {
      ...scenario.results,
      financingCostOverHorizon: financingCost,
      decisionHorizonMonths: horizonMonths,
      monthlyTotal: monthly ?? scenario.results.monthlyTotal,
    },
  };
}

function withPrincipal(scenario: ScenarioData, principalAmount: number): ScenarioData {
  return {
    ...scenario,
    activeSnapshot: {
      ...scenario.activeSnapshot,
      summary: {
        ...scenario.activeSnapshot.summary,
        principalAmount,
      },
    },
    results: {
      ...scenario.results,
      loanAmount: principalAmount,
    },
  };
}

describe("comparisonContract — participant construction", () => {
  it("defaults to activeSnapshot and never fabricates unsupported HELOC mortgage fields", () => {
    const heloc = helocScenario("BM-H02");
    const participant = buildComparisonParticipant(heloc);
    expect(participant.snapshotKind).toBe("active");
    expect(participant.financingCostOverHorizon).toBeCloseTo(
      bmH02.expected.financingCostOverHorizon,
      1
    );
    expect(participant.endingLoanBalance).toBeNull();
    expect(participant.modeledEquityAtHorizon).toBeNull();
    expect(participant.unsupportedMetrics).toContain("monthlyPMI");
    expect(participant.unsupportedMetrics).toContain("ltvRatio");
  });

  it("does not fabricate assumption mortgage-only fields", () => {
    const assumption = assumptionScenario("BM-A02");
    const participant = buildComparisonParticipant(assumption);
    expect(participant.financingCostOverHorizon).toBeCloseTo(
      bmA02.expected.financingCostOverHorizon,
      1
    );
    expect(participant.endingLoanBalance).toBeNull();
    expect(participant.modeledEquityAtHorizon).toBeNull();
    expect(participant.unsupportedMetrics).toContain("monthlyPrincipalInterest");
  });

  it("uses originalSnapshot only when explicitly requested", () => {
    const created = purchaseScenario("p1");
    const stale = withStaleActive(created);
    const active = buildComparisonParticipant(stale);
    const original = buildComparisonParticipant(stale, { snapshot: "original" });
    expect(active.financingCostOverHorizon).toBe(999999);
    expect(original.financingCostOverHorizon).toBe(
      created.originalSnapshot.summary.financingCostOverHorizon
    );
    expect(original.snapshotKind).toBe("original");
  });

  it("discloses stale calculator version without recalculating", () => {
    const stale = withStaleActive(purchaseScenario("stale"));
    const before = stale.activeSnapshot.summary.financingCostOverHorizon;
    const participant = buildComparisonParticipant(stale);
    expect(participant.staleCalculation).toBe(true);
    expect(participant.financingCostOverHorizon).toBe(before);
    expect(participant.calculatorVersion).toBe("1.0.0");
    expect(participant.currentCalculatorVersion).toBe(CALCULATOR_VERSION);
  });
});

describe("comparisonWinner — primary metric, horizon, and funding comparability", () => {
  it("BM-C01: P01/H02/A02 are not economically comparable — indeterminate", () => {
    expect(bmC01.expected.primaryRankingMetric).toBe("financingCostOverHorizon");
    expect(bmC01.expected.status).toBe("indeterminate");
    expect(bmC01.expected.winnerScenarioId).toBeNull();

    const p01 = purchaseScenario("BM-P01", "BM-P01");
    const h02 = helocScenario("BM-H02", "BM-H02");
    const a02 = assumptionScenario("BM-A02", "BM-A02");

    const p = buildComparisonParticipant(p01);
    const h = buildComparisonParticipant(h02);
    const a = buildComparisonParticipant(a02);

    expect(p.decisionObjective).toBe("home_purchase");
    expect(p.totalFinancingProvided).toBeCloseTo(360000, 0);
    expect(p.upfrontCashRequired).toBeCloseTo(90000, 0);
    expect(p.fundingRequirement).toBeCloseTo(450000, 0);

    expect(h.decisionObjective).toBe("heloc_credit");
    expect(h.totalFinancingProvided).toBeCloseTo(50000, 0);
    expect(h.upfrontCashRequired).toBeCloseTo(0, 0);

    expect(a.decisionObjective).toBe("assumption_purchase");
    expect(a.decisionHorizonMonths).toBe(300);
    expect(a.totalFinancingProvided).toBeCloseTo(300000, 0);
    expect(a.upfrontCashRequired).toBeCloseTo(50000, 0);

    const result = determineComparisonWinner([p01, h02, a02]);
    expect(result.status).toBe("indeterminate");
    expect(result.winnerScenarioId).toBeNull();
    expect(result.explanationCode).toBe(bmC01.expected.explanationCode);
    expect(result.explanation.toLowerCase()).not.toContain("best");
    expect(result.explanation.toLowerCase()).not.toContain("winner");
  });

  it("equivalent financing amount and same horizon — lowest financing cost wins", () => {
    const a = withFinancing(purchaseScenario("a", "A"), 100000, 360, 2000);
    const b = withFinancing(purchaseScenario("b", "B"), 120000, 360, 1500);
    // Same persisted principal (BM-P01 $360k) → funding-equivalent
    expect(a.activeSnapshot.summary.principalAmount).toBe(
      b.activeSnapshot.summary.principalAmount
    );
    const result = determineComparisonWinner([a, b]);
    expect(result.status).toBe("winner");
    expect(result.winnerScenarioId).toBe("a");
    expect(result.delta).toBeCloseTo(20000, 2);
    expect(result.fundingEquivalenceTolerance).toBe(
      COMPARISON_FUNDING_EQUIVALENCE_TOLERANCE_USD
    );
  });

  it("same horizon but different financing amounts → indeterminate", () => {
    const a = withPrincipal(
      withFinancing(purchaseScenario("a"), 100000, 360),
      360000
    );
    const b = withPrincipal(
      withFinancing(purchaseScenario("b"), 80000, 360),
      50000
    );
    const result = determineComparisonWinner([a, b]);
    expect(result.status).toBe("indeterminate");
    expect(result.winnerScenarioId).toBeNull();
    expect(result.explanationCode).toBe("non_equivalent_funding");
  });

  it("missing funding amount → indeterminate", () => {
    const a = purchaseScenario("a");
    const b = purchaseScenario("b");
    const participants = buildComparisonParticipants([a, b]);
    participants[1] = {
      ...participants[1],
      totalFinancingProvided: null,
      financingPrincipalOrDraw: null,
    };
    const result = determineComparisonWinnerFromParticipants(participants);
    expect(result.status).toBe("indeterminate");
    expect(result.explanationCode).toBe("missing_funding_amount");
    expect(
      result.excludedScenarioIds.some((e) => e.reason === "missing_funding_amount")
    ).toBe(true);
  });

  it("different decision objective/comparison group → indeterminate", () => {
    const purchase = purchaseScenario("BM-P01");
    const heloc = helocScenario("BM-H02");
    const result = determineComparisonWinner([purchase, heloc]);
    expect(result.status).toBe("indeterminate");
    expect(result.winnerScenarioId).toBeNull();
    expect(result.explanationCode).toBe("decision_objective_mismatch");
  });

  it("purchase vs refinance differ by decision objective → indeterminate", () => {
    const purchase = withFinancing(purchaseScenario("p"), 200000, 360);
    const refi = withFinancing(refinanceScenario("r"), 150000, 360);
    const result = determineComparisonWinner([purchase, refi]);
    expect(result.status).toBe("indeterminate");
    expect(result.explanationCode).toBe("decision_objective_mismatch");
  });

  it("purchase vs assumption with mismatched objectives/funding → indeterminate", () => {
    const purchase = withFinancing(purchaseScenario("p"), 200000, 300);
    const assumption = withFinancing(assumptionScenario("a"), 167236, 300);
    const result = determineComparisonWinner([purchase, assumption]);
    expect(result.status).toBe("indeterminate");
    expect(result.winnerScenarioId).toBeNull();
    expect(["decision_objective_mismatch", "non_equivalent_funding"]).toContain(
      result.explanationCode
    );
  });

  it("upfront-cash incompatibility → indeterminate", () => {
    const a = purchaseScenario("a");
    const b = purchaseScenario("b");
    const participants = buildComparisonParticipants([a, b]);
    participants[0] = { ...participants[0], upfrontCashRequired: 90000 };
    participants[1] = { ...participants[1], upfrontCashRequired: 10000 };
    const result = determineComparisonWinnerFromParticipants(participants);
    expect(result.status).toBe("indeterminate");
    expect(result.explanationCode).toBe("upfront_cash_incompatible");
    expect(result.winnerScenarioId).toBeNull();
  });

  it("side-by-side metrics remain available without a winner", () => {
    const purchase = purchaseScenario("BM-P01", "Purchase");
    const heloc = helocScenario("BM-H02", "HELOC");
    const result = determineComparisonWinner([purchase, heloc]);
    expect(result.status).toBe("indeterminate");
    const layout = buildComparisonLayout(purchase, heloc);
    const costSection = layout.sections.find(
      (s) => s.title === "Cost Over the Modeled Term"
    );
    expect(costSection?.rows?.length).toBeGreaterThan(0);
    expect(layout.sections[0].text?.toLowerCase()).not.toContain("best option");
    expect(layout.sections[0].text?.toLowerCase()).toContain(
      "side-by-side metrics remain available"
    );
  });

  it("financing cost excludes principal reduction from ranking", () => {
    const highPrincipalLowFinancing = withFinancing(
      purchaseScenario("low-fin"),
      50000,
      360
    );
    highPrincipalLowFinancing.activeSnapshot.summary.principalReductionOverHorizon = 400000;
    const lowPrincipalHighFinancing = withFinancing(
      purchaseScenario("high-fin"),
      200000,
      360
    );
    lowPrincipalHighFinancing.activeSnapshot.summary.principalReductionOverHorizon = 10000;
    const result = determineComparisonWinner([
      highPrincipalLowFinancing,
      lowPrincipalHighFinancing,
    ]);
    expect(result.winnerScenarioId).toBe("low-fin");
  });

  it("BM-C02: all-in monthly payment does not determine the primary winner", () => {
    expect(bmC02.expected.winnerDeterminedBy).toBe("financingCostOverHorizon");
    expect(bmC02.expected.primaryMetricNever).toBe("allInMonthlyHousingPayment");
    const lowMonthly = withFinancing(purchaseScenario("low-mo"), 300000, 360, 1000);
    const highMonthly = withFinancing(purchaseScenario("high-mo"), 100000, 360, 3000);
    const result = determineComparisonWinner([lowMonthly, highMonthly]);
    expect(result.winnerScenarioId).toBe("high-mo");
    expect(result.primaryMetric).toBe("financingCostOverHorizon");
  });

  it("same financing cost within tolerance returns tie", () => {
    const a = withFinancing(purchaseScenario("a"), 100000, 360);
    const b = withFinancing(
      purchaseScenario("b"),
      100000 + COMPARISON_TIE_TOLERANCE_USD / 2,
      360
    );
    const result = determineComparisonWinner([a, b]);
    expect(result.status).toBe("tie");
    expect(result.winnerScenarioId).toBeNull();
    expect(result.explanationCode).toBe("financing_cost_tie");
  });

  it("different horizons return indeterminate unless enough share a horizon", () => {
    const a = withFinancing(purchaseScenario("a"), 100000, 360);
    const b = withFinancing(purchaseScenario("b"), 90000, 300);
    const result = determineComparisonWinner([a, b]);
    expect(result.status).toBe("indeterminate");
    expect(result.explanationCode).toBe("horizon_incompatible");
    expect(result.winnerScenarioId).toBeNull();
  });

  it("unsupported / missing primary metric returns indeterminate", () => {
    const a = purchaseScenario("a");
    const b = purchaseScenario("b");
    const participants = buildComparisonParticipants([a, b]);
    participants[1] = { ...participants[1], financingCostOverHorizon: null };
    const result = determineComparisonWinnerFromParticipants(participants);
    expect(result.status).toBe("indeterminate");
    expect(result.explanationCode).toBe("missing_primary_metric");
    expect(result.excludedScenarioIds[0]?.reason).toBe("missing_financing_cost");
  });

  it("stale scenarios compare without recalculation and are disclosed", () => {
    const fresh = withFinancing(purchaseScenario("fresh"), 200000, 360);
    const stale = withStaleActive(
      withFinancing(purchaseScenario("stale"), 100000, 360)
    );
    const result = determineComparisonWinner([fresh, stale]);
    expect(result.staleScenarioIds).toContain("stale");
    expect(result.winnerScenarioId).toBe("fresh");
    expect(stale.activeSnapshot.summary.financingCostOverHorizon).toBe(999999);
  });

  it("excluded scenarios include deterministic reasons", () => {
    const p01 = purchaseScenario("BM-P01");
    const h02 = helocScenario("BM-H02");
    const a02 = assumptionScenario("BM-A02");
    const result = determineComparisonWinner([p01, h02, a02]);
    expect(result.excludedScenarioIds.length).toBeGreaterThan(0);
    for (const excluded of result.excludedScenarioIds) {
      expect(excluded.reason).toMatch(
        /missing_financing_cost|horizon_mismatch|incomplete_snapshot|unsupported_scenario_type|missing_funding_amount|decision_objective_mismatch|non_equivalent_funding|upfront_cash_incompatible/
      );
    }
  });
});

describe("legacy comparison adapter parity", () => {
  it("determineLowestCost routes through canonical winner", () => {
    const a = withFinancing(purchaseScenario("a", "A"), 100000, 360, 2500);
    const b = withFinancing(purchaseScenario("b", "B"), 150000, 360, 1000);
    const legacy = determineLowestCost(a, b);
    const canonical = determineComparisonWinner([a, b]);
    expect(legacy.status).toBe(canonical.status);
    expect(legacy.winnerResult.winnerScenarioId).toBe(canonical.winnerScenarioId);
    expect(legacy.lowestCostScenario).toBe("A");
    expect(legacy.financingCost).toBeCloseTo(100000, 2);
    // Must not prefer lower monthly payment
    expect(legacy.lowestCostScenario).not.toBe("B");
  });

  it("comparison export summary uses canonical financing-cost winner language", () => {
    const a = withFinancing(purchaseScenario("a", "Alpha"), 100000, 360);
    const b = withFinancing(purchaseScenario("b", "Beta"), 150000, 360);
    const text = generateSummaryText(a, b);
    expect(text).toContain("Alpha");
    expect(text.toLowerCase()).toContain("financing cost");
    expect(text.toLowerCase()).not.toContain("total cost over the life");

    const layout = buildComparisonLayout(a, b);
    expect(layout.sections[0].type).toBe("text");
    expect(layout.sections[0].text).toBe(text);
    const keyDiff = layout.sections.find((s) => s.title === "How the Options Compare");
    const labels = (keyDiff?.items ?? []).map((i) => i.label);
    expect(labels).toContain("Financing cost over modeled term");
    expect(labels).not.toContain("Total cost (legacy)");
  });

  it("three-way export narrative does not declare a least-expensive option for BM-C01", () => {
    const p01 = purchaseScenario("BM-P01", "Purchase");
    const h02 = helocScenario("BM-H02", "HELOC");
    const a02 = assumptionScenario("BM-A02", "Assumption");
    const text = generateThreeWaySummaryText(p01, h02, a02);
    expect(text.toLowerCase()).not.toContain("best option");
    expect(text.toLowerCase()).not.toContain("least expensive option overall");
    expect(text.toLowerCase()).toMatch(
      /decision objective|equivalent financing|side-by-side/
    );
  });
});
