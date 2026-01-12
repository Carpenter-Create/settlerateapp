/**
 * Quantified Decision Summary for Comparisons
 * 
 * Displays a dynamically generated analytical summary of the comparison
 * with percentage-based differences. Neutral, institutional tone.
 * 
 * Calculation baseline: Scenario B (unless otherwise specified)
 */

import { ScenarioData } from "@/lib/scenarioContract";

interface ComparisonSummaryProps {
  scenarioA: ScenarioData;
  scenarioB: ScenarioData;
}

interface ComparisonDeltas {
  monthlyPaymentDelta: number | null;    // Percentage
  totalCostDelta: number | null;         // Percentage
  totalInterestDelta: number | null;     // Percentage
  interestRateDelta: number | null;      // Basis points
  ltvDelta: number | null;               // Absolute percentage points
}

/**
 * Calculate percentage deltas between two scenarios
 * Baseline: Scenario B
 */
function calculateDeltas(a: ScenarioData, b: ScenarioData): ComparisonDeltas {
  const aMonthly = a.results.monthlyTotal;
  const bMonthly = b.results.monthlyTotal;
  const aTotalCost = a.results.totalCost;
  const bTotalCost = b.results.totalCost;
  const aTotalInterest = a.results.totalInterest;
  const bTotalInterest = b.results.totalInterest;
  const aRate = a.inputs.shared?.interestRate ?? 0;
  const bRate = b.inputs.shared?.interestRate ?? 0;
  const aLtv = a.results.ltvRatio ?? 0;
  const bLtv = b.results.ltvRatio ?? 0;

  return {
    monthlyPaymentDelta: bMonthly && bMonthly > 0 && aMonthly != null
      ? ((aMonthly - bMonthly) / bMonthly) * 100
      : null,
    totalCostDelta: bTotalCost && bTotalCost > 0 && aTotalCost != null
      ? ((aTotalCost - bTotalCost) / bTotalCost) * 100
      : null,
    totalInterestDelta: bTotalInterest && bTotalInterest > 0
      ? ((aTotalInterest - bTotalInterest) / bTotalInterest) * 100
      : null,
    interestRateDelta: (aRate - bRate) * 100, // Convert to basis points
    ltvDelta: aLtv - bLtv, // Absolute percentage points
  };
}

/**
 * Format a percentage with appropriate precision:
 * - Whole numbers if ≥ 5%
 * - One decimal if < 5%
 */
function formatDeltaPercent(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 5) {
    return `${Math.round(absValue)}%`;
  }
  return `${absValue.toFixed(1)}%`;
}

/**
 * Format basis points
 */
function formatBasisPoints(bps: number): string {
  const absBps = Math.abs(bps);
  if (absBps < 10) {
    return `${absBps.toFixed(1)} basis point${absBps === 1 ? "" : "s"}`;
  }
  return `${Math.round(absBps)} basis points`;
}

/**
 * Determine the comparison pattern based on deltas
 */
type ComparisonPattern = "tradeoff" | "cost_efficient" | "minimal_difference" | "insufficient_data";

function determinePattern(deltas: ComparisonDeltas): ComparisonPattern {
  const { monthlyPaymentDelta, totalCostDelta, totalInterestDelta } = deltas;

  // Check for insufficient data
  if (monthlyPaymentDelta === null || totalCostDelta === null) {
    return "insufficient_data";
  }

  const absMonthly = Math.abs(monthlyPaymentDelta);
  const absTotalCost = Math.abs(totalCostDelta);
  const absInterest = Math.abs(totalInterestDelta ?? 0);

  // Minimal difference: all key metrics < 3%
  if (absMonthly < 3 && absTotalCost < 3 && absInterest < 3) {
    return "minimal_difference";
  }

  // Tradeoff: monthly and total cost move in opposite directions
  // OR monthly and interest move in opposite directions
  const monthlyVsCost = monthlyPaymentDelta * totalCostDelta < 0;
  const monthlyVsInterest = totalInterestDelta !== null && monthlyPaymentDelta * totalInterestDelta < 0;
  
  if (monthlyVsCost || monthlyVsInterest) {
    return "tradeoff";
  }

  // Cost efficient: Scenario A is better across metrics
  return "cost_efficient";
}

/**
 * Generate institutional summary copy based on pattern and deltas
 */
function generateSummaryCopy(
  deltas: ComparisonDeltas,
  pattern: ComparisonPattern,
  nameA: string,
  nameB: string
): string[] {
  const { monthlyPaymentDelta, totalCostDelta, totalInterestDelta, interestRateDelta, ltvDelta } = deltas;

  if (pattern === "insufficient_data") {
    return ["Comparison data is incomplete. Additional scenario inputs may be required to generate a quantitative summary."];
  }

  const sentences: string[] = [];
  const displayNameA = nameA || "Scenario A";
  const displayNameB = nameB || "Scenario B";

  if (pattern === "minimal_difference") {
    sentences.push(
      `The modeled outcomes between the two scenarios differ by less than 3% across monthly payment and total cost.`
    );
    
    if (interestRateDelta !== null && Math.abs(interestRateDelta) > 0) {
      sentences.push(
        `Small variations are driven by marginal differences in interest rate and loan amount, suggesting broadly similar cost profiles under the assumptions used.`
      );
    } else {
      sentences.push(
        `The scenarios reflect broadly similar cost profiles under the current assumptions.`
      );
    }
    
    return sentences;
  }

  if (pattern === "tradeoff") {
    // Build tradeoff description
    if (monthlyPaymentDelta !== null && totalInterestDelta !== null) {
      const monthlyDirection = monthlyPaymentDelta > 0 ? "higher" : "lower";
      const interestDirection = totalInterestDelta > 0 ? "higher" : "lower";
      
      sentences.push(
        `Relative to ${displayNameB}, ${displayNameA} results in ${formatDeltaPercent(monthlyPaymentDelta)} ${monthlyDirection} monthly payments, but ${formatDeltaPercent(totalInterestDelta)} ${interestDirection} total interest paid over the loan term.`
      );
    }

    if (totalCostDelta !== null) {
      const costDirection = totalCostDelta > 0 ? "higher" : "lower";
      sentences.push(
        `Total projected cost is ${formatDeltaPercent(totalCostDelta)} ${costDirection}, driven by differences in interest rate and loan structure.`
      );
    }

    sentences.push(
      `The comparison highlights a tradeoff between near-term affordability and long-term interest exposure under the modeled assumptions.`
    );

    return sentences;
  }

  // Cost efficient pattern
  if (monthlyPaymentDelta !== null) {
    const monthlyDirection = monthlyPaymentDelta > 0 ? "higher" : "lower";
    const totalCostDirection = totalCostDelta !== null ? (totalCostDelta > 0 ? "higher" : "lower") : null;
    
    if (totalCostDirection) {
      sentences.push(
        `${displayNameA} produces ${formatDeltaPercent(monthlyPaymentDelta)} ${monthlyDirection} monthly payments and a ${formatDeltaPercent(totalCostDelta!)} ${totalCostDirection} total projected cost compared to ${displayNameB}.`
      );
    } else {
      sentences.push(
        `${displayNameA} produces ${formatDeltaPercent(monthlyPaymentDelta)} ${monthlyDirection} monthly payments compared to ${displayNameB}.`
      );
    }
  }

  // Add rate/LTV context if meaningful
  const contextParts: string[] = [];
  if (interestRateDelta !== null && Math.abs(interestRateDelta) >= 5) {
    const rateDirection = interestRateDelta > 0 ? "higher" : "lower";
    contextParts.push(`a ${formatBasisPoints(interestRateDelta)} ${rateDirection} interest rate`);
  }
  if (ltvDelta !== null && Math.abs(ltvDelta) >= 1) {
    const ltvDirection = ltvDelta > 0 ? "higher" : "lower";
    contextParts.push(`a ${Math.abs(ltvDelta).toFixed(1)}% ${ltvDirection} loan-to-value ratio`);
  }

  if (contextParts.length > 0) {
    sentences.push(
      `These differences are primarily driven by ${contextParts.join(" and ")}.`
    );
  }

  // Determine summary statement
  const isABetter = (monthlyPaymentDelta !== null && monthlyPaymentDelta < 0) || 
                   (totalCostDelta !== null && totalCostDelta < 0);
  
  if (isABetter) {
    sentences.push(
      `Under the current assumptions, ${displayNameA} reflects a more cost-efficient structure.`
    );
  } else {
    sentences.push(
      `Under the current assumptions, ${displayNameB} reflects a more cost-efficient structure.`
    );
  }

  return sentences;
}

export function ComparisonSummary({ scenarioA, scenarioB }: ComparisonSummaryProps) {
  const deltas = calculateDeltas(scenarioA, scenarioB);
  const pattern = determinePattern(deltas);
  const summaryCopy = generateSummaryCopy(
    deltas,
    pattern,
    scenarioA.name,
    scenarioB.name
  );

  return (
    <div className="relative pl-4 border-l-2 border-border/40 bg-muted/30 py-5 px-5 sm:py-6 sm:px-6 rounded-r-sm">
      {/* Label */}
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
        Comparison summary
      </div>
      
      {/* Summary text */}
      <div className="space-y-2">
        {summaryCopy.map((sentence, index) => (
          <p key={index} className="text-sm text-foreground/90 leading-relaxed">
            {sentence}
          </p>
        ))}
      </div>
    </div>
  );
}
