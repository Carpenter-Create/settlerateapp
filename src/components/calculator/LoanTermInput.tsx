import { Button } from "@/components/ui/button";
import { InputField } from "./InputField";
import { cn } from "@/lib/utils";

const TERM_OPTIONS = [
  { value: 10, label: "10 yr" },
  { value: 15, label: "15 yr" },
  { value: 20, label: "20 yr" },
  { value: 30, label: "30 yr" },
];

interface LoanTermInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
}

export function LoanTermInput({ value, onChange, label = "Loan term" }: LoanTermInputProps) {
  return (
    <InputField label={label}>
      <div className="flex rounded-md border border-input bg-muted p-0.5">
        {TERM_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant="ghost"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 h-9 rounded text-sm font-medium transition-all",
              value === option.value
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-transparent"
            )}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </InputField>
  );
}
