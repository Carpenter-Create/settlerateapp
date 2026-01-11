import { forwardRef, useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, placeholder = "0", className, min = 0, max, disabled }, ref) => {
    const [displayValue, setDisplayValue] = useState(() => formatForDisplay(value));
    const [isFocused, setIsFocused] = useState(false);

    function formatForDisplay(num: number): string {
      if (num === 0) return "";
      return num.toLocaleString("en-US");
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
        const clamped = Math.max(min, max !== undefined ? Math.min(parsed, max) : parsed);
        onChange(clamped);
      },
      [onChange, min, max]
    );

    const handleFocus = useCallback(() => {
      setIsFocused(true);
      // Show raw number on focus for easier editing
      setDisplayValue(value === 0 ? "" : value.toString());
    }, [value]);

    const handleBlur = useCallback(() => {
      setIsFocused(false);
      setDisplayValue(formatForDisplay(value));
    }, [value]);

    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          $
        </span>
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pl-7 font-mono tabular-nums", className)}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
