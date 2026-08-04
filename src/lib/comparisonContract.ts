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

export type DecisionObjective =
  | "home_purchase"
  | "refinance"
  | "heloc_credit"
  | "assumption_purchase";

export type ComparabilityStatus =
  | "candidate"
  | "ineligible"
  | "comparable"
  | "excluded";

export type ComparisonExclusionReason =
  | "missing_financing_cost"
  | "horizon_mismatch"
  | "unsupported_scenario_type"
  | "incomplete_snapshot"
  | "missing_funding_amount"
  | "decision_objective_mismatch"
  | "non_equivalent_funding"
  | "upfront_cash_incompatible";

export type ComparisonExplanationCode =
  | "lowest_financing_cost"
  | "financing_cost_tie"
  | "no_comparable_scenarios"
  | "horizon_incompatible"
  | "missing_primary_metric"
  | "single_scenario"
  | "non_equivalent_funding"
  | "decision_objective_mismatch"
  | "upfront_cash_incompatible"
  | "missing_funding_amount";

/** Absolute USD tolerance for primary-metric ties (financing cost). */
export const COMPARISON_TIE_TOLERANCE_USD = 1.0;

/**
 * Absolute USD tolerance for equivalent financing proceeds / principal drawn.
 * Scenarios outside this band are not ranked against each other.
 */
export const COMPARISON_FUNDING_EQUIVALENCE_TOLERANCE_USD = 1.0;

/** Absolute USD tolerance for compatible upfront cash within a comparable set. */
export const COMPARISON_UPFRONT_CASH_TOLERANCE_USD = 1.0;

export const COMPARISON_METHODOLOGY_VERSION = "5.1.0";

export interface CanonicalComparisonOptions {
  /** Default: "active". Original only when explicitly requested. */
  snapshot?: ComparisonSnapshotSelection;
  /**
   * Optional explicit comparison group override. When omitted, group defaults
   * to the scenario's decisionObjective (type-derived).
   */
  comparisonGroupId?: string;
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
  /** @deprecated Prefer upfrontCashRequired */
  cashRequiredAtClosingOrStart: number | null;
  upfrontCashRequired: number | null;
  allInMonthlyHousingPayment: number | null;
  endingLoanBalance: number | null;
  modeledEquityAtHorizon: number | null;
  totalInterestOverHorizon: number | null;
  modeledMortgageInsurance: number | null;
  definedFinancingFees: number | null;
  /** Loan principal, HELOC draw, or assumed+gap principal from the snapshot. */
  financingPrincipalOrDraw: number | null;
  /** Capital supplied by financing (same source as financingPrincipalOrDraw). */
  totalFinancingProvided: number | null;
  /** Decision funding target when knowable from inputs (e.g. purchase price). */
  fundingRequirement: number | null;
  decisionObjective: DecisionObjective;
  comparisonGroupId: string;
  comparabilityStatus: ComparabilityStatus;
  comparabilityExclusions: ComparisonExclusionReason[];
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
  fundingEquivalenceTolerance: number;
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

export function decisionObjectiveForType(mode: ScenarioType): DecisionObjective {
  switch (mode) {
    case "purchase":
      return "home_purchase";
    case "refinance":
      return "refinance";
    case "heloc":
      return "heloc_credit";
    case "assumption":
      return "assumption_purchase";
    default:
      return "home_purchase";
  }
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
    if (!scenario.inputs.heloc) return null;
    return scenario.inputs.heloc.closingCosts ?? 0;
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

function fundingRequirementFromInputs(scenario: ScenarioData): number | null {
  const mode = scenario.inputs.mode;
  if (mode === "purchase") {
    return nullIfMissing(scenario.inputs.purchase?.purchasePrice);
  }
  if (mode === "refinance") {
    const refi = scenario.inputs.refinance;
    if (!refi) return null;
    return nullIfMissing(refi.currentLoanBalance + (refi.cashOutAmount ?? 0));
  }
  if (mode === "heloc") {
    // HELOC funding target is the modeled draw / end-of-draw balance when persisted.
    return null;
  }
  if (mode === "assumption") {
    return nullIfMissing(scenario.inputs.assumption?.purchasePrice);
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
      "fundingRequirement",
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
  const decisionObjective = decisionObjectiveForType(mode);
  const financingPrincipalOrDraw = nullIfMissing(summary.principalAmount);
  const totalFinancingProvided = financingPrincipalOrDraw;
  const fundingRequirement =
    fundingRequirementFromInputs(scenario) ??
    // HELOC: use persisted draw amount as the only available funding figure.
    (mode === "heloc" ? financingPrincipalOrDraw : null);
  const upfrontCashRequired = cashRequiredFromInputs(scenario);
  const comparabilityExclusions: ComparisonExclusionReason[] = [];
  if (nullIfMissing(summary.financingCostOverHorizon) == null) {
    comparabilityExclusions.push("missing_financing_cost");
  }
  if (totalFinancingProvided == null) {
    comparabilityExclusions.push("missing_funding_amount");
  }
  if (nullIfMissing(summary.decisionHorizonMonths) == null) {
    comparabilityExclusions.push("incomplete_snapshot");
  }

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
    cashRequiredAtClosingOrStart: upfrontCashRequired,
    upfrontCashRequired,
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
    financingPrincipalOrDraw,
    totalFinancingProvided,
    fundingRequirement,
    decisionObjective,
    comparisonGroupId: options.comparisonGroupId ?? decisionObjective,
    comparabilityStatus:
      comparabilityExclusions.length > 0 ? "ineligible" : "candidate",
    comparabilityExclusions,
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
