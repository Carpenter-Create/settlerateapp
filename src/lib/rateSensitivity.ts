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
    narrative = `If interest rates were ${rateAmount}% ${rateDirection} across all options, the relative ordering of these scenarios would change. This suggests the current recommendation is sensitive to rate assumptions.`;
  } else {
    const paymentChangeText = paymentChangeRange.min === paymentChangeRange.max
      ? `approximately ${formatCurrency(paymentChangeRange.min)}`
      : `approximately ${formatCurrency(paymentChangeRange.min)}–${formatCurrency(paymentChangeRange.max)}`;
    
    narrative = `If interest rates were ${rateAmount}% ${rateDirection} across all options, the relative ordering of these scenarios would remain the same. Monthly payments would ${rateAdjustment < 0 ? "decrease" : "increase"} by ${paymentChangeText}.`;
  }

  return {
    isValid: true,
    narrative,
    orderingChanges,
    paymentChangeRange,
  };
}
