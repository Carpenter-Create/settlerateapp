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
 * Steps:
 * 1. Transaction type
 * 2. Property & loan context
 * 3. Payment structure
 * 4. Review assumptions
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
import { getZipEstimate, isValidZipCode } from "@/lib/zipEstimates";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Home, RefreshCw } from "lucide-react";

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

const STEP_HELPERS: Record<Step, string> = {
  1: "Sets default inputs.",
  2: "Establish baseline assumptions.",
  3: "Define rate, term, and payment assumptions.",
  4: "You can revise any input after continuing.",
};

export function GuidedStart({ open, onOpenChange, onComplete }: GuidedStartProps) {
  const [step, setStep] = useState<Step>(1);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  
  // Form state - mirrors canonical MortgageInputs structure
  const [mode, setMode] = useState<ScenarioType>("purchase");
  const [purchasePrice, setPurchasePrice] = useState(DEFAULT_PURCHASE_INPUTS.purchasePrice);
  const [downPayment, setDownPayment] = useState(DEFAULT_PURCHASE_INPUTS.downPayment);
  const [downPaymentType, setDownPaymentType] = useState<"percent" | "dollar">(DEFAULT_PURCHASE_INPUTS.downPaymentType);
  const [currentLoanBalance, setCurrentLoanBalance] = useState(DEFAULT_REFINANCE_INPUTS.currentLoanBalance);
  const [estimatedHomeValue, setEstimatedHomeValue] = useState<number>(DEFAULT_REFINANCE_INPUTS.estimatedHomeValue ?? 400000);
  const [cashOutAmount, setCashOutAmount] = useState(DEFAULT_REFINANCE_INPUTS.cashOutAmount);
  const [interestRate, setInterestRate] = useState(DEFAULT_SHARED_INPUTS.interestRate);
  const [loanTerm, setLoanTerm] = useState(DEFAULT_SHARED_INPUTS.loanTerm);
  const [zipCode, setZipCode] = useState("");
  const [includeEstimates, setIncludeEstimates] = useState(true);
  const [propertyTaxRate, setPropertyTaxRate] = useState<number>(1.1);
  const [homeInsuranceMonthly, setHomeInsuranceMonthly] = useState<number>(150);

  // Check if user has entered any data
  const hasData = useMemo(() => {
    return (
      step > 1 ||
      purchasePrice !== DEFAULT_PURCHASE_INPUTS.purchasePrice ||
      currentLoanBalance !== DEFAULT_REFINANCE_INPUTS.currentLoanBalance ||
      zipCode !== ""
    );
  }, [step, purchasePrice, currentLoanBalance, zipCode]);

  const resetForm = useCallback(() => {
    setStep(1);
    setMode("purchase");
    setPurchasePrice(DEFAULT_PURCHASE_INPUTS.purchasePrice);
    setDownPayment(DEFAULT_PURCHASE_INPUTS.downPayment);
    setDownPaymentType(DEFAULT_PURCHASE_INPUTS.downPaymentType);
    setCurrentLoanBalance(DEFAULT_REFINANCE_INPUTS.currentLoanBalance);
    setEstimatedHomeValue(DEFAULT_REFINANCE_INPUTS.estimatedHomeValue ?? 400000);
    setCashOutAmount(DEFAULT_REFINANCE_INPUTS.cashOutAmount);
    setInterestRate(DEFAULT_SHARED_INPUTS.interestRate);
    setLoanTerm(DEFAULT_SHARED_INPUTS.loanTerm);
    setZipCode("");
    setIncludeEstimates(true);
    setPropertyTaxRate(1.1);
    setHomeInsuranceMonthly(150);
  }, []);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen && hasData) {
      // Show confirmation if data entered
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
    
    // Auto-apply estimates when valid ZIP entered
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
    // Build canonical MortgageInputs
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
      shared: {
        interestRate,
        loanTerm,
        includeEstimates,
        zipCode: zipCode || null,
        usedZipEstimate: zipCode.length === 5,
        propertyTaxMode: "rate",
        propertyTaxRate: includeEstimates ? propertyTaxRate : null,
        propertyTaxAnnual: null,
        homeInsuranceMonthly: includeEstimates ? homeInsuranceMonthly : null,
        hoaMonthly: null,
        pmiMonthly: includeEstimates ? 85 : null, // Default PMI estimate
        extraMonthlyPayment: 0,
        oneTimePrincipalPayment: null,
      },
    };

    // Generate name using shared label constants
    const typeLabel = TRANSACTION_TYPE_LABELS[mode];
    const name = `${typeLabel} ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

    onComplete(inputs, name);
    resetForm();
  }, [
    mode, purchasePrice, downPayment, downPaymentType,
    currentLoanBalance, cashOutAmount, estimatedHomeValue,
    interestRate, loanTerm, includeEstimates, zipCode,
    propertyTaxRate, homeInsuranceMonthly, onComplete, resetForm
  ]);

  const canProceed = useCallback(() => {
    switch (step) {
      case 1:
        return true; // Mode is always set
      case 2:
        return mode === "purchase" 
          ? purchasePrice > 0 
          : currentLoanBalance > 0 && estimatedHomeValue > 0;
      case 3:
        return interestRate > 0 && loanTerm > 0;
      case 4:
        return true; // Estimates are optional
      default:
        return false;
    }
  }, [step, mode, purchasePrice, currentLoanBalance, estimatedHomeValue, interestRate, loanTerm]);

  // Step labels remain consistent
  const getStepLabel = (s: Step) => STEP_LABELS[s];
  const getStepHelper = (s: Step) => STEP_HELPERS[s];

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-md border-border/60 shadow-lg"
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
            <p className="text-sm font-medium">{getStepLabel(step)}</p>
            {getStepHelper(step) && (
              <p className="text-xs text-muted-foreground">{getStepHelper(step)}</p>
            )}
          </div>

          {step === 1 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  onClick={() => setMode("purchase")}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-md border p-3.5 transition-all text-left",
                    mode === "purchase"
                      ? "border-foreground/40 bg-muted/40"
                      : "border-border hover:border-muted-foreground/40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-sm font-medium">{TRANSACTION_TYPE_LABELS.purchase}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    New home acquisition financing
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("refinance")}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-md border p-3.5 transition-all text-left",
                    mode === "refinance"
                      ? "border-foreground/40 bg-muted/40"
                      : "border-border hover:border-muted-foreground/40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-sm font-medium">{TRANSACTION_TYPE_LABELS.refinance}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Replace existing mortgage with new terms
                  </span>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
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

              {mode === "purchase" ? (
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
              ) : (
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
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              {mode === "purchase" ? (
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
                    <Label className="text-sm">Interest rate</Label>
                    <PercentInput
                      value={interestRate}
                      onChange={setInterestRate}
                      min={0}
                      max={25}
                      step={0.125}
                    />
                    <p className="text-xs text-muted-foreground">
                      Starting assumption. Adjustable later.
                    </p>
                  </div>
                  <LoanTermInput
                    value={loanTerm}
                    onChange={setLoanTerm}
                    label="Loan term"
                  />
                </>
              ) : (
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
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
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
                Next
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
