/**
 * HELOC (Home Equity Line of Credit) Calculation Module
 * 
 * Models a HELOC as a second-lien product with draw and repayment periods.
 * Supports interest-only payments during draw and amortized repayment.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface HelocInputs {
  /** Maximum credit available */
  creditLimit: number;
  /** Current outstanding balance at time of analysis (can be 0) */
  currentBalance: number;
  /** Annual Percentage Rate (variable, entered as current) */
  apr: number;
  /** Length of draw period in months (e.g., 120) */
  drawMonths: number;
  /** Length of repayment period in months (e.g., 240) */
  repayMonths: number;
  /** Amount drawn each month during draw period */
  monthlyDraw: number;
  /** Months the user plans to draw (if less than full draw period) */
  drawMonthsUsed: number;
  /** Annual fee for the HELOC */
  annualFee: number;
  /** Closing costs */
  closingCosts: number;
  /** Whether draw period is interest-only (v1 default: true) */
  interestOnlyDraw: boolean;
}

export interface HelocResults {
  /** Average monthly payment during draw period */
  paymentDrawAvg: number;
  /** Maximum monthly payment during draw period */
  paymentDrawMax: number;
  /** Monthly payment during repayment period */
  paymentRepay: number;
  /** Total interest paid (draw + repayment) */
  interestTotal: number;
  /** Total fees paid */
  feesTotal: number;
  /** Total cost (interest + fees) */
  costTotal: number;
  /** Balance at end of draw period */
  balanceEndDraw: number;
  /** Total timeline in months */
  timelineMonthsTotal: number;
  /** Monthly payment schedule for comparison normalization */
  monthlyPaymentPrimary: number;
}

// ============================================================================
// DEFAULTS
// ============================================================================

export const DEFAULT_HELOC_INPUTS: HelocInputs = {
  creditLimit: 50000,
  currentBalance: 0,
  apr: 8.5,
  drawMonths: 120, // 10 years
  repayMonths: 240, // 20 years
  monthlyDraw: 0,
  drawMonthsUsed: 120,
  annualFee: 0,
  closingCosts: 0,
  interestOnlyDraw: true,
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
 * Calculate HELOC scenario
 */
export function calculateHeloc(inputs: HelocInputs): HelocResults {
  const {
    creditLimit,
    currentBalance,
    apr,
    drawMonths,
    repayMonths,
    monthlyDraw,
    drawMonthsUsed,
    annualFee,
    closingCosts,
    interestOnlyDraw,
  } = inputs;

  if (!interestOnlyDraw) {
    throw new Error(
      "Amortizing HELOC draw periods are not supported; interestOnlyDraw must be true"
    );
  }

  const monthlyRate = apr / 100 / 12;
  
  // Simulate draw period
  let balance = currentBalance;
  let totalDrawInterest = 0;
  const drawPayments: number[] = [];
  
  const effectiveDrawMonths = Math.min(drawMonthsUsed, drawMonths);
  
  for (let month = 1; month <= effectiveDrawMonths; month++) {
    // Add monthly draw (capped at credit limit)
    if (monthlyDraw > 0) {
      balance = Math.min(balance + monthlyDraw, creditLimit);
    }
    
    // Calculate interest
    const monthlyInterest = balance * monthlyRate;
    totalDrawInterest += monthlyInterest;
    
    drawPayments.push(monthlyInterest);
  }
  
  // For remaining draw period with no additional draws
  for (let month = effectiveDrawMonths + 1; month <= drawMonths; month++) {
    const monthlyInterest = balance * monthlyRate;
    totalDrawInterest += monthlyInterest;
    drawPayments.push(monthlyInterest);
  }
  
  const balanceEndDraw = balance;
  
  // Calculate repayment period (amortized)
  let totalRepayInterest = 0;
  const repayPayment = calculateAmortizedPayment(balanceEndDraw, monthlyRate, repayMonths);
  
  // Calculate total repayment interest
  if (balanceEndDraw > 0 && monthlyRate > 0) {
    totalRepayInterest = (repayPayment * repayMonths) - balanceEndDraw;
  }
  
  // Calculate averages and totals
  const paymentDrawAvg = drawPayments.length > 0 
    ? drawPayments.reduce((a, b) => a + b, 0) / drawPayments.length 
    : 0;
  const paymentDrawMax = drawPayments.length > 0 
    ? Math.max(...drawPayments) 
    : 0;
  
  const interestTotal = totalDrawInterest + totalRepayInterest;
  const feesTotal = (annualFee * (drawMonths + repayMonths) / 12) + closingCosts;
  const costTotal = interestTotal + feesTotal;
  
  return {
    paymentDrawAvg,
    paymentDrawMax,
    paymentRepay: repayPayment,
    interestTotal,
    feesTotal,
    costTotal,
    balanceEndDraw,
    timelineMonthsTotal: drawMonths + repayMonths,
    // Use repayment payment as primary for comparisons
    monthlyPaymentPrimary: repayPayment,
  };
}

/**
 * Get payoff date for HELOC
 */
export function getHelocPayoffDate(inputs: HelocInputs): Date {
  const totalMonths = inputs.drawMonths + inputs.repayMonths;
  const date = new Date();
  date.setMonth(date.getMonth() + totalMonths);
  return date;
}
