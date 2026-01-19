import { ScenarioType, TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_FIELD_LABEL, TRANSACTION_TYPE_DESCRIPTIONS } from "@/lib/mortgage";
import { cn } from "@/lib/utils";
import { Home, RefreshCw, CreditCard, FileCheck } from "lucide-react";

interface ScenarioTypeSelectorProps {
  value: ScenarioType;
  onChange: (type: ScenarioType) => void;
}

const SCENARIO_TYPE_ICONS: Record<ScenarioType, React.ComponentType<{ className?: string }>> = {
  purchase: Home,
  refinance: RefreshCw,
  heloc: CreditCard,
  assumption: FileCheck,
};

export function ScenarioTypeSelector({ value, onChange }: ScenarioTypeSelectorProps) {
  const types: ScenarioType[] = ["purchase", "refinance", "heloc", "assumption"];
  
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{TRANSACTION_TYPE_FIELD_LABEL}</p>
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-background p-1 sm:grid-cols-4">
        {types.map((type) => {
          const Icon = SCENARIO_TYPE_ICONS[type];
          const isSelected = value === type;
          
          return (
            <button
              key={type}
              type="button"
              onClick={() => onChange(type)}
              title={TRANSACTION_TYPE_DESCRIPTIONS[type]}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{TRANSACTION_TYPE_LABELS[type]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}