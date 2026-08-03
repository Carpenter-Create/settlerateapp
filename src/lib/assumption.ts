/**
 * Loan Assumption Calculation Module
 * 
 * Models an assumed existing mortgage plus gap financing required
 * to complete the transaction (cash, second loan, or HELOC).
 */

// ============================================================================
// TYPES
// ============================================================================

export type GapMethod = "cash" | "second_loan" | "heloc";

export interface AssumedLoanInputs {
  /** Remaining balance on the assumed loan */
  balance: number;
  /** APR of the assumed loan */
  apr: number;
  /** Remaining months on the assumed loan */
  remainingMonths: number;
  /** Monthly PMI if applicable */
  monthlyPmi: number;
  /** Monthly escrow (taxes/insurance) */
  monthlyEscrow: number;
}

export interface GapLoanInputs {
  /** Amount needed beyond assumed loan */
  amount: number;
  /** How the gap is financed */
  method: GapMethod;
  /** For second_loan: APR */
  loanApr: number;
  /** For second_loan: term in months */
  loanTermMonths: number;
  /** For HELOC: APR */
  helocApr: number;
  /** For HELOC: interest-only flag */
  helocInterestOnly: boolean;
  /** For HELOC: repayment months (optional, default 60) */
  helocRepayMonths: number;
}

export interface AssumptionInputs {
  /** Purchase/transaction details */
  purchasePrice: number;
  /** Cash provided by buyer */
  downPaymentCash: number;
  /** The assumed loan details */
  assumed: AssumedLoanInputs;
  /** Gap financing details */
  gap: GapLoanInputs;
  /** Assumption fees */
  assumptionFees: number;
}

export interface AssumptionResults {
  /** Monthly P&I on assumed loan */
  assumedPaymentPi: number;
  /** Monthly payment for gap financing */
  gapPayment: number;
  /** Total combined monthly payment */
  paymentTotal: number;
  /** Total interest over modeled term */
  interestTotal: number;
  /** Total fees */
  feesTotal: number;
  /** Total cost (interest + fees) */
  costTotal: number;
  /** Payoff date of assumed loan */
  assumedPayoffDate: Date;
  /** Gap amount required */
  gapAmount: number;
  /** For comparison normalization */
  monthlyPaymentPrimary: number;
  /** LTV ratio (assumed balance / purchase price) */
  ltvRatio: number;
}

// ============================================================================
// DEFAULTS
// ============================================================================

export const DEFAULT_ASSUMED_LOAN_INPUTS: AssumedLoanInputs = {
  balance: 200000,
  apr: 3.5,
  remainingMonths: 300, // 25 years
  monthlyPmi: 0,
  monthlyEscrow: 0,
};

export const DEFAULT_GAP_INPUTS: GapLoanInputs = {
  amount: 0,
  method: "cash",
  loanApr: 7.5,
  loanTermMonths: 180, // 15 years
  helocApr: 8.5,
  helocInterestOnly: true,
  helocRepayMonths: 60, // 5 years
};

export const DEFAULT_ASSUMPTION_INPUTS: AssumptionInputs = {
  purchasePrice: 350000,
  downPaymentCash: 50000,
  assumed: { ...DEFAULT_ASSUMED_LOAN_INPUTS },
  gap: { ...DEFAULT_GAP_INPUTS },
  assumptionFees: 0,
};

// ============================================================================
// CALCULATIONS
// ============================================================================

/**
 * Calculate standard amortization payment
 */
function calculateAmortizedPayment(
  principal: number,
  monthlyRate: number,
  months: number
): number {
  if (principal <= 0) return 0;
  if (monthlyRate === 0) return principal / months;
  
  return (principal * (monthlyRate * Math.pow(1 + monthlyRate, months))) /
    (Math.pow(1 + monthlyRate, months) - 1);
}

/**
 * Calculate total interest for an amortized loan
 */
function calculateTotalInterest(
  principal: number,
  monthlyPayment: number,
  months: number
): number {
  return (monthlyPayment * months) - principal;
}

/**
 * Calculate Loan Assumption scenario
 */
export function calculateAssumption(inputs: AssumptionInputs): AssumptionResults {
  const { purchasePrice, downPaymentCash, assumed, gap, assumptionFees } = inputs;
  
  // Calculate gap amount needed
  const gapAmount = Math.max(0, purchasePrice - assumed.balance - downPaymentCash);
  
  // Calculate assumed loan payment
  const assumedMonthlyRate = assumed.apr / 100 / 12;
  const assumedPaymentPi = calculateAmortizedPayment(
    assumed.balance,
    assumedMonthlyRate,
    assumed.remainingMonths
  );
  
  // Calculate assumed loan total interest remaining
  const assumedInterest = calculateTotalInterest(
    assumed.balance,
    assumedPaymentPi,
    assumed.remainingMonths
  );
  
  // Calculate gap payment based on method
  let gapPayment = 0;
  let gapInterest = 0;
  let gapTermMonths = 0;
  
  if (gapAmount > 0) {
    switch (gap.method) {
      case "cash":
        // No payment needed
        gapPayment = 0;
        gapInterest = 0;
        break;
        
      case "second_loan": {
        const loanMonthlyRate = gap.loanApr / 100 / 12;
        gapPayment = calculateAmortizedPayment(gapAmount, loanMonthlyRate, gap.loanTermMonths);
        gapInterest = calculateTotalInterest(gapAmount, gapPayment, gap.loanTermMonths);
        gapTermMonths = gap.loanTermMonths;
        break;
      }
        
      case "heloc":
        if (gap.helocInterestOnly) {
          // Interest-only during modeled period
          gapPayment = gapAmount * (gap.helocApr / 100 / 12);
          gapInterest = gapPayment * gap.helocRepayMonths;
          gapTermMonths = gap.helocRepayMonths;
        } else {
          // Amortized HELOC
          const helocMonthlyRate = gap.helocApr / 100 / 12;
          gapPayment = calculateAmortizedPayment(gapAmount, helocMonthlyRate, gap.helocRepayMonths);
          gapInterest = calculateTotalInterest(gapAmount, gapPayment, gap.helocRepayMonths);
          gapTermMonths = gap.helocRepayMonths;
        }
        break;
    }
  }
  
  // Calculate totals
  const paymentTotal = assumedPaymentPi + gapPayment + assumed.monthlyPmi + assumed.monthlyEscrow;
  const interestTotal = assumedInterest + gapInterest;
  const feesTotal = assumptionFees;
  const costTotal = interestTotal + feesTotal;
  
  // Calculate payoff date (based on assumed loan as primary)
  const assumedPayoffDate = new Date();
  assumedPayoffDate.setMonth(assumedPayoffDate.getMonth() + assumed.remainingMonths);
  
  // Calculate LTV
  const ltvRatio = purchasePrice > 0 ? (assumed.balance / purchasePrice) * 100 : 0;
  
  return {
    assumedPaymentPi,
    gapPayment,
    paymentTotal,
    interestTotal,
    feesTotal,
    costTotal,
    assumedPayoffDate,
    gapAmount,
    monthlyPaymentPrimary: paymentTotal,
    ltvRatio,
  };
}

/**
 * Get payoff date for assumption
 */
export function getAssumptionPayoffDate(inputs: AssumptionInputs): Date {
  const date = new Date();
  date.setMonth(date.getMonth() + inputs.assumed.remainingMonths);
  return date;
}