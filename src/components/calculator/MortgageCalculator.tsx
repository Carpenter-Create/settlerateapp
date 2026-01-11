import { useState, useMemo, useCallback } from "react";
import { MortgageInputs, calculateMortgage, DEFAULT_INPUTS } from "@/lib/mortgage";
import { CurrencyInput } from "./CurrencyInput";
import { PercentInput } from "./PercentInput";
import { InputField } from "./InputField";
import { DownPaymentInput } from "./DownPaymentInput";
import { LoanTermInput } from "./LoanTermInput";
import { ResultsCard } from "./ResultsCard";
import { AmortizationTable } from "./AmortizationTable";
import { Button } from "@/components/ui/button";
import { Save, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
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

  const handleReset = useCallback(() => {
    setInputs(DEFAULT_INPUTS);
  }, []);

  const handleSave = useCallback(() => {
    const name = `Scenario ${scenarios.length + 1}`;
    createScenario(name, inputs);
    toast.success("Scenario saved", {
      description: `"${name}" has been saved to your scenarios.`,
    });
  }, [createScenario, inputs, scenarios.length]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr,400px] lg:gap-12">
      {/* Inputs */}
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mortgage Calculator</h1>
          <p className="mt-1 text-muted-foreground">
            Calculate your monthly payment and total costs
          </p>
        </div>

        <div className="card-elevated p-6 animate-fade-in">
          <div className="space-y-6">
            {/* Primary inputs */}
            <div className="grid gap-6 sm:grid-cols-2">
              <InputField label="Purchase price">
                <CurrencyInput
                  value={inputs.purchasePrice}
                  onChange={(v) => updateInput("purchasePrice", v)}
                  min={0}
                />
              </InputField>

              <DownPaymentInput
                value={inputs.downPayment}
                type={inputs.downPaymentType}
                purchasePrice={inputs.purchasePrice}
                onChange={(value, type) => {
                  setInputs((prev) => ({
                    ...prev,
                    downPayment: value,
                    downPaymentType: type,
                  }));
                }}
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <InputField label="Interest rate">
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
              />
            </div>

            <div className="divider-subtle" />

            {/* Taxes and insurance */}
            <div className="grid gap-6 sm:grid-cols-2">
              <InputField label="Property tax" description="Annual amount">
                <CurrencyInput
                  value={inputs.propertyTax}
                  onChange={(v) => updateInput("propertyTax", v)}
                  min={0}
                />
              </InputField>

              <InputField label="Home insurance" description="Annual amount">
                <CurrencyInput
                  value={inputs.homeInsurance}
                  onChange={(v) => updateInput("homeInsurance", v)}
                  min={0}
                />
              </InputField>
            </div>

            {/* Advanced options toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>Advanced options</span>
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {/* Advanced inputs */}
            {showAdvanced && (
              <div className="space-y-6 animate-slide-up">
                <div className="grid gap-6 sm:grid-cols-2">
                  <InputField label="PMI" description="Monthly amount" optional>
                    <CurrencyInput
                      value={inputs.pmi}
                      onChange={(v) => updateInput("pmi", v)}
                      min={0}
                    />
                  </InputField>

                  <InputField label="HOA" description="Monthly amount" optional>
                    <CurrencyInput
                      value={inputs.hoa}
                      onChange={(v) => updateInput("hoa", v)}
                      min={0}
                    />
                  </InputField>
                </div>

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
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
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
        <div className="card-elevated p-6">
          <AmortizationTable schedule={results.amortizationSchedule} />
        </div>
      </div>

      {/* Results */}
      <div className="lg:sticky lg:top-20 lg:h-fit">
        <div className="card-elevated p-6 animate-slide-up">
          <ResultsCard results={results} />
        </div>
      </div>
    </div>
  );
}
