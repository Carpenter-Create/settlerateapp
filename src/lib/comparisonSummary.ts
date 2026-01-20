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
 * - Explain WHY using cause-and-effect: "borrowing more increases both monthly payment and total cost"
 * - Use dollars first, percentages second: "$245/mo (+8.2%)"
 * - Use "least expensive" or "lower cost" — never "best" or "recommended"
 * - Keep summaries to 2-3 short paragraphs max
 * - Include "rule of thumb" for cost per dollar borrowed when rate/term are identical
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
  // Dollar amounts for dollar-first display
  monthlyPaymentDollarDelta: number | null;
  totalCostDollarDelta: number | null;
  totalInterestDollarDelta: number | null;
  // Principal difference for loan size comparisons
  loanAmountDelta: number | null;
}

export interface ThreeWayDeltas {
  aVsB: ComparisonDeltas;
  cVsB: ComparisonDeltas | null;
}

export type ComparisonPattern = "tradeoff" | "cost_efficient" | "minimal_difference" | "insufficient_data" | "same_rate_different_size";

// ============================================================================
// SCENARIO ANALYSIS HELPERS
// ============================================================================

/**
 * Check if two scenarios have the same rate and term (for cash-out comparisons)
 */
export function haveSameRateAndTerm(a: ScenarioData, b: ScenarioData): boolean {
  const aRate = a.inputs.shared?.interestRate ?? 0;
  const bRate = b.inputs.shared?.interestRate ?? 0;
  const aTerm = a.inputs.shared?.loanTerm ?? 0;
  const bTerm = b.inputs.shared?.loanTerm ?? 0;
  
  return Math.abs(aRate - bRate) < 0.001 && aTerm === bTerm;
}

/**
 * Calculate cost per dollar borrowed over full term
 * Useful for "rule of thumb" explanations
 */
export function calculateCostPerDollarBorrowed(
  loanAmountDiff: number,
  totalCostDiff: number
): number {
  if (loanAmountDiff === 0) return 0;
  return totalCostDiff / loanAmountDiff;
}

// ============================================================================
// LOWEST COST DETERMINATION
// ============================================================================

export interface LowestCostResult {
  lowestCostScenario: "A" | "B" | "C";
  lowestCostName: string;
  totalCost: number;
  monthlyPayment: number;
  totalInterest: number;
  loanAmount: number;
}

/**
 * Determine lowest-cost scenario using tie-breaker logic:
 * 1. Lowest Total Cost (primary)
 * 2. Lowest Total Interest (first tie-breaker)
 * 3. Lowest Monthly Payment (second tie-breaker)
 * 4. Lowest LTV (third tie-breaker)
 * 
 * This logic is deterministic and documented.
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

  // Sort by: total cost → total interest → monthly payment → LTV
  scenarios.sort((a, b) => {
    const costA = a.data.results.totalCost ?? Infinity;
    const costB = b.data.results.totalCost ?? Infinity;
    if (costA !== costB) return costA - costB;
    
    const interestA = a.data.results.totalInterest ?? Infinity;
    const interestB = b.data.results.totalInterest ?? Infinity;
    if (interestA !== interestB) return interestA - interestB;
    
    const monthlyA = a.data.results.monthlyTotal ?? Infinity;
    const monthlyB = b.data.results.monthlyTotal ?? Infinity;
    if (monthlyA !== monthlyB) return monthlyA - monthlyB;
    
    const ltvA = a.data.results.ltvRatio ?? Infinity;
    const ltvB = b.data.results.ltvRatio ?? Infinity;
    return ltvA - ltvB;
  });

  const winner = scenarios[0];
  return {
    lowestCostScenario: winner.label,
    lowestCostName: winner.data.name || `Scenario ${winner.label}`,
    totalCost: winner.data.results.totalCost ?? 0,
    monthlyPayment: winner.data.results.monthlyTotal ?? 0,
    totalInterest: winner.data.results.totalInterest ?? 0,
    loanAmount: winner.data.results.loanAmount ?? 0,
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
  const aLoanAmount = a.results.loanAmount ?? 0;
  const bLoanAmount = b.results.loanAmount ?? 0;

  // Calculate dollar deltas (independent per metric)
  const monthlyDollarDelta = aMonthly != null && bMonthly != null ? aMonthly - bMonthly : null;
  const totalCostDollarDelta = aTotalCost != null && bTotalCost != null ? aTotalCost - bTotalCost : null;
  const totalInterestDollarDelta = aTotalInterest != null && bTotalInterest != null ? aTotalInterest - bTotalInterest : null;
  const loanAmountDelta = aLoanAmount - bLoanAmount;

  // Calculate percentage deltas (independent per metric - never reuse across categories)
  return {
    monthlyPaymentDelta: bMonthly && bMonthly > 0 && aMonthly != null
      ? ((aMonthly - bMonthly) / bMonthly) * 100
      : null,
    totalCostDelta: bTotalCost && bTotalCost > 0 && aTotalCost != null
      ? ((aTotalCost - bTotalCost) / bTotalCost) * 100
      : null,
    totalInterestDelta: bTotalInterest && bTotalInterest > 0 && aTotalInterest != null
      ? ((aTotalInterest - bTotalInterest) / bTotalInterest) * 100
      : null,
    interestRateDelta: (aRate - bRate) * 100, // Convert to basis points
    ltvDelta: aLtv - bLtv, // Absolute percentage points
    // Dollar amounts for dollar-first display
    monthlyPaymentDollarDelta: monthlyDollarDelta,
    totalCostDollarDelta: totalCostDollarDelta,
    totalInterestDollarDelta: totalInterestDollarDelta,
    loanAmountDelta: loanAmountDelta,
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
  const sLoanAmount = scenario.results.loanAmount ?? 0;
  const wLoanAmount = winner.results.loanAmount ?? 0;

  // Calculate dollar deltas
  const monthlyDollarDelta = sMonthly != null && wMonthly != null ? sMonthly - wMonthly : null;
  const totalCostDollarDelta = sTotalCost != null && wTotalCost != null ? sTotalCost - wTotalCost : null;
  const totalInterestDollarDelta = sTotalInterest != null && wTotalInterest != null ? sTotalInterest - wTotalInterest : null;
  const loanAmountDelta = sLoanAmount - wLoanAmount;

  return {
    monthlyPaymentDelta: wMonthly && wMonthly > 0 && sMonthly != null
      ? ((sMonthly - wMonthly) / wMonthly) * 100
      : null,
    totalCostDelta: wTotalCost && wTotalCost > 0 && sTotalCost != null
      ? ((sTotalCost - wTotalCost) / wTotalCost) * 100
      : null,
    totalInterestDelta: wTotalInterest && wTotalInterest > 0 && sTotalInterest != null
      ? ((sTotalInterest - wTotalInterest) / wTotalInterest) * 100
      : null,
    interestRateDelta: (sRate - wRate) * 100,
    ltvDelta: sLtv - wLtv,
    monthlyPaymentDollarDelta: monthlyDollarDelta,
    totalCostDollarDelta: totalCostDollarDelta,
    totalInterestDollarDelta: totalInterestDollarDelta,
    loanAmountDelta: loanAmountDelta,
  };
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format currency for display (dollar-first display standard)
 */
export function formatDeltaCurrency(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1000) {
    return `$${(absValue / 1000).toFixed(absValue >= 10000 ? 0 : 1)}k`;
  }
  return `$${Math.round(absValue).toLocaleString()}`;
}

/**
 * Format signed currency delta
 */
export function formatSignedCurrencyDelta(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "-";
  return `${sign}${formatDeltaCurrency(value)}`;
}

/**
 * Format dollar-first delta display (dollars first, percentage second)
 * Example: "+$245/mo (+8.2%)"
 */
export function formatDollarFirstDelta(dollarDelta: number | null, percentDelta: number | null, suffix = ""): string {
  if (dollarDelta === null || percentDelta === null) return "—";
  const dollarSign = dollarDelta > 0 ? "+" : dollarDelta < 0 ? "-" : "";
  const percentSign = percentDelta > 0 ? "+" : "";
  const dollarStr = `${dollarSign}$${Math.abs(Math.round(dollarDelta)).toLocaleString()}${suffix}`;
  const percentStr = `${percentSign}${formatDeltaPercent(percentDelta)}`;
  return `${dollarStr} (${percentStr})`;
}

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
 * Determine the comparison pattern based on deltas and scenario data
 */
export function determinePattern(
  deltas: ComparisonDeltas,
  scenarioA?: ScenarioData,
  scenarioB?: ScenarioData
): ComparisonPattern {
  const { monthlyPaymentDelta, totalCostDelta, totalInterestDelta, loanAmountDelta } = deltas;

  // Check for insufficient data
  if (monthlyPaymentDelta === null || totalCostDelta === null) {
    return "insufficient_data";
  }

  // Check for same rate/term with different loan sizes (cash-out pattern)
  if (scenarioA && scenarioB && haveSameRateAndTerm(scenarioA, scenarioB)) {
    if (loanAmountDelta !== null && Math.abs(loanAmountDelta) > 1000) {
      return "same_rate_different_size";
    }
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
 * Format a dollar amount for display in prose
 */
function formatProseAmount(value: number): string {
  const absValue = Math.abs(value);
  return `$${Math.round(absValue).toLocaleString()}`;
}

/**
 * Generate cash-out comparison summary when rate/term are identical
 * Uses cause-and-effect language explaining why borrowing more costs more
 */
function generateSameRateDifferentSizeSummary(
  scenarios: { name: string; data: ScenarioData; deltas: ComparisonDeltas }[],
  winnerName: string,
  winnerData: ScenarioData,
  term: number
): string[] {
  const sentences: string[] = [];
  
  // Line 1: Clear outcome
  sentences.push(
    `Under these assumptions, ${winnerName} is the least expensive option overall.`
  );
  
  // Line 2: Cause-and-effect explanation
  // Calculate the cost per dollar borrowed
  const otherScenarios = scenarios.filter(s => s.data !== winnerData);
  
  if (otherScenarios.length > 0) {
    const firstOther = otherScenarios[0];
    const loanDiff = Math.abs(firstOther.deltas.loanAmountDelta ?? 0);
    const costDiff = Math.abs(firstOther.deltas.totalCostDollarDelta ?? 0);
    const monthlyDiff = Math.abs(firstOther.deltas.monthlyPaymentDollarDelta ?? 0);
    
    if (loanDiff > 0 && costDiff > 0) {
      sentences.push(
        `Although each option uses the same interest rate, borrowing more increases both the monthly payment and the total cost over time. Every additional ${formatProseAmount(loanDiff)} borrowed increases the monthly payment by about ${formatProseAmount(monthlyDiff)} and increases the total cost over ${term} years by roughly ${formatProseAmount(costDiff)}.`
      );
    }
  }
  
  // Line 3: List out other scenarios' extra costs
  if (otherScenarios.length > 0) {
    const costLines: string[] = [];
    for (const other of otherScenarios) {
      const extraCost = Math.abs(other.deltas.totalCostDollarDelta ?? 0);
      if (extraCost > 0) {
        costLines.push(`The ${other.name} costs about ${formatProseAmount(extraCost)} more over the life of the loan than the lowest option.`);
      }
    }
    
    if (costLines.length > 0) {
      sentences.push(`As a result: ${costLines.join(" ")}`);
    }
  }
  
  // Line 4: Conclusion
  sentences.push(
    `If minimizing long-term cost is the priority, ${winnerName} is the most financially efficient choice.`
  );
  
  return sentences;
}

/**
 * Generate plain-English decision statement for 2 scenarios
 * Homeowner-friendly, institutional, compliant, non-advisory
 * 
 * Format:
 * 1. Clear outcome: "Under these assumptions, X is the least expensive option overall."
 * 2. Why it matters: Dollars first, cause-and-effect explanation
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
    
    // Calculate deltas relative to winner
    const otherDeltas = calculateDeltasVsWinner(otherData, winnerData);
    
    // Get rate and term info
    const winnerRate = winnerData.inputs.shared?.interestRate ?? 0;
    const otherRate = otherData.inputs.shared?.interestRate ?? 0;
    const winnerTerm = winnerData.inputs.shared?.loanTerm ?? 30;
    const otherTerm = otherData.inputs.shared?.loanTerm ?? 30;
    
    const sameRate = Math.abs(winnerRate - otherRate) < 0.001;
    const sameTerm = winnerTerm === otherTerm;
    
    // Check if this is a same-rate-different-size pattern (cash-out comparison)
    if (pattern === "same_rate_different_size" || (sameRate && sameTerm && Math.abs(otherDeltas.loanAmountDelta ?? 0) > 1000)) {
      // Use specialized cash-out comparison language
      return generateSameRateDifferentSizeSummary(
        [{ name: otherName, data: otherData, deltas: otherDeltas }],
        winnerName,
        winnerData,
        winnerTerm
      );
    }
    
    // Standard comparison flow
    // Line 1: Clear outcome statement
    sentences.push(
      `Under these assumptions, ${winnerName} is the least expensive option overall.`
    );

    // Line 2: Explain why using dollars first, percentages second
    if (otherDeltas.totalCostDollarDelta !== null && otherDeltas.totalCostDelta !== null) {
      const dollarDiff = Math.abs(otherDeltas.totalCostDollarDelta);
      const percentDiff = Math.abs(otherDeltas.totalCostDelta);
      
      if (dollarDiff >= 1000) {
        sentences.push(
          `Compared to ${otherName}, it saves about ${formatProseAmount(dollarDiff)} over the life of the loan (${formatDeltaPercent(percentDiff)} less).`
        );
      }
    }

    // Line 3: Note when assumptions are held constant
    if (sameRate && sameTerm && winnerRate && winnerTerm) {
      sentences.push(
        `Both scenarios use the same assumed rate (${winnerRate}%) and term (${winnerTerm} years).`
      );
    } else if (sameRate && winnerRate) {
      sentences.push(
        `Both scenarios use the same assumed rate (${winnerRate}%).`
      );
    }

    // Line 4: Explain drivers in everyday terms
    const driverExplanations: string[] = [];
    
    // Interest rate explanation
    if (otherDeltas.interestRateDelta !== null && Math.abs(otherDeltas.interestRateDelta) >= 5) {
      const rateDiff = Math.abs(otherDeltas.interestRateDelta / 100);
      const rateDirection = otherDeltas.interestRateDelta > 0 ? "higher" : "lower";
      driverExplanations.push(`a ${rateDirection} interest rate (about ${rateDiff.toFixed(2)}%)`);
    }
    
    // LTV / loan size explanation (in plain terms)
    if (otherDeltas.loanAmountDelta !== null && Math.abs(otherDeltas.loanAmountDelta) >= 5000) {
      const loanDirection = otherDeltas.loanAmountDelta > 0 ? "more" : "less";
      driverExplanations.push(`${loanDirection} borrowed (${formatProseAmount(Math.abs(otherDeltas.loanAmountDelta))} difference in loan size)`);
    } else if (otherDeltas.ltvDelta !== null && Math.abs(otherDeltas.ltvDelta) >= 2) {
      const ltvDirection = otherDeltas.ltvDelta > 0 ? "more" : "less";
      driverExplanations.push(`${ltvDirection} borrowed relative to the home's value`);
    }

    if (driverExplanations.length > 0 && !sameRate) {
      const driversText = driverExplanations.length === 1
        ? driverExplanations[0]
        : `${driverExplanations.slice(0, -1).join(", ")} and ${driverExplanations[driverExplanations.length - 1]}`;
      
      sentences.push(
        `This outcome is driven primarily by ${driversText}.`
      );
    }

    // HELOC variable-rate risk disclosure (if winner or other scenario is HELOC)
    const hasHelocScenario = isHelocScenario(scenarioA) || isHelocScenario(scenarioB);
    if (hasHelocScenario) {
      if (isHelocScenario(winnerData)) {
        sentences.push(
          `Note: HELOC payments are typically lower early but may increase over time due to variable rates.`
        );
      } else if (isHelocScenario(otherData)) {
        sentences.push(
          `One scenario involves a HELOC, which may have variable rates that change over time.`
        );
      }
    }

    // Loan Assumption disclosure (if any scenario is assumption)
    const hasAssumption = isAssumptionScenario(scenarioA) || isAssumptionScenario(scenarioB);
    if (hasAssumption) {
      sentences.push(
        `Loan assumption scenarios combine the assumed loan with gap financing; total payments reflect both.`
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
/**
 * Check if a scenario is a HELOC (for risk disclosure)
 */
function isHelocScenario(scenario: ScenarioData): boolean {
  return scenario.inputs.mode === "heloc";
}

/**
 * Check if a scenario is a Loan Assumption (for disclosure)
 */
function isAssumptionScenario(scenario: ScenarioData): boolean {
  return scenario.inputs.mode === "assumption";
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

    // Check if all scenarios have same rate and term (cash-out pattern for 3 scenarios)
    const allScenarios = [scenarioA, scenarioB, scenarioC];
    const rates = allScenarios.map(s => s.inputs.shared?.interestRate ?? 0);
    const terms = allScenarios.map(s => s.inputs.shared?.loanTerm ?? 30);
    const sameRateAndTerm = rates.every(r => Math.abs(r - rates[0]) < 0.001) && 
                            terms.every(t => t === terms[0]);
    
    // Check if there are significant loan amount differences
    const hasLoanSizeDifferences = others.some(o => 
      o.deltas.loanAmountDelta !== null && Math.abs(o.deltas.loanAmountDelta) > 1000
    );
    
    if (sameRateAndTerm && hasLoanSizeDifferences) {
      // Use specialized cash-out comparison language for 3 scenarios
      return generateSameRateDifferentSizeSummary(
        others,
        winnerName,
        winnerData,
        terms[0]
      );
    }

    // Standard 3-scenario comparison flow
    // Line 1: Clear outcome statement
    sentences.push(
      `Under these assumptions, ${winnerName} is the least expensive option overall.`
    );

    // Line 2: Explain with dollars first, then percentages
    const significantOthers = others.filter(o => 
      o.deltas.totalCostDollarDelta !== null && Math.abs(o.deltas.totalCostDollarDelta) >= 1000
    );
    
    if (significantOthers.length > 0) {
      const costLines: string[] = [];
      for (const other of significantOthers) {
        const dollarDiff = Math.abs(other.deltas.totalCostDollarDelta ?? 0);
        const percentDiff = Math.abs(other.deltas.totalCostDelta ?? 0);
        costLines.push(`about $${Math.round(dollarDiff).toLocaleString()} (${formatDeltaPercent(percentDiff)}) more than ${other.name}`);
      }
      
      const comparisonText = costLines.length === 1 
        ? costLines[0]
        : `${costLines[0]} and ${costLines[1]}`;
      
      sentences.push(
        `Its total cost over the life of the loan is ${comparisonText}.`
      );
    }

    // Line 3: Explain drivers in everyday terms
    const winnerRate = winnerData.inputs.shared?.interestRate ?? 0;
    
    const avgOtherRate = others.reduce((sum, o) => 
      sum + (o.data.inputs.shared?.interestRate ?? 0), 0
    ) / others.length;
    
    const rateDiff = (avgOtherRate - winnerRate) * 100;
    
    const driverExplanations: string[] = [];
    
    if (Math.abs(rateDiff) >= 5) {
      driverExplanations.push(`a lower interest rate (about ${Math.abs(rateDiff / 100).toFixed(2)}% lower)`);
    }
    
    // Loan size explanation
    const avgLoanDiff = others.reduce((sum, o) => 
      sum + Math.abs(o.deltas.loanAmountDelta ?? 0), 0
    ) / others.length;
    
    if (avgLoanDiff >= 5000) {
      driverExplanations.push(`a smaller loan amount`);
    }

    if (driverExplanations.length > 0) {
      const driversText = driverExplanations.length === 1
        ? driverExplanations[0]
        : `${driverExplanations[0]} and ${driverExplanations[1]}`;
      
      sentences.push(
        `This is driven primarily by ${driversText}, which reduces long-term interest.`
      );
    }

    // HELOC variable-rate risk disclosure (if winner or any scenario is HELOC)
    const hasHelocScenario = allScenarios.some(s => isHelocScenario(s));
    
    if (hasHelocScenario) {
      if (isHelocScenario(winnerData)) {
        sentences.push(
          `Note: HELOC payments are typically lower early but may increase over time due to variable rates.`
        );
      } else {
        sentences.push(
          `One or more scenarios involve a HELOC, which may have variable rates that change over time.`
        );
      }
    }

    // Loan Assumption disclosure (if any scenario is assumption)
    const hasAssumption = allScenarios.some(s => isAssumptionScenario(s));
    if (hasAssumption) {
      sentences.push(
        `Loan assumption scenarios combine the assumed loan with gap financing; total payments reflect both.`
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
