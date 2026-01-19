/**
 * Comparison Summary Logic
 * 
 * Shared calculation and copy generation for comparison summaries.
 * Used by both the UI component and PDF export to ensure consistency.
 * 
 * Calculation baseline: Scenario B (unless otherwise specified)
 * Supports 2 or 3 scenario comparisons.
 * 
 * LANGUAGE GUARDRAILS:
 * - Use "Under these assumptions" framing (never "best choice")
 * - LTV uses "pp" (percentage points) not "pts"
 * - Interest rate uses "0.25% (25 basis points)" format
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
// LOWEST COST DETERMINATION
// ============================================================================

export interface LowestCostResult {
  lowestCostScenario: "A" | "B" | "C";
  lowestCostName: string;
  totalCost: number;
  monthlyPayment: number;
  totalInterest: number;
}

/**
 * Determine lowest-cost scenario using tie-breaker logic:
 * 1. Lowest Total Cost (primary)
 * 2. Lowest Monthly Payment (tie-breaker)
 * 3. Lowest Total Interest (second tie-breaker)
 */
export function determineLowestCost(
  scenarioA: ScenarioData,
  scenarioB: ScenarioData,
  scenarioC?: ScenarioData | null
): LowestCostResult {
  const scenarios: { label: "A" | "B" | "C"; data: ScenarioData }[] = [
    { label: "A", data: scenarioA },
    { label: "B", data: scenarioB },
  ];
  
  if (scenarioC) {
    scenarios.push({ label: "C", data: scenarioC });
  }

  // Sort by total cost, then monthly, then interest
  scenarios.sort((a, b) => {
    const costA = a.data.results.totalCost ?? Infinity;
    const costB = b.data.results.totalCost ?? Infinity;
    if (costA !== costB) return costA - costB;
    
    const monthlyA = a.data.results.monthlyTotal ?? Infinity;
    const monthlyB = b.data.results.monthlyTotal ?? Infinity;
    if (monthlyA !== monthlyB) return monthlyA - monthlyB;
    
    const interestA = a.data.results.totalInterest ?? Infinity;
    const interestB = b.data.results.totalInterest ?? Infinity;
    return interestA - interestB;
  });

  const winner = scenarios[0];
  return {
    lowestCostScenario: winner.label,
    lowestCostName: winner.data.name || `Scenario ${winner.label}`,
    totalCost: winner.data.results.totalCost ?? 0,
    monthlyPayment: winner.data.results.monthlyTotal ?? 0,
    totalInterest: winner.data.results.totalInterest ?? 0,
  };
}

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

/**
 * Calculate deltas relative to winner (for summary)
 */
export function calculateDeltasVsWinner(
  scenario: ScenarioData,
  winner: ScenarioData
): ComparisonDeltas {
  const sMonthly = scenario.results.monthlyTotal;
  const wMonthly = winner.results.monthlyTotal;
  const sTotalCost = scenario.results.totalCost;
  const wTotalCost = winner.results.totalCost;
  const sTotalInterest = scenario.results.totalInterest;
  const wTotalInterest = winner.results.totalInterest;
  const sRate = scenario.inputs.shared?.interestRate ?? 0;
  const wRate = winner.inputs.shared?.interestRate ?? 0;
  const sLtv = scenario.results.ltvRatio ?? 0;
  const wLtv = winner.results.ltvRatio ?? 0;

  return {
    monthlyPaymentDelta: wMonthly && wMonthly > 0 && sMonthly != null
      ? ((sMonthly - wMonthly) / wMonthly) * 100
      : null,
    totalCostDelta: wTotalCost && wTotalCost > 0 && sTotalCost != null
      ? ((sTotalCost - wTotalCost) / wTotalCost) * 100
      : null,
    totalInterestDelta: wTotalInterest && wTotalInterest > 0
      ? ((sTotalInterest - wTotalInterest) / wTotalInterest) * 100
      : null,
    interestRateDelta: (sRate - wRate) * 100,
    ltvDelta: sLtv - wLtv,
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
 * Uses "pp" (percentage points) for clarity
 */
export function formatLtvDelta(delta: number | null): string {
  if (delta === null) return "—";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)} pp`;
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
// COPY GENERATION - DECISION STATEMENT PATTERN
// ============================================================================

/**
 * Generate "Under these assumptions" decision statement for 2 scenarios
 * Institutional, compliant, non-advisory
 */
export function generateSummaryCopy(
  deltas: ComparisonDeltas,
  pattern: ComparisonPattern,
  nameA: string,
  nameB: string,
  scenarioA?: ScenarioData,
  scenarioB?: ScenarioData
): string[] {
  if (pattern === "insufficient_data") {
    return ["Comparison data is incomplete. Additional scenario inputs may be required."];
  }

  const sentences: string[] = [];
  const displayNameA = nameA || "Scenario A";
  const displayNameB = nameB || "Scenario B";

  // Determine lowest cost if we have scenario data
  if (scenarioA && scenarioB) {
    const lowestCost = determineLowestCost(scenarioA, scenarioB);
    
    // First line: "Under these assumptions" statement
    sentences.push(
      `Under these assumptions, ${lowestCost.lowestCostName} is the lowest projected cost.`
    );

    // Second line: quantify the gap vs other scenario
    const otherLabel = lowestCost.lowestCostScenario === "A" ? displayNameB : displayNameA;
    const otherDeltas = lowestCost.lowestCostScenario === "A" 
      ? calculateDeltasVsWinner(scenarioB, scenarioA)
      : calculateDeltasVsWinner(scenarioA, scenarioB);

    if (otherDeltas.totalCostDelta !== null && Math.abs(otherDeltas.totalCostDelta) >= 0.1) {
      const costDiff = formatDeltaPercent(otherDeltas.totalCostDelta);
      const monthlyDiff = otherDeltas.monthlyPaymentDelta !== null 
        ? formatDeltaPercent(otherDeltas.monthlyPaymentDelta)
        : null;
      
      if (monthlyDiff && Math.abs(otherDeltas.monthlyPaymentDelta!) >= 0.1) {
        sentences.push(
          `${otherLabel}: +${costDiff} total cost, +${monthlyDiff} monthly payment.`
        );
      } else {
        sentences.push(
          `${otherLabel}: +${costDiff} total cost.`
        );
      }
    }

    // Third line: drivers (rate, LTV)
    const driverParts: string[] = [];
    if (otherDeltas.interestRateDelta !== null && Math.abs(otherDeltas.interestRateDelta) >= 5) {
      driverParts.push(formatRateDeltaForCopy(otherDeltas.interestRateDelta, true) + " rate");
    }
    if (otherDeltas.ltvDelta !== null && Math.abs(otherDeltas.ltvDelta) >= 1) {
      driverParts.push(`${Math.abs(otherDeltas.ltvDelta).toFixed(1)} pp LTV`);
    }

    if (driverParts.length > 0) {
      sentences.push(`Drivers: ${driverParts.join("; ")}.`);
    }

    return sentences;
  }

  // Fallback if no scenario data (legacy path)
  if (pattern === "minimal_difference") {
    sentences.push(
      `The modeled outcomes differ by less than 3% across monthly payment and total cost.`
    );
    return sentences;
  }

  // Generic fallback
  const { monthlyPaymentDelta, totalCostDelta, interestRateDelta, ltvDelta } = deltas;
  
  if (monthlyPaymentDelta !== null && totalCostDelta !== null) {
    const monthlyDir = monthlyPaymentDelta > 0 ? "higher" : "lower";
    const costDir = totalCostDelta > 0 ? "higher" : "lower";
    
    sentences.push(
      `${displayNameA} produces ${formatDeltaPercent(monthlyPaymentDelta)} ${monthlyDir} monthly payments and ${formatDeltaPercent(totalCostDelta)} ${costDir} total projected cost compared to ${displayNameB}.`
    );
  }

  return sentences;
}

/**
 * Generate decision statement for 3-scenario comparison
 */
export function generateThreeWaySummaryCopy(
  threeWayDeltas: ThreeWayDeltas,
  nameA: string,
  nameB: string,
  nameC: string,
  scenarioA?: ScenarioData,
  scenarioB?: ScenarioData,
  scenarioC?: ScenarioData
): string[] {
  const sentences: string[] = [];
  
  const displayNameA = nameA || "Scenario A";
  const displayNameB = nameB || "Scenario B";
  const displayNameC = nameC || "Scenario C";

  // Check for insufficient data
  if (threeWayDeltas.aVsB.monthlyPaymentDelta === null || threeWayDeltas.aVsB.totalCostDelta === null) {
    return ["Comparison data is incomplete. Additional scenario inputs may be required."];
  }

  // Determine lowest cost across all three
  if (scenarioA && scenarioB && scenarioC) {
    const lowestCost = determineLowestCost(scenarioA, scenarioB, scenarioC);
    
    // First line: "Under these assumptions" statement
    sentences.push(
      `Under these assumptions, ${lowestCost.lowestCostName} is the lowest projected cost.`
    );

    // Get the winner scenario data
    const winnerData = lowestCost.lowestCostScenario === "A" ? scenarioA 
      : lowestCost.lowestCostScenario === "B" ? scenarioB 
      : scenarioC;

    // Build deltas for non-winners
    const others: { name: string; deltas: ComparisonDeltas }[] = [];
    
    if (lowestCost.lowestCostScenario !== "A") {
      others.push({ 
        name: displayNameA, 
        deltas: calculateDeltasVsWinner(scenarioA, winnerData) 
      });
    }
    if (lowestCost.lowestCostScenario !== "B") {
      others.push({ 
        name: displayNameB, 
        deltas: calculateDeltasVsWinner(scenarioB, winnerData) 
      });
    }
    if (lowestCost.lowestCostScenario !== "C") {
      others.push({ 
        name: displayNameC, 
        deltas: calculateDeltasVsWinner(scenarioC, winnerData) 
      });
    }

    // Second line: quantify gaps for each non-winner
    const gapParts = others
      .filter(o => o.deltas.totalCostDelta !== null && Math.abs(o.deltas.totalCostDelta) >= 0.1)
      .map(o => `+${formatDeltaPercent(o.deltas.totalCostDelta!)} vs ${o.name}`);

    if (gapParts.length > 0) {
      sentences.push(`Total cost: ${gapParts.join("; ")}.`);
    }

    // Third line: key drivers from the winner
    const driverParts: string[] = [];
    const winnerRate = winnerData.inputs.shared?.interestRate ?? 0;
    const winnerLtv = winnerData.results.ltvRatio ?? 0;
    
    // Compare rate vs average of others
    const avgOtherRate = others.reduce((sum, o) => {
      const scenario = o.name === displayNameA ? scenarioA 
        : o.name === displayNameB ? scenarioB 
        : scenarioC;
      return sum + (scenario.inputs.shared?.interestRate ?? 0);
    }, 0) / others.length;
    
    const rateDiff = (winnerRate - avgOtherRate) * 100;
    if (Math.abs(rateDiff) >= 5) {
      const dir = rateDiff < 0 ? "lower" : "higher";
      driverParts.push(`${formatRateDeltaForCopy(Math.abs(rateDiff), true)} ${dir} rate`);
    }

    const avgOtherLtv = others.reduce((sum, o) => {
      const scenario = o.name === displayNameA ? scenarioA 
        : o.name === displayNameB ? scenarioB 
        : scenarioC;
      return sum + (scenario.results.ltvRatio ?? 0);
    }, 0) / others.length;
    
    const ltvDiff = winnerLtv - avgOtherLtv;
    if (Math.abs(ltvDiff) >= 1) {
      const dir = ltvDiff < 0 ? "lower" : "higher";
      driverParts.push(`${Math.abs(ltvDiff).toFixed(1)} pp ${dir} LTV`);
    }

    if (driverParts.length > 0) {
      sentences.push(`Drivers: ${driverParts.join("; ")}.`);
    }

    return sentences;
  }

  // Fallback without full scenario data
  const { aVsB, cVsB } = threeWayDeltas;
  
  // A vs B summary
  const aMonthlyDir = aVsB.monthlyPaymentDelta! > 0 ? "higher" : "lower";
  const aCostDir = aVsB.totalCostDelta! > 0 ? "higher" : "lower";
  
  sentences.push(
    `Relative to ${displayNameB}, ${displayNameA} produces ${formatDeltaPercent(aVsB.monthlyPaymentDelta!)} ${aMonthlyDir} monthly payments and ${formatDeltaPercent(aVsB.totalCostDelta!)} ${aCostDir} total projected cost.`
  );

  // C vs B summary
  if (cVsB && cVsB.monthlyPaymentDelta !== null && cVsB.totalCostDelta !== null) {
    const cMonthlyDir = cVsB.monthlyPaymentDelta > 0 ? "higher" : "lower";
    const cCostDir = cVsB.totalCostDelta > 0 ? "higher" : "lower";
    
    sentences.push(
      `${displayNameC} results in ${formatDeltaPercent(cVsB.monthlyPaymentDelta)} ${cMonthlyDir} monthly payments and ${formatDeltaPercent(cVsB.totalCostDelta)} ${cCostDir} total cost compared to ${displayNameB}.`
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
  const sentences = generateSummaryCopy(deltas, pattern, scenarioA.name, scenarioB.name, scenarioA, scenarioB);
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
    scenarioC.name,
    scenarioA,
    scenarioB,
    scenarioC
  );
  return sentences.join(" ");
}
