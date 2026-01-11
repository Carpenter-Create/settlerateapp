/**
 * Comparison Contract - Data model and logic for saved comparisons.
 * 
 * Comparisons are relational references to scenarios, not snapshots.
 * They store only scenario IDs and metadata about the comparison itself.
 */

import { formatCurrency } from "@/lib/mortgage";
import type { ScenarioData } from "@/lib/scenarioContract";

// ============================================================================
// CONSTANTS
// ============================================================================

export const COMPARISON_SCHEMA_VERSION = 1;

// ============================================================================
// DATA MODEL
// ============================================================================

export interface SavedComparison {
  id: string;
  name: string;
  scenarioIds: string[]; // Ordered array of scenario IDs (references only)
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// COMPARISON SUMMARY CONTRACT
// ============================================================================

interface AnalyzedScenario {
  scenario: ScenarioData;
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
  payoffMonths: number;
}

export interface ComparisonSummary {
  recommendation: {
    scenario: ScenarioData;
    reason: string;
  } | null;
  benefits: string[];
  tradeoffs: {
    statement: string;
    detail?: string;
  }[];
  alternativeScenario: {
    scenario: ScenarioData;
    advice: string;
  } | null;
}

/**
 * Generate a canonical comparison summary following strict priority rules.
 * 
 * Priority order for recommendation:
 * 1. Lowest total interest paid
 * 2. Shortest payoff time
 * 3. Meaningful monthly payment reduction (≥5% difference)
 * 
 * If two scenarios tie, prefer the one with lower total cost.
 */
export function generateComparisonSummary(scenarios: ScenarioData[]): ComparisonSummary | null {
  if (scenarios.length < 2) return null;

  // Analyze each scenario
  const analyzed: AnalyzedScenario[] = scenarios.map((s) => ({
    scenario: s,
    monthlyPayment: s.results.monthlyTotal,
    totalInterest: s.results.totalInterest,
    totalCost: s.results.totalCost,
    payoffMonths: s.results.payoffMonths,
  }));

  // Sort by each priority criterion
  const byTotalInterest = [...analyzed].sort((a, b) => a.totalInterest - b.totalInterest);
  const byPayoffMonths = [...analyzed].sort((a, b) => a.payoffMonths - b.payoffMonths);
  const byMonthlyPayment = [...analyzed].sort((a, b) => a.monthlyPayment - b.monthlyPayment);
  const byTotalCost = [...analyzed].sort((a, b) => a.totalCost - b.totalCost);

  // Priority 1: Lowest total interest
  let recommended = byTotalInterest[0];

  // Check for tie - if within 1% of each other, prefer lower total cost
  const lowestInterest = byTotalInterest[0].totalInterest;
  const tiedByInterest = byTotalInterest.filter(
    (a) => a.totalInterest <= lowestInterest * 1.01
  );
  if (tiedByInterest.length > 1) {
    tiedByInterest.sort((a, b) => a.totalCost - b.totalCost);
    recommended = tiedByInterest[0];
  }

  // Priority 2: If shortest payoff is significantly better (>10% faster) and interest is close
  const shortestPayoff = byPayoffMonths[0];
  if (shortestPayoff.scenario.id !== recommended.scenario.id) {
    const payoffRatio = shortestPayoff.payoffMonths / recommended.payoffMonths;
    const interestRatio = shortestPayoff.totalInterest / recommended.totalInterest;
    // If 10% faster and within 5% interest difference
    if (payoffRatio <= 0.9 && interestRatio <= 1.05) {
      recommended = shortestPayoff;
    }
  }

  // Priority 3: Meaningful monthly improvement (≥5%) with acceptable interest
  const lowestMonthly = byMonthlyPayment[0];
  if (lowestMonthly.scenario.id !== recommended.scenario.id) {
    const monthlyRatio = lowestMonthly.monthlyPayment / recommended.monthlyPayment;
    // If 5% or more lower monthly AND interest is still within 10%
    if (monthlyRatio <= 0.95) {
      const interestRatio = lowestMonthly.totalInterest / recommended.totalInterest;
      if (interestRatio <= 1.10) {
        recommended = lowestMonthly;
      }
    }
  }

  const others = analyzed.filter((a) => a.scenario.id !== recommended.scenario.id);

  // Build recommendation reason
  let reason = "";
  if (recommended.scenario.id === byTotalInterest[0].scenario.id) {
    reason = "This option provides the lowest total interest over the life of the loan";
  } else if (recommended.scenario.id === byPayoffMonths[0].scenario.id) {
    reason = "This option provides the fastest path to debt freedom";
  } else if (recommended.scenario.id === byMonthlyPayment[0].scenario.id) {
    reason = "This option provides meaningful monthly savings with acceptable lifetime cost";
  }

  // Add secondary benefits to reason
  if (recommended.scenario.id === byTotalInterest[0].scenario.id && 
      recommended.scenario.id === byMonthlyPayment[0].scenario.id) {
    reason = "This option provides both the lowest monthly payment and lowest total interest";
  }

  // Build benefits list with absolute dollar amounts only
  const benefits: string[] = [];

  others.forEach((other) => {
    const monthlyDiff = other.monthlyPayment - recommended.monthlyPayment;
    if (monthlyDiff > 10) {
      benefits.push(
        `${formatCurrency(monthlyDiff)} lower monthly payment compared to ${other.scenario.name}`
      );
    }
  });

  others.forEach((other) => {
    const interestDiff = other.totalInterest - recommended.totalInterest;
    if (interestDiff > 500) {
      benefits.push(
        `${formatCurrency(interestDiff)} less total interest over the life of the loan`
      );
    }
  });

  others.forEach((other) => {
    const monthsDiff = other.payoffMonths - recommended.payoffMonths;
    if (monthsDiff > 6) {
      benefits.push(
        `Shorter payoff timeline (${recommended.payoffMonths} months vs. ${other.payoffMonths} months)`
      );
    }
  });

  // Build tradeoffs section
  const tradeoffs: { statement: string; detail?: string }[] = [];
  let alternativeScenario: ComparisonSummary["alternativeScenario"] = null;

  // Identify the lowest monthly payment scenario if different from recommended
  if (lowestMonthly.scenario.id !== recommended.scenario.id) {
    const monthlyDiff = recommended.monthlyPayment - lowestMonthly.monthlyPayment;
    if (monthlyDiff > 10) {
      tradeoffs.push({
        statement: `Requires a higher monthly payment than ${lowestMonthly.scenario.name}`,
      });

      const interestDiff = lowestMonthly.totalInterest - recommended.totalInterest;
      if (interestDiff > 500) {
        tradeoffs.push({
          statement: `${lowestMonthly.scenario.name} minimizes monthly cost`,
          detail: `but increases total interest paid by ${formatCurrency(interestDiff)}`,
        });
      }

      // Build alternative advice
      alternativeScenario = {
        scenario: lowestMonthly.scenario,
        advice: `If your priority is the lowest possible monthly payment, ${lowestMonthly.scenario.name} may be preferable despite the higher lifetime cost of ${formatCurrency(interestDiff)}.`,
      };
    }
  }

  return {
    recommendation: {
      scenario: recommended.scenario,
      reason,
    },
    benefits,
    tradeoffs,
    alternativeScenario,
  };
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

function generateComparisonId(): string {
  return `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getDefaultComparisonName(): string {
  const now = new Date();
  const month = now.toLocaleString("default", { month: "long" });
  const year = now.getFullYear();
  return `Comparison – ${month} ${year}`;
}

export function createComparison(
  scenarioIds: string[],
  name?: string
): SavedComparison {
  const now = new Date();
  return {
    id: generateComparisonId(),
    name: name ?? getDefaultComparisonName(),
    scenarioIds: [...scenarioIds],
    schemaVersion: COMPARISON_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateComparisonScenarios(
  comparison: SavedComparison,
  scenarioIds: string[]
): SavedComparison {
  return {
    ...comparison,
    scenarioIds: [...scenarioIds],
    updatedAt: new Date(),
  };
}

export function updateComparisonName(
  comparison: SavedComparison,
  name: string
): SavedComparison {
  return {
    ...comparison,
    name,
    updatedAt: new Date(),
  };
}

// ============================================================================
// MIGRATION
// ============================================================================

export interface ComparisonMigrationResult {
  success: boolean;
  comparison?: SavedComparison;
  error?: string;
}

function getComparisonSchemaVersion(raw: unknown): number {
  if (typeof raw !== "object" || raw === null) return 0;
  const r = raw as Record<string, unknown>;
  if (typeof r.schemaVersion === "number") return r.schemaVersion;
  if (typeof r.schema_version === "number") return r.schema_version;
  return 0;
}

function migrate_v0_to_v1(raw: Record<string, unknown>): SavedComparison {
  const now = new Date();
  
  // Ensure required fields
  const id = typeof raw.id === "string" ? raw.id : generateComparisonId();
  const name = typeof raw.name === "string" ? raw.name : getDefaultComparisonName();
  
  // Handle scenarioIds
  let scenarioIds: string[] = [];
  if (Array.isArray(raw.scenarioIds)) {
    scenarioIds = raw.scenarioIds.filter((id): id is string => typeof id === "string");
  } else if (Array.isArray(raw.scenario_ids)) {
    scenarioIds = raw.scenario_ids.filter((id): id is string => typeof id === "string");
  }
  
  // Handle dates
  let createdAt = now;
  let updatedAt = now;
  
  if (raw.createdAt) {
    createdAt = new Date(raw.createdAt as string | number | Date);
  } else if (raw.created_at) {
    createdAt = new Date(raw.created_at as string | number | Date);
  }
  
  if (raw.updatedAt) {
    updatedAt = new Date(raw.updatedAt as string | number | Date);
  } else if (raw.updated_at) {
    updatedAt = new Date(raw.updated_at as string | number | Date);
  }
  
  return {
    id,
    name,
    scenarioIds,
    schemaVersion: COMPARISON_SCHEMA_VERSION,
    createdAt,
    updatedAt,
  };
}

export function migrateComparison(raw: unknown): ComparisonMigrationResult {
  if (typeof raw !== "object" || raw === null) {
    return { success: false, error: "Invalid comparison: not an object" };
  }
  
  const record = raw as Record<string, unknown>;
  const version = getComparisonSchemaVersion(record);
  
  try {
    let comparison: SavedComparison;
    
    if (version === 0) {
      console.log("[ComparisonMigration] Migrating v0 → v1");
      comparison = migrate_v0_to_v1(record);
    } else if (version === COMPARISON_SCHEMA_VERSION) {
      // Already current version
      comparison = {
        id: record.id as string,
        name: record.name as string,
        scenarioIds: record.scenarioIds as string[],
        schemaVersion: COMPARISON_SCHEMA_VERSION,
        createdAt: new Date(record.createdAt as string | number | Date),
        updatedAt: new Date(record.updatedAt as string | number | Date),
      };
    } else {
      return { 
        success: false, 
        error: `Unknown comparison schema version: ${version}` 
      };
    }
    
    return { success: true, comparison };
  } catch (error) {
    return { 
      success: false, 
      error: `Migration failed: ${error instanceof Error ? error.message : "unknown error"}` 
    };
  }
}

export function needsComparisonMigration(raw: unknown): boolean {
  return getComparisonSchemaVersion(raw) < COMPARISON_SCHEMA_VERSION;
}
