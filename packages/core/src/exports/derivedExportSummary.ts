/**
 * Canonical persisted `derived` JSON → export-summary mapper.
 *
 * Canonical: `@settlerate/core/export-summary`
 * Authority: docs/EXPORT_CONTRACT.md;
 * docs/adr/0005-shared-package-architecture.md (Epic 5 PR 5).
 *
 * Pure / deterministic only. No I/O, no current time, no application or Edge
 * runtime dependencies. Client and server adapters project this superset to
 * their existing public return shapes.
 */

export type ExportSnapshotSelection = "active" | "original";

export interface MapDerivedExportSummaryOptions {
  /**
   * Fallback when `rateForComparison` is absent/non-numeric.
   * Default `0` preserves historical client/server behavior when the option
   * is omitted. Server `interestRateFallback` maps to this option.
   */
  rateForComparisonFallback?: number;
}

/**
 * Shared export-summary superset (server-compatible).
 * Client adapters must project to their narrower public key set.
 */
export interface DerivedExportSummary {
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
 * Map Phase 3 dual-snapshot `derived` JSON (or legacy flat results) into the
 * shared export-summary fields. Never recalculates.
 */
export function mapDerivedExportSummary(
  derived: unknown,
  selection: ExportSnapshotSelection = "active",
  options?: MapDerivedExportSummaryOptions
): DerivedExportSummary {
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

  const rateFallback = options?.rateForComparisonFallback ?? 0;

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
