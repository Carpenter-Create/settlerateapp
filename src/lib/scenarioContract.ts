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
 */

import { MortgageInputs, MortgageResults, calculateMortgage } from "./mortgage";

// Semantic versioning for the mortgage calculator
// Increment when calculation logic changes to ensure reproducibility
export const CALCULATOR_VERSION = "1.0.0";

// Schema version for migrations - increment when scenario shape changes
export const LATEST_SCHEMA_VERSION = 1;

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
  results: MortgageResults;
  
  // Version for deterministic recomputation
  calculatorVersion: string;
  
  // Schema version for migrations (REQUIRED)
  schemaVersion: number;
}

/**
 * Generate a unique scenario ID
 */
export function generateScenarioId(): string {
  return `scenario_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new scenario from inputs
 */
export function createScenarioData(
  name: string,
  inputs: MortgageInputs,
  ownerId: string | null = null,
  sourceScenarioId: string | null = null
): ScenarioData {
  const now = new Date();
  const assumptions = { ...DEFAULT_ASSUMPTIONS };
  
  return {
    id: generateScenarioId(),
    ownerId,
    name,
    createdAt: now,
    updatedAt: now,
    sourceScenarioId,
    inputs: structuredClone(inputs),
    assumptions,
    results: calculateMortgage(inputs),
    calculatorVersion: CALCULATOR_VERSION,
    schemaVersion: LATEST_SCHEMA_VERSION,
  };
}

/**
 * Deep clone a scenario for duplication.
 * Creates a completely independent copy with new ID and lineage reference.
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
  
  // Deep clone all data structures
  const clonedInputs: MortgageInputs = structuredClone(original.inputs);
  const clonedAssumptions: ScenarioAssumptions = structuredClone(original.assumptions);
  
  // Recompute results to ensure no shared references in amortization schedule
  const freshResults = calculateMortgage(clonedInputs);
  
  return {
    id: generateScenarioId(),
    ownerId: newOwnerId !== undefined ? newOwnerId : original.ownerId,
    name: newName,
    createdAt: now,
    updatedAt: now,
    sourceScenarioId: original.id, // Track lineage
    inputs: clonedInputs,
    assumptions: clonedAssumptions,
    results: freshResults,
    calculatorVersion: CALCULATOR_VERSION,
    schemaVersion: LATEST_SCHEMA_VERSION,
  };
}

/**
 * Update a scenario's inputs and recompute results.
 * Returns a new scenario object (immutable update pattern).
 */
export function updateScenarioInputs(
  scenario: ScenarioData,
  newInputs: MortgageInputs
): ScenarioData {
  return {
    ...scenario,
    inputs: structuredClone(newInputs),
    results: calculateMortgage(newInputs),
    updatedAt: new Date(),
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
 * Validate that a scenario's results match recomputation from inputs
 */
export function validateScenarioIntegrity(scenario: ScenarioData): IntegrityCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check calculator version
  if (scenario.calculatorVersion !== CALCULATOR_VERSION) {
    warnings.push(
      `Scenario was created with calculator v${scenario.calculatorVersion}, current is v${CALCULATOR_VERSION}`
    );
  }
  
  // Recompute and compare key results
  const recomputed = calculateMortgage(scenario.inputs);
  
  const tolerance = 0.01; // Allow for floating point variance
  
  if (Math.abs(recomputed.monthlyPrincipalInterest - scenario.results.monthlyPrincipalInterest) > tolerance) {
    errors.push("Monthly P&I mismatch on recomputation");
  }
  
  if (Math.abs(recomputed.totalInterest - scenario.results.totalInterest) > tolerance) {
    errors.push("Total interest mismatch on recomputation");
  }
  
  if (Math.abs(recomputed.loanAmount - scenario.results.loanAmount) > tolerance) {
    errors.push("Loan amount mismatch on recomputation");
  }
  
  // Check required fields
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
  
  // Must have different IDs
  if (original.id === duplicate.id) {
    errors.push("Duplicate has same ID as original");
  }
  
  // Lineage must be set
  if (duplicate.sourceScenarioId !== original.id) {
    errors.push("Duplicate does not reference original as source");
  }
  
  // Check for shared object references (should be impossible with structuredClone)
  if (original.inputs === duplicate.inputs) {
    errors.push("Inputs object is shared (not deep cloned)");
  }
  
  if (original.assumptions === duplicate.assumptions) {
    errors.push("Assumptions object is shared (not deep cloned)");
  }
  
  if (original.results === duplicate.results) {
    errors.push("Results object is shared (not deep cloned)");
  }
  
  if (original.results.amortizationSchedule === duplicate.results.amortizationSchedule) {
    errors.push("Amortization schedule array is shared (not deep cloned)");
  }
  
  // Verify input values are equal but independent
  const inputsEqual = JSON.stringify(original.inputs) === JSON.stringify(duplicate.inputs);
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
  
  // Additional checks for computation determinism
  const recomputed1 = calculateMortgage(scenario.inputs);
  const recomputed2 = calculateMortgage(scenario.inputs);
  
  if (JSON.stringify(recomputed1) !== JSON.stringify(recomputed2)) {
    selfCheck.errors.push("Non-deterministic computation detected");
  }
  
  return selfCheck;
}
