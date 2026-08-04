import { describe, it, expect, vi, afterEach } from "vitest";
import type { MortgageInputs } from "@/lib/mortgage";
import { DEFAULT_HELOC_INPUTS } from "@/lib/heloc";
import { DEFAULT_ASSUMPTION_INPUTS } from "@/lib/assumption";
import {
  createScenarioData,
  CALCULATOR_VERSION,
  type ScenarioData,
} from "@/lib/scenarioContract";
import { type ScenarioCalculationSnapshot } from "@/lib/scenarioPersistence";
import { toSupabaseRow } from "@/lib/scenarioStore";
import {
  buildCanonicalScenarioExport,
  exportSummaryFromDerivedJson,
} from "@/lib/exports/exportContract";
import { generateScenarioHTML } from "@/lib/exports/exportPDF";
import bmP01 from "./fixtures/BM-P01.json";
import bmR01 from "./fixtures/BM-R01.json";
import bmH02 from "./fixtures/BM-H02.json";
import bmA02 from "./fixtures/BM-A02.json";

afterEach(() => {
  vi.restoreAllMocks();
});

function purchaseInputs(): MortgageInputs {
  return bmP01.inputs as MortgageInputs;
}

function refinanceInputs(): MortgageInputs {
  return bmR01.inputs as MortgageInputs;
}

function helocInputs(): MortgageInputs {
  return {
    ...(bmP01.inputs as MortgageInputs),
    mode: "heloc",
    heloc: {
      ...DEFAULT_HELOC_INPUTS,
      ...(bmH02.inputs as typeof DEFAULT_HELOC_INPUTS),
    },
  };
}

function assumptionInputs(): MortgageInputs {
  return {
    ...(bmP01.inputs as MortgageInputs),
    mode: "assumption",
    assumption: {
      ...DEFAULT_ASSUMPTION_INPUTS,
      ...(bmA02.inputs as typeof DEFAULT_ASSUMPTION_INPUTS),
    },
  };
}

function withStaleActive(scenario: ScenarioData): ScenarioData {
  const staleActive: ScenarioCalculationSnapshot = {
    ...scenario.activeSnapshot,
    calculatorVersion: "1.0.0",
    summary: {
      ...scenario.activeSnapshot.summary,
      totalInterest: 1,
      financingCostOverHorizon: 1,
      principalReductionOverHorizon: 2,
    },
  };
  return {
    ...scenario,
    activeSnapshot: staleActive,
    activeCalculatorVersion: "1.0.0",
    calculatorVersion: "1.0.0",
  };
}

describe("exportContract — active snapshot by mode", () => {
  it("purchase active-snapshot export uses financing cost and excludes fabricated HELOC fields", () => {
    const scenario = createScenarioData("Purchase", purchaseInputs(), "user-1");
    const exported = buildCanonicalScenarioExport(scenario);

    expect(exported.metadata.snapshotSource).toBe("active");
    expect(exported.metadata.scenarioType).toBe("purchase");
    expect(exported.metadata.calculatorVersion).toBe(CALCULATOR_VERSION);
    expect(exported.metrics.financingCostOverHorizon).toBe(
      scenario.activeSnapshot.summary.financingCostOverHorizon
    );
    expect(exported.metrics.principalReductionOverHorizon).toBe(
      scenario.activeSnapshot.summary.principalReductionOverHorizon
    );
    expect(exported.metrics.financingCostOverHorizon).not.toBe(
      exported.metrics.legacyTotalCost
    );
    expect(exported.metrics.paymentDrawAvg).toBeNull();
    expect(exported.metrics.assumedPaymentPi).toBeNull();
  });

  it("refinance active-snapshot export includes closing costs and decision horizon", () => {
    const scenario = createScenarioData("Refi", refinanceInputs(), "user-1");
    const exported = buildCanonicalScenarioExport(scenario);

    expect(exported.metadata.scenarioType).toBe("refinance");
    expect(exported.metrics.decisionHorizonMonths).toBe(
      scenario.activeSnapshot.summary.decisionHorizonMonths
    );
    expect(exported.metrics.closingCosts).toBe(
      scenario.inputs.refinance.closingCosts
    );
    expect(exported.metrics.allInMonthlyHousingPayment).not.toBeNull();
  });

  it("HELOC export omits mortgage-only fabrication", () => {
    const scenario = createScenarioData("HELOC", helocInputs(), "user-1");
    const exported = buildCanonicalScenarioExport(scenario);

    expect(exported.metadata.scenarioType).toBe("heloc");
    expect(exported.metrics.monthlyPrincipalInterest).toBeNull();
    expect(exported.metrics.monthlyPropertyTax).toBeNull();
    expect(exported.metrics.monthlyPMI).toBeNull();
    expect(exported.metrics.ltvRatio).toBeNull();
    expect(exported.metrics.paymentRepay).toBe(
      scenario.activeSnapshot.summary.monthlyPaymentPrimary
    );
    expect(exported.metrics.financingCostOverHorizon).toBe(
      scenario.activeSnapshot.summary.financingCostOverHorizon
    );
  });

  it("assumption export omits mortgage fallback fields", () => {
    const scenario = createScenarioData("Assumption", assumptionInputs(), "user-1");
    const exported = buildCanonicalScenarioExport(scenario);

    expect(exported.metadata.scenarioType).toBe("assumption");
    expect(exported.metrics.monthlyPrincipalInterest).toBeNull();
    expect(exported.metrics.monthlyPropertyTax).toBeNull();
    expect(exported.metrics.monthlyPMI).toBeNull();
    expect(exported.metrics.financingCostOverHorizon).toBe(
      scenario.activeSnapshot.summary.financingCostOverHorizon
    );
    expect(exported.metrics.principalReductionOverHorizon).toBe(
      scenario.activeSnapshot.summary.principalReductionOverHorizon
    );
  });
});

describe("exportContract — snapshot selection and stale versions", () => {
  it("original-snapshot export preserves historical values exactly", () => {
    const created = createScenarioData("Purchase", purchaseInputs(), "user-1");
    const originalInterest = created.originalSnapshot.summary.totalInterest;
    const stale = withStaleActive(created);

    expect(stale.activeSnapshot.summary.totalInterest).toBe(1);
    expect(stale.originalSnapshot.summary.totalInterest).toBe(originalInterest);

    const exported = buildCanonicalScenarioExport(stale, { snapshot: "original" });
    expect(exported.metadata.snapshotSource).toBe("original");
    expect(exported.metrics.totalInterest).toBe(originalInterest);
    expect(exported.metrics.financingCostOverHorizon).toBe(
      created.originalSnapshot.summary.financingCostOverHorizon
    );
    expect(exported.metadata.calculatorVersion).toBe(
      stale.originalCalculatorVersion
    );
  });

  it("stale active snapshot exports persisted values without recalculation", () => {
    const created = createScenarioData("Purchase", purchaseInputs(), "user-1");
    const stale = withStaleActive(created);
    const activeBeforeExport = JSON.stringify(stale.activeSnapshot);
    const exported = buildCanonicalScenarioExport(stale);

    expect(exported.metadata.recalculationAvailable).toBe(true);
    expect(exported.metadata.calculatorVersion).toBe("1.0.0");
    expect(exported.metrics.totalInterest).toBe(1);
    expect(exported.metrics.financingCostOverHorizon).toBe(1);
    expect(JSON.stringify(stale.activeSnapshot)).toBe(activeBeforeExport);
  });

  it("calculator version appears in export metadata and printable HTML", () => {
    const scenario = createScenarioData("Purchase", purchaseInputs(), "user-1");
    const exported = buildCanonicalScenarioExport(scenario);
    const html = generateScenarioHTML(scenario);

    expect(exported.metadata.calculatorVersion).toBe(CALCULATOR_VERSION);
    expect(exported.metadata.currentCalculatorVersion).toBe(CALCULATOR_VERSION);
    expect(html).toContain(`Calculator: v${CALCULATOR_VERSION}`);
    expect(html).toContain("Financing cost over modeled term");
    expect(html).toContain("Principal reduction over modeled term");
  });
});

describe("exportContract — financing vs principal and legacy compatibility", () => {
  it("financing cost excludes principal and principal reduction is separate", () => {
    const scenario = createScenarioData("Purchase", purchaseInputs(), "user-1");
    const exported = buildCanonicalScenarioExport(scenario);
    const { financingCostOverHorizon, principalReductionOverHorizon, legacyTotalCost } =
      exported.metrics;

    expect(financingCostOverHorizon).not.toBeNull();
    expect(principalReductionOverHorizon).not.toBeNull();
    expect(financingCostOverHorizon).not.toBe(principalReductionOverHorizon);
    // Legacy totalCost typically includes principal; financing cost must not equal it
    // for a standard amortizing purchase over full term.
    expect(financingCostOverHorizon).not.toBe(legacyTotalCost);
  });

  it("legacy flat derived JSON remains exportable via adapter", () => {
    const mapped = exportSummaryFromDerivedJson(
      {
        loanAmount: 320000,
        monthlyPrincipalInterest: 2000,
        monthlyTotal: 2500,
        totalInterest: 100000,
        totalCost: 420000,
        financingCostOverHorizon: 100000,
        principalReductionOverHorizon: 320000,
        allInMonthlyHousingPayment: 2500,
        decisionHorizonMonths: 360,
        payoffMonths: 360,
        ltvRatio: 80,
        rateForComparison: 6.5,
        calculatorVersion: "1.0.0",
      },
      "active"
    );

    expect(mapped.isLegacyFlat).toBe(true);
    expect(mapped.financingCostOverHorizon).toBe(100000);
    expect(mapped.principalReductionOverHorizon).toBe(320000);
    expect(mapped.principalAmount).toBe(320000);
    expect(mapped.calculatorVersion).toBe("1.0.0");
  });
});

describe("exportContract — client/server derived parity", () => {
  it("shared fields match between canonical export and derived-JSON mapper", () => {
    const scenario = createScenarioData("Purchase", purchaseInputs(), "user-1");
    const row = toSupabaseRow(scenario, "user-1");
    const fromCanonical = buildCanonicalScenarioExport(scenario);
    const fromDerived = exportSummaryFromDerivedJson(row.derived, "active");

    expect(fromDerived.financingCostOverHorizon).toBe(
      fromCanonical.metrics.financingCostOverHorizon
    );
    expect(fromDerived.principalReductionOverHorizon).toBe(
      fromCanonical.metrics.principalReductionOverHorizon
    );
    expect(fromDerived.allInMonthlyHousingPayment).toBe(
      fromCanonical.metrics.allInMonthlyHousingPayment
    );
    expect(fromDerived.decisionHorizonMonths).toBe(
      fromCanonical.metrics.decisionHorizonMonths
    );
    expect(fromDerived.totalInterest).toBe(fromCanonical.metrics.totalInterest);
    expect(fromDerived.principalAmount).toBe(fromCanonical.metrics.principalAmount);
    expect(fromDerived.calculatorVersion).toBe(
      fromCanonical.metadata.calculatorVersion
    );
  });

  it("original selection on derived JSON matches canonical original export", () => {
    const created = createScenarioData("Purchase", purchaseInputs(), "user-1");
    const stale = withStaleActive(created);
    const row = toSupabaseRow(stale, "user-1");
    const fromCanonical = buildCanonicalScenarioExport(stale, {
      snapshot: "original",
    });
    const fromDerived = exportSummaryFromDerivedJson(row.derived, "original");

    expect(fromDerived.totalInterest).toBe(fromCanonical.metrics.totalInterest);
    expect(fromDerived.financingCostOverHorizon).toBe(
      fromCanonical.metrics.financingCostOverHorizon
    );
    expect(fromDerived.calculatorVersion).toBe(
      fromCanonical.metadata.calculatorVersion
    );
  });
});
