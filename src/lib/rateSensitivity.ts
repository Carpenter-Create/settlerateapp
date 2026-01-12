/**
 * Rate Sensitivity Analysis
 * 
 * Illustrative rate-change narratives for decision robustness assessment.
 * NOT predictive - clearly labeled as illustrative only.
 */

import type { Scenario } from "@/hooks/useScenarios";
import { formatCurrency, calculateMortgage, MortgageInputs } from "@/lib/mortgage";

export interface RateSensitivityResult {
  /** Whether the analysis is meaningful (enough scenarios, stable results) */
  isValid: boolean;
  /** The narrative text to display */
  narrative: string;
  /** Whether scenario ordering changes with rate adjustment */
  orderingChanges: boolean;
  /** Payment change range across scenarios */
  paymentChangeRange: {
    min: number;
    max: number;
  };
}

export interface RefiRateSensitivityPoint {
  rateAdjustment: number;
  monthlyPayment: number;
  monthlyChange: number;
  totalInterest: number;
  interestChange: number;
}

export interface RefiRateSensitivityResult {
  /** Whether the analysis is valid */
  isValid: boolean;
  /** Base scenario info */
  scenarioName: string;
  baseRate: number;
  baseMonthly: number;
  baseTotalInterest: number;
  /** Sensitivity points at different rate levels */
  points: RefiRateSensitivityPoint[];
  /** Break-even months if fees/points exist */
  breakEvenMonths: number | null;
  /** Primary narrative */
  narrative: string;
}

/**
 * Generate a rate sensitivity narrative for a set of scenarios.
 * Uses ±0.5% adjustment applied uniformly to all scenarios.
 */
export function generateRateSensitivityNarrative(
  scenarios: Scenario[],
  rateAdjustment: number = -0.5
): RateSensitivityResult {
  // Need at least 2 scenarios for comparison
  if (scenarios.length < 2) {
    return {
      isValid: false,
      narrative: "",
      orderingChanges: false,
      paymentChangeRange: { min: 0, max: 0 },
    };
  }

  // Calculate current order (by total cost)
  const currentOrder = [...scenarios]
    .sort((a, b) => a.results.totalCost - b.results.totalCost)
    .map((s) => s.id);

  // Calculate adjusted results
  const adjustedScenarios = scenarios.map((scenario) => {
    const adjustedInputs: MortgageInputs = {
      ...scenario.inputs,
      shared: {
        ...scenario.inputs.shared,
        interestRate: Math.max(0.1, scenario.inputs.shared.interestRate + rateAdjustment),
      },
    };

    const adjustedResults = calculateMortgage(adjustedInputs);
    
    return {
      id: scenario.id,
      name: scenario.name,
      originalPayment: scenario.results.monthlyTotal,
      adjustedPayment: adjustedResults.monthlyTotal,
      paymentChange: adjustedResults.monthlyTotal - scenario.results.monthlyTotal,
      originalTotalCost: scenario.results.totalCost,
      adjustedTotalCost: adjustedResults.totalCost,
      originalInterest: scenario.results.totalInterest,
      adjustedInterest: adjustedResults.totalInterest,
    };
  });

  // Calculate new order
  const adjustedOrder = [...adjustedScenarios]
    .sort((a, b) => a.adjustedTotalCost - b.adjustedTotalCost)
    .map((s) => s.id);

  // Check if ordering changed
  const orderingChanges = !currentOrder.every((id, idx) => id === adjustedOrder[idx]);

  // Calculate payment change range
  const paymentChanges = adjustedScenarios.map((s) => Math.abs(s.paymentChange));
  const paymentChangeRange = {
    min: Math.round(Math.min(...paymentChanges)),
    max: Math.round(Math.max(...paymentChanges)),
  };

  // Generate narrative
  const rateDirection = rateAdjustment > 0 ? "higher" : "lower";
  const rateAmount = Math.abs(rateAdjustment);
  
  let narrative: string;
  
  if (orderingChanges) {
    narrative = `Rate Context: If rates were ${rateAmount}% ${rateDirection}, the relative ordering of these scenarios would change. This is an illustrative change, not a prediction.`;
  } else {
    const paymentChangeText = paymentChangeRange.min === paymentChangeRange.max
      ? `about ${formatCurrency(paymentChangeRange.min)}`
      : `about ${formatCurrency(paymentChangeRange.min)}–${formatCurrency(paymentChangeRange.max)}`;
    
    narrative = `Rate Context: If rates were ${rateAmount}% ${rateDirection}, your monthly payment would ${rateAdjustment < 0 ? "decrease" : "increase"} by ${paymentChangeText}. This example shows how small rate changes affect monthly payments.`;
  }

  return {
    isValid: true,
    narrative,
    orderingChanges,
    paymentChangeRange,
  };
}

/**
 * Generate multi-point rate sensitivity analysis for a refinance scenario.
 * Shows impacts at base rate, base-0.25, base-0.50, and base-1.00.
 */
export function generateRefiRateSensitivity(
  scenario: Scenario
): RefiRateSensitivityResult {
  if (scenario.inputs.mode !== "refinance") {
    return {
      isValid: false,
      scenarioName: scenario.name,
      baseRate: 0,
      baseMonthly: 0,
      baseTotalInterest: 0,
      points: [],
      breakEvenMonths: null,
      narrative: "",
    };
  }

  const baseRate = scenario.inputs.shared.interestRate;
  const baseMonthly = scenario.results.monthlyTotal;
  const baseTotalInterest = scenario.results.totalInterest;
  const rateAdjustments = [-0.25, -0.50, -1.00];

  const points: RefiRateSensitivityPoint[] = rateAdjustments.map((adj) => {
    const adjustedInputs: MortgageInputs = {
      ...scenario.inputs,
      shared: {
        ...scenario.inputs.shared,
        interestRate: Math.max(0.1, baseRate + adj),
      },
    };

    const adjustedResults = calculateMortgage(adjustedInputs);

    return {
      rateAdjustment: adj,
      monthlyPayment: adjustedResults.monthlyTotal,
      monthlyChange: adjustedResults.monthlyTotal - baseMonthly,
      totalInterest: adjustedResults.totalInterest,
      interestChange: adjustedResults.totalInterest - baseTotalInterest,
    };
  });

  // Calculate break-even months if closing costs exist
  let breakEvenMonths: number | null = null;
  const closingCosts = scenario.inputs.refinance.closingCosts;
  
  if (closingCosts > 0) {
    // Compare to a hypothetical scenario where you don't refinance
    // Break-even = closingCosts / monthly savings
    const currentLoanBalance = scenario.inputs.refinance.currentLoanBalance;
    // Assume current rate is ~1% higher for rough break-even calc
    const estimatedCurrentRate = baseRate + 1.0;
    
    const currentInputs: MortgageInputs = {
      ...scenario.inputs,
      shared: {
        ...scenario.inputs.shared,
        interestRate: estimatedCurrentRate,
      },
    };
    const currentResults = calculateMortgage(currentInputs);
    const monthlySavings = currentResults.monthlyPrincipalInterest - scenario.results.monthlyPrincipalInterest;
    
    if (monthlySavings > 0) {
      breakEvenMonths = Math.ceil(closingCosts / monthlySavings);
    }
  }

  // Generate narrative for 0.5% drop (most common consideration)
  const halfPointDrop = points.find((p) => p.rateAdjustment === -0.50);
  let narrative = "";
  
  if (halfPointDrop) {
    const monthlySaving = Math.abs(halfPointDrop.monthlyChange);
    const interestSaving = Math.abs(halfPointDrop.interestChange);
    
    narrative = `Rate Context: If rates drop by 0.50%, your monthly payment would decrease by about ${formatCurrency(monthlySaving)}, saving about ${formatCurrency(interestSaving)} in total interest. This is an illustrative change, not a prediction.`;
    
    if (breakEvenMonths !== null) {
      narrative += ` With ${formatCurrency(closingCosts)} in closing costs, the break-even point would be about ${breakEvenMonths} months.`;
    }
  }

  return {
    isValid: true,
    scenarioName: scenario.name,
    baseRate,
    baseMonthly,
    baseTotalInterest,
    points,
    breakEvenMonths,
    narrative,
  };
}
