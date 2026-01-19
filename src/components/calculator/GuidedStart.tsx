/**
 * GuidedStart - Structured configuration flow for new scenarios
 * 
 * This is a configuration overlay, NOT onboarding or marketing.
 * 
 * Design principles:
 * - Neutral, institutional, non-promotional
 * - No language implying advice, recommendations, or outcomes
 * - Treat user as a decision-maker, not a beginner
 * - Simple fade transitions only
 * - No progress celebration
 * 
 * Supports all four scenario types:
 * - Purchase: New home acquisition
 * - Refinance: Replace existing mortgage
 * - HELOC: Home equity line of credit
 * - Assumption: Take over existing loan
 */

import { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CurrencyInput } from "./CurrencyInput";
import { PercentInput } from "./PercentInput";
import { DownPaymentInput } from "./DownPaymentInput";
import { LoanTermInput } from "./LoanTermInput";
import {
  MortgageInputs,
  ScenarioType,
  DEFAULT_INPUTS,
  DEFAULT_PURCHASE_INPUTS,
  DEFAULT_REFINANCE_INPUTS,
  DEFAULT_SHARED_INPUTS,
  TRANSACTION_TYPE_LABELS,
} from "@/lib/mortgage";
import { DEFAULT_HELOC_INPUTS, HelocInputs } from "@/lib/heloc";
import { 
  DEFAULT_ASSUMPTION_INPUTS, 
  DEFAULT_ASSUMED_LOAN_INPUTS,
  DEFAULT_GAP_INPUTS,
  AssumptionInputs,
  GapMethod 
} from "@/lib/assumption";
import { DEFAULT_RATE_META } from "@/lib/rateMeta";
import { getZipEstimate, isValidZipCode } from "@/lib/zipEstimates";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Home, RefreshCw, CreditCard, FileCheck } from "lucide-react";

interface GuidedStartProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (inputs: MortgageInputs, name: string) => void;
}

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<Step, string> = {
  1: "Transaction type",
  2: "Property & loan context",
  3: "Payment structure",
  4: "Review assumptions",
};

const STEP_HELPERS: Record<ScenarioType, Record<Step, string>> = {
  purchase: {
    1: "Sets default inputs.",
    2: "Establish baseline assumptions.",
    3: "Define rate, term, and payment assumptions.",
    4: "You can revise any input after continuing.",
  },
  refinance: {
    1: "Sets default inputs.",
    2: "Establish baseline assumptions.",
    3: "Define rate, term, and payment assumptions.",
    4: "You can revise any input after continuing.",
  },
  heloc: {
    1: "Sets default inputs.",
    2: "Establish property and credit context.",
    3: "Define APR and term assumptions.",
    4: "You can revise any input after continuing.",
  },
  assumption: {
    1: "Sets default inputs.",
    2: "Establish transaction context.",
    3: "Define assumed loan and gap financing.",
    4: "You can revise any input after continuing.",
  },
};

const SCENARIO_TYPE_CARDS: { type: ScenarioType; icon: typeof Home; helper: string }[] = [
  { type: "purchase", icon: Home, helper: "New home acquisition financing" },
  { type: "refinance", icon: RefreshCw, helper: "Replace existing mortgage with new terms" },
  { type: "heloc", icon: CreditCard, helper: "Borrow against equity without replacing your mortgage" },
  { type: "assumption", icon: FileCheck, helper: "Take over an existing loan's rate and remaining term" },
];

const GAP_METHOD_OPTIONS: { value: GapMethod; label: string; description: string }[] = [
  { value: "cash", label: "Cash", description: "Pay gap from savings" },
  { value: "second_loan", label: "Second loan", description: "Amortized loan for gap" },
  { value: "heloc", label: "HELOC", description: "Interest-only gap financing" },
];

export function GuidedStart({ open, onOpenChange, onComplete }: GuidedStartProps) {
  const [step, setStep] = useState<Step>(1);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  
  // Form state - mirrors canonical MortgageInputs structure
  const [mode, setMode] = useState<ScenarioType>("purchase");
  
  // Common fields
  const [zipCode, setZipCode] = useState("");
  const [includeEstimates, setIncludeEstimates] = useState(true);
  const [propertyTaxRate, setPropertyTaxRate] = useState<number>(1.1);
  const [homeInsuranceMonthly, setHomeInsuranceMonthly] = useState<number>(150);
  
  // Purchase fields
  const [purchasePrice, setPurchasePrice] = useState(DEFAULT_PURCHASE_INPUTS.purchasePrice);
  const [downPayment, setDownPayment] = useState(DEFAULT_PURCHASE_INPUTS.downPayment);
  const [downPaymentType, setDownPaymentType] = useState<"percent" | "dollar">(DEFAULT_PURCHASE_INPUTS.downPaymentType);
  const [interestRate, setInterestRate] = useState(DEFAULT_SHARED_INPUTS.interestRate);
  const [loanTerm, setLoanTerm] = useState(DEFAULT_SHARED_INPUTS.loanTerm);
  
  // Refinance fields
  const [currentLoanBalance, setCurrentLoanBalance] = useState(DEFAULT_REFINANCE_INPUTS.currentLoanBalance);
  const [estimatedHomeValue, setEstimatedHomeValue] = useState<number>(DEFAULT_REFINANCE_INPUTS.estimatedHomeValue ?? 400000);
  const [cashOutAmount, setCashOutAmount] = useState(DEFAULT_REFINANCE_INPUTS.cashOutAmount);
  
  // HELOC fields
  const [helocHomeValue, setHelocHomeValue] = useState<number>(400000);
  const [helocMortgageBalance, setHelocMortgageBalance] = useState<number>(200000);
  const [helocCreditLimit, setHelocCreditLimit] = useState(DEFAULT_HELOC_INPUTS.creditLimit);
  const [helocApr, setHelocApr] = useState(DEFAULT_HELOC_INPUTS.apr);
  const [helocDrawMonths, setHelocDrawMonths] = useState(DEFAULT_HELOC_INPUTS.drawMonths);
  const [helocRepayMonths, setHelocRepayMonths] = useState(DEFAULT_HELOC_INPUTS.repayMonths);
  
  // Assumption fields
  const [assumptionPurchasePrice, setAssumptionPurchasePrice] = useState(DEFAULT_ASSUMPTION_INPUTS.purchasePrice);
  const [assumedBalance, setAssumedBalance] = useState(DEFAULT_ASSUMED_LOAN_INPUTS.balance);
  const [assumedApr, setAssumedApr] = useState(DEFAULT_ASSUMED_LOAN_INPUTS.apr);
  const [assumedRemainingYears, setAssumedRemainingYears] = useState(Math.round(DEFAULT_ASSUMED_LOAN_INPUTS.remainingMonths / 12));
  const [assumptionDownPayment, setAssumptionDownPayment] = useState(DEFAULT_ASSUMPTION_INPUTS.downPaymentCash);
  const [gapMethod, setGapMethod] = useState<GapMethod>(DEFAULT_GAP_INPUTS.method);
  const [gapLoanApr, setGapLoanApr] = useState(DEFAULT_GAP_INPUTS.loanApr);
  const [gapLoanTermYears, setGapLoanTermYears] = useState(Math.round(DEFAULT_GAP_INPUTS.loanTermMonths / 12));
  const [gapHelocApr, setGapHelocApr] = useState(DEFAULT_GAP_INPUTS.helocApr);

  // Computed gap amount for assumption
  const computedGapAmount = useMemo(() => {
    return Math.max(0, assumptionPurchasePrice - assumedBalance - assumptionDownPayment);
  }, [assumptionPurchasePrice, assumedBalance, assumptionDownPayment]);

  // Check if user has entered any data
  const hasData = useMemo(() => {
    return (
      step > 1 ||
      purchasePrice !== DEFAULT_PURCHASE_INPUTS.purchasePrice ||
      currentLoanBalance !== DEFAULT_REFINANCE_INPUTS.currentLoanBalance ||
      helocCreditLimit !== DEFAULT_HELOC_INPUTS.creditLimit ||
      assumedBalance !== DEFAULT_ASSUMED_LOAN_INPUTS.balance ||
      zipCode !== ""
    );
  }, [step, purchasePrice, currentLoanBalance, helocCreditLimit, assumedBalance, zipCode]);

  const resetForm = useCallback(() => {
    setStep(1);
    setMode("purchase");
    setZipCode("");
    setIncludeEstimates(true);
    setPropertyTaxRate(1.1);
    setHomeInsuranceMonthly(150);
    
    // Purchase
    setPurchasePrice(DEFAULT_PURCHASE_INPUTS.purchasePrice);
    setDownPayment(DEFAULT_PURCHASE_INPUTS.downPayment);
    setDownPaymentType(DEFAULT_PURCHASE_INPUTS.downPaymentType);
    setInterestRate(DEFAULT_SHARED_INPUTS.interestRate);
    setLoanTerm(DEFAULT_SHARED_INPUTS.loanTerm);
    
    // Refinance
    setCurrentLoanBalance(DEFAULT_REFINANCE_INPUTS.currentLoanBalance);
    setEstimatedHomeValue(DEFAULT_REFINANCE_INPUTS.estimatedHomeValue ?? 400000);
    setCashOutAmount(DEFAULT_REFINANCE_INPUTS.cashOutAmount);
    
    // HELOC
    setHelocHomeValue(400000);
    setHelocMortgageBalance(200000);
    setHelocCreditLimit(DEFAULT_HELOC_INPUTS.creditLimit);
    setHelocApr(DEFAULT_HELOC_INPUTS.apr);
    setHelocDrawMonths(DEFAULT_HELOC_INPUTS.drawMonths);
    setHelocRepayMonths(DEFAULT_HELOC_INPUTS.repayMonths);
    
    // Assumption
    setAssumptionPurchasePrice(DEFAULT_ASSUMPTION_INPUTS.purchasePrice);
    setAssumedBalance(DEFAULT_ASSUMED_LOAN_INPUTS.balance);
    setAssumedApr(DEFAULT_ASSUMED_LOAN_INPUTS.apr);
    setAssumedRemainingYears(Math.round(DEFAULT_ASSUMED_LOAN_INPUTS.remainingMonths / 12));
    setAssumptionDownPayment(DEFAULT_ASSUMPTION_INPUTS.downPaymentCash);
    setGapMethod(DEFAULT_GAP_INPUTS.method);
    setGapLoanApr(DEFAULT_GAP_INPUTS.loanApr);
    setGapLoanTermYears(Math.round(DEFAULT_GAP_INPUTS.loanTermMonths / 12));
    setGapHelocApr(DEFAULT_GAP_INPUTS.helocApr);
  }, []);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen && hasData) {
      setShowDiscardDialog(true);
      return;
    }
    onOpenChange(newOpen);
  }, [onOpenChange, hasData]);

  const handleConfirmDiscard = useCallback(() => {
    setShowDiscardDialog(false);
    resetForm();
    onOpenChange(false);
  }, [onOpenChange, resetForm]);

  const handleCancelDiscard = useCallback(() => {
    setShowDiscardDialog(false);
  }, []);

  const handleZipChange = useCallback((value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 5);
    setZipCode(cleaned);
    
    if (cleaned.length === 5 && isValidZipCode(cleaned)) {
      const estimate = getZipEstimate(cleaned);
      setPropertyTaxRate(estimate.propertyTaxRate);
      setHomeInsuranceMonthly(estimate.homeInsuranceMonthly);
    }
  }, []);

  const handleNext = useCallback(() => {
    if (step < 4) {
      setStep((s) => (s + 1) as Step);
    }
  }, [step]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep((s) => (s - 1) as Step);
    }
  }, [step]);

  const handleFinish = useCallback(() => {
    // Build canonical MortgageInputs based on mode
    const baseShared = {
      interestRate: mode === "purchase" || mode === "refinance" ? interestRate : DEFAULT_SHARED_INPUTS.interestRate,
      loanTerm: mode === "purchase" || mode === "refinance" ? loanTerm : DEFAULT_SHARED_INPUTS.loanTerm,
      rateSourceType: "user_entered" as const,
      rateSourceNote: null,
      includeEstimates: mode === "purchase" || mode === "refinance" ? includeEstimates : false,
      zipCode: zipCode || null,
      usedZipEstimate: zipCode.length === 5,
      propertyTaxMode: "rate" as const,
      propertyTaxRate: includeEstimates ? propertyTaxRate : null,
      propertyTaxAnnual: null,
      homeInsuranceMonthly: includeEstimates ? homeInsuranceMonthly : null,
      hoaMonthly: null,
      pmiMonthly: includeEstimates ? 85 : null,
      extraMonthlyPayment: 0,
      oneTimePrincipalPayment: null,
    };

    const helocInputs: HelocInputs = {
      ...DEFAULT_HELOC_INPUTS,
      creditLimit: helocCreditLimit,
      apr: helocApr,
      drawMonths: helocDrawMonths,
      repayMonths: helocRepayMonths,
    };

    const assumptionInputs: AssumptionInputs = {
      purchasePrice: assumptionPurchasePrice,
      downPaymentCash: assumptionDownPayment,
      assumed: {
        ...DEFAULT_ASSUMED_LOAN_INPUTS,
        balance: assumedBalance,
        apr: assumedApr,
        remainingMonths: assumedRemainingYears * 12,
      },
      gap: {
        ...DEFAULT_GAP_INPUTS,
        amount: computedGapAmount,
        method: gapMethod,
        loanApr: gapLoanApr,
        loanTermMonths: gapLoanTermYears * 12,
        helocApr: gapHelocApr,
      },
      assumptionFees: 0,
    };

    const inputs: MortgageInputs = {
      mode,
      purchase: {
        purchasePrice,
        downPayment,
        downPaymentType,
      },
      refinance: {
        currentLoanBalance,
        cashOutAmount,
        closingCosts: 0,
        financeClosingCosts: false,
        estimatedHomeValue,
      },
      heloc: helocInputs,
      assumption: assumptionInputs,
      shared: baseShared,
      rateMeta: { ...DEFAULT_RATE_META },
    };

    // Generate name
    const typeLabel = TRANSACTION_TYPE_LABELS[mode];
    const name = `${typeLabel} ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

    onComplete(inputs, name);
    resetForm();
  }, [
    mode, purchasePrice, downPayment, downPaymentType,
    currentLoanBalance, cashOutAmount, estimatedHomeValue,
    interestRate, loanTerm, includeEstimates, zipCode,
    propertyTaxRate, homeInsuranceMonthly,
    helocCreditLimit, helocApr, helocDrawMonths, helocRepayMonths,
    assumptionPurchasePrice, assumedBalance, assumedApr, assumedRemainingYears,
    assumptionDownPayment, gapMethod, gapLoanApr, gapLoanTermYears, gapHelocApr,
    computedGapAmount, onComplete, resetForm
  ]);

  const canProceed = useCallback(() => {
    switch (step) {
      case 1:
        return true;
      case 2:
        switch (mode) {
          case "purchase":
            return purchasePrice > 0;
          case "refinance":
            return currentLoanBalance > 0 && estimatedHomeValue > 0;
          case "heloc":
            return helocCreditLimit > 0;
          case "assumption":
            return assumptionPurchasePrice > 0 && assumedBalance > 0;
        }
        return false;
      case 3:
        switch (mode) {
          case "purchase":
          case "refinance":
            return interestRate > 0 && loanTerm > 0;
          case "heloc":
            return helocApr > 0 && helocDrawMonths > 0 && helocRepayMonths > 0;
          case "assumption":
            return assumedApr > 0 && assumedRemainingYears > 0;
        }
        return false;
      case 4:
        return true;
      default:
        return false;
    }
  }, [
    step, mode, purchasePrice, currentLoanBalance, estimatedHomeValue,
    interestRate, loanTerm, helocCreditLimit, helocApr, helocDrawMonths, helocRepayMonths,
    assumptionPurchasePrice, assumedBalance, assumedApr, assumedRemainingYears
  ]);

  const getStepHelper = (s: Step) => STEP_HELPERS[mode][s];

  // Rate source display (shows under rate inputs)
  const RateSourceLine = () => (
    <p className="text-[11px] text-muted-foreground mt-1">
      Rate source: User-entered estimate
    </p>
  );

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-md border-border/60 shadow-lg max-h-[85vh] overflow-y-auto"
        overlayClassName="bg-black/30"
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-lg font-medium">Guided start</DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-1 mb-1">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <div
              key={s}
              className={cn(
                "h-0.5 flex-1 rounded-full transition-colors",
                s <= step ? "bg-foreground/70" : "bg-muted"
              )}
            />
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground/70 mb-4">
          Step {step} of 4
        </p>

        {/* Step content */}
        <div className="space-y-5 py-2">
          {/* Step heading */}
          <div className="space-y-1">
            <p className="text-sm font-medium">{STEP_LABELS[step]}</p>
            {getStepHelper(step) && (
              <p className="text-xs text-muted-foreground">{getStepHelper(step)}</p>
            )}
          </div>

          {/* Step 1: Transaction Type */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2.5">
                {SCENARIO_TYPE_CARDS.map(({ type, icon: Icon, helper }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMode(type)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-md border p-3.5 transition-all text-left",
                      mode === type
                        ? "border-foreground/40 bg-muted/40"
                        : "border-border hover:border-muted-foreground/40"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                      <span className="text-sm font-medium">{TRANSACTION_TYPE_LABELS[type]}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {helper}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Property & Loan Context */}
          {step === 2 && (
            <div className="space-y-5">
              {/* ZIP code (for purchase/refinance only) */}
              {(mode === "purchase" || mode === "refinance") && (
                <div className="space-y-2">
                  <Label className="text-sm">ZIP Code <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="75201"
                    value={zipCode}
                    onChange={(e) => handleZipChange(e.target.value)}
                    maxLength={5}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enables regional tax and insurance estimates.
                  </p>
                </div>
              )}

              {/* Purchase-specific fields */}
              {mode === "purchase" && (
                <div className="space-y-2">
                  <Label className="text-sm">Purchase price</Label>
                  <CurrencyInput
                    value={purchasePrice}
                    onChange={setPurchasePrice}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">
                    Agreed sale price of property.
                  </p>
                </div>
              )}

              {/* Refinance-specific fields */}
              {mode === "refinance" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">Estimated home value <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <CurrencyInput
                      value={estimatedHomeValue}
                      onChange={setEstimatedHomeValue}
                      min={0}
                    />
                    <p className="text-xs text-muted-foreground">
                      Current market value for LTV calculation.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Current loan balance</Label>
                    <CurrencyInput
                      value={currentLoanBalance}
                      onChange={setCurrentLoanBalance}
                      min={0}
                    />
                    <p className="text-xs text-muted-foreground">
                      Remaining principal on existing mortgage.
                    </p>
                  </div>
                </>
              )}

              {/* HELOC-specific fields */}
              {mode === "heloc" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">Home value</Label>
                    <CurrencyInput
                      value={helocHomeValue}
                      onChange={setHelocHomeValue}
                      min={0}
                    />
                    <p className="text-xs text-muted-foreground">
                      Current market value for equity calculation.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Current mortgage balance <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <CurrencyInput
                      value={helocMortgageBalance}
                      onChange={setHelocMortgageBalance}
                      min={0}
                    />
                    <p className="text-xs text-muted-foreground">
                      First lien balance, if any.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">HELOC credit limit</Label>
                    <CurrencyInput
                      value={helocCreditLimit}
                      onChange={setHelocCreditLimit}
                      min={0}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum amount available to draw.
                    </p>
                  </div>
                </>
              )}

              {/* Assumption-specific fields */}
              {mode === "assumption" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">Purchase price</Label>
                    <CurrencyInput
                      value={assumptionPurchasePrice}
                      onChange={setAssumptionPurchasePrice}
                      min={0}
                    />
                    <p className="text-xs text-muted-foreground">
                      Transaction price for the property.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Assumed loan balance</Label>
                    <CurrencyInput
                      value={assumedBalance}
                      onChange={setAssumedBalance}
                      min={0}
                    />
                    <p className="text-xs text-muted-foreground">
                      Remaining balance on the loan being assumed.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Cash down payment</Label>
                    <CurrencyInput
                      value={assumptionDownPayment}
                      onChange={setAssumptionDownPayment}
                      min={0}
                    />
                    <p className="text-xs text-muted-foreground">
                      Cash provided by buyer at closing.
                    </p>
                  </div>
                  {computedGapAmount > 0 && (
                    <div className="rounded-md bg-muted/40 px-3 py-2">
                      <p className="text-xs text-muted-foreground">
                        Gap to finance: ${computedGapAmount.toLocaleString()}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 3: Payment Structure */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Purchase payment structure */}
              {mode === "purchase" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">Down payment</Label>
                    <DownPaymentInput
                      value={downPayment}
                      type={downPaymentType}
                      purchasePrice={purchasePrice}
                      onChange={(value, type) => {
                        setDownPayment(value);
                        setDownPaymentType(type);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Amount applied to principal at closing.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Interest rate (assumed)</Label>
                    <PercentInput
                      value={interestRate}
                      onChange={setInterestRate}
                      min={0}
                      max={25}
                      step={0.125}
                    />
                    <RateSourceLine />
                  </div>
                  <LoanTermInput
                    value={loanTerm}
                    onChange={setLoanTerm}
                    label="Loan term"
                  />
                </>
              )}

              {/* Refinance payment structure */}
              {mode === "refinance" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">Current loan balance</Label>
                    <CurrencyInput
                      value={currentLoanBalance}
                      onChange={setCurrentLoanBalance}
                      min={0}
                    />
                    <p className="text-xs text-muted-foreground">
                      Remaining principal on existing mortgage.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">New interest rate (assumed)</Label>
                    <PercentInput
                      value={interestRate}
                      onChange={setInterestRate}
                      min={0}
                      max={25}
                      step={0.125}
                    />
                    <RateSourceLine />
                  </div>
                  <LoanTermInput
                    value={loanTerm}
                    onChange={setLoanTerm}
                    label="New loan term"
                  />
                  <div className="space-y-2">
                    <Label className="text-sm">Cash out <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <CurrencyInput
                      value={cashOutAmount}
                      onChange={setCashOutAmount}
                      min={0}
                    />
                    <p className="text-xs text-muted-foreground">
                      Equity withdrawn and added to new loan balance.
                    </p>
                  </div>
                </>
              )}

              {/* HELOC payment structure */}
              {mode === "heloc" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">HELOC APR (assumed)</Label>
                    <PercentInput
                      value={helocApr}
                      onChange={setHelocApr}
                      min={0}
                      max={25}
                      step={0.125}
                    />
                    <RateSourceLine />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Draw period</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={Math.round(helocDrawMonths / 12)}
                        onChange={(e) => setHelocDrawMonths(parseInt(e.target.value || "10") * 12)}
                        min={1}
                        max={20}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">years</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Period during which funds can be drawn.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Repayment period</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={Math.round(helocRepayMonths / 12)}
                        onChange={(e) => setHelocRepayMonths(parseInt(e.target.value || "20") * 12)}
                        min={1}
                        max={30}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">years</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Period to repay the balance after draw.
                    </p>
                  </div>
                </>
              )}

              {/* Assumption payment structure */}
              {mode === "assumption" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">Assumed loan rate (assumed)</Label>
                    <PercentInput
                      value={assumedApr}
                      onChange={setAssumedApr}
                      min={0}
                      max={25}
                      step={0.125}
                    />
                    <RateSourceLine />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Remaining term</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={assumedRemainingYears}
                        onChange={(e) => setAssumedRemainingYears(parseInt(e.target.value || "25"))}
                        min={1}
                        max={40}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">years</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Years remaining on the assumed loan.
                    </p>
                  </div>
                  
                  {computedGapAmount > 0 && (
                    <>
                      <div className="pt-2 border-t border-border">
                        <Label className="text-sm">Gap financing method</Label>
                        <RadioGroup
                          value={gapMethod}
                          onValueChange={(v) => setGapMethod(v as GapMethod)}
                          className="mt-2 space-y-2"
                        >
                          {GAP_METHOD_OPTIONS.map((opt) => (
                            <div key={opt.value} className="flex items-start gap-2">
                              <RadioGroupItem value={opt.value} id={`gap-${opt.value}`} className="mt-0.5" />
                              <div className="flex-1">
                                <Label htmlFor={`gap-${opt.value}`} className="text-sm font-normal cursor-pointer">
                                  {opt.label}
                                </Label>
                                <p className="text-xs text-muted-foreground">{opt.description}</p>
                              </div>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>

                      {gapMethod === "second_loan" && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-sm">Second loan rate (assumed)</Label>
                            <PercentInput
                              value={gapLoanApr}
                              onChange={setGapLoanApr}
                              min={0}
                              max={25}
                              step={0.125}
                            />
                            <RateSourceLine />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">Second loan term</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={gapLoanTermYears}
                                onChange={(e) => setGapLoanTermYears(parseInt(e.target.value || "15"))}
                                min={1}
                                max={30}
                                className="w-20"
                              />
                              <span className="text-sm text-muted-foreground">years</span>
                            </div>
                          </div>
                        </>
                      )}

                      {gapMethod === "heloc" && (
                        <div className="space-y-2">
                          <Label className="text-sm">Gap HELOC APR (assumed)</Label>
                          <PercentInput
                            value={gapHelocApr}
                            onChange={setGapHelocApr}
                            min={0}
                            max={25}
                            step={0.125}
                          />
                          <RateSourceLine />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-5">
              {(mode === "purchase" || mode === "refinance") && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm">Include tax & insurance estimates</Label>
                    </div>
                    <Switch
                      checked={includeEstimates}
                      onCheckedChange={setIncludeEstimates}
                    />
                  </div>

                  {includeEstimates && (
                    <div className="space-y-4">
                      <div className="rounded-md bg-muted/40 px-3 py-2">
                        <p className="text-xs text-muted-foreground">
                          Regional averages applied. All values editable.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Property taxes (annual rate)</Label>
                        <PercentInput
                          value={propertyTaxRate}
                          onChange={setPropertyTaxRate}
                          min={0}
                          max={10}
                          step={0.01}
                        />
                        <p className="text-xs text-muted-foreground">
                          Percentage of assessed home value.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Homeowners insurance (annual)</Label>
                        <CurrencyInput
                          value={homeInsuranceMonthly * 12}
                          onChange={(v) => setHomeInsuranceMonthly(Math.round(v / 12))}
                          min={0}
                        />
                        <p className="text-xs text-muted-foreground">
                          Annual premium amount.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {mode === "heloc" && (
                <div className="space-y-3">
                  <div className="rounded-md bg-muted/40 px-3 py-2.5 space-y-1.5">
                    <p className="text-xs text-muted-foreground">Summary</p>
                    <p className="text-sm">Credit limit: ${helocCreditLimit.toLocaleString()}</p>
                    <p className="text-sm">APR: {helocApr}%</p>
                    <p className="text-sm">Draw: {Math.round(helocDrawMonths / 12)} years / Repay: {Math.round(helocRepayMonths / 12)} years</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Modeled using current APR. HELOC rates can change.
                  </p>
                </div>
              )}

              {mode === "assumption" && (
                <div className="space-y-3">
                  <div className="rounded-md bg-muted/40 px-3 py-2.5 space-y-1.5">
                    <p className="text-xs text-muted-foreground">Summary</p>
                    <p className="text-sm">Purchase price: ${assumptionPurchasePrice.toLocaleString()}</p>
                    <p className="text-sm">Assumed balance: ${assumedBalance.toLocaleString()} at {assumedApr}%</p>
                    <p className="text-sm">Remaining term: {assumedRemainingYears} years</p>
                    {computedGapAmount > 0 && (
                      <p className="text-sm">Gap: ${computedGapAmount.toLocaleString()} via {GAP_METHOD_OPTIONS.find(o => o.value === gapMethod)?.label}</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Modeled using stated assumptions. Verify loan is assumable.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div>
            {step > 1 ? (
              <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                Back
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
                Skip
              </Button>
            )}
          </div>

          <div>
            {step < 4 ? (
              <Button size="sm" onClick={handleNext} disabled={!canProceed()} className="gap-1.5">
                Continue
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Button>
            ) : (
              <Button size="sm" onClick={handleFinish} className="gap-1.5">
                Start scenario
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Discard confirmation dialog */}
    <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard changes</AlertDialogTitle>
          <AlertDialogDescription>
            Changes will not be saved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelDiscard}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmDiscard}>Discard</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
