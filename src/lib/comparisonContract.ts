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

// Tie thresholds - differences within these ranges are "effectively the same"
export const TIE_THRESHOLDS = {
  monthly: 25,           // $25/mo
  totalInterest: 2500,   // $2,500
  totalCost: 2500,       // $2,500
  payoffMonths: 3,       // 3 months
  cashAtClose: 500,      // $500
} as const;

// Conflict override threshold
export const TOTAL_COST_OVERRIDE_THRESHOLD = 15000; // $15,000

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
 * Only returns changes that exceed tie thresholds (to avoid noise).
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

    // Interest rate change (threshold: 0.125% - half a typical rate step)
    if (Math.abs(snapshot.interestRate - currentSnapshot.interestRate) >= 0.125) {
      const interestDiff = currentSnapshot.totalInterest - snapshot.totalInterest;
      changes.push({
        scenarioId: snapshot.scenarioId,
        scenarioName: current.name,
        field: "interestRate",
        fieldLabel: "Interest rate",
        oldValue: formatPercent(snapshot.interestRate),
        newValue: formatPercent(currentSnapshot.interestRate),
        impact: Math.abs(interestDiff) >= TIE_THRESHOLDS.totalInterest
          ? `This ${interestDiff > 0 ? "increased" : "decreased"} total interest by ${formatCurrency(Math.abs(interestDiff))}`
          : null,
      });
    }

    // Loan amount change (threshold: $2,500)
    if (Math.abs(snapshot.loanAmount - currentSnapshot.loanAmount) >= 2500) {
      const interestDiff = currentSnapshot.totalInterest - snapshot.totalInterest;
      changes.push({
        scenarioId: snapshot.scenarioId,
        scenarioName: current.name,
        field: "loanAmount",
        fieldLabel: "Loan amount",
        oldValue: formatCurrency(snapshot.loanAmount),
        newValue: formatCurrency(currentSnapshot.loanAmount),
        impact: Math.abs(interestDiff) >= TIE_THRESHOLDS.totalInterest
          ? `This ${interestDiff > 0 ? "increased" : "decreased"} total interest by ${formatCurrency(Math.abs(interestDiff))}`
          : null,
      });
    }

    // Term length change (any change is material)
    if (snapshot.loanTerm !== currentSnapshot.loanTerm) {
      const monthsDiff = currentSnapshot.payoffMonths - snapshot.payoffMonths;
      changes.push({
        scenarioId: snapshot.scenarioId,
        scenarioName: current.name,
        field: "loanTerm",
        fieldLabel: "Loan term",
        oldValue: `${snapshot.loanTerm} years`,
        newValue: `${currentSnapshot.loanTerm} years`,
        impact: Math.abs(monthsDiff) >= TIE_THRESHOLDS.payoffMonths
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
        impact: Math.abs(monthlyDiff) >= TIE_THRESHOLDS.monthly
          ? `Monthly payment ${monthlyDiff > 0 ? "increased" : "decreased"} by ${formatCurrency(Math.abs(monthlyDiff))}`
          : null,
      });
    }

    // Monthly payment change (only if exceeds threshold and not explained by above)
    const monthlyDiff = currentSnapshot.monthlyTotal - snapshot.monthlyTotal;
    const hasMonthlyExplanation = changes.some(
      (c) => c.scenarioId === snapshot.scenarioId && 
             (c.field === "interestRate" || c.field === "loanAmount" || 
              c.field === "loanTerm" || c.field === "includeTaxesInsurance")
    );
    if (Math.abs(monthlyDiff) >= TIE_THRESHOLDS.monthly && !hasMonthlyExplanation) {
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

    // Total interest change (only if exceeds threshold and not explained by above)
    const totalInterestDiff = currentSnapshot.totalInterest - snapshot.totalInterest;
    const hasInterestExplanation = changes.some(
      (c) => c.scenarioId === snapshot.scenarioId && 
             (c.field === "interestRate" || c.field === "loanAmount" || c.field === "loanTerm")
    );
    if (Math.abs(totalInterestDiff) >= TIE_THRESHOLDS.totalInterest && !hasInterestExplanation) {
      changes.push({
        scenarioId: snapshot.scenarioId,
        scenarioName: current.name,
        field: "totalInterest",
        fieldLabel: "Total interest",
        oldValue: formatCurrency(snapshot.totalInterest),
        newValue: formatCurrency(currentSnapshot.totalInterest),
        impact: null,
      });
    }
  }

  return changes;
}

// ============================================================================
// COMPARISON SUMMARY CONTRACT - DETERMINISTIC RECOMMENDATION ENGINE
// ============================================================================

interface AnalyzedScenario {
  scenario: ScenarioData;
  monthlyPayment: number;       // Monthly total (P&I + T&I if included)
  monthlyPI: number;            // Monthly P&I only
  totalInterest: number;
  totalCost: number;
  payoffMonths: number;
  cashAtClose: number;
}

/**
 * Winner determination result for a metric
 */
interface MetricWinner {
  winnerId: string | null;
  winnerValue: number;
  isTie: boolean;
  tieMembersIds: string[];
  marginOverNext: number;
}

export interface RecommendationOutput {
  /** Recommended scenario (null if "two strong options") */
  recommendedId: string | null;
  /** Headline reason */
  headline: string;
  /** Whether this is a clear winner or "two strong options" */
  isClearWinner: boolean;
  /** Ordered summary lines */
  summaryLines: string[];
  /** Tradeoff line (only if conflicts exist) */
  tradeoffLine: string | null;
}

export interface ComparisonSummary {
  recommendation: {
    scenario: ScenarioData;
    reason: string;
  } | null;
  /** Full recommendation output */
  recommendationOutput: RecommendationOutput | null;
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
 * Determine winner for a metric using tie threshold
 */
function determineWinner(
  analyzed: AnalyzedScenario[],
  getValue: (a: AnalyzedScenario) => number,
  threshold: number,
  lowerIsBetter: boolean = true
): MetricWinner {
  const sorted = [...analyzed].sort((a, b) => 
    lowerIsBetter ? getValue(a) - getValue(b) : getValue(b) - getValue(a)
  );
  
  const bestValue = getValue(sorted[0]);
  const tieMembersIds = sorted
    .filter((a) => Math.abs(getValue(a) - bestValue) <= threshold)
    .map((a) => a.scenario.id);
  
  const isTie = tieMembersIds.length > 1;
  const marginOverNext = sorted.length > 1 
    ? Math.abs(getValue(sorted[0]) - getValue(sorted[1]))
    : 0;
  
  return {
    winnerId: isTie ? null : sorted[0].scenario.id,
    winnerValue: bestValue,
    isTie,
    tieMembersIds,
    marginOverNext,
  };
}

/**
 * Calculate cash required at close for a scenario
 */
function calculateCashAtClose(scenario: ScenarioData): number {
  if (scenario.inputs.mode === "purchase") {
    const { purchasePrice, downPayment, downPaymentType } = scenario.inputs.purchase;
    const downPaymentAmount = downPaymentType === "percent"
      ? (purchasePrice * downPayment) / 100
      : downPayment;
    // Estimate closing costs at 3% + prepaid expenses
    const closingCosts = purchasePrice * 0.03;
    return downPaymentAmount + closingCosts;
  } else {
    // Refinance: closing costs (if not financed) + any adjustments
    const closingCosts = scenario.inputs.refinance.financeClosingCosts 
      ? 0 
      : scenario.inputs.refinance.closingCosts;
    return closingCosts;
  }
}

/**
 * Generate a canonical comparison summary following strict priority rules.
 * 
 * RECOMMENDATION ENGINE LOGIC:
 * 1. Compute winners across: lowest monthly, lowest total interest, lowest total cost,
 *    fastest payoff, lowest cash at close
 * 2. Use tie thresholds to determine "effectively the same"
 * 3. Primary metric: Monthly total (for both purchase and refi)
 * 4. If primary metric winner by > threshold, recommend unless total cost worse by ≥$15k
 * 5. If primary tied, use total cost → fastest payoff → lowest cash at close
 * 6. If no clean winner, output "Two strong options"
 */
export function generateComparisonSummary(scenarios: ScenarioData[]): ComparisonSummary | null {
  if (scenarios.length < 2) return null;

  const analyzed: AnalyzedScenario[] = scenarios.map((s) => ({
    scenario: s,
    monthlyPayment: s.results.monthlyTotal,
    monthlyPI: s.results.monthlyPrincipalInterest,
    totalInterest: s.results.totalInterest,
    totalCost: s.results.totalCost,
    payoffMonths: s.results.payoffMonths,
    cashAtClose: calculateCashAtClose(s),
  }));

  // Determine winners for each metric
  const monthlyWinner = determineWinner(analyzed, (a) => a.monthlyPayment, TIE_THRESHOLDS.monthly);
  const totalInterestWinner = determineWinner(analyzed, (a) => a.totalInterest, TIE_THRESHOLDS.totalInterest);
  const totalCostWinner = determineWinner(analyzed, (a) => a.totalCost, TIE_THRESHOLDS.totalCost);
  const payoffWinner = determineWinner(analyzed, (a) => a.payoffMonths, TIE_THRESHOLDS.payoffMonths);
  const cashWinner = determineWinner(analyzed, (a) => a.cashAtClose, TIE_THRESHOLDS.cashAtClose);

  // Primary metric is monthly payment for both modes
  const primaryWinner = monthlyWinner;
  
  // Determine recommended scenario
  let recommendedId: string | null = null;
  let isClearWinner = false;
  let headline = "";
  let tradeoffLine: string | null = null;

  if (!primaryWinner.isTie && primaryWinner.winnerId) {
    // Primary metric has a clear winner
    const primaryScenario = analyzed.find((a) => a.scenario.id === primaryWinner.winnerId)!;
    const totalCostScenario = analyzed.find((a) => a.scenario.id === totalCostWinner.winnerId);
    
    // Check for override: winner is significantly worse on total cost
    if (totalCostScenario && totalCostScenario.scenario.id !== primaryScenario.scenario.id) {
      const costDifference = primaryScenario.totalCost - totalCostScenario.totalCost;
      
      if (costDifference >= TOTAL_COST_OVERRIDE_THRESHOLD) {
        // Total cost difference is too significant - recommend based on total cost
        recommendedId = totalCostScenario.scenario.id;
        isClearWinner = true;
        headline = `${totalCostScenario.scenario.name} provides the lowest total cost over the life of the loan`;
        tradeoffLine = `${primaryScenario.scenario.name} has a lower monthly payment but costs ${formatCurrency(costDifference)} more overall.`;
      } else {
        // Primary metric winner stands
        recommendedId = primaryWinner.winnerId;
        isClearWinner = true;
        headline = `${primaryScenario.scenario.name} provides the lowest monthly payment`;
        
        if (costDifference > TIE_THRESHOLDS.totalCost) {
          tradeoffLine = `This option costs ${formatCurrency(costDifference)} more over the full term than ${totalCostScenario.scenario.name}.`;
        }
      }
    } else {
      // Primary winner is also best/tied on total cost
      recommendedId = primaryWinner.winnerId;
      isClearWinner = true;
      
      if (totalCostWinner.winnerId === primaryWinner.winnerId) {
        headline = `${primaryScenario.scenario.name} provides both the lowest monthly payment and lowest total cost`;
      } else {
        headline = `${primaryScenario.scenario.name} provides the lowest monthly payment`;
      }
    }
  } else if (primaryWinner.isTie) {
    // Primary metric is tied - use tiebreakers
    const tiedScenarios = analyzed.filter((a) => primaryWinner.tieMembersIds.includes(a.scenario.id));
    
    // Tiebreaker 1: Total cost
    const tiedTotalCostWinner = determineWinner(tiedScenarios, (a) => a.totalCost, TIE_THRESHOLDS.totalCost);
    
    if (!tiedTotalCostWinner.isTie && tiedTotalCostWinner.winnerId) {
      recommendedId = tiedTotalCostWinner.winnerId;
      isClearWinner = true;
      const winnerScenario = analyzed.find((a) => a.scenario.id === recommendedId)!;
      headline = `${winnerScenario.scenario.name} offers lower total cost with a similar monthly payment`;
    } else {
      // Tiebreaker 2: Fastest payoff
      const tiedPayoffWinner = determineWinner(tiedScenarios, (a) => a.payoffMonths, TIE_THRESHOLDS.payoffMonths);
      
      if (!tiedPayoffWinner.isTie && tiedPayoffWinner.winnerId) {
        recommendedId = tiedPayoffWinner.winnerId;
        isClearWinner = true;
        const winnerScenario = analyzed.find((a) => a.scenario.id === recommendedId)!;
        headline = `${winnerScenario.scenario.name} provides a faster path to payoff`;
      } else {
        // Tiebreaker 3: Lowest cash at close
        const tiedCashWinner = determineWinner(tiedScenarios, (a) => a.cashAtClose, TIE_THRESHOLDS.cashAtClose);
        
        if (!tiedCashWinner.isTie && tiedCashWinner.winnerId) {
          recommendedId = tiedCashWinner.winnerId;
          isClearWinner = true;
          const winnerScenario = analyzed.find((a) => a.scenario.id === recommendedId)!;
          headline = `${winnerScenario.scenario.name} requires less cash at closing`;
        } else {
          // No clean winner
          isClearWinner = false;
          headline = "Two strong options";
          
          // Generate tradeoff description for the tied scenarios
          if (tiedScenarios.length >= 2) {
            const s1 = tiedScenarios[0];
            const s2 = tiedScenarios[1];
            tradeoffLine = `Both options are effectively equivalent on monthly cost. ${s1.scenario.name} and ${s2.scenario.name} represent similar value.`;
          }
        }
      }
    }
  }

  // Build summary lines
  const summaryLines: string[] = [];
  const recommendedScenario = recommendedId 
    ? analyzed.find((a) => a.scenario.id === recommendedId)
    : null;
  const others = analyzed.filter((a) => a.scenario.id !== recommendedId);

  if (recommendedScenario && others.length > 0) {
    // Monthly lead
    const monthlyDiff = others[0].monthlyPayment - recommendedScenario.monthlyPayment;
    if (Math.abs(monthlyDiff) > TIE_THRESHOLDS.monthly) {
      summaryLines.push(
        monthlyDiff > 0 
          ? `${formatCurrency(monthlyDiff)} lower monthly payment`
          : `Monthly payment is effectively the same`
      );
    } else {
      summaryLines.push(`Monthly payment is effectively the same`);
    }

    // Total cost
    const costDiff = others[0].totalCost - recommendedScenario.totalCost;
    if (Math.abs(costDiff) > TIE_THRESHOLDS.totalCost) {
      summaryLines.push(
        costDiff > 0
          ? `${formatCurrency(costDiff)} less in total cost over the life of the loan`
          : `Total cost is effectively the same`
      );
    }

    // Payoff timeline
    const monthsDiff = others[0].payoffMonths - recommendedScenario.payoffMonths;
    if (Math.abs(monthsDiff) > TIE_THRESHOLDS.payoffMonths) {
      summaryLines.push(
        monthsDiff > 0
          ? `${monthsDiff} months shorter payoff timeline`
          : `Similar payoff timeline`
      );
    }

    // Cash at close
    const cashDiff = others[0].cashAtClose - recommendedScenario.cashAtClose;
    if (Math.abs(cashDiff) > TIE_THRESHOLDS.cashAtClose) {
      summaryLines.push(
        cashDiff > 0
          ? `${formatCurrency(cashDiff)} less cash required at close`
          : `Similar cash required at close`
      );
    }
  }

  // Build recommendation output
  const recommendationOutput: RecommendationOutput = {
    recommendedId,
    headline,
    isClearWinner,
    summaryLines,
    tradeoffLine,
  };

  // Legacy fields for backward compatibility
  const recommended = recommendedId 
    ? analyzed.find((a) => a.scenario.id === recommendedId)
    : analyzed[0];

  const byTotalInterest = [...analyzed].sort((a, b) => a.totalInterest - b.totalInterest);
  const byMonthlyPayment = [...analyzed].sort((a, b) => a.monthlyPayment - b.monthlyPayment);

  // Generate benefits
  const benefits: string[] = [];
  if (recommendedId) {
    others.forEach((other) => {
      const monthlyDiff = other.monthlyPayment - recommended!.monthlyPayment;
      if (monthlyDiff > TIE_THRESHOLDS.monthly) {
        benefits.push(
          `${formatCurrency(monthlyDiff)} lower monthly payment compared to ${other.scenario.name}`
        );
      }
    });

    others.forEach((other) => {
      const interestDiff = other.totalInterest - recommended!.totalInterest;
      if (interestDiff > TIE_THRESHOLDS.totalInterest) {
        benefits.push(
          `${formatCurrency(interestDiff)} less total interest over the life of the loan`
        );
      }
    });

    others.forEach((other) => {
      const monthsDiff = other.payoffMonths - recommended!.payoffMonths;
      if (monthsDiff > TIE_THRESHOLDS.payoffMonths) {
        benefits.push(
          `Shorter payoff timeline (${recommended!.payoffMonths} months vs. ${other.payoffMonths} months)`
        );
      }
    });
  }

  // Generate tradeoffs
  const tradeoffs: { statement: string; detail?: string }[] = [];
  let alternativeScenario: ComparisonSummary["alternativeScenario"] = null;

  const lowestMonthly = byMonthlyPayment[0];
  if (recommendedId && lowestMonthly.scenario.id !== recommendedId) {
    const monthlyDiff = recommended!.monthlyPayment - lowestMonthly.monthlyPayment;
    if (monthlyDiff > TIE_THRESHOLDS.monthly) {
      tradeoffs.push({
        statement: `Requires a higher monthly payment than ${lowestMonthly.scenario.name}`,
      });

      const interestDiff = lowestMonthly.totalInterest - recommended!.totalInterest;
      if (Math.abs(interestDiff) > TIE_THRESHOLDS.totalInterest) {
        tradeoffs.push({
          statement: `${lowestMonthly.scenario.name} minimizes monthly cost`,
          detail: interestDiff > 0 
            ? `but increases total interest paid by ${formatCurrency(interestDiff)}`
            : `and also saves ${formatCurrency(Math.abs(interestDiff))} in total interest`,
        });
      }

      alternativeScenario = {
        scenario: lowestMonthly.scenario,
        advice: `If your priority is the lowest possible monthly payment, ${lowestMonthly.scenario.name} may be preferable despite the higher lifetime cost of ${formatCurrency(interestDiff > 0 ? interestDiff : 0)}.`,
      };
    }
  }

  // Generate confidence statement
  const confidenceStatement = generateConfidenceStatement(analyzed, recommended!, byTotalInterest, byMonthlyPayment);
  
  // Generate sensitivity hints
  const sensitivityHints = generateSensitivityHints(analyzed);

  return {
    recommendation: recommendedId ? {
      scenario: recommended!.scenario,
      reason: headline,
    } : null,
    recommendationOutput,
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
