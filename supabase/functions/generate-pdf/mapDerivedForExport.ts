/**
 * Server-side derived → export summary mapper for generate-pdf.
 *
 * Plain TypeScript (no Deno runtime imports) so Vitest and Deno can both
 * exercise this exact implementation. Keep field semantics aligned with
 * `exportSummaryFromDerivedJson` in `src/lib/exports/exportContract.ts`.
 *
 * See docs/EXPORT_CONTRACT.md § Server / client parity and deployment checklist.
 */

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

/** Parity shape shared with client `exportSummaryFromDerivedJson`. */
export interface MappedExportSummary {
  financingCostOverHorizon: number;
  principalReductionOverHorizon: number;
  allInMonthlyHousingPayment: number;
  decisionHorizonMonths: number;
  totalInterest: number;
  legacyTotalCost: number;
  monthlyPaymentPrimary: number;
  monthlyTotal: number;
  principalAmount: number;
  ltvRatio: number | null;
  rateForComparison: number;
  payoffMonths: number;
  calculatorVersion: string;
  activeCalculatorVersion: string;
  originalCalculatorVersion: string;
  isLegacyFlat: boolean;
  snapshotSource: ExportSnapshotSelection;
  /** Unsupported / optional fields — null when absent (never fabricated). */
  paymentDrawAvg: number | null;
  paymentRepay: number | null;
  assumedPaymentPi: number | null;
  gapPayment: number | null;
  gapAmount: number | null;
  monthlyPropertyTax: number | null;
  monthlyHomeInsurance: number | null;
  monthlyPMI: number | null;
  monthlyHOA: number | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && !Number.isNaN(value) ? value : fallback;
}

function optionalNumber(value: unknown): number | null {
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

/**
 * Map Phase 3 dual-snapshot `derived` JSON (or legacy flat results) into
 * the shared export summary fields. This is the implementation used by
 * generate-pdf via `buildScenarioData`.
 */
export function mapDerivedForExport(
  derived: unknown,
  selection: ExportSnapshotSelection = "active",
  options?: { interestRateFallback?: number }
): MappedExportSummary {
  const root = asRecord(derived) ?? {};
  const activeSnap = asRecord(root.activeSnapshot);
  const originalSnap = asRecord(root.originalSnapshot);
  const selectedSnap =
    selection === "original"
      ? (originalSnap ?? activeSnap)
      : (activeSnap ?? originalSnap);
  const summary = asRecord(selectedSnap?.summary);

  const isLegacyFlat =
    !activeSnap &&
    !originalSnap &&
    (typeof root.loanAmount === "number" ||
      typeof root.monthlyPrincipalInterest === "number" ||
      typeof root.totalCost === "number" ||
      typeof root.financingCostOverHorizon === "number");

  const src = isLegacyFlat ? root : (summary ?? {});

  const monthlyPaymentPrimary = readNumber(
    src.monthlyPaymentPrimary ??
      src.monthlyPrincipalInterest ??
      src.paymentRepay ??
      src.paymentTotal
  );
  const monthlyTotal = readNumber(src.monthlyTotal, monthlyPaymentPrimary);
  const totalInterest = readNumber(src.totalInterest ?? src.interestTotal);
  const legacyTotalCost = readNumber(src.totalCost ?? src.costTotal, totalInterest);
  const decisionHorizonMonths = readNumber(
    src.decisionHorizonMonths ?? src.payoffMonths,
    360
  );

  const activeCalculatorVersion =
    typeof root.activeCalculatorVersion === "string"
      ? root.activeCalculatorVersion
      : typeof root.calculatorVersion === "string"
        ? root.calculatorVersion
        : typeof activeSnap?.calculatorVersion === "string"
          ? (activeSnap.calculatorVersion as string)
          : "unknown";

  const originalCalculatorVersion =
    typeof root.originalCalculatorVersion === "string"
      ? root.originalCalculatorVersion
      : typeof originalSnap?.calculatorVersion === "string"
        ? (originalSnap.calculatorVersion as string)
        : activeCalculatorVersion;

  const calculatorVersion =
    typeof selectedSnap?.calculatorVersion === "string"
      ? (selectedSnap.calculatorVersion as string)
      : selection === "original"
        ? originalCalculatorVersion
        : activeCalculatorVersion;

  const rateFallback = options?.interestRateFallback ?? 0;

  return {
    financingCostOverHorizon: readNumber(
      src.financingCostOverHorizon,
      totalInterest
    ),
    principalReductionOverHorizon: readNumber(src.principalReductionOverHorizon),
    allInMonthlyHousingPayment: readNumber(
      src.allInMonthlyHousingPayment,
      monthlyTotal
    ),
    decisionHorizonMonths,
    totalInterest,
    legacyTotalCost,
    monthlyPaymentPrimary,
    monthlyTotal,
    principalAmount: readNumber(
      src.principalAmount ?? src.loanAmount ?? src.balanceEndDraw
    ),
    ltvRatio:
      src.ltvRatio == null || typeof src.ltvRatio !== "number"
        ? null
        : src.ltvRatio,
    rateForComparison: readNumber(src.rateForComparison, rateFallback),
    payoffMonths: readNumber(src.payoffMonths, decisionHorizonMonths),
    calculatorVersion,
    activeCalculatorVersion,
    originalCalculatorVersion,
    isLegacyFlat,
    snapshotSource: selection,
    paymentDrawAvg: optionalNumber(src.paymentDrawAvg),
    paymentRepay: optionalNumber(src.paymentRepay),
    assumedPaymentPi: optionalNumber(src.assumedPaymentPi),
    gapPayment: optionalNumber(src.gapPayment),
    gapAmount: optionalNumber(src.gapAmount),
    monthlyPropertyTax: optionalNumber(src.monthlyPropertyTax),
    monthlyHomeInsurance: optionalNumber(src.monthlyHomeInsurance),
    monthlyPMI: optionalNumber(src.monthlyPMI),
    monthlyHOA: optionalNumber(src.monthlyHOA),
  };
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
