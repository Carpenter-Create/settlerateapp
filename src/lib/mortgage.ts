export type ScenarioType = "purchase" | "refinance";

// =============================================================================
// NAMESPACED INPUT TYPES (Mode-specific inputs)
// =============================================================================

/**
 * Purchase-specific inputs
 */
export interface PurchaseInputs {
  purchasePrice: number;
  downPayment: number;
  downPaymentType: "percent" | "dollar";
}

/**
 * Refinance-specific inputs
 */
export interface RefinanceInputs {
  currentLoanBalance: number;
  cashOutAmount: number;
  closingCosts: number;
  financeClosingCosts: boolean;
  estimatedHomeValue: number | null;
}

/**
 * Shared inputs (common to both modes)
 */
export interface SharedInputs {
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

// =============================================================================
// CANONICAL MORTGAGE INPUTS (Strict scenario shape contract)
// =============================================================================

/**
 * MortgageInputs - The canonical input structure for the mortgage calculator.
 * 
 * STRICT CONTRACT:
 * - `mode` is REQUIRED and determines which namespaced inputs are active
 * - `purchase` contains purchase-specific inputs
 * - `refinance` contains refinance-specific inputs
 * - Both namespaces are always present to simplify code, but only one is "active"
 * - When mode is toggled, the active namespace's values are used for calculation
 * 
 * This design ensures:
 * 1. Mode never falls back to defaults after save/duplicate
 * 2. Switching modes preserves previous values (can switch back)
 * 3. Deep clone captures everything needed for accurate duplication
 */
export interface MortgageInputs {
  // Mode is REQUIRED - determines which inputs are active
  mode: ScenarioType;
  
  // Namespaced mode-specific inputs
  purchase: PurchaseInputs;
  refinance: RefinanceInputs;
  
  // Shared inputs (common to both modes)
  shared: SharedInputs;
}

// Legacy flat interface for backward compatibility during migration
// TODO: Remove after full migration
export interface LegacyMortgageInputs {
  scenarioType: ScenarioType;
  purchasePrice: number;
  downPayment: number;
  downPaymentType: "percent" | "dollar";
  currentLoanBalance: number;
  cashOutAmount: number;
  closingCosts: number;
  financeClosingCosts: boolean;
  interestRate: number;
  loanTerm: number;
  includeEstimates: boolean;
  zipCode: string | null;
  usedZipEstimate: boolean;
  propertyTaxMode: "rate" | "annual";
  propertyTaxRate: number | null;
  propertyTaxAnnual: number | null;
  homeInsuranceMonthly: number | null;
  hoaMonthly: number | null;
  pmiMonthly: number | null;
  estimatedHomeValue: number | null;
  extraMonthlyPayment: number;
  oneTimePrincipalPayment: number | null;
}

// =============================================================================
// DEFAULTS
// =============================================================================

export const DEFAULT_PURCHASE_INPUTS: PurchaseInputs = {
  purchasePrice: 450000,
  downPayment: 20,
  downPaymentType: "percent",
};

export const DEFAULT_REFINANCE_INPUTS: RefinanceInputs = {
  currentLoanBalance: 300000,
  cashOutAmount: 0,
  closingCosts: 0,
  financeClosingCosts: false,
  estimatedHomeValue: 400000,
};

export const DEFAULT_SHARED_INPUTS: SharedInputs = {
  interestRate: 6.5,
  loanTerm: 30,
  includeEstimates: false,
  zipCode: null,
  usedZipEstimate: false,
  propertyTaxMode: "rate",
  propertyTaxRate: null,
  propertyTaxAnnual: null,
  homeInsuranceMonthly: null,
  hoaMonthly: null,
  pmiMonthly: null,
  extraMonthlyPayment: 0,
  oneTimePrincipalPayment: null,
};

/**
 * Default canonical inputs (new scenario mode)
 */
export const DEFAULT_INPUTS: MortgageInputs = {
  mode: "purchase",
  purchase: { ...DEFAULT_PURCHASE_INPUTS },
  refinance: { ...DEFAULT_REFINANCE_INPUTS },
  shared: { ...DEFAULT_SHARED_INPUTS },
};

// =============================================================================
// MIGRATION UTILITIES
// =============================================================================

/**
 * Check if inputs are in legacy flat format
 */
export function isLegacyInputs(inputs: unknown): inputs is LegacyMortgageInputs {
  if (!inputs || typeof inputs !== "object") return false;
  const obj = inputs as Record<string, unknown>;
  // Legacy format has scenarioType at top level, new format has mode
  return "scenarioType" in obj && !("mode" in obj);
}

/**
 * Migrate legacy flat inputs to namespaced structure
 */
export function migrateLegacyInputs(legacy: LegacyMortgageInputs): MortgageInputs {
  return {
    mode: legacy.scenarioType,
    purchase: {
      purchasePrice: legacy.purchasePrice,
      downPayment: legacy.downPayment,
      downPaymentType: legacy.downPaymentType,
    },
    refinance: {
      currentLoanBalance: legacy.currentLoanBalance,
      cashOutAmount: legacy.cashOutAmount,
      closingCosts: legacy.closingCosts,
      financeClosingCosts: legacy.financeClosingCosts,
      estimatedHomeValue: legacy.estimatedHomeValue,
    },
    shared: {
      interestRate: legacy.interestRate,
      loanTerm: legacy.loanTerm,
      includeEstimates: legacy.includeEstimates,
      zipCode: legacy.zipCode,
      usedZipEstimate: legacy.usedZipEstimate,
      propertyTaxMode: legacy.propertyTaxMode,
      propertyTaxRate: legacy.propertyTaxRate,
      propertyTaxAnnual: legacy.propertyTaxAnnual,
      homeInsuranceMonthly: legacy.homeInsuranceMonthly,
      hoaMonthly: legacy.hoaMonthly,
      pmiMonthly: legacy.pmiMonthly,
      extraMonthlyPayment: legacy.extraMonthlyPayment,
      oneTimePrincipalPayment: legacy.oneTimePrincipalPayment,
    },
  };
}

/**
 * Ensure inputs are in canonical format (migrate if necessary)
 */
export function ensureCanonicalInputs(inputs: MortgageInputs | LegacyMortgageInputs | unknown): MortgageInputs {
  if (!inputs || typeof inputs !== "object") {
    return structuredClone(DEFAULT_INPUTS);
  }
  
  if (isLegacyInputs(inputs)) {
    return migrateLegacyInputs(inputs);
  }
  
  // Already canonical
  return inputs as MortgageInputs;
}

// =============================================================================
// RESULT TYPES
// =============================================================================

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
  mode: ScenarioType;
  // Refinance-specific results
  cashOutAmount?: number;
  closingCostsIncluded?: number;
}

// =============================================================================
// CALCULATION HELPERS
// =============================================================================

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
 * Calculate loan amount based on scenario mode
 */
export function calculateLoanAmount(inputs: MortgageInputs): {
  loanAmount: number;
  homeValue: number;
  cashOut: number;
  closingCostsIncluded: number;
} {
  if (inputs.mode === "purchase") {
    const purchase = inputs.purchase;
    const downPaymentAmount = calculateDownPaymentAmount(
      purchase.purchasePrice,
      purchase.downPayment,
      purchase.downPaymentType
    );
    return {
      loanAmount: purchase.purchasePrice - downPaymentAmount,
      homeValue: purchase.purchasePrice,
      cashOut: 0,
      closingCostsIncluded: 0,
    };
  } else {
    // Refinance: loan = current balance + cash out + closing costs (if financed)
    const refinance = inputs.refinance;
    const closingCostsIncluded = refinance.financeClosingCosts ? refinance.closingCosts : 0;
    return {
      loanAmount: refinance.currentLoanBalance + refinance.cashOutAmount + closingCostsIncluded,
      homeValue: refinance.estimatedHomeValue ?? refinance.currentLoanBalance * 1.25, // Fallback estimate
      cashOut: refinance.cashOutAmount,
      closingCostsIncluded,
    };
  }
}

// =============================================================================
// MAIN CALCULATION
// =============================================================================

export function calculateMortgage(inputs: MortgageInputs): MortgageResults {
  const { mode, shared } = inputs;
  const {
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
  } = shared;

  // Calculate loan amount based on scenario mode
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
    mode,
    ...(mode === "refinance" && {
      cashOutAmount: cashOut,
      closingCostsIncluded,
    }),
  };
}

// =============================================================================
// FORMATTING UTILITIES
// =============================================================================

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

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate that a MortgageInputs object has the required structure.
 * Returns error messages if invalid.
 */
export function validateInputs(inputs: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!inputs || typeof inputs !== "object") {
    errors.push("Inputs must be an object");
    return { valid: false, errors };
  }
  
  const obj = inputs as Record<string, unknown>;
  
  // Check mode
  if (!obj.mode) {
    errors.push("Missing required field: mode");
  } else if (obj.mode !== "purchase" && obj.mode !== "refinance") {
    errors.push("Invalid mode: must be 'purchase' or 'refinance'");
  }
  
  // Check namespaced inputs
  if (!obj.purchase || typeof obj.purchase !== "object") {
    errors.push("Missing required field: purchase inputs");
  }
  
  if (!obj.refinance || typeof obj.refinance !== "object") {
    errors.push("Missing required field: refinance inputs");
  }
  
  if (!obj.shared || typeof obj.shared !== "object") {
    errors.push("Missing required field: shared inputs");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
