export type ScenarioType = "purchase" | "refinance";

export interface MortgageInputs {
  // Scenario type
  scenarioType: ScenarioType;
  
  // Purchase-specific inputs
  purchasePrice: number;
  downPayment: number;
  downPaymentType: "percent" | "dollar";
  
  // Refinance-specific inputs
  currentLoanBalance: number;
  cashOutAmount: number;
  closingCosts: number;
  financeClosingCosts: boolean;
  
  // Shared inputs
  interestRate: number;
  loanTerm: number; // years
  
  // Taxes & Insurance (optional section)
  includeEstimates: boolean;
  zipCode: string | null;
  usedZipEstimate: boolean;
  propertyTaxMode: "rate" | "annual";
  propertyTaxRate: number | null; // percent of home value
  propertyTaxAnnual: number | null; // dollars per year
  homeInsuranceMonthly: number | null;
  hoaMonthly: number | null;
  pmiMonthly: number | null;
  
  // For refinance: estimated home value (used for LTV/PMI calculation)
  estimatedHomeValue: number | null;
  
  // Extra payments
  extraMonthlyPayment: number;
  oneTimePrincipalPayment: number | null;
}

export interface AmortizationEntry {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  extraPayment: number;
  totalPayment: number;
  balance: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
}

export interface MortgageResults {
  loanAmount: number;
  monthlyPrincipalInterest: number;
  monthlyPropertyTax: number;
  monthlyHomeInsurance: number;
  monthlyPMI: number;
  monthlyHOA: number;
  monthlyTotal: number;
  totalInterest: number;
  totalCost: number;
  payoffDate: Date;
  payoffMonths: number;
  amortizationSchedule: AmortizationEntry[];
  ltvRatio: number;
  requiresPMI: boolean;
  usedEstimates: boolean;
  scenarioType: ScenarioType;
  // Refinance-specific results
  cashOutAmount?: number;
  closingCostsIncluded?: number;
}

export function calculateDownPaymentAmount(
  purchasePrice: number,
  downPayment: number,
  downPaymentType: "percent" | "dollar"
): number {
  if (downPaymentType === "percent") {
    return (purchasePrice * downPayment) / 100;
  }
  return downPayment;
}

export function calculateDownPaymentPercent(
  purchasePrice: number,
  downPayment: number,
  downPaymentType: "percent" | "dollar"
): number {
  if (downPaymentType === "percent") {
    return downPayment;
  }
  return purchasePrice > 0 ? (downPayment / purchasePrice) * 100 : 0;
}

/**
 * Calculate loan amount based on scenario type
 */
export function calculateLoanAmount(inputs: MortgageInputs): {
  loanAmount: number;
  homeValue: number;
  cashOut: number;
  closingCostsIncluded: number;
} {
  if (inputs.scenarioType === "purchase") {
    const downPaymentAmount = calculateDownPaymentAmount(
      inputs.purchasePrice,
      inputs.downPayment,
      inputs.downPaymentType
    );
    return {
      loanAmount: inputs.purchasePrice - downPaymentAmount,
      homeValue: inputs.purchasePrice,
      cashOut: 0,
      closingCostsIncluded: 0,
    };
  } else {
    // Refinance: loan = current balance + cash out + closing costs (if financed)
    const closingCostsIncluded = inputs.financeClosingCosts ? inputs.closingCosts : 0;
    return {
      loanAmount: inputs.currentLoanBalance + inputs.cashOutAmount + closingCostsIncluded,
      homeValue: inputs.estimatedHomeValue ?? inputs.currentLoanBalance * 1.25, // Fallback estimate
      cashOut: inputs.cashOutAmount,
      closingCostsIncluded,
    };
  }
}

export function calculateMortgage(inputs: MortgageInputs): MortgageResults {
  const {
    scenarioType,
    interestRate,
    loanTerm,
    includeEstimates,
    propertyTaxMode,
    propertyTaxRate,
    propertyTaxAnnual,
    homeInsuranceMonthly,
    hoaMonthly,
    pmiMonthly,
    extraMonthlyPayment,
    usedZipEstimate,
  } = inputs;

  // Calculate loan amount based on scenario type
  const { loanAmount, homeValue, cashOut, closingCostsIncluded } = calculateLoanAmount(inputs);
  
  // Calculate LTV ratio
  const ltvRatio = homeValue > 0 ? (loanAmount / homeValue) * 100 : 0;
  const requiresPMI = ltvRatio > 80;

  // Monthly interest rate
  const monthlyRate = interestRate / 100 / 12;
  const totalPayments = loanTerm * 12;

  // Calculate monthly P&I using amortization formula
  let monthlyPrincipalInterest = 0;
  if (loanAmount > 0 && monthlyRate > 0) {
    monthlyPrincipalInterest =
      (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments))) /
      (Math.pow(1 + monthlyRate, totalPayments) - 1);
  } else if (loanAmount > 0 && monthlyRate === 0) {
    monthlyPrincipalInterest = loanAmount / totalPayments;
  }

  // Calculate monthly costs based on whether estimates are included
  let monthlyPropertyTax = 0;
  let monthlyHomeInsurance = 0;
  let monthlyPMI = 0;
  let monthlyHOA = 0;

  if (includeEstimates) {
    // Property tax calculation based on mode
    if (propertyTaxMode === "rate" && propertyTaxRate !== null) {
      const annualTax = homeValue * (propertyTaxRate / 100);
      monthlyPropertyTax = annualTax / 12;
    } else if (propertyTaxMode === "annual" && propertyTaxAnnual !== null) {
      monthlyPropertyTax = propertyTaxAnnual / 12;
    }

    // Home insurance
    monthlyHomeInsurance = homeInsuranceMonthly ?? 0;

    // HOA
    monthlyHOA = hoaMonthly ?? 0;

    // PMI (only if required based on LTV)
    monthlyPMI = requiresPMI ? (pmiMonthly ?? 0) : 0;
  }

  // Generate amortization schedule with extra payments
  const amortizationSchedule: AmortizationEntry[] = [];
  let balance = loanAmount;
  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;
  let month = 0;

  while (balance > 0.01 && month < totalPayments * 2) {
    month++;
    
    const interestPayment = balance * monthlyRate;
    let principalPayment = monthlyPrincipalInterest - interestPayment;
    
    // Apply extra payment
    let extraPayment = extraMonthlyPayment;
    
    // Cap payments to remaining balance
    if (principalPayment + extraPayment > balance) {
      principalPayment = Math.min(principalPayment, balance);
      extraPayment = Math.min(extraPayment, balance - principalPayment);
    }

    const totalPayment = principalPayment + interestPayment + extraPayment;
    balance -= (principalPayment + extraPayment);
    
    // Ensure balance doesn't go negative
    balance = Math.max(0, balance);

    totalPrincipalPaid += principalPayment + extraPayment;
    totalInterestPaid += interestPayment;

    amortizationSchedule.push({
      month,
      payment: monthlyPrincipalInterest,
      principal: principalPayment,
      interest: interestPayment,
      extraPayment,
      totalPayment,
      balance,
      totalPrincipalPaid,
      totalInterestPaid,
    });

    if (balance <= 0.01) break;
  }

  // Calculate totals
  const totalInterest = totalInterestPaid;
  const totalCost = loanAmount + totalInterest;
  
  // Calculate payoff date
  const payoffMonths = amortizationSchedule.length;
  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + payoffMonths);

  // Monthly total payment (without extra)
  const monthlyTotal =
    monthlyPrincipalInterest +
    monthlyPropertyTax +
    monthlyHomeInsurance +
    monthlyPMI +
    monthlyHOA;

  return {
    loanAmount,
    monthlyPrincipalInterest,
    monthlyPropertyTax,
    monthlyHomeInsurance,
    monthlyPMI,
    monthlyHOA,
    monthlyTotal,
    totalInterest,
    totalCost,
    payoffDate,
    payoffMonths,
    amortizationSchedule,
    ltvRatio,
    requiresPMI,
    usedEstimates: includeEstimates && usedZipEstimate,
    scenarioType,
    ...(scenarioType === "refinance" && {
      cashOutAmount: cashOut,
      closingCostsIncluded,
    }),
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyPrecise(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
  }).format(date);
}

export const DEFAULT_PURCHASE_INPUTS: Partial<MortgageInputs> = {
  scenarioType: "purchase",
  purchasePrice: 450000,
  downPayment: 20,
  downPaymentType: "percent",
};

export const DEFAULT_REFINANCE_INPUTS: Partial<MortgageInputs> = {
  scenarioType: "refinance",
  currentLoanBalance: 300000,
  cashOutAmount: 0,
  closingCosts: 0,
  financeClosingCosts: false,
  estimatedHomeValue: 400000,
};

export const DEFAULT_INPUTS: MortgageInputs = {
  // Scenario type
  scenarioType: "purchase",
  
  // Purchase-specific
  purchasePrice: 450000,
  downPayment: 20,
  downPaymentType: "percent",
  
  // Refinance-specific
  currentLoanBalance: 300000,
  cashOutAmount: 0,
  closingCosts: 0,
  financeClosingCosts: false,
  estimatedHomeValue: null,
  
  // Shared
  interestRate: 6.5,
  loanTerm: 30,
  
  // Taxes & insurance (optional, collapsed by default)
  includeEstimates: false,
  zipCode: null,
  usedZipEstimate: false,
  propertyTaxMode: "rate",
  propertyTaxRate: null,
  propertyTaxAnnual: null,
  homeInsuranceMonthly: null,
  hoaMonthly: null,
  pmiMonthly: null,
  
  // Extra payments
  extraMonthlyPayment: 0,
  oneTimePrincipalPayment: null,
};
