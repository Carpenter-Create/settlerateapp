/**
 * Comparison Contract - Data model and logic for saved comparisons.
 * 
 * Comparisons are relational references to scenarios, not snapshots.
 * They store scenario IDs and a snapshot of key values for change detection.
 */

import { formatCurrency, formatPercent } from "@/lib/mortgage";
import type { ScenarioData } from "@/lib/scenarioContract";

// ============================================================================
// CONSTANTS
// ============================================================================

export const COMPARISON_SCHEMA_VERSION = 2;

// ============================================================================
// DATA MODEL
// ============================================================================

/**
 * Snapshot of material values for a scenario at a point in time.
 * Only decision-impacting fields are captured.
 */
export interface ScenarioSnapshot {
  scenarioId: string;
  scenarioName: string;
  // Input values
  interestRate: number;
  loanTerm: number; // years
  loanAmount: number;
  includeTaxesInsurance: boolean;
  // Computed outcomes
  monthlyTotal: number;
  totalInterest: number;
  totalCost: number;
  payoffMonths: number;
}

export interface SavedComparison {
  id: string;
  name: string;
  scenarioIds: string[]; // Ordered array of scenario IDs (references only)
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
  // v2 additions for change tracking
  lastViewedAt: Date | null;
  scenarioSnapshots: ScenarioSnapshot[]; // Snapshot at last view
}

// ============================================================================
// CHANGE DETECTION
// ============================================================================

export interface MaterialChange {
  scenarioId: string;
  scenarioName: string;
  field: string;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  impact: string | null; // e.g., "This increased total interest by $18,400"
}

/**
 * Create a snapshot of material values from a scenario.
 */
export function createScenarioSnapshot(scenario: ScenarioData): ScenarioSnapshot {
  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    interestRate: scenario.inputs.shared.interestRate,
    loanTerm: scenario.inputs.shared.loanTerm,
    loanAmount: scenario.results.loanAmount,
    includeTaxesInsurance: scenario.inputs.shared.includeEstimates,
    monthlyTotal: scenario.results.monthlyTotal,
    totalInterest: scenario.results.totalInterest,
    totalCost: scenario.results.totalCost,
    payoffMonths: scenario.results.payoffMonths,
  };
}

/**
 * Detect material changes between a stored snapshot and current scenario state.
 * Only returns changes that affect decision-making.
 */
export function detectMaterialChanges(
  snapshots: ScenarioSnapshot[],
  currentScenarios: ScenarioData[]
): MaterialChange[] {
  const changes: MaterialChange[] = [];

  for (const snapshot of snapshots) {
    const current = currentScenarios.find((s) => s.id === snapshot.scenarioId);
    if (!current) continue; // Scenario deleted - handled elsewhere

    const currentSnapshot = createScenarioSnapshot(current);

    // Interest rate change
    if (Math.abs(snapshot.interestRate - currentSnapshot.interestRate) >= 0.01) {
      const interestDiff = currentSnapshot.totalInterest - snapshot.totalInterest;
      changes.push({
        scenarioId: snapshot.scenarioId,
        scenarioName: current.name,
        field: "interestRate",
        fieldLabel: "Interest rate",
        oldValue: formatPercent(snapshot.interestRate),
        newValue: formatPercent(currentSnapshot.interestRate),
        impact: interestDiff !== 0 
          ? `This ${interestDiff > 0 ? "increased" : "decreased"} total interest by ${formatCurrency(Math.abs(interestDiff))}`
          : null,
      });
    }

    // Loan amount change (material if >$1,000)
    if (Math.abs(snapshot.loanAmount - currentSnapshot.loanAmount) >= 1000) {
      const interestDiff = currentSnapshot.totalInterest - snapshot.totalInterest;
      changes.push({
        scenarioId: snapshot.scenarioId,
        scenarioName: current.name,
        field: "loanAmount",
        fieldLabel: "Loan amount",
        oldValue: formatCurrency(snapshot.loanAmount),
        newValue: formatCurrency(currentSnapshot.loanAmount),
        impact: interestDiff !== 0
          ? `This ${interestDiff > 0 ? "increased" : "decreased"} total interest by ${formatCurrency(Math.abs(interestDiff))}`
          : null,
      });
    }

    // Term length change
    if (snapshot.loanTerm !== currentSnapshot.loanTerm) {
      const monthsDiff = currentSnapshot.payoffMonths - snapshot.payoffMonths;
      changes.push({
        scenarioId: snapshot.scenarioId,
        scenarioName: current.name,
        field: "loanTerm",
        fieldLabel: "Loan term",
        oldValue: `${snapshot.loanTerm} years`,
        newValue: `${currentSnapshot.loanTerm} years`,
        impact: monthsDiff !== 0
          ? `Payoff timeline ${monthsDiff > 0 ? "extended" : "shortened"} by ${Math.abs(monthsDiff)} months`
          : null,
      });
    }

    // Taxes/insurance inclusion change
    if (snapshot.includeTaxesInsurance !== currentSnapshot.includeTaxesInsurance) {
      const monthlyDiff = currentSnapshot.monthlyTotal - snapshot.monthlyTotal;
      changes.push({
        scenarioId: snapshot.scenarioId,
        scenarioName: current.name,
        field: "includeTaxesInsurance",
        fieldLabel: "Taxes & insurance",
        oldValue: snapshot.includeTaxesInsurance ? "Included" : "Not included",
        newValue: currentSnapshot.includeTaxesInsurance ? "Included" : "Not included",
        impact: monthlyDiff !== 0
          ? `Monthly payment ${monthlyDiff > 0 ? "increased" : "decreased"} by ${formatCurrency(Math.abs(monthlyDiff))}`
          : null,
      });
    }

    // Significant monthly payment change (>$50) not explained by above
    const monthlyDiff = currentSnapshot.monthlyTotal - snapshot.monthlyTotal;
    const hasMonthlyExplanation = changes.some(
      (c) => c.scenarioId === snapshot.scenarioId && 
             (c.field === "interestRate" || c.field === "loanAmount" || 
              c.field === "loanTerm" || c.field === "includeTaxesInsurance")
    );
    if (Math.abs(monthlyDiff) >= 50 && !hasMonthlyExplanation) {
      changes.push({
        scenarioId: snapshot.scenarioId,
        scenarioName: current.name,
        field: "monthlyPayment",
        fieldLabel: "Monthly payment",
        oldValue: formatCurrency(snapshot.monthlyTotal),
        newValue: formatCurrency(currentSnapshot.monthlyTotal),
        impact: null,
      });
    }
  }

  return changes;
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
  /** Decision confidence language - calm, advisory statement (no scores/gauges) */
  confidenceStatement: string | null;
  /** Assumption sensitivity hints - max 2 items explaining what drives outcomes */
  sensitivityHints: string[];
}

/**
 * Generate a canonical comparison summary following strict priority rules.
 */
export function generateComparisonSummary(scenarios: ScenarioData[]): ComparisonSummary | null {
  if (scenarios.length < 2) return null;

  const analyzed: AnalyzedScenario[] = scenarios.map((s) => ({
    scenario: s,
    monthlyPayment: s.results.monthlyTotal,
    totalInterest: s.results.totalInterest,
    totalCost: s.results.totalCost,
    payoffMonths: s.results.payoffMonths,
  }));

  const byTotalInterest = [...analyzed].sort((a, b) => a.totalInterest - b.totalInterest);
  const byPayoffMonths = [...analyzed].sort((a, b) => a.payoffMonths - b.payoffMonths);
  const byMonthlyPayment = [...analyzed].sort((a, b) => a.monthlyPayment - b.monthlyPayment);

  let recommended = byTotalInterest[0];

  const lowestInterest = byTotalInterest[0].totalInterest;
  const tiedByInterest = byTotalInterest.filter(
    (a) => a.totalInterest <= lowestInterest * 1.01
  );
  if (tiedByInterest.length > 1) {
    tiedByInterest.sort((a, b) => a.totalCost - b.totalCost);
    recommended = tiedByInterest[0];
  }

  const shortestPayoff = byPayoffMonths[0];
  if (shortestPayoff.scenario.id !== recommended.scenario.id) {
    const payoffRatio = shortestPayoff.payoffMonths / recommended.payoffMonths;
    const interestRatio = shortestPayoff.totalInterest / recommended.totalInterest;
    if (payoffRatio <= 0.9 && interestRatio <= 1.05) {
      recommended = shortestPayoff;
    }
  }

  const lowestMonthly = byMonthlyPayment[0];
  if (lowestMonthly.scenario.id !== recommended.scenario.id) {
    const monthlyRatio = lowestMonthly.monthlyPayment / recommended.monthlyPayment;
    if (monthlyRatio <= 0.95) {
      const interestRatio = lowestMonthly.totalInterest / recommended.totalInterest;
      if (interestRatio <= 1.10) {
        recommended = lowestMonthly;
      }
    }
  }

  const others = analyzed.filter((a) => a.scenario.id !== recommended.scenario.id);

  let reason = "";
  if (recommended.scenario.id === byTotalInterest[0].scenario.id) {
    reason = "This option provides the lowest total interest over the life of the loan";
  } else if (recommended.scenario.id === byPayoffMonths[0].scenario.id) {
    reason = "This option provides the fastest path to debt freedom";
  } else if (recommended.scenario.id === byMonthlyPayment[0].scenario.id) {
    reason = "This option provides meaningful monthly savings with acceptable lifetime cost";
  }

  if (recommended.scenario.id === byTotalInterest[0].scenario.id && 
      recommended.scenario.id === byMonthlyPayment[0].scenario.id) {
    reason = "This option provides both the lowest monthly payment and lowest total interest";
  }

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

  const tradeoffs: { statement: string; detail?: string }[] = [];
  let alternativeScenario: ComparisonSummary["alternativeScenario"] = null;

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

      alternativeScenario = {
        scenario: lowestMonthly.scenario,
        advice: `If your priority is the lowest possible monthly payment, ${lowestMonthly.scenario.name} may be preferable despite the higher lifetime cost of ${formatCurrency(interestDiff)}.`,
      };
    }
  }

  // Generate confidence statement (language-based, no scores)
  const confidenceStatement = generateConfidenceStatement(analyzed, recommended, byTotalInterest, byMonthlyPayment);
  
  // Generate sensitivity hints (max 2, only if material)
  const sensitivityHints = generateSensitivityHints(analyzed);

  return {
    recommendation: {
      scenario: recommended.scenario,
      reason,
    },
    benefits,
    tradeoffs,
    alternativeScenario,
    confidenceStatement,
    sensitivityHints,
  };
}

/**
 * Generate calm, advisor-like confidence language.
 * No scores, no gauges, no absolutes.
 */
function generateConfidenceStatement(
  analyzed: AnalyzedScenario[],
  recommended: AnalyzedScenario,
  byTotalInterest: AnalyzedScenario[],
  byMonthlyPayment: AnalyzedScenario[]
): string | null {
  if (analyzed.length < 2) return null;

  const others = analyzed.filter((a) => a.scenario.id !== recommended.scenario.id);
  if (others.length === 0) return null;

  // Calculate variance to understand decision clarity
  const interestValues = analyzed.map((a) => a.totalInterest);
  const maxInterest = Math.max(...interestValues);
  const minInterest = Math.min(...interestValues);
  const interestSpread = maxInterest - minInterest;
  const interestSpreadPct = (interestSpread / minInterest) * 100;

  const monthlyValues = analyzed.map((a) => a.monthlyPayment);
  const maxMonthly = Math.max(...monthlyValues);
  const minMonthly = Math.min(...monthlyValues);
  const monthlySpread = maxMonthly - minMonthly;
  const monthlySpreadPct = (monthlySpread / minMonthly) * 100;

  // Determine the nature of the tradeoff
  const sameWinner = byTotalInterest[0].scenario.id === byMonthlyPayment[0].scenario.id;

  if (sameWinner && interestSpreadPct > 10) {
    return "This option meaningfully reduces your long-term cost.";
  }

  if (sameWinner && interestSpreadPct <= 10 && monthlySpreadPct <= 5) {
    return "The differences between these options are modest. Either choice is reasonable.";
  }

  if (!sameWinner && monthlySpreadPct > 10 && interestSpreadPct > 10) {
    return "This tradeoff is straightforward: lower monthly cost in exchange for higher total interest.";
  }

  if (!sameWinner && monthlySpreadPct <= 10) {
    return "The difference between these options is primarily timing, not monthly cost.";
  }

  // Check if it's primarily a term-length decision
  const terms = [...new Set(analyzed.map((a) => a.scenario.inputs.shared.loanTerm))];
  if (terms.length > 1) {
    return "The choice here largely depends on your preferred timeline for paying off the loan.";
  }

  return "These options represent different approaches to the same goal.";
}

/**
 * Generate assumption sensitivity hints.
 * Shows at most 2 items, only if one assumption materially outweighs others.
 */
function generateSensitivityHints(analyzed: AnalyzedScenario[]): string[] {
  if (analyzed.length < 2) return [];

  const hints: { weight: number; hint: string }[] = [];

  // Analyze interest rate impact
  const rates = analyzed.map((a) => a.scenario.inputs.shared.interestRate);
  const rateSpread = Math.max(...rates) - Math.min(...rates);
  const interestValues = analyzed.map((a) => a.totalInterest);
  const interestSpread = Math.max(...interestValues) - Math.min(...interestValues);

  if (rateSpread >= 0.25 && interestSpread > 5000) {
    hints.push({
      weight: interestSpread,
      hint: "Interest rate differences are driving most of the cost gap between these options.",
    });
  }

  // Analyze term length impact
  const terms = analyzed.map((a) => a.scenario.inputs.shared.loanTerm);
  const termSpread = Math.max(...terms) - Math.min(...terms);
  
  if (termSpread >= 5) {
    const monthlyValues = analyzed.map((a) => a.monthlyPayment);
    const monthlySpread = Math.max(...monthlyValues) - Math.min(...monthlyValues);
    
    hints.push({
      weight: monthlySpread * 12 * Math.min(...terms), // Weight by total payment difference
      hint: "Loan term length is the primary factor affecting total interest here.",
    });
  }

  // Analyze loan amount impact
  const loanAmounts = analyzed.map((a) => a.scenario.results.loanAmount);
  const loanSpread = Math.max(...loanAmounts) - Math.min(...loanAmounts);
  const loanSpreadPct = (loanSpread / Math.min(...loanAmounts)) * 100;

  if (loanSpreadPct >= 5 && loanSpread > 10000) {
    hints.push({
      weight: loanSpread * 0.05, // Rough interest impact
      hint: "Differences in down payment are significantly affecting total interest paid.",
    });
  }

  // Analyze extra payments
  const extraPayments = analyzed.map((a) => a.scenario.inputs.shared.extraMonthlyPayment || 0);
  const hasExtraPayments = extraPayments.some((e) => e > 0);
  const extraSpread = Math.max(...extraPayments) - Math.min(...extraPayments);

  if (hasExtraPayments && extraSpread >= 100) {
    hints.push({
      weight: extraSpread * 12, // Annual extra payment difference
      hint: "Extra monthly payments are materially shortening the payoff timeline in some options.",
    });
  }

  // Sort by weight and return top 2
  hints.sort((a, b) => b.weight - a.weight);
  return hints.slice(0, 2).map((h) => h.hint);
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
  scenarios: ScenarioData[],
  name?: string
): SavedComparison {
  const now = new Date();
  const snapshots = scenarioIds
    .map((id) => scenarios.find((s) => s.id === id))
    .filter((s): s is ScenarioData => s !== undefined)
    .map(createScenarioSnapshot);

  return {
    id: generateComparisonId(),
    name: name ?? getDefaultComparisonName(),
    scenarioIds: [...scenarioIds],
    schemaVersion: COMPARISON_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    lastViewedAt: now,
    scenarioSnapshots: snapshots,
  };
}

export function updateComparisonScenarios(
  comparison: SavedComparison,
  scenarioIds: string[],
  scenarios: ScenarioData[]
): SavedComparison {
  const snapshots = scenarioIds
    .map((id) => scenarios.find((s) => s.id === id))
    .filter((s): s is ScenarioData => s !== undefined)
    .map(createScenarioSnapshot);

  return {
    ...comparison,
    scenarioIds: [...scenarioIds],
    scenarioSnapshots: snapshots,
    updatedAt: new Date(),
    lastViewedAt: new Date(),
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

export function markComparisonViewed(
  comparison: SavedComparison,
  scenarios: ScenarioData[]
): SavedComparison {
  const snapshots = comparison.scenarioIds
    .map((id) => scenarios.find((s) => s.id === id))
    .filter((s): s is ScenarioData => s !== undefined)
    .map(createScenarioSnapshot);

  return {
    ...comparison,
    lastViewedAt: new Date(),
    scenarioSnapshots: snapshots,
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

function migrate_v0_to_v1(raw: Record<string, unknown>): Record<string, unknown> {
  const now = new Date();
  
  const id = typeof raw.id === "string" ? raw.id : generateComparisonId();
  const name = typeof raw.name === "string" ? raw.name : getDefaultComparisonName();
  
  let scenarioIds: string[] = [];
  if (Array.isArray(raw.scenarioIds)) {
    scenarioIds = raw.scenarioIds.filter((id): id is string => typeof id === "string");
  } else if (Array.isArray(raw.scenario_ids)) {
    scenarioIds = raw.scenario_ids.filter((id): id is string => typeof id === "string");
  }
  
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
    schemaVersion: 1,
    createdAt,
    updatedAt,
  };
}

function migrate_v1_to_v2(raw: Record<string, unknown>): SavedComparison {
  return {
    id: raw.id as string,
    name: raw.name as string,
    scenarioIds: raw.scenarioIds as string[],
    schemaVersion: COMPARISON_SCHEMA_VERSION,
    createdAt: new Date(raw.createdAt as string | number | Date),
    updatedAt: new Date(raw.updatedAt as string | number | Date),
    // v2 additions - initialize as null/empty since we have no prior snapshot
    lastViewedAt: null,
    scenarioSnapshots: [],
  };
}

export function migrateComparison(raw: unknown): ComparisonMigrationResult {
  if (typeof raw !== "object" || raw === null) {
    return { success: false, error: "Invalid comparison: not an object" };
  }
  
  let record = raw as Record<string, unknown>;
  let version = getComparisonSchemaVersion(record);
  
  try {
    // Run migrations in sequence
    if (version === 0) {
      console.log("[ComparisonMigration] Migrating v0 → v1");
      record = migrate_v0_to_v1(record);
      version = 1;
    }
    
    if (version === 1) {
      console.log("[ComparisonMigration] Migrating v1 → v2");
      const comparison = migrate_v1_to_v2(record);
      return { success: true, comparison };
    }
    
    if (version === COMPARISON_SCHEMA_VERSION) {
      // Already current version
      const comparison: SavedComparison = {
        id: record.id as string,
        name: record.name as string,
        scenarioIds: record.scenarioIds as string[],
        schemaVersion: COMPARISON_SCHEMA_VERSION,
        createdAt: new Date(record.createdAt as string | number | Date),
        updatedAt: new Date(record.updatedAt as string | number | Date),
        lastViewedAt: record.lastViewedAt 
          ? new Date(record.lastViewedAt as string | number | Date) 
          : null,
        scenarioSnapshots: (record.scenarioSnapshots as ScenarioSnapshot[]) ?? [],
      };
      return { success: true, comparison };
    }
    
    return { 
      success: false, 
      error: `Unknown comparison schema version: ${version}` 
    };
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
