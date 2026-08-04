/**
 * Scenario persistence contract helpers (Phase 3 / BM-V01).
 *
 * Terminology matches docs/FINANCIAL_METHODOLOGY.md §12:
 * - originalSnapshot / activeSnapshot (summary only; no amortization)
 * - originalCalculatorVersion / activeCalculatorVersion
 * - calculatedAt is snapshot metadata, not part of deterministic math
 */

import {
  MortgageInputs,
  MortgageResults,
  ScenarioType,
} from "./mortgage";
import {
  HelocResults,
} from "./heloc";
import {
  AssumptionResults,
} from "./assumption";
import {
  calculateScenario,
  isMortgageResults,
  UnifiedResults,
} from "./scenarioCalculator";
import { CALCULATOR_VERSION, LATEST_SCHEMA_VERSION } from "./calculatorVersion";
import type { ScenarioAssumptions, ScenarioData } from "./scenarioContract";

// =============================================================================
// SNAPSHOT TYPES
// =============================================================================

/** Persistable unified summary — no amortization schedule. */
export interface PersistedScenarioSummary {
  type: ScenarioType;
  monthlyPaymentPrimary: number;
  monthlyTotal: number;
  totalInterest: number;
  totalCost: number;
  financingCostOverHorizon: number;
  principalReductionOverHorizon: number;
  allInMonthlyHousingPayment: number;
  decisionHorizonMonths: number;
  rateForComparison: number;
  ltvRatio: number | null;
  payoffMonths: number;
  principalAmount: number;
}

/**
 * One calculation snapshot. Summary is the durable audit record;
 * calculatedAt / calculatorVersion are metadata.
 */
export interface ScenarioCalculationSnapshot {
  calculatorVersion: string;
  calculatedAt: string; // ISO-8601 metadata
  summary: PersistedScenarioSummary;
}

export interface DualSnapshotBundle {
  originalSnapshot: ScenarioCalculationSnapshot;
  activeSnapshot: ScenarioCalculationSnapshot;
  originalCalculatorVersion: string;
  activeCalculatorVersion: string;
  /** UI/compat projection from the active calculation (may include regenerated schedule). */
  results: MortgageResults;
  /** Backward-compat alias of activeCalculatorVersion. */
  calculatorVersion: string;
}

export interface DerivedPersistencePayload {
  assumptions: ScenarioAssumptions;
  sourceScenarioId: string | null;
  calculatorVersion: string;
  originalCalculatorVersion: string;
  activeCalculatorVersion: string;
  originalSnapshot: ScenarioCalculationSnapshot;
  activeSnapshot: ScenarioCalculationSnapshot;
}

// =============================================================================
// SUMMARY / SNAPSHOT BUILDERS
// =============================================================================

export function summaryFromUnified(unified: UnifiedResults): PersistedScenarioSummary {
  return {
    type: unified.type,
    monthlyPaymentPrimary: unified.monthlyPaymentPrimary,
    monthlyTotal: unified.monthlyTotal,
    totalInterest: unified.totalInterest,
    totalCost: unified.totalCost,
    financingCostOverHorizon: unified.financingCostOverHorizon,
    principalReductionOverHorizon: unified.principalReductionOverHorizon,
    allInMonthlyHousingPayment: unified.allInMonthlyHousingPayment,
    decisionHorizonMonths: unified.decisionHorizonMonths,
    rateForComparison: unified.rateForComparison,
    ltvRatio: unified.ltvRatio,
    payoffMonths: unified.payoffMonths,
    principalAmount: unified.principalAmount,
  };
}

export function buildSnapshot(
  unified: UnifiedResults,
  calculatorVersion: string = CALCULATOR_VERSION,
  calculatedAt: Date = new Date()
): ScenarioCalculationSnapshot {
  return {
    calculatorVersion,
    calculatedAt: calculatedAt.toISOString(),
    summary: summaryFromUnified(unified),
  };
}

/**
 * Project active calculation into MortgageResults for list/editor surfaces that
 * still read scenario.results.*. Purchase/refinance keep the full typed result
 * (including amortization). HELOC/assumption get a bounded compat projection —
 * never via calculateMortgage.
 */
export function projectUiResults(unified: UnifiedResults): MortgageResults {
  if (isMortgageResults(unified.original)) {
    return unified.original;
  }

  const mode: ScenarioType = unified.type;
  return {
    loanAmount: unified.principalAmount,
    monthlyPrincipalInterest: unified.monthlyPaymentPrimary,
    monthlyPropertyTax: 0,
    monthlyHomeInsurance: 0,
    monthlyPMI: 0,
    monthlyHOA: 0,
    monthlyTotal: unified.monthlyTotal,
    totalInterest: unified.totalInterest,
    totalCost: unified.totalCost,
    financingCostOverHorizon: unified.financingCostOverHorizon,
    principalReductionOverHorizon: unified.principalReductionOverHorizon,
    allInMonthlyHousingPayment: unified.allInMonthlyHousingPayment,
    decisionHorizonMonths: unified.decisionHorizonMonths,
    payoffDate: new Date(),
    payoffMonths: unified.payoffMonths,
    amortizationSchedule: [],
    ltvRatio: unified.ltvRatio ?? 0,
    requiresPMI: false,
    usedEstimates: false,
    mode,
  };
}

export function computeScenarioBundle(
  inputs: MortgageInputs,
  assumptions: ScenarioAssumptions,
  options?: {
    calculatorVersion?: string;
    calculatedAt?: Date;
    /** When set, preserves original snapshot (input update / explicit recalc). */
    preserveOriginal?: Pick<
      ScenarioData,
      "originalSnapshot" | "originalCalculatorVersion"
    >;
  }
): DualSnapshotBundle {
  const version = options?.calculatorVersion ?? CALCULATOR_VERSION;
  const at = options?.calculatedAt ?? new Date();
  const unified = calculateScenario(inputs, {
    pmiRemovalThreshold: assumptions.pmiRemovalThreshold,
  });
  const activeSnapshot = buildSnapshot(unified, version, at);
  const originalSnapshot = options?.preserveOriginal?.originalSnapshot
    ?? activeSnapshot;
  const originalCalculatorVersion =
    options?.preserveOriginal?.originalCalculatorVersion
    ?? version;

  return {
    originalSnapshot,
    activeSnapshot,
    originalCalculatorVersion,
    activeCalculatorVersion: version,
    results: projectUiResults(unified),
    calculatorVersion: version,
  };
}

// =============================================================================
// LEGACY HYDRATION
// =============================================================================

function isPersistedSummary(value: unknown): value is PersistedScenarioSummary {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.type === "string" &&
    typeof s.monthlyPaymentPrimary === "number" &&
    typeof s.monthlyTotal === "number" &&
    typeof s.totalInterest === "number" &&
    typeof s.totalCost === "number" &&
    typeof s.financingCostOverHorizon === "number" &&
    typeof s.principalReductionOverHorizon === "number" &&
    typeof s.principalAmount === "number"
  );
}

function isCalculationSnapshot(value: unknown): value is ScenarioCalculationSnapshot {
  if (!value || typeof value !== "object") return false;
  const snap = value as Record<string, unknown>;
  return (
    typeof snap.calculatorVersion === "string" &&
    typeof snap.calculatedAt === "string" &&
    isPersistedSummary(snap.summary)
  );
}

/**
 * Legacy single-result → both snapshots (deterministic).
 * Prefer stored numeric fields; fill missing financing metrics from totalInterest/totalCost.
 */
export function snapshotsFromLegacyResults(
  results: unknown,
  mode: ScenarioType,
  calculatorVersion: string,
  calculatedAt: Date = new Date()
): Pick<
  DualSnapshotBundle,
  "originalSnapshot" | "activeSnapshot" | "originalCalculatorVersion" | "activeCalculatorVersion"
> {
  const r = (results && typeof results === "object"
    ? results
    : {}) as Partial<MortgageResults> &
    Partial<HelocResults> &
    Partial<AssumptionResults> &
    Record<string, unknown>;

  const monthlyPaymentPrimary =
    typeof r.monthlyPrincipalInterest === "number"
      ? r.monthlyPrincipalInterest
      : typeof r.monthlyPaymentPrimary === "number"
        ? r.monthlyPaymentPrimary
        : typeof r.paymentRepay === "number"
          ? r.paymentRepay
          : typeof r.paymentTotal === "number"
            ? r.paymentTotal
            : 0;

  const monthlyTotal =
    typeof r.monthlyTotal === "number" ? r.monthlyTotal : monthlyPaymentPrimary;

  const totalInterest =
    typeof r.totalInterest === "number"
      ? r.totalInterest
      : typeof r.interestTotal === "number"
        ? r.interestTotal
        : 0;

  const totalCost =
    typeof r.totalCost === "number"
      ? r.totalCost
      : typeof r.costTotal === "number"
        ? r.costTotal
        : totalInterest;

  const principalAmount =
    typeof r.loanAmount === "number"
      ? r.loanAmount
      : typeof r.principalAmount === "number"
        ? r.principalAmount
        : typeof r.balanceEndDraw === "number"
          ? r.balanceEndDraw
          : 0;

  const payoffMonths =
    typeof r.payoffMonths === "number"
      ? r.payoffMonths
      : typeof r.timelineMonthsTotal === "number"
        ? r.timelineMonthsTotal
        : typeof r.decisionHorizonMonths === "number"
          ? r.decisionHorizonMonths
          : 0;

  const financingCostOverHorizon =
    typeof r.financingCostOverHorizon === "number"
      ? r.financingCostOverHorizon
      : totalInterest;

  const principalReductionOverHorizon =
    typeof r.principalReductionOverHorizon === "number"
      ? r.principalReductionOverHorizon
      : principalAmount;

  const summary: PersistedScenarioSummary = {
    type: mode,
    monthlyPaymentPrimary,
    monthlyTotal,
    totalInterest,
    totalCost,
    financingCostOverHorizon,
    principalReductionOverHorizon,
    allInMonthlyHousingPayment:
      typeof r.allInMonthlyHousingPayment === "number"
        ? r.allInMonthlyHousingPayment
        : monthlyTotal,
    decisionHorizonMonths:
      typeof r.decisionHorizonMonths === "number"
        ? r.decisionHorizonMonths
        : payoffMonths,
    rateForComparison: 0,
    ltvRatio: typeof r.ltvRatio === "number" ? r.ltvRatio : null,
    payoffMonths,
    principalAmount,
  };

  const snapshot: ScenarioCalculationSnapshot = {
    calculatorVersion,
    calculatedAt: calculatedAt.toISOString(),
    summary,
  };

  return {
    originalSnapshot: snapshot,
    activeSnapshot: structuredClone(snapshot),
    originalCalculatorVersion: calculatorVersion,
    activeCalculatorVersion: calculatorVersion,
  };
}

export interface HydrateScenarioOptions {
  id: string;
  ownerId: string | null;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  sourceScenarioId: string | null;
  inputs: MortgageInputs;
  assumptions: ScenarioAssumptions;
  schemaVersion?: number;
  /** Legacy top-level calculator version. */
  calculatorVersion?: string;
  /** Legacy single results blob. */
  results?: unknown;
  originalSnapshot?: unknown;
  activeSnapshot?: unknown;
  originalCalculatorVersion?: string;
  activeCalculatorVersion?: string;
  /**
   * When true (default), if activeCalculatorVersion !== CALCULATOR_VERSION,
   * recompute activeSnapshot only. Never mutates originalSnapshot.
   */
  lazyRecomputeActive?: boolean;
  now?: Date;
}

/**
 * Hydrate a ScenarioData from persisted fields.
 * Does not silently overwrite originalSnapshot.
 */
export function hydrateScenarioData(options: HydrateScenarioOptions): ScenarioData {
  const now = options.now ?? new Date();
  const mode = (options.inputs.mode ?? "purchase") as ScenarioType;
  const legacyVersion =
    options.activeCalculatorVersion ??
    options.calculatorVersion ??
    options.originalCalculatorVersion ??
    CALCULATOR_VERSION;

  let originalSnapshot: ScenarioCalculationSnapshot;
  let activeSnapshot: ScenarioCalculationSnapshot;
  let originalCalculatorVersion: string;
  let activeCalculatorVersion: string;

  if (
    isCalculationSnapshot(options.originalSnapshot) &&
    isCalculationSnapshot(options.activeSnapshot)
  ) {
    originalSnapshot = options.originalSnapshot;
    activeSnapshot = options.activeSnapshot;
    originalCalculatorVersion =
      options.originalCalculatorVersion ?? originalSnapshot.calculatorVersion;
    activeCalculatorVersion =
      options.activeCalculatorVersion ?? activeSnapshot.calculatorVersion;
  } else if (isCalculationSnapshot(options.originalSnapshot)) {
    originalSnapshot = structuredClone(options.originalSnapshot);
    activeSnapshot = structuredClone(options.originalSnapshot);
    originalCalculatorVersion =
      options.originalCalculatorVersion ?? options.originalSnapshot.calculatorVersion;
    activeCalculatorVersion =
      options.activeCalculatorVersion ?? options.originalSnapshot.calculatorVersion;
  } else if (isCalculationSnapshot(options.activeSnapshot)) {
    originalSnapshot = structuredClone(options.activeSnapshot);
    activeSnapshot = structuredClone(options.activeSnapshot);
    originalCalculatorVersion =
      options.originalCalculatorVersion ?? options.activeSnapshot.calculatorVersion;
    activeCalculatorVersion =
      options.activeCalculatorVersion ?? options.activeSnapshot.calculatorVersion;
  } else if (options.results && typeof options.results === "object") {
    const legacy = snapshotsFromLegacyResults(
      options.results,
      mode,
      legacyVersion,
      options.createdAt ?? now
    );
    originalSnapshot = legacy.originalSnapshot;
    activeSnapshot = legacy.activeSnapshot;
    originalCalculatorVersion = legacy.originalCalculatorVersion;
    activeCalculatorVersion = legacy.activeCalculatorVersion;
  } else {
    // Recovery path only — no durable result available.
    const bundle = computeScenarioBundle(options.inputs, options.assumptions, {
      calculatorVersion: legacyVersion,
      calculatedAt: now,
    });
    originalSnapshot = bundle.originalSnapshot;
    activeSnapshot = bundle.activeSnapshot;
    originalCalculatorVersion = bundle.originalCalculatorVersion;
    activeCalculatorVersion = bundle.activeCalculatorVersion;
  }

  let results: MortgageResults;
  const shouldLazyRecompute =
    (options.lazyRecomputeActive ?? true) &&
    activeCalculatorVersion !== CALCULATOR_VERSION;

  if (shouldLazyRecompute) {
    const recomputed = computeScenarioBundle(options.inputs, options.assumptions, {
      calculatorVersion: CALCULATOR_VERSION,
      calculatedAt: now,
      preserveOriginal: { originalSnapshot, originalCalculatorVersion },
    });
    activeSnapshot = recomputed.activeSnapshot;
    activeCalculatorVersion = recomputed.activeCalculatorVersion;
    results = recomputed.results;
  } else if (activeCalculatorVersion === CALCULATOR_VERSION) {
    // Regenerate full typed results (incl. amortization for mortgage modes).
    const live = calculateScenario(options.inputs, {
      pmiRemovalThreshold: options.assumptions.pmiRemovalThreshold,
    });
    results = projectUiResults(live);
  } else {
    // Stale active kept as-is (lazy recompute disabled); project from summary.
    results = projectUiResults({
      ...activeSnapshot.summary,
      original: {
        loanAmount: activeSnapshot.summary.principalAmount,
        monthlyPrincipalInterest: activeSnapshot.summary.monthlyPaymentPrimary,
        monthlyPropertyTax: 0,
        monthlyHomeInsurance: 0,
        monthlyPMI: 0,
        monthlyHOA: 0,
        monthlyTotal: activeSnapshot.summary.monthlyTotal,
        totalInterest: activeSnapshot.summary.totalInterest,
        totalCost: activeSnapshot.summary.totalCost,
        financingCostOverHorizon: activeSnapshot.summary.financingCostOverHorizon,
        principalReductionOverHorizon:
          activeSnapshot.summary.principalReductionOverHorizon,
        allInMonthlyHousingPayment:
          activeSnapshot.summary.allInMonthlyHousingPayment,
        decisionHorizonMonths: activeSnapshot.summary.decisionHorizonMonths,
        payoffDate: new Date(activeSnapshot.calculatedAt),
        payoffMonths: activeSnapshot.summary.payoffMonths,
        amortizationSchedule: [],
        ltvRatio: activeSnapshot.summary.ltvRatio ?? 0,
        requiresPMI: false,
        usedEstimates: false,
        mode: activeSnapshot.summary.type,
      },
    });
  }

  return {
    id: options.id,
    ownerId: options.ownerId,
    name: options.name,
    createdAt: options.createdAt,
    updatedAt: options.updatedAt,
    sourceScenarioId: options.sourceScenarioId,
    inputs: options.inputs,
    assumptions: options.assumptions,
    results,
    calculatorVersion: activeCalculatorVersion,
    schemaVersion: options.schemaVersion ?? LATEST_SCHEMA_VERSION,
    originalSnapshot,
    activeSnapshot,
    originalCalculatorVersion,
    activeCalculatorVersion,
  };
}

/**
 * Explicit recalculation: updates activeSnapshot only.
 */
export function recalculateActiveSnapshot(
  scenario: ScenarioData,
  calculatedAt: Date = new Date()
): ScenarioData {
  const bundle = computeScenarioBundle(scenario.inputs, scenario.assumptions, {
    calculatorVersion: CALCULATOR_VERSION,
    calculatedAt,
    preserveOriginal: {
      originalSnapshot: scenario.originalSnapshot,
      originalCalculatorVersion: scenario.originalCalculatorVersion,
    },
  });

  return {
    ...scenario,
    results: bundle.results,
    calculatorVersion: bundle.calculatorVersion,
    activeSnapshot: bundle.activeSnapshot,
    activeCalculatorVersion: bundle.activeCalculatorVersion,
    updatedAt: calculatedAt,
  };
}

export function toDerivedPersistencePayload(
  scenario: ScenarioData
): DerivedPersistencePayload {
  return {
    assumptions: scenario.assumptions,
    sourceScenarioId: scenario.sourceScenarioId,
    calculatorVersion: scenario.activeCalculatorVersion,
    originalCalculatorVersion: scenario.originalCalculatorVersion,
    activeCalculatorVersion: scenario.activeCalculatorVersion,
    originalSnapshot: scenario.originalSnapshot,
    activeSnapshot: scenario.activeSnapshot,
  };
}

export function summariesMatch(
  a: PersistedScenarioSummary,
  b: PersistedScenarioSummary,
  tolerance = 0.01
): boolean {
  const keys: (keyof PersistedScenarioSummary)[] = [
    "monthlyPaymentPrimary",
    "monthlyTotal",
    "totalInterest",
    "totalCost",
    "financingCostOverHorizon",
    "principalReductionOverHorizon",
    "allInMonthlyHousingPayment",
    "decisionHorizonMonths",
    "payoffMonths",
    "principalAmount",
  ];
  for (const key of keys) {
    const av = a[key];
    const bv = b[key];
    if (typeof av === "number" && typeof bv === "number") {
      if (Math.abs(av - bv) > tolerance) return false;
    } else if (av !== bv) {
      return false;
    }
  }
  return a.type === b.type;
}
