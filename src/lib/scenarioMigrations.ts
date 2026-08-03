/**
 * SettleRate Scenario Migration Pipeline
 * 
 * This module ensures any saved scenario—past or future—loads reliably.
 * If the persisted shape changes, the app migrates the record to the latest
 * schema before hydration. No silent fallbacks to defaults when a scenario id exists.
 * 
 * MIGRATION CONTRACT:
 * - Pure and deterministic (no network calls, no UI state)
 * - Upgrades any scenario from its stored version up to LATEST_SCHEMA_VERSION
 * - Does not overwrite user data; only adds missing fields, moves/renames as needed
 * - Returns structured error if migration cannot be safely completed
 */

import {
  MortgageInputs,
  LegacyMortgageInputs,
  isLegacyInputs,
  migrateLegacyInputs,
  DEFAULT_INPUTS,
  DEFAULT_PURCHASE_INPUTS,
  DEFAULT_REFINANCE_INPUTS,
  DEFAULT_SHARED_INPUTS,
  ScenarioType,
} from "./mortgage";
import { ScenarioAssumptions, DEFAULT_ASSUMPTIONS, CALCULATOR_VERSION as CONTRACT_VERSION } from "./scenarioContract";

// =============================================================================
// VERSION CONSTANTS
// =============================================================================

/**
 * Current schema version. Increment when the scenario shape changes.
 */
export const LATEST_SCHEMA_VERSION = 1;

/**
 * Current calculator version for computation reproducibility.
 */
export const CALCULATOR_VERSION = CONTRACT_VERSION;

// =============================================================================
// MIGRATION RESULT TYPES
// =============================================================================

export interface MigrationResult {
  success: true;
  scenario: MigratedScenario;
  wasChanged: boolean;
  migrations: string[]; // List of migrations applied
}

export interface MigrationError {
  success: false;
  error: string;
  details: string[];
}

export type MigrationOutcome = MigrationResult | MigrationError;

/**
 * Scenario after migration - guaranteed to have all required fields
 */
export interface MigratedScenario {
  id: string;
  ownerId: string | null;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  sourceScenarioId: string | null;
  inputs: MortgageInputs;
  assumptions: ScenarioAssumptions;
  results: unknown; // Will be recomputed after migration
  calculatorVersion: string;
  schemaVersion: number;
}

// =============================================================================
// SCHEMA VERSION DETECTION
// =============================================================================

/**
 * Detect the schema version of a raw scenario object.
 * Returns 0 if no version is present (pre-versioning era).
 */
export function getScenarioSchemaVersion(raw: unknown): number {
  if (!raw || typeof raw !== "object") return 0;
  const obj = raw as Record<string, unknown>;
  
  if (typeof obj.schemaVersion === "number") {
    return obj.schemaVersion;
  }
  
  // Legacy: no schemaVersion field = version 0
  return 0;
}

// =============================================================================
// MIGRATION FUNCTIONS
// =============================================================================

/**
 * v0 → v1 Migration
 * 
 * Handles scenarios from before schema versioning was introduced.
 * These may have:
 * - Missing schema_version (now required)
 * - Missing calculator_version
 * - Legacy flat inputs structure (scenarioType at top level)
 * - Missing mode field
 * - Missing or malformed assumptions
 */
function migrate_v0_to_v1(raw: Record<string, unknown>): MigrationOutcome {
  const migrations: string[] = [];
  const scenario: Record<string, unknown> = { ...raw };
  
  // A) Ensure top-level required fields exist
  
  // scenario_id: REQUIRED - if missing, this is invalid
  if (!scenario.id || typeof scenario.id !== "string") {
    return {
      success: false,
      error: "Missing scenario ID",
      details: ["Scenario ID is required and cannot be inferred. This scenario is invalid."],
    };
  }
  
  // name: default to "Untitled scenario"
  if (!scenario.name || typeof scenario.name !== "string") {
    scenario.name = "Untitled scenario";
    migrations.push("Set default name: 'Untitled scenario'");
  }
  
  // ownerId: default to null
  if (scenario.ownerId === undefined) {
    scenario.ownerId = null;
    migrations.push("Set ownerId to null");
  }
  
  // sourceScenarioId: default to null
  if (scenario.sourceScenarioId === undefined) {
    scenario.sourceScenarioId = null;
    migrations.push("Set sourceScenarioId to null");
  }
  
  // Timestamps
  const now = new Date();
  
  if (!scenario.createdAt) {
    // Try to use updatedAt if available, else current time
    if (scenario.updatedAt) {
      scenario.createdAt = new Date(scenario.updatedAt as string | number | Date);
      migrations.push("Set createdAt from updatedAt");
    } else {
      scenario.createdAt = now;
      migrations.push("Set createdAt to current time");
    }
  } else {
    scenario.createdAt = new Date(scenario.createdAt as string | number | Date);
  }
  
  if (!scenario.updatedAt) {
    scenario.updatedAt = now;
    migrations.push("Set updatedAt to current time");
  } else {
    scenario.updatedAt = new Date(scenario.updatedAt as string | number | Date);
  }
  
  // Set schema version and calculator version
  scenario.schemaVersion = 1;
  migrations.push("Set schemaVersion to 1");
  
  if (!scenario.calculatorVersion || typeof scenario.calculatorVersion !== "string") {
    scenario.calculatorVersion = CALCULATOR_VERSION;
    migrations.push(`Set calculatorVersion to ${CALCULATOR_VERSION}`);
  }
  
  // B) Ensure mode exists and inputs are in namespaced structure
  
  const inputs = scenario.inputs as Record<string, unknown> | undefined;
  
  if (!inputs || typeof inputs !== "object") {
    // No inputs at all - create defaults
    scenario.inputs = structuredClone(DEFAULT_INPUTS);
    migrations.push("Created default inputs (none existed)");
  } else if (isLegacyInputs(inputs)) {
    // Legacy flat format - migrate to namespaced
    scenario.inputs = migrateLegacyInputs(inputs as unknown as LegacyMortgageInputs);
    migrations.push("Migrated legacy flat inputs to namespaced structure");
  } else {
    // Ensure namespaced inputs have all required fields
    const currentInputs = inputs as Record<string, unknown>;
    
    // Ensure mode exists
    if (!currentInputs.mode || (currentInputs.mode !== "purchase" && currentInputs.mode !== "refinance")) {
      // Infer mode from presence of refinance-like fields
      const hasRefiFields = 
        "currentLoanBalance" in currentInputs ||
        "current_loan_balance" in currentInputs ||
        "loan_balance" in currentInputs ||
        "cash_out_amount" in currentInputs ||
        "cashOutAmount" in currentInputs ||
        "closing_costs" in currentInputs ||
        "closingCosts" in currentInputs ||
        "refi_rate" in currentInputs;
      
      currentInputs.mode = hasRefiFields ? "refinance" : "purchase";
      console.log(`[Migration] Inferred mode: ${currentInputs.mode} (hasRefiFields: ${hasRefiFields})`);
      migrations.push(`Inferred mode: ${currentInputs.mode}`);
    }
    
    // Ensure purchase namespace exists
    if (!currentInputs.purchase || typeof currentInputs.purchase !== "object") {
      currentInputs.purchase = structuredClone(DEFAULT_PURCHASE_INPUTS);
      migrations.push("Created default purchase inputs");
    } else {
      // Fill in any missing purchase fields
      const purchase = currentInputs.purchase as Record<string, unknown>;
      if (purchase.purchasePrice === undefined) purchase.purchasePrice = DEFAULT_PURCHASE_INPUTS.purchasePrice;
      if (purchase.downPayment === undefined) purchase.downPayment = DEFAULT_PURCHASE_INPUTS.downPayment;
      if (purchase.downPaymentType === undefined) purchase.downPaymentType = DEFAULT_PURCHASE_INPUTS.downPaymentType;
    }
    
    // Ensure refinance namespace exists
    if (!currentInputs.refinance || typeof currentInputs.refinance !== "object") {
      currentInputs.refinance = structuredClone(DEFAULT_REFINANCE_INPUTS);
      migrations.push("Created default refinance inputs");
    } else {
      // Fill in any missing refinance fields
      const refinance = currentInputs.refinance as Record<string, unknown>;
      if (refinance.currentLoanBalance === undefined) refinance.currentLoanBalance = DEFAULT_REFINANCE_INPUTS.currentLoanBalance;
      if (refinance.cashOutAmount === undefined) refinance.cashOutAmount = DEFAULT_REFINANCE_INPUTS.cashOutAmount;
      if (refinance.closingCosts === undefined) refinance.closingCosts = DEFAULT_REFINANCE_INPUTS.closingCosts;
      if (refinance.financeClosingCosts === undefined) refinance.financeClosingCosts = DEFAULT_REFINANCE_INPUTS.financeClosingCosts;
      if (refinance.estimatedHomeValue === undefined) refinance.estimatedHomeValue = DEFAULT_REFINANCE_INPUTS.estimatedHomeValue;
    }
    
    // Ensure shared namespace exists
    if (!currentInputs.shared || typeof currentInputs.shared !== "object") {
      currentInputs.shared = structuredClone(DEFAULT_SHARED_INPUTS);
      migrations.push("Created default shared inputs");
    } else {
      // Fill in any missing shared fields
      const shared = currentInputs.shared as Record<string, unknown>;
      if (shared.interestRate === undefined) shared.interestRate = DEFAULT_SHARED_INPUTS.interestRate;
      if (shared.loanTerm === undefined) shared.loanTerm = DEFAULT_SHARED_INPUTS.loanTerm;
      if (shared.includeEstimates === undefined) shared.includeEstimates = DEFAULT_SHARED_INPUTS.includeEstimates;
      if (shared.zipCode === undefined) shared.zipCode = DEFAULT_SHARED_INPUTS.zipCode;
      if (shared.usedZipEstimate === undefined) shared.usedZipEstimate = DEFAULT_SHARED_INPUTS.usedZipEstimate;
      if (shared.propertyTaxMode === undefined) shared.propertyTaxMode = DEFAULT_SHARED_INPUTS.propertyTaxMode;
      if (shared.propertyTaxRate === undefined) shared.propertyTaxRate = DEFAULT_SHARED_INPUTS.propertyTaxRate;
      if (shared.propertyTaxAnnual === undefined) shared.propertyTaxAnnual = DEFAULT_SHARED_INPUTS.propertyTaxAnnual;
      if (shared.homeInsuranceMonthly === undefined) shared.homeInsuranceMonthly = DEFAULT_SHARED_INPUTS.homeInsuranceMonthly;
      if (shared.hoaMonthly === undefined) shared.hoaMonthly = DEFAULT_SHARED_INPUTS.hoaMonthly;
      if (shared.pmiMonthly === undefined) shared.pmiMonthly = DEFAULT_SHARED_INPUTS.pmiMonthly;
      if (shared.extraMonthlyPayment === undefined) shared.extraMonthlyPayment = DEFAULT_SHARED_INPUTS.extraMonthlyPayment;
      if (shared.oneTimePrincipalPayment === undefined) shared.oneTimePrincipalPayment = DEFAULT_SHARED_INPUTS.oneTimePrincipalPayment;
    }
    
    scenario.inputs = currentInputs;
  }
  
  // C) Ensure assumptions exist with defaults
  if (!scenario.assumptions || typeof scenario.assumptions !== "object") {
    scenario.assumptions = structuredClone(DEFAULT_ASSUMPTIONS);
    migrations.push("Created default assumptions");
  } else {
    // Fill in any missing assumption fields
    const assumptions = scenario.assumptions as Record<string, unknown>;
    if (assumptions.amortizationType === undefined) assumptions.amortizationType = DEFAULT_ASSUMPTIONS.amortizationType;
    if (assumptions.pmiRemovalThreshold === undefined) assumptions.pmiRemovalThreshold = DEFAULT_ASSUMPTIONS.pmiRemovalThreshold;
    if (assumptions.defaultPmiRate === undefined) assumptions.defaultPmiRate = DEFAULT_ASSUMPTIONS.defaultPmiRate;
    if (assumptions.assumePrepaymentPenalty === undefined) assumptions.assumePrepaymentPenalty = DEFAULT_ASSUMPTIONS.assumePrepaymentPenalty;
    if (assumptions.taxDeductible === undefined) assumptions.taxDeductible = DEFAULT_ASSUMPTIONS.taxDeductible;
    if (assumptions.calculatorVersion === undefined) assumptions.calculatorVersion = CALCULATOR_VERSION;
    scenario.assumptions = assumptions;
  }
  
  // D) Results will be recomputed after migration, so just preserve existing or set empty
  if (!scenario.results) {
    scenario.results = {};
    migrations.push("Results will be recomputed");
  }
  
  return {
    success: true,
    scenario: scenario as unknown as MigratedScenario,
    wasChanged: migrations.length > 0,
    migrations,
  };
}

// =============================================================================
// MAIN MIGRATION PIPELINE
// =============================================================================

/**
 * Migrate a raw scenario object to the latest schema version.
 * 
 * This function is:
 * - Pure and deterministic (no side effects)
 * - Safe (does not overwrite user data)
 * - Traceable (returns list of migrations applied)
 */
export function migrateScenario(raw: unknown): MigrationOutcome {
  if (!raw || typeof raw !== "object") {
    return {
      success: false,
      error: "Invalid scenario data",
      details: ["Scenario must be a non-null object"],
    };
  }
  
  const rawObj = raw as Record<string, unknown>;
  const startVersion = getScenarioSchemaVersion(rawObj);
  const allMigrations: string[] = [];
  
  let current: Record<string, unknown> = { ...rawObj };
  let currentVersion = startVersion;
  
  // Apply migrations in order
  while (currentVersion < LATEST_SCHEMA_VERSION) {
    let result: MigrationOutcome;
    
    switch (currentVersion) {
      case 0:
        result = migrate_v0_to_v1(current);
        break;
      // Future migrations would be added here:
      // case 1:
      //   result = migrate_v1_to_v2(current);
      //   break;
      default:
        return {
          success: false,
          error: `Unknown schema version: ${currentVersion}`,
          details: [`No migration path from version ${currentVersion} to ${LATEST_SCHEMA_VERSION}`],
        };
    }
    
    if (!result.success) {
      return result;
    }
    
    current = result.scenario as unknown as Record<string, unknown>;
    allMigrations.push(...result.migrations);
    currentVersion = (current.schemaVersion as number) ?? currentVersion + 1;
  }
  
  // Final validation
  const finalScenario = current as unknown as MigratedScenario;
  
  if (finalScenario.schemaVersion !== LATEST_SCHEMA_VERSION) {
    return {
      success: false,
      error: "Migration incomplete",
      details: [`Schema version ${finalScenario.schemaVersion} != expected ${LATEST_SCHEMA_VERSION}`],
    };
  }
  
  // Log migrations in development
  if (process.env.NODE_ENV === "development" && allMigrations.length > 0) {
    console.log(`[Migration] Scenario ${finalScenario.id} migrated:`, allMigrations);
  }
  
  return {
    success: true,
    scenario: finalScenario,
    wasChanged: allMigrations.length > 0,
    migrations: allMigrations,
  };
}

/**
 * Check if a scenario needs migration
 */
export function needsMigration(raw: unknown): boolean {
  return getScenarioSchemaVersion(raw) < LATEST_SCHEMA_VERSION;
}

/**
 * Validate that a scenario is at the latest schema version
 */
export function isLatestSchema(raw: unknown): boolean {
  return getScenarioSchemaVersion(raw) === LATEST_SCHEMA_VERSION;
}
