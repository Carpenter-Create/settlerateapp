import { useState } from "react";
import { MortgageInputs } from "@/lib/mortgage";
import { CurrencyInput } from "./CurrencyInput";
import { InputField } from "./InputField";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp } from "lucide-react";

interface RefinanceInputsProps {
  inputs: MortgageInputs;
  onUpdate: <K extends keyof MortgageInputs>(key: K, value: MortgageInputs[K]) => void;
  onBatchUpdate: (updates: Partial<MortgageInputs>) => void;
}

export function RefinanceInputs({ inputs, onUpdate, onBatchUpdate }: RefinanceInputsProps) {
  const [showOptional, setShowOptional] = useState(
    inputs.cashOutAmount > 0 || inputs.closingCosts > 0
  );

  return (
    <div className="space-y-5">
      {/* Primary refinance inputs */}
      <div className="grid gap-5 md:grid-cols-2">
        <InputField 
          label="Current loan balance" 
          description="The remaining balance on your existing mortgage"
        >
          <CurrencyInput
            value={inputs.currentLoanBalance}
            onChange={(v) => onUpdate("currentLoanBalance", v)}
            min={0}
          />
        </InputField>

        <InputField 
          label="Estimated home value" 
          description="Current market value of your home"
          optional
        >
          <CurrencyInput
            value={inputs.estimatedHomeValue ?? 0}
            onChange={(v) => onUpdate("estimatedHomeValue", v || null)}
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
              description="Additional funds you'd like to receive"
              optional
            >
              <CurrencyInput
                value={inputs.cashOutAmount}
                onChange={(v) => onUpdate("cashOutAmount", v)}
                min={0}
              />
            </InputField>

            <InputField 
              label="Estimated closing costs" 
              description="Fees for the new loan"
              optional
            >
              <CurrencyInput
                value={inputs.closingCosts}
                onChange={(v) => onUpdate("closingCosts", v)}
                min={0}
              />
            </InputField>
          </div>

          {inputs.closingCosts > 0 && (
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <Switch
                id="finance-closing"
                checked={inputs.financeClosingCosts}
                onCheckedChange={(checked) => onUpdate("financeClosingCosts", checked)}
              />
              <Label htmlFor="finance-closing" className="text-sm cursor-pointer">
                Roll closing costs into the new loan
              </Label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
