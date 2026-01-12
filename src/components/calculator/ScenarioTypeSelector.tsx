import { ScenarioType, TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_FIELD_LABEL } from "@/lib/mortgage";
import { cn } from "@/lib/utils";
import { Home, RefreshCw } from "lucide-react";

interface ScenarioTypeSelectorProps {
  value: ScenarioType;
  onChange: (type: ScenarioType) => void;
}

export function ScenarioTypeSelector({ value, onChange }: ScenarioTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{TRANSACTION_TYPE_FIELD_LABEL}</p>
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-background p-1">
        <button
          type="button"
          onClick={() => onChange("purchase")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all",
            value === "purchase"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Home className="h-4 w-4" />
          <span>{TRANSACTION_TYPE_LABELS.purchase}</span>
        </button>
        <button
          type="button"
          onClick={() => onChange("refinance")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all",
            value === "refinance"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <RefreshCw className="h-4 w-4" />
          <span>{TRANSACTION_TYPE_LABELS.refinance}</span>
        </button>
      </div>
    </div>
  );
}