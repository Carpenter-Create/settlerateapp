import { useState, useMemo, useCallback } from "react";
import { MortgageInputs, ScenarioType, calculateMortgage, DEFAULT_INPUTS, calculateDownPaymentPercent, calculateLoanAmount } from "@/lib/mortgage";
import { PercentInput } from "./PercentInput";
import { InputField } from "./InputField";
import { LoanTermInput } from "./LoanTermInput";
import { ScenarioTypeSelector } from "./ScenarioTypeSelector";
import { PurchaseInputs } from "./PurchaseInputs";
import { RefinanceInputs } from "./RefinanceInputs";
import { TaxInsuranceSection } from "./TaxInsuranceSection";
import { ResultsCard } from "./ResultsCard";
import { AmortizationTable } from "./AmortizationTable";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "./CurrencyInput";
import { Save, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { useScenarios } from "@/hooks/useScenarios";
import { toast } from "sonner";

interface MortgageCalculatorProps {
  initialInputs?: MortgageInputs;
  onSave?: (name: string, inputs: MortgageInputs) => void;
}

export function MortgageCalculator({ initialInputs, onSave }: MortgageCalculatorProps) {
  const [inputs, setInputs] = useState<MortgageInputs>(initialInputs ?? DEFAULT_INPUTS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { createScenario, scenarios } = useScenarios();

  const results = useMemo(() => calculateMortgage(inputs), [inputs]);

  const updateInput = useCallback(<K extends keyof MortgageInputs>(
    key: K,
    value: MortgageInputs[K]
  ) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }, []);

  const batchUpdateInputs = useCallback((updates: Partial<MortgageInputs>) => {
    setInputs((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleScenarioTypeChange = useCallback((type: ScenarioType) => {
    setInputs((prev) => ({ ...prev, scenarioType: type }));
  }, []);

  const handleReset = useCallback(() => {
    setInputs(DEFAULT_INPUTS);
  }, []);

  const handleSave = useCallback(() => {
    const typeLabel = inputs.scenarioType === "purchase" ? "Purchase" : "Refinance";
    const name = `${typeLabel} ${scenarios.length + 1}`;
    createScenario(name, inputs);
    toast.success("Scenario saved", {
      description: `"${name}" has been saved to your scenarios.`,
    });
  }, [createScenario, inputs, scenarios.length]);

  // Calculate LTV for PMI logic
  const ltvRatio = useMemo(() => {
    const { loanAmount, homeValue } = calculateLoanAmount(inputs);
    return homeValue > 0 ? (loanAmount / homeValue) * 100 : 0;
  }, [inputs]);

  // Helper text based on scenario type
  const pageDescription = inputs.scenarioType === "purchase"
    ? "Calculate your monthly payment and total costs for a new home purchase"
    : "Compare your new loan terms and see potential savings";

  return (
    <div className="grid w-full max-w-full gap-6 lg:grid-cols-[1fr,380px] lg:gap-10">
      {/* Inputs */}
      <div className="min-w-0 space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Mortgage Calculator</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {pageDescription}
          </p>
        </div>

        <div className="card-elevated w-full p-4 sm:p-6 animate-fade-in">
          <div className="space-y-6">
            {/* Scenario Type Selector */}
            <ScenarioTypeSelector
              value={inputs.scenarioType}
              onChange={handleScenarioTypeChange}
            />

            <div className="divider-subtle" />

            {/* Conditional inputs based on scenario type */}
            {inputs.scenarioType === "purchase" ? (
              <PurchaseInputs
                inputs={inputs}
                onUpdate={updateInput}
                onBatchUpdate={batchUpdateInputs}
              />
            ) : (
              <RefinanceInputs
                inputs={inputs}
                onUpdate={updateInput}
                onBatchUpdate={batchUpdateInputs}
              />
            )}

            {/* Shared loan terms */}
            <div className="grid gap-5 md:grid-cols-2">
              <InputField 
                label={inputs.scenarioType === "purchase" ? "Interest rate" : "New interest rate"}
              >
                <PercentInput
                  value={inputs.interestRate}
                  onChange={(v) => updateInput("interestRate", v)}
                  min={0}
                  max={25}
                  step={0.125}
                />
              </InputField>

              <LoanTermInput
                value={inputs.loanTerm}
                onChange={(v) => updateInput("loanTerm", v)}
                label={inputs.scenarioType === "purchase" ? "Loan term" : "New loan term"}
              />
            </div>

            <div className="divider-subtle" />

            {/* Taxes & Insurance Section (Optional) */}
            <TaxInsuranceSection
              inputs={inputs}
              ltvRatio={ltvRatio}
              onUpdate={updateInput}
              onBatchUpdate={batchUpdateInputs}
            />

            <div className="divider-subtle" />

            {/* Advanced options toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>Extra payments</span>
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {/* Advanced inputs */}
            {showAdvanced && (
              <div className="space-y-5 animate-slide-up">
                <InputField
                  label="Extra monthly payment"
                  description="Additional principal payment each month"
                  optional
                >
                  <CurrencyInput
                    value={inputs.extraMonthlyPayment}
                    onChange={(v) => updateInput("extraMonthlyPayment", v)}
                    min={0}
                  />
                </InputField>

                <InputField
                  label="One-time principal payment"
                  description="Lump sum payment toward principal"
                  optional
                >
                  <CurrencyInput
                    value={inputs.oneTimePrincipalPayment ?? 0}
                    onChange={(v) => updateInput("oneTimePrincipalPayment", v)}
                    min={0}
                  />
                </InputField>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save scenario
          </Button>
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>

        {/* Amortization table */}
        <div className="card-elevated w-full overflow-hidden p-4 sm:p-6">
          <AmortizationTable schedule={results.amortizationSchedule} />
        </div>
      </div>

      {/* Results */}
      <div className="min-w-0 lg:sticky lg:top-20 lg:h-fit">
        <div className="card-elevated w-full p-4 sm:p-6 animate-slide-up">
          <ResultsCard results={results} />
        </div>
      </div>
    </div>
  );
}
