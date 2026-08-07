/**
 * Server-side derived → export summary adapter for generate-pdf.
 *
 * Canonical mapping: `@settlerate/core/export-summary`
 * (`mapDerivedExportSummary`) via Edge `deno.json` import map.
 *
 * Plain TypeScript (no Deno runtime imports) so Vitest and Deno can both
 * exercise this exact adapter. Public signatures and option names are frozen.
 *
 * See docs/EXPORT_CONTRACT.md § Server / client parity and deployment checklist.
 */

import {
  mapDerivedExportSummary,
  type DerivedExportSummary,
} from "@settlerate/core/export-summary";

export type ExportSnapshotSelection = "active" | "original";

export type ScenarioType = "purchase" | "refinance" | "heloc" | "assumption";

export interface ScenarioInputs {
  mode: ScenarioType;
  shared: {
    loanTerm: number;
    interestRate: number;
    propertyTaxAnnual?: number;
    homeInsuranceMonthly?: number;
  };
  purchase?: {
    purchasePrice: number;
    downPayment: number;
    downPaymentType: "percent" | "amount";
  };
  refinance?: {
    currentLoanBalance: number;
    estimatedHomeValue?: number;
    closingCosts?: number;
  };
  heloc?: {
    creditLimit: number;
    currentBalance: number;
    apr: number;
    drawMonths: number;
    repayMonths: number;
  };
  assumption?: {
    purchasePrice: number;
    downPaymentCash: number;
    assumed: {
      balance: number;
      apr: number;
      remainingMonths: number;
    };
    gap: {
      method: "cash" | "second_loan" | "heloc";
    };
  };
}

export interface ScenarioResults {
  loanAmount: number;
  monthlyPrincipalInterest: number;
  monthlyTotal: number;
  monthlyPropertyTax: number;
  monthlyHomeInsurance: number;
  monthlyPMI: number;
  monthlyHOA: number;
  totalCost: number;
  totalInterest: number;
  ltvRatio: number;
  payoffMonths: number;
  financingCostOverHorizon: number;
  principalReductionOverHorizon: number;
  decisionHorizonMonths: number;
  allInMonthlyHousingPayment: number;
  rateForComparison: number;
  paymentDrawAvg?: number;
  paymentRepay?: number;
  assumedPaymentPi?: number;
  gapPayment?: number;
  gapAmount?: number;
}

export interface ScenarioData {
  id: string;
  name: string;
  inputs: ScenarioInputs;
  results: ScenarioResults;
  activeCalculatorVersion: string;
  originalCalculatorVersion: string;
  exportCalculatorVersion: string;
  snapshotSource: ExportSnapshotSelection;
}

export interface ScenarioRow {
  id: string;
  name?: string;
  inputs?: ScenarioInputs;
  derived?: Record<string, unknown> | ScenarioResults;
}

/** Parity shape shared with client `exportSummaryFromDerivedJson` (+ server escrow fields). */
export type MappedExportSummary = DerivedExportSummary;

/**
 * Map Phase 3 dual-snapshot `derived` JSON (or legacy flat results) into
 * the shared export summary fields. Delegates to the canonical core mapper.
 * generate-pdf consumes this via `buildScenarioData`.
 */
export function mapDerivedForExport(
  derived: unknown,
  selection: ExportSnapshotSelection = "active",
  options?: { interestRateFallback?: number }
): MappedExportSummary {
  return mapDerivedExportSummary(derived, selection, {
    rateForComparisonFallback: options?.interestRateFallback ?? 0,
  });
}

/**
 * Build ScenarioData for PDF layout from a Supabase scenario row.
 * Uses `mapDerivedForExport` — do not reimplement mapping here.
 */
export function buildScenarioData(
  s: ScenarioRow,
  snapshotSource: ExportSnapshotSelection = "active"
): ScenarioData {
  const inputs = (s.inputs || {}) as ScenarioInputs;
  const mode = inputs.mode || "purchase";
  const mapped = mapDerivedForExport(s.derived, snapshotSource, {
    interestRateFallback: inputs.shared?.interestRate ?? 0,
  });

  const paymentRepay =
    mapped.paymentRepay != null
      ? mapped.paymentRepay
      : mode === "heloc"
        ? mapped.monthlyPaymentPrimary
        : undefined;

  return {
    id: s.id,
    name: s.name || "Untitled",
    inputs: {
      mode,
      shared: inputs.shared || { loanTerm: 30, interestRate: 0 },
      purchase: inputs.purchase,
      refinance: inputs.refinance,
      heloc: inputs.heloc,
      assumption: inputs.assumption,
    },
    results: {
      loanAmount: mapped.principalAmount,
      monthlyPrincipalInterest: mapped.monthlyPaymentPrimary,
      monthlyTotal: mapped.monthlyTotal,
      monthlyPropertyTax: mapped.monthlyPropertyTax ?? 0,
      monthlyHomeInsurance: mapped.monthlyHomeInsurance ?? 0,
      monthlyPMI: mapped.monthlyPMI ?? 0,
      monthlyHOA: mapped.monthlyHOA ?? 0,
      totalCost: mapped.legacyTotalCost,
      totalInterest: mapped.totalInterest,
      ltvRatio: mapped.ltvRatio ?? 0,
      payoffMonths: mapped.payoffMonths,
      financingCostOverHorizon: mapped.financingCostOverHorizon,
      principalReductionOverHorizon: mapped.principalReductionOverHorizon,
      decisionHorizonMonths: mapped.decisionHorizonMonths,
      allInMonthlyHousingPayment: mapped.allInMonthlyHousingPayment,
      rateForComparison: mapped.rateForComparison,
      paymentDrawAvg: mapped.paymentDrawAvg ?? undefined,
      paymentRepay,
      assumedPaymentPi: mapped.assumedPaymentPi ?? undefined,
      gapPayment: mapped.gapPayment ?? undefined,
      gapAmount: mapped.gapAmount ?? undefined,
    },
    activeCalculatorVersion: mapped.activeCalculatorVersion,
    originalCalculatorVersion: mapped.originalCalculatorVersion,
    exportCalculatorVersion: mapped.calculatorVersion,
    snapshotSource,
  };
}
