/**
 * Unified Scenario Calculation Module
 * 
 * Dispatches to the appropriate calculator based on scenario type.
 * Provides a unified results interface for comparisons.
 */

import { MortgageInputs, MortgageResults, calculateMortgage, ScenarioType } from "./mortgage";
import { HelocInputs, HelocResults, calculateHeloc, DEFAULT_HELOC_INPUTS } from "./heloc";
import { AssumptionInputs, AssumptionResults, calculateAssumption, DEFAULT_ASSUMPTION_INPUTS } from "./assumption";

// ============================================================================
// UNIFIED RESULTS INTERFACE (for comparisons)
// ============================================================================

export interface UnifiedResults {
  /** Scenario type */
  type: ScenarioType;
  
  /** Primary monthly payment (for comparison) */
  monthlyPaymentPrimary: number;
  
  /** Total monthly payment including all components */
  monthlyTotal: number;
  
  /** Total interest over the life of the loan */
  totalInterest: number;
  
  /** Total cost (principal + interest + fees) */
  totalCost: number;
  
  /** Interest rate or APR (for comparison) */
  rateForComparison: number;
  
  /** LTV ratio if applicable */
  ltvRatio: number | null;
  
  /** Payoff timeline in months */
  payoffMonths: number;
  
  /** Loan/credit amount */
  principalAmount: number;
  
  /** Original typed results */
  original: MortgageResults | HelocResults | AssumptionResults;
}

// ============================================================================
// CALCULATION DISPATCHER
// ============================================================================

/**
 * Calculate scenario based on type and return unified results
 */
export function calculateScenario(inputs: MortgageInputs): UnifiedResults {
  switch (inputs.mode) {
    case "purchase":
    case "refinance": {
      const results = calculateMortgage(inputs);
      return {
        type: inputs.mode,
        monthlyPaymentPrimary: results.monthlyPrincipalInterest,
        monthlyTotal: results.monthlyTotal,
        totalInterest: results.totalInterest,
        totalCost: results.totalCost,
        rateForComparison: inputs.shared.interestRate,
        ltvRatio: results.ltvRatio,
        payoffMonths: results.payoffMonths,
        principalAmount: results.loanAmount,
        original: results,
      };
    }
    
    case "heloc": {
      const helocInputs = inputs.heloc ?? DEFAULT_HELOC_INPUTS;
      const results = calculateHeloc(helocInputs);
      return {
        type: "heloc",
        monthlyPaymentPrimary: results.paymentRepay,
        monthlyTotal: results.paymentRepay,
        totalInterest: results.interestTotal,
        totalCost: results.costTotal,
        rateForComparison: helocInputs.apr,
        ltvRatio: null, // HELOC doesn't have traditional LTV
        payoffMonths: results.timelineMonthsTotal,
        principalAmount: results.balanceEndDraw,
        original: results,
      };
    }
    
    case "assumption": {
      const assumptionInputs = inputs.assumption ?? DEFAULT_ASSUMPTION_INPUTS;
      const results = calculateAssumption(assumptionInputs);
      return {
        type: "assumption",
        monthlyPaymentPrimary: results.paymentTotal,
        monthlyTotal: results.paymentTotal,
        totalInterest: results.interestTotal,
        totalCost: results.costTotal,
        rateForComparison: assumptionInputs.assumed.apr,
        ltvRatio: results.ltvRatio,
        payoffMonths: assumptionInputs.assumed.remainingMonths,
        principalAmount: assumptionInputs.assumed.balance + results.gapAmount,
        original: results,
      };
    }
    
    default:
      throw new Error(`Unknown scenario type: ${inputs.mode}`);
  }
}

/**
 * Type guard for MortgageResults
 */
export function isMortgageResults(results: UnifiedResults["original"]): results is MortgageResults {
  return "amortizationSchedule" in results;
}

/**
 * Type guard for HelocResults
 */
export function isHelocResults(results: UnifiedResults["original"]): results is HelocResults {
  return "paymentDrawAvg" in results;
}

/**
 * Type guard for AssumptionResults
 */
export function isAssumptionResults(results: UnifiedResults["original"]): results is AssumptionResults {
  return "assumedPaymentPi" in results;
}

/**
 * Get display-friendly rate label for a scenario type
 */
export function getRateLabel(type: ScenarioType): string {
  switch (type) {
    case "purchase":
    case "refinance":
      return "Interest rate";
    case "heloc":
      return "APR";
    case "assumption":
      return "Assumed rate";
    default:
      return "Rate";
  }
}