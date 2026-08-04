/**
 * Canonical Comparison Contract (Phase 5)
 *
 * Neutral decision-support comparison model across purchase, refinance, HELOC,
 * and assumption. Reads persisted snapshots only — never recalculates.
 *
 * See docs/COMPARISON_CONTRACT.md and docs/FINANCIAL_METHODOLOGY.md §2–3.
 */

import type { ScenarioType } from "@/lib/mortgage";
import {
  CALCULATOR_VERSION,
  type ScenarioData,
} from "@/lib/scenarioContract";
import {
  getScenarioRecalculationState,
  type PersistedScenarioSummary,
} from "@/lib/scenarioPersistence";

export type ComparisonSnapshotSelection = "active" | "original";

export type ComparisonWinnerStatus = "winner" | "tie" | "indeterminate";

export type ComparisonExclusionReason =
  | "missing_financing_cost"
  | "horizon_mismatch"
  | "unsupported_scenario_type"
  | "incomplete_snapshot";

export type ComparisonExplanationCode =
  | "lowest_financing_cost"
  | "financing_cost_tie"
  | "no_comparable_scenarios"
  | "horizon_incompatible"
  | "missing_primary_metric"
  | "single_scenario";

/** Absolute USD tolerance for primary-metric ties (financing cost). */
export const COMPARISON_TIE_TOLERANCE_USD = 1.0;

export const COMPARISON_METHODOLOGY_VERSION = "5.0.0";

export interface CanonicalComparisonOptions {
  /** Default: "active". Original only when explicitly requested. */
  snapshot?: ComparisonSnapshotSelection;
}

export interface CanonicalComparisonParticipant {
  scenarioId: string;
  scenarioName: string;
  scenarioType: ScenarioType;
  snapshotKind: ComparisonSnapshotSelection;
  calculatorVersion: string;
  decisionHorizonMonths: number | null;
  financingCostOverHorizon: number | null;
  principalReductionOverHorizon: number | null;
  cashRequiredAtClosingOrStart: number | null;
  allInMonthlyHousingPayment: number | null;
  endingLoanBalance: number | null;
  modeledEquityAtHorizon: number | null;
  totalInterestOverHorizon: number | null;
  modeledMortgageInsurance: number | null;
  definedFinancingFees: number | null;
  unsupportedMetrics: string[];
  staleCalculation: boolean;
  activeCalculatorVersion: string;
  originalCalculatorVersion: string;
  currentCalculatorVersion: string;
}

export interface ComparisonWinnerResult {
  winnerScenarioId: string | null;
  status: ComparisonWinnerStatus;
  primaryMetric: "financingCostOverHorizon";
  comparisonHorizonMonths: number | null;
  delta: number | null;
  explanationCode: ComparisonExplanationCode;
  excludedScenarioIds: { scenarioId: string; reason: ComparisonExclusionReason }[];
  staleScenarioIds: string[];
  tieTolerance: number;
  methodologyVersion: string;
  calculatorVersionMetadata: {
    currentCalculatorVersion: string;
    participantVersions: { scenarioId: string; calculatorVersion: string }[];
  };
  /** Human-readable neutral summary line (not a product recommendation). */
  explanation: string;
}

function nullIfMissing(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return value;
}

function cashRequiredFromInputs(scenario: ScenarioData): number | null {
  const mode = scenario.inputs.mode;
  if (mode === "purchase") {
    const purchase = scenario.inputs.purchase;
    if (!purchase) return null;
    if (purchase.downPaymentType === "percent") {
      return (purchase.purchasePrice * purchase.downPayment) / 100;
    }
    return purchase.downPayment;
  }
  if (mode === "refinance") {
    const refi = scenario.inputs.refinance;
    if (!refi) return null;
    return refi.financeClosingCosts ? 0 : refi.closingCosts;
  }
  if (mode === "heloc") {
    return scenario.inputs.heloc?.closingCosts ?? 0;
  }
  if (mode === "assumption") {
    const assumption = scenario.inputs.assumption;
    if (!assumption) return null;
    return (
      (assumption.downPaymentCash ?? 0) + (assumption.assumptionFees ?? 0)
    );
  }
  return null;
}

function unsupportedForMode(mode: ScenarioType): string[] {
  if (mode === "heloc") {
    return [
      "monthlyPrincipalInterest",
      "monthlyPropertyTax",
      "monthlyHomeInsurance",
      "monthlyPMI",
      "monthlyHOA",
      "ltvRatio",
      "modeledEquityAtHorizon",
      "endingLoanBalance",
    ];
  }
  if (mode === "assumption") {
    return [
      "monthlyPrincipalInterest",
      "monthlyPropertyTax",
      "monthlyHomeInsurance",
      "monthlyPMI",
      "monthlyHOA",
      "endingLoanBalance",
      "modeledEquityAtHorizon",
    ];
  }
  return ["endingLoanBalance", "modeledEquityAtHorizon"];
}

function miFromSummaryOrResults(
  scenario: ScenarioData,
  summary: PersistedScenarioSummary,
  snapshotKind: ComparisonSnapshotSelection,
  stale: boolean
): number | null {
  // MI is embedded in financing cost; line-item MI is only available from
  // current UI results when active + not stale + mortgage mode.
  if (
    snapshotKind === "active" &&
    !stale &&
    (summary.type === "purchase" || summary.type === "refinance") &&
    scenario.results.mode === summary.type
  ) {
    const monthly = nullIfMissing(scenario.results.monthlyPMI);
    if (monthly == null || monthly <= 0) return 0;
    const months = nullIfMissing(summary.decisionHorizonMonths);
    if (months == null) return null;
    return monthly * months;
  }
  return null;
}

/**
 * Build one comparison participant from a scenario snapshot.
 * Does not recalculate.
 */
export function buildComparisonParticipant(
  scenario: ScenarioData,
  options: CanonicalComparisonOptions = {}
): CanonicalComparisonParticipant {
  const snapshotKind: ComparisonSnapshotSelection = options.snapshot ?? "active";
  const snapshot =
    snapshotKind === "original"
      ? scenario.originalSnapshot
      : scenario.activeSnapshot;
  const calculatorVersion =
    snapshotKind === "original"
      ? scenario.originalCalculatorVersion
      : scenario.activeCalculatorVersion;
  const summary = snapshot.summary;
  const staleState = getScenarioRecalculationState(scenario);
  const staleCalculation =
    snapshotKind === "active" && staleState.recalculationAvailable;
  const mode = scenario.inputs.mode;

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name || "Untitled",
    scenarioType: mode,
    snapshotKind,
    calculatorVersion,
    decisionHorizonMonths: nullIfMissing(summary.decisionHorizonMonths),
    financingCostOverHorizon: nullIfMissing(summary.financingCostOverHorizon),
    principalReductionOverHorizon: nullIfMissing(
      summary.principalReductionOverHorizon
    ),
    cashRequiredAtClosingOrStart: cashRequiredFromInputs(scenario),
    allInMonthlyHousingPayment: nullIfMissing(
      summary.allInMonthlyHousingPayment
    ),
    endingLoanBalance: null,
    modeledEquityAtHorizon: null,
    totalInterestOverHorizon: nullIfMissing(summary.totalInterest),
    modeledMortgageInsurance: miFromSummaryOrResults(
      scenario,
      summary,
      snapshotKind,
      staleCalculation
    ),
    definedFinancingFees:
      mode === "refinance"
        ? nullIfMissing(scenario.inputs.refinance?.closingCosts)
        : mode === "heloc"
          ? nullIfMissing(scenario.inputs.heloc?.closingCosts)
          : mode === "assumption"
            ? nullIfMissing(scenario.inputs.assumption?.assumptionFees)
            : 0,
    unsupportedMetrics: unsupportedForMode(mode),
    staleCalculation,
    activeCalculatorVersion: scenario.activeCalculatorVersion,
    originalCalculatorVersion: scenario.originalCalculatorVersion,
    currentCalculatorVersion: CALCULATOR_VERSION,
  };
}

export function buildComparisonParticipants(
  scenarios: ScenarioData[],
  options: CanonicalComparisonOptions = {}
): CanonicalComparisonParticipant[] {
  return scenarios.map((s) => buildComparisonParticipant(s, options));
}
