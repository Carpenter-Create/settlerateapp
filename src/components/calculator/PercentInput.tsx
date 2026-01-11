import { forwardRef, useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PercentInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export const PercentInput = forwardRef<HTMLInputElement, PercentInputProps>(
  ({ value, onChange, placeholder = "0", className, min = 0, max = 100, step = 0.125, disabled }, ref) => {
    const [displayValue, setDisplayValue] = useState(() => formatForDisplay(value));
    const [isFocused, setIsFocused] = useState(false);

    function formatForDisplay(num: number): string {
      if (num === 0) return "";
      // Show up to 3 decimal places, but trim trailing zeros
      return parseFloat(num.toFixed(3)).toString();
    }

    function parseValue(str: string): number {
      const cleaned = str.replace(/[^0-9.-]/g, "");
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setDisplayValue(raw);
        const parsed = parseValue(raw);
        const clamped = Math.max(min, Math.min(parsed, max));
        onChange(clamped);
      },
      [onChange, min, max]
    );

    const handleFocus = useCallback(() => {
      setIsFocused(true);
      setDisplayValue(value === 0 ? "" : value.toString());
    }, [value]);

    const handleBlur = useCallback(() => {
      setIsFocused(false);
      setDisplayValue(formatForDisplay(value));
    }, [value]);

    return (
      <div className="relative">
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pr-7 font-mono tabular-nums", className)}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          %
        </span>
      </div>
    );
  }
);

PercentInput.displayName = "PercentInput";
