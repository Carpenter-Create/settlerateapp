export interface MortgageInputs {
  purchasePrice: number;
  downPayment: number;
  downPaymentType: "percent" | "dollar";
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

export function calculateMortgage(inputs: MortgageInputs): MortgageResults {
  const {
    purchasePrice,
    downPayment,
    downPaymentType,
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

  // Calculate loan amount
  const downPaymentAmount = calculateDownPaymentAmount(
    purchasePrice,
    downPayment,
    downPaymentType
  );
  const loanAmount = purchasePrice - downPaymentAmount;
  const ltvRatio = purchasePrice > 0 ? (loanAmount / purchasePrice) * 100 : 0;
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
      const annualTax = purchasePrice * (propertyTaxRate / 100);
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
      const totalPrincipalNeeded = balance;
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

export const DEFAULT_INPUTS: MortgageInputs = {
  purchasePrice: 450000,
  downPayment: 20,
  downPaymentType: "percent",
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
