/**
 * Canonical Export Contract (Phase 4)
 *
 * Single semantic source for printable HTML, PDF edge functions, and HTML downloads.
 * Snapshot selection defaults to activeSnapshot; original requires an explicit option.
 * Never recalculates stale scenarios during export.
 *
 * See docs/EXPORT_CONTRACT.md.
 */

import { mapDerivedExportSummary } from "@settlerate/core/export-summary";
import type { MortgageInputs, ScenarioType } from "@/lib/mortgage";
import {
  CALCULATOR_VERSION,
  type ScenarioData,
} from "@/lib/scenarioContract";
import {
  getScenarioRecalculationState,
  type PersistedScenarioSummary,
  type ScenarioCalculationSnapshot,
} from "@/lib/scenarioPersistence";

export type ExportSnapshotSelection = "active" | "original";

export interface CanonicalExportOptions {
  /** Default: "active". Original only when explicitly requested. */
  snapshot?: ExportSnapshotSelection;
}

export interface CanonicalExportMetadata {
  generatedAt: string;
  snapshotSource: ExportSnapshotSelection;
  scenarioType: ScenarioType;
  calculatorVersion: string;
  activeCalculatorVersion: string;
  originalCalculatorVersion: string;
  schemaVersion: number;
  recalculationAvailable: boolean;
  currentCalculatorVersion: string;
}

/**
 * Typed financial fields for export. Unsupported values are null (never fabricated).
 */
export interface CanonicalExportMetrics {
  decisionHorizonMonths: number | null;
  financingCostOverHorizon: number | null;
  principalReductionOverHorizon: number | null;
  allInMonthlyHousingPayment: number | null;
  totalInterest: number | null;
  /** Legacy totalCost (principal + interest style). Exposed for compatibility; not primary. */
  legacyTotalCost: number | null;
  monthlyPaymentPrimary: number | null;
  monthlyTotal: number | null;
  principalAmount: number | null;
  ltvRatio: number | null;
  rateForComparison: number | null;
  payoffMonths: number | null;

  // Purchase / refinance detail (null when not applicable or unavailable)
  monthlyPrincipalInterest: number | null;
  monthlyPropertyTax: number | null;
  monthlyHomeInsurance: number | null;
  monthlyPMI: number | null;
  monthlyHOA: number | null;
  closingCosts: number | null;

  // HELOC-specific (null unless mode === heloc)
  paymentDrawAvg: number | null;
  paymentRepay: number | null;
  balanceEndDraw: number | null;

  // Assumption-specific (null unless mode === assumption)
  assumedPaymentPi: number | null;
  gapPayment: number | null;
  gapAmount: number | null;
}

export interface CanonicalScenarioExport {
  id: string;
  name: string;
  metadata: CanonicalExportMetadata;
  metrics: CanonicalExportMetrics;
  inputs: MortgageInputs;
}

function nullIfMissing(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return value;
}

function selectSnapshot(
  scenario: ScenarioData,
  selection: ExportSnapshotSelection
): {
  snapshot: ScenarioCalculationSnapshot;
  calculatorVersion: string;
} {
  if (selection === "original") {
    return {
      snapshot: scenario.originalSnapshot,
      calculatorVersion: scenario.originalCalculatorVersion,
    };
  }
  return {
    snapshot: scenario.activeSnapshot,
    calculatorVersion: scenario.activeCalculatorVersion,
  };
}

function metricsFromSummary(
  summary: PersistedScenarioSummary
): Pick<
  CanonicalExportMetrics,
  | "decisionHorizonMonths"
  | "financingCostOverHorizon"
  | "principalReductionOverHorizon"
  | "allInMonthlyHousingPayment"
  | "totalInterest"
  | "legacyTotalCost"
  | "monthlyPaymentPrimary"
  | "monthlyTotal"
  | "principalAmount"
  | "ltvRatio"
  | "rateForComparison"
  | "payoffMonths"
> {
  return {
    decisionHorizonMonths: nullIfMissing(summary.decisionHorizonMonths),
    financingCostOverHorizon: nullIfMissing(summary.financingCostOverHorizon),
    principalReductionOverHorizon: nullIfMissing(
      summary.principalReductionOverHorizon
    ),
    allInMonthlyHousingPayment: nullIfMissing(
      summary.allInMonthlyHousingPayment
    ),
    totalInterest: nullIfMissing(summary.totalInterest),
    legacyTotalCost: nullIfMissing(summary.totalCost),
    monthlyPaymentPrimary: nullIfMissing(summary.monthlyPaymentPrimary),
    monthlyTotal: nullIfMissing(summary.monthlyTotal),
    principalAmount: nullIfMissing(summary.principalAmount),
    ltvRatio: nullIfMissing(summary.ltvRatio),
    rateForComparison: nullIfMissing(summary.rateForComparison),
    payoffMonths: nullIfMissing(summary.payoffMonths),
  };
}

/**
 * Build the canonical export payload for a scenario.
 * Does not recalculate; reads persisted snapshots only.
 */
export function buildCanonicalScenarioExport(
  scenario: ScenarioData,
  options: CanonicalExportOptions = {}
): CanonicalScenarioExport {
  const snapshotSource: ExportSnapshotSelection = options.snapshot ?? "active";
  const { snapshot, calculatorVersion } = selectSnapshot(
    scenario,
    snapshotSource
  );
  const summary = snapshot.summary;
  const mode = scenario.inputs.mode;
  const staleState = getScenarioRecalculationState(scenario);

  const base = metricsFromSummary(summary);

  const metrics: CanonicalExportMetrics = {
    ...base,
    monthlyPrincipalInterest: null,
    monthlyPropertyTax: null,
    monthlyHomeInsurance: null,
    monthlyPMI: null,
    monthlyHOA: null,
    closingCosts: null,
    paymentDrawAvg: null,
    paymentRepay: null,
    balanceEndDraw: null,
    assumedPaymentPi: null,
    gapPayment: null,
    gapAmount: null,
  };

  if (mode === "purchase" || mode === "refinance") {
    metrics.monthlyPrincipalInterest = base.monthlyPaymentPrimary;
    // Escrow detail only when exporting the active snapshot and UI results
    // were regenerated under the same calculator generation (not stale).
    if (
      snapshotSource === "active" &&
      scenario.activeCalculatorVersion === CALCULATOR_VERSION &&
      scenario.results.mode === mode
    ) {
      metrics.monthlyPropertyTax = nullIfMissing(
        scenario.results.monthlyPropertyTax
      );
      metrics.monthlyHomeInsurance = nullIfMissing(
        scenario.results.monthlyHomeInsurance
      );
      metrics.monthlyPMI = nullIfMissing(scenario.results.monthlyPMI);
      metrics.monthlyHOA = nullIfMissing(scenario.results.monthlyHOA);
      metrics.monthlyPrincipalInterest = nullIfMissing(
        scenario.results.monthlyPrincipalInterest
      );
      metrics.allInMonthlyHousingPayment = nullIfMissing(
        scenario.results.allInMonthlyHousingPayment
      );
    }
    if (mode === "refinance") {
      metrics.closingCosts = nullIfMissing(
        scenario.inputs.refinance.closingCosts
      );
    }
  }

  if (mode === "heloc") {
    // Do not emit mortgage P&I / escrow as if they were valid HELOC fields.
    metrics.monthlyPrincipalInterest = null;
    metrics.monthlyPropertyTax = null;
    metrics.monthlyHomeInsurance = null;
    metrics.monthlyPMI = null;
    metrics.monthlyHOA = null;
    metrics.ltvRatio = null;
    metrics.paymentRepay = base.monthlyPaymentPrimary;
    metrics.balanceEndDraw = base.principalAmount;
    // Draw-period average is not in the persisted summary; omit rather than fabricate.
    metrics.paymentDrawAvg = null;
  }

  if (mode === "assumption") {
    metrics.monthlyPrincipalInterest = null;
    metrics.monthlyPropertyTax = null;
    metrics.monthlyHomeInsurance = null;
    metrics.monthlyPMI = null;
    metrics.monthlyHOA = null;
    metrics.assumedPaymentPi = null; // not in summary; omit unless we add later
    metrics.gapPayment = null;
    metrics.gapAmount = null;
  }

  return {
    id: scenario.id,
    name: scenario.name,
    metadata: {
      generatedAt: new Date().toISOString(),
      snapshotSource,
      scenarioType: mode,
      calculatorVersion,
      activeCalculatorVersion: scenario.activeCalculatorVersion,
      originalCalculatorVersion: scenario.originalCalculatorVersion,
      schemaVersion: scenario.schemaVersion,
      recalculationAvailable: staleState.recalculationAvailable,
      currentCalculatorVersion: CALCULATOR_VERSION,
    },
    metrics,
    inputs: scenario.inputs,
  };
}

/**
 * Compatibility mapper for Supabase `derived` JSON → client export summary.
 *
 * Canonical implementation: `@settlerate/core/export-summary`
 * (`mapDerivedExportSummary`). This surface projects the shared superset to
 * the historical client return keys only (no monthlyTotal / escrow fields).
 *
 * Server counterpart: `mapDerivedForExport` in
 * `supabase/functions/generate-pdf/mapDerivedForExport.ts` (used by generate-pdf).
 * Parity fixtures: `src/lib/__tests__/fixtures/export-parity/` + `exportParity.test.ts`.
 */
export function exportSummaryFromDerivedJson(
  derived: unknown,
  selection: ExportSnapshotSelection = "active"
): {
  financingCostOverHorizon: number;
  principalReductionOverHorizon: number;
  allInMonthlyHousingPayment: number;
  decisionHorizonMonths: number;
  totalInterest: number;
  legacyTotalCost: number;
  monthlyPaymentPrimary: number;
  principalAmount: number;
  ltvRatio: number | null;
  rateForComparison: number;
  payoffMonths: number;
  calculatorVersion: string;
  activeCalculatorVersion: string;
  originalCalculatorVersion: string;
  isLegacyFlat: boolean;
  snapshotSource: ExportSnapshotSelection;
  paymentDrawAvg: number | null;
  paymentRepay: number | null;
  assumedPaymentPi: number | null;
  gapPayment: number | null;
  gapAmount: number | null;
} {
  const mapped = mapDerivedExportSummary(derived, selection);
  // Explicit projection — do not spread the core superset (server-only keys).
  return {
    financingCostOverHorizon: mapped.financingCostOverHorizon,
    principalReductionOverHorizon: mapped.principalReductionOverHorizon,
    allInMonthlyHousingPayment: mapped.allInMonthlyHousingPayment,
    decisionHorizonMonths: mapped.decisionHorizonMonths,
    totalInterest: mapped.totalInterest,
    legacyTotalCost: mapped.legacyTotalCost,
    monthlyPaymentPrimary: mapped.monthlyPaymentPrimary,
    principalAmount: mapped.principalAmount,
    ltvRatio: mapped.ltvRatio,
    rateForComparison: mapped.rateForComparison,
    payoffMonths: mapped.payoffMonths,
    calculatorVersion: mapped.calculatorVersion,
    activeCalculatorVersion: mapped.activeCalculatorVersion,
    originalCalculatorVersion: mapped.originalCalculatorVersion,
    isLegacyFlat: mapped.isLegacyFlat,
    snapshotSource: mapped.snapshotSource,
    paymentDrawAvg: mapped.paymentDrawAvg,
    paymentRepay: mapped.paymentRepay,
    assumedPaymentPi: mapped.assumedPaymentPi,
    gapPayment: mapped.gapPayment,
    gapAmount: mapped.gapAmount,
  };
}

/**
 * Format helpers shared by layout adapters (null → omitted display).
 */
export function formatExportCurrency(
  value: number | null,
  fallback = "—"
): string {
  if (value == null) return fallback;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatExportPercent(
  value: number | null,
  fallback = "—"
): string {
  if (value == null) return fallback;
  const decimals = value % 0.01 !== 0 ? 3 : 2;
  return `${value.toFixed(decimals)}%`;
}

export function formatExportMonths(
  value: number | null,
  fallback = "—"
): string {
  if (value == null) return fallback;
  return `${value} months`;
}
