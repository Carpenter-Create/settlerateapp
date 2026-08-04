import { useState } from "react";
import { MortgageInputs, RefinanceInputs as RefinanceInputsType } from "@/lib/mortgage";
import { coerceOptionalInterestRate } from "@/lib/coerceOptionalInterestRate";
import { CurrencyInput } from "./CurrencyInput";
import { PercentInput } from "./PercentInput";
import { InputField } from "./InputField";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp } from "lucide-react";

interface RefinanceInputsProps {
  inputs: MortgageInputs;
  onBatchUpdate: (updates: Partial<MortgageInputs>) => void;
}

export function RefinanceInputs({ inputs, onBatchUpdate }: RefinanceInputsProps) {
  const refinance = inputs.refinance;
  
  const [showOptional, setShowOptional] = useState(
    refinance.cashOutAmount > 0 ||
      refinance.closingCosts > 0 ||
      refinance.currentInterestRate != null ||
      refinance.currentRemainingTermMonths != null
  );

  const updateRefinance = (updates: Partial<RefinanceInputsType>) => {
    onBatchUpdate({
      refinance: { ...refinance, ...updates },
    });
  };

  return (
    <div className="space-y-5">
      {/* Primary refinance inputs */}
      <div className="grid gap-5 md:grid-cols-2">
        <InputField 
          label="Current loan balance" 
          description="Remaining principal on existing mortgage"
        >
          <CurrencyInput
            value={refinance.currentLoanBalance}
            onChange={(v) => updateRefinance({ currentLoanBalance: v })}
            min={0}
          />
        </InputField>

        <InputField 
          label="Estimated home value" 
          description="Current market value (used for LTV calculation)"
          optional
        >
          <CurrencyInput
            value={refinance.estimatedHomeValue ?? 0}
            onChange={(v) => updateRefinance({ estimatedHomeValue: v || null })}
            min={0}
          />
        </InputField>
      </div>

      {/* Optional refinance details toggle */}
      <button
        type="button"
        onClick={() => setShowOptional(!showOptional)}
        className="flex w-full items-center justify-between py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <span>Cash-out & closing costs</span>
        {showOptional ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {showOptional && (
        <div className="space-y-5 animate-slide-up">
          <div className="grid gap-5 md:grid-cols-2">
            <InputField 
              label="Cash-out amount" 
              description="Funds to receive at closing (added to loan)"
              optional
            >
              <CurrencyInput
                value={refinance.cashOutAmount}
                onChange={(v) => updateRefinance({ cashOutAmount: v })}
                min={0}
              />
            </InputField>

            <InputField 
              label="Estimated closing costs" 
              description="Lender and third-party fees"
              optional
            >
              <CurrencyInput
                value={refinance.closingCosts}
                onChange={(v) => updateRefinance({ closingCosts: v })}
                min={0}
              />
            </InputField>
          </div>

          {refinance.closingCosts > 0 && (
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <Switch
                id="finance-closing"
                checked={refinance.financeClosingCosts}
                onCheckedChange={(checked) => updateRefinance({ financeClosingCosts: checked })}
              />
              <Label htmlFor="finance-closing" className="text-sm cursor-pointer">
                Finance closing costs into the new loan
              </Label>
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <InputField
              label="Current interest rate"
              description="Required with remaining term for break-even"
              optional
            >
              <PercentInput
                value={refinance.currentInterestRate ?? 0}
                onChange={(v) =>
                  updateRefinance({ currentInterestRate: coerceOptionalInterestRate(v) })
                }
                min={0}
                max={25}
                step={0.125}
              />
            </InputField>

            <InputField
              label="Current remaining term"
              description="Months remaining on the existing loan"
              optional
            >
              <input
                type="number"
                value={refinance.currentRemainingTermMonths ?? ""}
                onChange={(event) => {
                  const months = Number.parseInt(event.target.value, 10);
                  updateRefinance({
                    currentRemainingTermMonths: Number.isFinite(months) && months > 0 ? months : null,
                  });
                }}
                min={1}
                max={600}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </InputField>
          </div>
        </div>
      )}
    </div>
  );
}
