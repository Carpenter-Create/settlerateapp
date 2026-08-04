/**
 * SettleRate Scenario Data Model Contract
 *
 * A scenario is a self-contained, immutable-on-read financial analysis snapshot.
 *
 * Core principles:
 * 1. Self-containment: Each scenario stores all inputs, assumptions, and derived results
 * 2. Immutability: Historical scenarios do not change when system defaults update
 * 3. Lineage: Duplicated scenarios track their source for audit purposes
 * 4. Determinism: Same inputs + assumptions + calculator version = same results
 * 5. Dual snapshots (Phase 3 / BM-V01): originalSnapshot is an immutable baseline;
 *    activeSnapshot may be recalculated under a newer calculator version
 */

import { MortgageInputs, MortgageResults } from "./mortgage";
import { CALCULATOR_VERSION, LATEST_SCHEMA_VERSION } from "./calculatorVersion";
import {
  computeScenarioBundle,
  getScenarioRecalculationState,
  isRecalculationAvailable,
  recalculateActiveSnapshot,
  summariesMatch,
  summaryFromUnified,
  type ScenarioCalculationSnapshot,
  type ScenarioRecalculationState,
} from "./scenarioPersistence";
import { calculateScenario } from "./scenarioCalculator";

export { CALCULATOR_VERSION, LATEST_SCHEMA_VERSION };
export type { ScenarioCalculationSnapshot, ScenarioRecalculationState };
export {
  recalculateActiveSnapshot,
  getScenarioRecalculationState,
  isRecalculationAvailable,
};

/**
 * System-level assumptions that may change over time.
 * Frozen at scenario creation to ensure historical stability.
 */
export interface ScenarioAssumptions {
  // Amortization method
  amortizationType: "standard" | "simple";

  // PMI removal threshold (LTV percentage)
  pmiRemovalThreshold: number;

  // Default PMI rate if not specified (annual % of loan amount)
  defaultPmiRate: number;

  // Whether prepayment penalties are assumed (always false in v1)
  assumePrepaymentPenalty: boolean;

  // Tax treatment assumptions
  taxDeductible: boolean;

  // Calculator version at time of scenario creation
  calculatorVersion: string;
}

/**
 * Current system defaults for assumptions.
 * New scenarios capture these at creation time.
 */
export const DEFAULT_ASSUMPTIONS: ScenarioAssumptions = {
  amortizationType: "standard",
  pmiRemovalThreshold: 80,
  defaultPmiRate: 0.5,
  assumePrepaymentPenalty: false,
  taxDeductible: false,
  calculatorVersion: CALCULATOR_VERSION,
};

/**
 * Full scenario data model
 */
export interface ScenarioData {
  // Identity
  id: string;
  ownerId: string | null; // null for anonymous/local scenarios
  name: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Lineage tracking
  sourceScenarioId: string | null; // ID of scenario this was duplicated from

  // Core data (self-contained)
  inputs: MortgageInputs;
  assumptions: ScenarioAssumptions;
  /**
   * UI/compat projection of the active calculation.
   * Purchase/refinance: full MortgageResults (schedule regenerated when current).
   * HELOC/assumption: bounded projection — never produced via calculateMortgage.
   */
  results: MortgageResults;

  /**
   * @deprecated Prefer activeCalculatorVersion. Kept as alias for compatibility.
   */
  calculatorVersion: string;

  // Schema version for migrations (REQUIRED)
  schemaVersion: number;

  /** Immutable historical baseline (first save / established original). */
  originalSnapshot: ScenarioCalculationSnapshot;
  /** Current result used by the application (may be recalculated). */
  activeSnapshot: ScenarioCalculationSnapshot;
  originalCalculatorVersion: string;
  activeCalculatorVersion: string;
}

/**
 * Generate a unique scenario ID
 */
export function generateScenarioId(): string {
  return `scenario_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new scenario from inputs.
 * Dispatches through calculateScenario for all supported modes.
 */
export function createScenarioData(
  name: string,
  inputs: MortgageInputs,
  ownerId: string | null = null,
  sourceScenarioId: string | null = null
): ScenarioData {
  const now = new Date();
  const assumptions = { ...DEFAULT_ASSUMPTIONS };
  const bundle = computeScenarioBundle(inputs, assumptions, {
    calculatorVersion: CALCULATOR_VERSION,
    calculatedAt: now,
  });

  return {
    id: generateScenarioId(),
    ownerId,
    name,
    createdAt: now,
    updatedAt: now,
    sourceScenarioId,
    inputs: structuredClone(inputs),
    assumptions,
    results: bundle.results,
    calculatorVersion: bundle.calculatorVersion,
    schemaVersion: LATEST_SCHEMA_VERSION,
    originalSnapshot: bundle.originalSnapshot,
    activeSnapshot: bundle.activeSnapshot,
    originalCalculatorVersion: bundle.originalCalculatorVersion,
    activeCalculatorVersion: bundle.activeCalculatorVersion,
  };
}

/**
 * Deep clone a scenario for duplication.
 * Creates a completely independent copy with new ID and lineage reference.
 * Both snapshots are established from a fresh calculateScenario dispatch.
 */
export function duplicateScenarioData(
  original: ScenarioData,
  newOwnerId?: string | null
): ScenarioData {
  const now = new Date();

  // Generate appropriate name
  let newName = original.name;
  const copyMatch = newName.match(/^(.+?)\s*\(Copy(?:\s*(\d+))?\)$/i);
  if (copyMatch) {
    const baseName = copyMatch[1].trim();
    const copyNum = copyMatch[2] ? parseInt(copyMatch[2], 10) + 1 : 2;
    newName = `${baseName} (Copy ${copyNum})`;
  } else {
    newName = `${original.name} (Copy)`;
  }

  const clonedInputs: MortgageInputs = structuredClone(original.inputs);
  const clonedAssumptions: ScenarioAssumptions = structuredClone(
    original.assumptions
  );
  const bundle = computeScenarioBundle(clonedInputs, clonedAssumptions, {
    calculatorVersion: CALCULATOR_VERSION,
    calculatedAt: now,
  });

  return {
    id: generateScenarioId(),
    ownerId: newOwnerId !== undefined ? newOwnerId : original.ownerId,
    name: newName,
    createdAt: now,
    updatedAt: now,
    sourceScenarioId: original.id,
    inputs: clonedInputs,
    assumptions: clonedAssumptions,
    results: bundle.results,
    calculatorVersion: bundle.calculatorVersion,
    schemaVersion: LATEST_SCHEMA_VERSION,
    originalSnapshot: bundle.originalSnapshot,
    activeSnapshot: bundle.activeSnapshot,
    originalCalculatorVersion: bundle.originalCalculatorVersion,
    activeCalculatorVersion: bundle.activeCalculatorVersion,
  };
}

/**
 * Update a scenario's inputs and recompute the active snapshot only.
 * originalSnapshot remains unchanged for auditability.
 */
export function updateScenarioInputs(
  scenario: ScenarioData,
  newInputs: MortgageInputs
): ScenarioData {
  const now = new Date();
  const bundle = computeScenarioBundle(newInputs, scenario.assumptions, {
    calculatorVersion: CALCULATOR_VERSION,
    calculatedAt: now,
    preserveOriginal: {
      originalSnapshot: scenario.originalSnapshot,
      originalCalculatorVersion: scenario.originalCalculatorVersion,
    },
  });

  return {
    ...scenario,
    inputs: structuredClone(newInputs),
    results: bundle.results,
    calculatorVersion: bundle.calculatorVersion,
    activeSnapshot: bundle.activeSnapshot,
    activeCalculatorVersion: bundle.activeCalculatorVersion,
    updatedAt: now,
  };
}

/**
 * Update scenario name only
 */
export function updateScenarioName(
  scenario: ScenarioData,
  newName: string
): ScenarioData {
  return {
    ...scenario,
    name: newName,
    updatedAt: new Date(),
  };
}

// ============================================================================
// INTEGRITY VALIDATION
// ============================================================================

export interface IntegrityCheckResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate that a scenario's active snapshot matches recomputation from inputs
 * via calculateScenario (authoritative dispatch for all modes).
 */
export function validateScenarioIntegrity(
  scenario: ScenarioData
): IntegrityCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (scenario.activeCalculatorVersion !== CALCULATOR_VERSION) {
    warnings.push(
      `Scenario active calculator v${scenario.activeCalculatorVersion}, current is v${CALCULATOR_VERSION}`
    );
  }

  if (scenario.originalCalculatorVersion !== scenario.activeCalculatorVersion) {
    warnings.push(
      `Original calculator v${scenario.originalCalculatorVersion} differs from active v${scenario.activeCalculatorVersion}`
    );
  }

  const recomputed = calculateScenario(scenario.inputs, {
    pmiRemovalThreshold: scenario.assumptions.pmiRemovalThreshold,
  });
  const recomputedSummary = summaryFromUnified(recomputed);

  if (
    scenario.activeCalculatorVersion === CALCULATOR_VERSION &&
    !summariesMatch(recomputedSummary, scenario.activeSnapshot.summary)
  ) {
    errors.push("Active snapshot mismatch on calculateScenario recomputation");
  }

  if (!scenario.id) {
    errors.push("Missing scenario ID");
  }

  if (!scenario.name) {
    errors.push("Missing scenario name");
  }

  if (!scenario.inputs) {
    errors.push("Missing scenario inputs");
  }

  if (!scenario.assumptions) {
    errors.push("Missing scenario assumptions");
  }

  if (!scenario.originalSnapshot || !scenario.activeSnapshot) {
    errors.push("Missing dual-snapshot persistence fields");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate that a duplicated scenario is truly independent
 */
export function validateDuplicateIndependence(
  original: ScenarioData,
  duplicate: ScenarioData
): IntegrityCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (original.id === duplicate.id) {
    errors.push("Duplicate has same ID as original");
  }

  if (duplicate.sourceScenarioId !== original.id) {
    errors.push("Duplicate does not reference original as source");
  }

  if (original.inputs === duplicate.inputs) {
    errors.push("Inputs object is shared (not deep cloned)");
  }

  if (original.assumptions === duplicate.assumptions) {
    errors.push("Assumptions object is shared (not deep cloned)");
  }

  if (original.results === duplicate.results) {
    errors.push("Results object is shared (not deep cloned)");
  }

  if (
    original.results.amortizationSchedule ===
    duplicate.results.amortizationSchedule
  ) {
    errors.push("Amortization schedule array is shared (not deep cloned)");
  }

  if (original.originalSnapshot === duplicate.originalSnapshot) {
    errors.push("originalSnapshot object is shared (not deep cloned)");
  }

  if (original.activeSnapshot === duplicate.activeSnapshot) {
    errors.push("activeSnapshot object is shared (not deep cloned)");
  }

  const inputsEqual =
    JSON.stringify(original.inputs) === JSON.stringify(duplicate.inputs);
  if (!inputsEqual) {
    warnings.push("Duplicate inputs differ from original (may be intentional)");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Run full integrity test suite on a scenario
 */
export function runIntegrityTests(scenario: ScenarioData): IntegrityCheckResult {
  const selfCheck = validateScenarioIntegrity(scenario);

  const recomputed1 = calculateScenario(scenario.inputs, {
    pmiRemovalThreshold: scenario.assumptions.pmiRemovalThreshold,
  });
  const recomputed2 = calculateScenario(scenario.inputs, {
    pmiRemovalThreshold: scenario.assumptions.pmiRemovalThreshold,
  });

  if (JSON.stringify(recomputed1) !== JSON.stringify(recomputed2)) {
    selfCheck.errors.push("Non-deterministic computation detected");
  }

  return selfCheck;
}
