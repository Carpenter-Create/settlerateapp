import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "./CurrencyInput";
import { PercentInput } from "./PercentInput";
import { InputField } from "./InputField";
import { calculateDownPaymentAmount, calculateDownPaymentPercent } from "@/lib/mortgage";
import { cn } from "@/lib/utils";

interface DownPaymentInputProps {
  value: number;
  type: "percent" | "dollar";
  purchasePrice: number;
  onChange: (value: number, type: "percent" | "dollar") => void;
}

export function DownPaymentInput({ value, type, purchasePrice, onChange }: DownPaymentInputProps) {
  const handleTypeChange = useCallback(
    (newType: "percent" | "dollar") => {
      if (newType === type) return;
      
      // Convert value to new type
      if (newType === "dollar") {
        const dollarAmount = calculateDownPaymentAmount(purchasePrice, value, "percent");
        onChange(dollarAmount, "dollar");
      } else {
        const percentAmount = calculateDownPaymentPercent(purchasePrice, value, "dollar");
        onChange(percentAmount, "percent");
      }
    },
    [type, value, purchasePrice, onChange]
  );

  const handleValueChange = useCallback(
    (newValue: number) => {
      onChange(newValue, type);
    },
    [onChange, type]
  );

  // Calculate the display values
  const dollarAmount = type === "dollar" ? value : calculateDownPaymentAmount(purchasePrice, value, "percent");
  const percentAmount = type === "percent" ? value : calculateDownPaymentPercent(purchasePrice, value, "dollar");

  return (
    <InputField
      label="Down payment"
      description={
        type === "percent"
          ? `${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(dollarAmount)} • Higher down payment lowers the loan amount.`
          : `${percentAmount.toFixed(1)}% of purchase price`
      }
    >
      <div className="flex w-full min-w-0 gap-2">
        <div className="min-w-0 flex-1">
          {type === "percent" ? (
            <PercentInput
              value={value}
              onChange={handleValueChange}
              min={0}
              max={100}
            />
          ) : (
            <CurrencyInput
              value={value}
              onChange={handleValueChange}
              min={0}
              max={purchasePrice}
            />
          )}
        </div>
        <div className="flex shrink-0 rounded-md border border-input bg-muted p-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleTypeChange("percent")}
            className={cn(
              "h-8 rounded px-2.5 text-xs font-medium sm:px-3",
              type === "percent"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-transparent"
            )}
          >
            %
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleTypeChange("dollar")}
            className={cn(
              "h-8 rounded px-2.5 text-xs font-medium sm:px-3",
              type === "dollar"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-transparent"
            )}
          >
            $
          </Button>
        </div>
      </div>
    </InputField>
  );
}
