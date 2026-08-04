/**
 * Income Context Component
 * 
 * Optional income input with percent-of-income framing.
 * Neutral, observational display only - no recommendations or warnings.
 */

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/mortgage";
import { X } from "lucide-react";

interface IncomeContextProps {
  monthlyHousingPayment: number;
  onIncomeChange?: (grossMonthlyIncome: number | null) => void;
  /** UI mirror of server income_context entitlement; default false. */
  enabled?: boolean;
}

type IncomeType = "monthly" | "annual";

export function IncomeContext({
  monthlyHousingPayment,
  onIncomeChange,
  enabled = false,
}: IncomeContextProps) {
  const [showInput, setShowInput] = useState(false);
  const [incomeValue, setIncomeValue] = useState<string>("");
  const [incomeType, setIncomeType] = useState<IncomeType>("annual");
  const [savedIncome, setSavedIncome] = useState<number | null>(null);

  const handleSave = () => {
    const numValue = parseFloat(incomeValue.replace(/[^0-9.]/g, ""));
    if (isNaN(numValue) || numValue <= 0) return;

    // Normalize to monthly
    const monthlyIncome = incomeType === "annual" ? numValue / 12 : numValue;
    setSavedIncome(monthlyIncome);
    setShowInput(false);
    onIncomeChange?.(monthlyIncome);
  };

  const handleClear = () => {
    setSavedIncome(null);
    setIncomeValue("");
    setShowInput(false);
    onIncomeChange?.(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers and basic formatting
    const value = e.target.value.replace(/[^0-9.,]/g, "");
    setIncomeValue(value);
  };

  // Calculate percent of income
  const percentOfIncome = savedIncome && savedIncome > 0
    ? Math.round((monthlyHousingPayment / savedIncome) * 100)
    : null;

  if (!enabled) {
    return null;
  }

  if (!showInput && !savedIncome) {
    return (
      <button
        onClick={() => setShowInput(true)}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
      >
        Add Income Context (How this fits your income)
      </button>
    );
  }

  if (showInput) {
    return (
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="income" className="text-xs text-muted-foreground whitespace-nowrap">
            Gross income
          </Label>
          <Select value={incomeType} onValueChange={(v) => setIncomeType(v as IncomeType)}>
            <SelectTrigger className="h-7 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="annual">Annual</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Input
            id="income"
            type="text"
            inputMode="numeric"
            placeholder={incomeType === "annual" ? "e.g., 150,000" : "e.g., 12,500"}
            value={incomeValue}
            onChange={handleInputChange}
            className="h-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") setShowInput(false);
            }}
            autoFocus
          />
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleSave}>
            Apply
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 px-2 text-muted-foreground" 
            onClick={() => setShowInput(false)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          This value is private and used only for context.
        </p>
      </div>
    );
  }

  // Show the income context display
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground mb-1">
        Percent of Income (Share of your monthly income)
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed">
        This payment uses about{" "}
        <span className="font-mono font-medium text-foreground">{percentOfIncome}%</span>{" "}
        of your monthly income.
      </p>
      <p className="text-xs text-muted-foreground/70">
        This helps show how the payment fits into your monthly budget.
      </p>
      <button
        onClick={handleClear}
        className="text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors underline-offset-2 hover:underline mt-1"
      >
        Clear income
      </button>
    </div>
  );
}

/**
 * Calculate housing cost as percent of income for display purposes.
 */
export function calculateHousingPercentOfIncome(
  monthlyHousingPayment: number,
  grossMonthlyIncome: number
): number {
  if (grossMonthlyIncome <= 0) return 0;
  return Math.round((monthlyHousingPayment / grossMonthlyIncome) * 100);
}
