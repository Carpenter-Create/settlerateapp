/**
 * Comparison Summary Logic
 * 
 * Shared calculation and copy generation for comparison summaries.
 * Used by both the UI component and PDF export to ensure consistency.
 * 
 * Calculation baseline: Scenario B (unless otherwise specified)
 * Supports 2 or 3 scenario comparisons.
 */

import type { ScenarioData } from "@/lib/scenarioContract";

// ============================================================================
// TYPES
// ============================================================================

export interface ComparisonDeltas {
  monthlyPaymentDelta: number | null;    // Percentage
  totalCostDelta: number | null;         // Percentage
  totalInterestDelta: number | null;     // Percentage
  interestRateDelta: number | null;      // Basis points
  ltvDelta: number | null;               // Absolute percentage points
}

export interface ThreeWayDeltas {
  aVsB: ComparisonDeltas;
  cVsB: ComparisonDeltas | null;
}

export type ComparisonPattern = "tradeoff" | "cost_efficient" | "minimal_difference" | "insufficient_data";

// ============================================================================
// CALCULATIONS
// ============================================================================

/**
 * Calculate percentage deltas between two scenarios
 * Baseline: Scenario B
 */
export function calculateDeltas(a: ScenarioData, b: ScenarioData): ComparisonDeltas {
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
 * Calculate deltas for 2 or 3 scenario comparison
 * Returns A vs B and optionally C vs B
 */
export function calculateThreeWayDeltas(
  scenarioA: ScenarioData,
  scenarioB: ScenarioData,
  scenarioC?: ScenarioData | null
): ThreeWayDeltas {
  return {
    aVsB: calculateDeltas(scenarioA, scenarioB),
    cVsB: scenarioC ? calculateDeltas(scenarioC, scenarioB) : null,
  };
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format a percentage with appropriate precision:
 * - Whole numbers if ≥ 5%
 * - One decimal if < 5%
 */
export function formatDeltaPercent(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 5) {
    return `${Math.round(absValue)}%`;
  }
  return `${absValue.toFixed(1)}%`;
}

/**
 * Format delta with sign for display
 */
export function formatSignedDelta(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatDeltaPercent(value)}`;
}

/**
 * Format basis points to percentage for user-facing copy
 * Primary: percentage (e.g., "0.25%")
 * 
 * LANGUAGE GUARDRAIL:
 * All user-facing financial deltas must be expressed in plain-language percentages.
 * Industry terms may be included only if spelled out and numerically clarified.
 */
export function formatRateDeltaAsPercent(bps: number): string {
  const absPercent = Math.abs(bps / 100);
  // Use 2 decimal places for interest rate percentages (standard precision)
  return `${absPercent.toFixed(2)}%`;
}

/**
 * Format interest rate delta for prose copy with optional basis points explanation
 * Example: "0.25% (25 basis points)"
 */
export function formatRateDeltaForCopy(bps: number, includeBasicPoints = false): string {
  const absPercent = Math.abs(bps / 100);
  const percentStr = `${absPercent.toFixed(2)}%`;
  
  if (!includeBasicPoints || Math.abs(bps) < 1) {
    return percentStr;
  }
  
  const absBps = Math.abs(bps);
  const bpsStr = absBps < 10 
    ? `${absBps.toFixed(1)} basis points`
    : `${Math.round(absBps)} basis points`;
  
  return `${percentStr} (${bpsStr})`;
}

/**
 * Format signed basis points for compact display (key metrics row)
 * Uses percentage as primary with bps as secondary
 */
export function formatSignedBasisPoints(bps: number | null): string {
  if (bps === null) return "—";
  const sign = bps > 0 ? "+" : bps < 0 ? "−" : "";
  const absPercent = Math.abs(bps / 100);
  // For compact display, show percentage with bps in parentheses
  const percentStr = `${absPercent.toFixed(2)}%`;
  const absBps = Math.abs(bps);
  const bpsStr = absBps < 10 ? `${absBps.toFixed(1)}` : `${Math.round(absBps)}`;
  return `${sign}${percentStr} (${bpsStr} bps)`;
}

/**
 * Format LTV delta for display
 */
export function formatLtvDelta(delta: number | null): string {
  if (delta === null) return "—";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)} pts`;
}

// ============================================================================
// PATTERN DETECTION
// ============================================================================

/**
 * Determine the comparison pattern based on deltas
 */
export function determinePattern(deltas: ComparisonDeltas): ComparisonPattern {
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

// ============================================================================
// COPY GENERATION
// ============================================================================

/**
 * Generate institutional summary copy based on pattern and deltas (2 scenarios)
 */
export function generateSummaryCopy(
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
  // LANGUAGE GUARDRAIL: Use plain percentages, with optional spelled-out basis points
  const contextParts: string[] = [];
  if (interestRateDelta !== null && Math.abs(interestRateDelta) >= 5) {
    const rateDirection = interestRateDelta > 0 ? "higher" : "lower";
    // Use percentage as primary, with basis points spelled out in parentheses
    contextParts.push(`a ${formatRateDeltaForCopy(interestRateDelta, true)} ${rateDirection} interest rate`);
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

/**
 * Generate institutional summary copy for 3-scenario comparison
 * Compares A vs B and C vs B (B is baseline)
 */
export function generateThreeWaySummaryCopy(
  threeWayDeltas: ThreeWayDeltas,
  nameA: string,
  nameB: string,
  nameC: string
): string[] {
  const { aVsB, cVsB } = threeWayDeltas;
  const sentences: string[] = [];
  
  const displayNameA = nameA || "Scenario A";
  const displayNameB = nameB || "Scenario B";
  const displayNameC = nameC || "Scenario C";

  // Check for insufficient data
  if (aVsB.monthlyPaymentDelta === null || aVsB.totalCostDelta === null) {
    return ["Comparison data is incomplete. Additional scenario inputs may be required to generate a quantitative summary."];
  }

  // A vs B summary
  const aMonthlyDir = aVsB.monthlyPaymentDelta > 0 ? "higher" : "lower";
  const aCostDir = aVsB.totalCostDelta > 0 ? "higher" : "lower";
  
  sentences.push(
    `Relative to ${displayNameB}, ${displayNameA} produces ${formatDeltaPercent(aVsB.monthlyPaymentDelta)} ${aMonthlyDir} monthly payments and ${formatDeltaPercent(aVsB.totalCostDelta)} ${aCostDir} total projected cost.`
  );

  // C vs B summary (if available)
  if (cVsB && cVsB.monthlyPaymentDelta !== null && cVsB.totalCostDelta !== null) {
    const cMonthlyDir = cVsB.monthlyPaymentDelta > 0 ? "higher" : "lower";
    const cCostDir = cVsB.totalCostDelta > 0 ? "higher" : "lower";
    
    sentences.push(
      `${displayNameC} results in ${formatDeltaPercent(cVsB.monthlyPaymentDelta)} ${cMonthlyDir} monthly payments and ${formatDeltaPercent(cVsB.totalCostDelta)} ${cCostDir} total cost compared to ${displayNameB}.`
    );
  }

  // Add contextual insight
  const patternA = determinePattern(aVsB);
  const patternC = cVsB ? determinePattern(cVsB) : null;

  if (patternA === "minimal_difference" && patternC === "minimal_difference") {
    sentences.push(
      `All three scenarios produce broadly similar outcomes under the current assumptions.`
    );
  } else if (patternA === "tradeoff" || patternC === "tradeoff") {
    sentences.push(
      `The comparison highlights tradeoffs between near-term affordability and long-term cost across the modeled scenarios.`
    );
  } else {
    sentences.push(
      `These differences are driven by variations in interest rate, loan amount, and term structure.`
    );
  }

  return sentences;
}

/**
 * Generate the full summary text as a single string (for PDF export)
 */
export function generateSummaryText(scenarioA: ScenarioData, scenarioB: ScenarioData): string {
  const deltas = calculateDeltas(scenarioA, scenarioB);
  const pattern = determinePattern(deltas);
  const sentences = generateSummaryCopy(deltas, pattern, scenarioA.name, scenarioB.name);
  return sentences.join(" ");
}

/**
 * Generate summary text for 3-scenario comparison (for PDF export)
 */
export function generateThreeWaySummaryText(
  scenarioA: ScenarioData,
  scenarioB: ScenarioData,
  scenarioC: ScenarioData
): string {
  const threeWayDeltas = calculateThreeWayDeltas(scenarioA, scenarioB, scenarioC);
  const sentences = generateThreeWaySummaryCopy(
    threeWayDeltas,
    scenarioA.name,
    scenarioB.name,
    scenarioC.name
  );
  return sentences.join(" ");
}
