/**
 * Comparison Summary Logic
 * 
 * Shared calculation and copy generation for comparison summaries.
 * Used by both the UI component and PDF export to ensure consistency.
 * 
 * Calculation baseline: Scenario B (unless otherwise specified)
 * Supports 2 or 3 scenario comparisons.
 * 
 * LANGUAGE GUARDRAILS (PLAIN-ENGLISH, HOMEOWNER-FRIENDLY):
 * - Lead with clear outcome: "Under these assumptions, X is the least expensive option overall."
 * - Explain WHY in everyday terms: "lower interest rate" not "basis points"
 * - Use "percentage points" not "pp" when spelled out
 * - Use "least expensive" or "lower cost" — never "best" or "recommended"
 * - Keep summaries to 2-3 short paragraphs max
 * - If basis points are shown, include the percentage first: "0.25% (25 basis points)"
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
  return `${absPercent.toFixed(2)}%`;
}

/**
 * Format interest rate delta for prose copy (plain-English)
 * Example: "about 0.38% lower"
 * If includeBasicPoints is true: "0.38% (38 basis points)"
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
 * Format signed rate delta for Key Differences display (plain-English)
 * Shows percentage with direction, optional basis points
 */
export function formatSignedRateDelta(bps: number | null): string {
  if (bps === null) return "—";
  const absPercent = Math.abs(bps / 100);
  const direction = bps > 0 ? "higher" : bps < 0 ? "lower" : "same";
  if (Math.abs(bps) < 1) return "Same";
  return `${absPercent.toFixed(2)}% ${direction}`;
}

/**
 * Format LTV delta for display (plain-English)
 * Uses "percentage points" spelled out for clarity
 */
export function formatLtvDelta(delta: number | null): string {
  if (delta === null) return "—";
  if (Math.abs(delta) < 0.1) return "Same";
  const direction = delta > 0 ? "higher" : "lower";
  return `About ${Math.abs(delta).toFixed(0)}% ${direction}`;
}

/**
 * @deprecated Use formatSignedRateDelta for plain-English formatting
 * Kept for backwards compatibility with key metrics display
 */
export function formatSignedBasisPoints(bps: number | null): string {
  return formatSignedRateDelta(bps);
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
 * Generate plain-English decision statement for 2 scenarios
 * Homeowner-friendly, institutional, compliant, non-advisory
 * 
 * Format:
 * 1. Clear outcome: "Under these assumptions, X is the least expensive option overall."
 * 2. Why it matters: "Compared to Y, it results in meaningfully lower total costs..."
 * 3. Drivers in everyday terms: "This is driven by a lower interest rate..."
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
    const winnerName = lowestCost.lowestCostName;
    const otherName = lowestCost.lowestCostScenario === "A" ? displayNameB : displayNameA;
    
    // Get the winner and other scenario data
    const winnerData = lowestCost.lowestCostScenario === "A" ? scenarioA : scenarioB;
    const otherData = lowestCost.lowestCostScenario === "A" ? scenarioB : scenarioA;
    
    // Calculate percentage differences
    const otherDeltas = calculateDeltasVsWinner(otherData, winnerData);
    
    // Line 1: Clear outcome statement
    sentences.push(
      `Under these assumptions, ${winnerName} is the least expensive option overall.`
    );

    // Line 2: Explain why this matters (in plain terms)
    if (otherDeltas.totalCostDelta !== null && Math.abs(otherDeltas.totalCostDelta) >= 0.5) {
      const costDiff = Math.abs(otherDeltas.totalCostDelta);
      const costWord = costDiff >= 10 ? "meaningfully" : "somewhat";
      
      // Check if monthly payments are similar despite total cost difference
      const monthlyDiff = Math.abs(otherDeltas.monthlyPaymentDelta ?? 0);
      
      if (monthlyDiff < 3 && costDiff >= 5) {
        sentences.push(
          `Compared to ${otherName}, it results in ${costWord} lower total costs over the life of the loan, even though the monthly payments may look similar at first.`
        );
      } else {
        sentences.push(
          `Compared to ${otherName}, it results in about ${formatDeltaPercent(costDiff)} lower total costs over the life of the loan.`
        );
      }
    }

    // Line 3: Explain drivers in everyday terms
    const driverExplanations: string[] = [];
    
    // Interest rate explanation
    if (otherDeltas.interestRateDelta !== null && Math.abs(otherDeltas.interestRateDelta) >= 5) {
      const rateDiff = Math.abs(otherDeltas.interestRateDelta / 100);
      const rateDirection = otherDeltas.interestRateDelta > 0 ? "higher" : "lower";
      driverExplanations.push(`a ${rateDirection} interest rate (about ${rateDiff.toFixed(2)}% ${rateDirection})`);
    }
    
    // LTV explanation (in plain terms)
    if (otherDeltas.ltvDelta !== null && Math.abs(otherDeltas.ltvDelta) >= 2) {
      const ltvDiff = Math.abs(otherDeltas.ltvDelta);
      const ltvDirection = otherDeltas.ltvDelta > 0 ? "more" : "less";
      driverExplanations.push(`${ltvDirection} borrowed relative to the home's value`);
    }

    if (driverExplanations.length > 0) {
      const driversText = driverExplanations.length === 1
        ? driverExplanations[0]
        : `${driverExplanations.slice(0, -1).join(", ")} and ${driverExplanations[driverExplanations.length - 1]}`;
      
      sentences.push(
        `This outcome is driven primarily by ${driversText}, which reduces long-term interest.`
      );
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
  const { monthlyPaymentDelta, totalCostDelta } = deltas;
  
  if (monthlyPaymentDelta !== null && totalCostDelta !== null) {
    const monthlyDir = monthlyPaymentDelta > 0 ? "higher" : "lower";
    const costDir = totalCostDelta > 0 ? "higher" : "lower";
    
    sentences.push(
      `${displayNameA} has ${formatDeltaPercent(Math.abs(monthlyPaymentDelta))} ${monthlyDir} monthly payments and ${formatDeltaPercent(Math.abs(totalCostDelta))} ${costDir} total costs compared to ${displayNameB}.`
    );
  }

  return sentences;
}

/**
 * Generate plain-English decision statement for 3-scenario comparison
 * Homeowner-friendly, institutional, compliant, non-advisory
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
    const winnerName = lowestCost.lowestCostName;

    // Get the winner scenario data
    const winnerData = lowestCost.lowestCostScenario === "A" ? scenarioA 
      : lowestCost.lowestCostScenario === "B" ? scenarioB 
      : scenarioC;

    // Build deltas for non-winners
    const others: { name: string; data: ScenarioData; deltas: ComparisonDeltas }[] = [];
    
    if (lowestCost.lowestCostScenario !== "A") {
      others.push({ 
        name: displayNameA, 
        data: scenarioA,
        deltas: calculateDeltasVsWinner(scenarioA, winnerData) 
      });
    }
    if (lowestCost.lowestCostScenario !== "B") {
      others.push({ 
        name: displayNameB, 
        data: scenarioB,
        deltas: calculateDeltasVsWinner(scenarioB, winnerData) 
      });
    }
    if (lowestCost.lowestCostScenario !== "C") {
      others.push({ 
        name: displayNameC, 
        data: scenarioC,
        deltas: calculateDeltasVsWinner(scenarioC, winnerData) 
      });
    }

    // Line 1: Clear outcome statement
    sentences.push(
      `Under these assumptions, ${winnerName} is the least expensive option overall.`
    );

    // Line 2: Explain what this means in plain terms
    const significantOthers = others.filter(o => 
      o.deltas.totalCostDelta !== null && Math.abs(o.deltas.totalCostDelta) >= 3
    );
    
    if (significantOthers.length > 0) {
      const comparisons = significantOthers.map(o => {
        const costDiff = Math.abs(o.deltas.totalCostDelta!);
        return `about ${formatDeltaPercent(costDiff)} lower than ${o.name}`;
      });
      
      const comparisonText = comparisons.length === 1 
        ? comparisons[0]
        : `${comparisons[0]} and ${comparisons[1]}`;
      
      sentences.push(
        `Its total cost over the life of the loan is ${comparisonText}.`
      );
    }

    // Line 3: Explain drivers in everyday terms
    const winnerRate = winnerData.inputs.shared?.interestRate ?? 0;
    const winnerLtv = winnerData.results.ltvRatio ?? 0;
    
    const avgOtherRate = others.reduce((sum, o) => 
      sum + (o.data.inputs.shared?.interestRate ?? 0), 0
    ) / others.length;
    
    const avgOtherLtv = others.reduce((sum, o) => 
      sum + (o.data.results.ltvRatio ?? 0), 0
    ) / others.length;
    
    const rateDiff = (avgOtherRate - winnerRate) * 100;
    const ltvDiff = avgOtherLtv - winnerLtv;
    
    const driverExplanations: string[] = [];
    
    if (Math.abs(rateDiff) >= 5) {
      driverExplanations.push(`a lower interest rate (about ${Math.abs(rateDiff / 100).toFixed(2)}% lower)`);
    }
    
    if (Math.abs(ltvDiff) >= 2) {
      driverExplanations.push(`less borrowed relative to the home's value`);
    }

    if (driverExplanations.length > 0) {
      const driversText = driverExplanations.length === 1
        ? driverExplanations[0]
        : `${driverExplanations[0]} and ${driverExplanations[1]}`;
      
      sentences.push(
        `This is driven primarily by ${driversText}, which reduces long-term interest.`
      );
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
