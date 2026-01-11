/**
 * GuidedStart - Minimal onboarding stepper for new users
 * 
 * NOT a marketing funnel. A calm, institutional flow that:
 * 1. Collects essential inputs across 4 steps
 * 2. Creates a draft scenario using canonical shape
 * 3. Routes to calculator with scenario loaded
 * 
 * Steps:
 * 1. Goal: Buying / Refinance
 * 2. Property: ZIP + price/value
 * 3. Loan basics: down payment/balance, term, rate
 * 4. Taxes & insurance: toggle estimates + editable values
 */

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "@/lib/mortgage";
import { getZipEstimate, isValidZipCode } from "@/lib/zipEstimates";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Home, RefreshCw, Check } from "lucide-react";

interface GuidedStartProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (inputs: MortgageInputs, name: string) => void;
}

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<Step, string> = {
  1: "Goal",
  2: "Property",
  3: "Loan basics",
  4: "Taxes & insurance",
};

export function GuidedStart({ open, onOpenChange, onComplete }: GuidedStartProps) {
  const [step, setStep] = useState<Step>(1);
  
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
    if (!newOpen) {
      // Don't reset form on close - user might want to come back
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

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

    // Generate name
    const name = mode === "purchase" 
      ? `Purchase ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      : `Refinance ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">
            {STEP_LABELS[step]}
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-1 mb-2">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                s <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Step {step} of 4
        </p>

        {/* Step content */}
        <div className="space-y-5 py-2">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                What are you looking to do?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode("purchase")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all",
                    mode === "purchase"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  <Home className="h-5 w-5" strokeWidth={1.5} />
                  <span className="text-sm font-medium">Buying a home</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("refinance")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all",
                    mode === "refinance"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  <RefreshCw className="h-5 w-5" strokeWidth={1.5} />
                  <span className="text-sm font-medium">Refinancing</span>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm">ZIP code <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g., 90210"
                  value={zipCode}
                  onChange={(e) => handleZipChange(e.target.value)}
                  maxLength={5}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  We'll use this to estimate taxes and insurance.
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
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">Estimated home value</Label>
                    <CurrencyInput
                      value={estimatedHomeValue}
                      onChange={setEstimatedHomeValue}
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Current loan balance</Label>
                    <CurrencyInput
                      value={currentLoanBalance}
                      onChange={setCurrentLoanBalance}
                      min={0}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              {mode === "purchase" ? (
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
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-sm">Cash out <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <CurrencyInput
                    value={cashOutAmount}
                    onChange={setCashOutAmount}
                    min={0}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm">
                  {mode === "purchase" ? "Interest rate" : "New interest rate"}
                </Label>
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
                label={mode === "purchase" ? "Loan term" : "New loan term"}
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm">Include estimates</Label>
                  <p className="text-xs text-muted-foreground">
                    Add taxes and insurance to your payment
                  </p>
                </div>
                <Switch
                  checked={includeEstimates}
                  onCheckedChange={setIncludeEstimates}
                />
              </div>

              {includeEstimates && (
                <div className="space-y-4 animate-slide-up">
                  <div className="space-y-2">
                    <Label className="text-sm">Property tax rate</Label>
                    <PercentInput
                      value={propertyTaxRate}
                      onChange={setPropertyTaxRate}
                      min={0}
                      max={10}
                      step={0.01}
                    />
                    <p className="text-xs text-muted-foreground">
                      Percent of home value per year
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Home insurance</Label>
                    <CurrencyInput
                      value={homeInsuranceMonthly}
                      onChange={setHomeInsuranceMonthly}
                      min={0}
                    />
                    <p className="text-xs text-muted-foreground">
                      Monthly amount
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
                <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                Finish
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
