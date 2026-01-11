import { useState } from "react";
import { useScenarios, Scenario } from "@/hooks/useScenarios";
import { formatCurrency, formatPercent, formatDate } from "@/lib/mortgage";
import { Button } from "@/components/ui/button";
import { Calculator, GitCompare, Plus, X } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ComparisonRowProps {
  label: string;
  values: (string | number)[];
  highlight?: "lowest" | "highest";
  format?: "currency" | "percent" | "text";
}

function ComparisonRow({ label, values, highlight, format = "text" }: ComparisonRowProps) {
  const numericValues = values.map((v) => (typeof v === "number" ? v : parseFloat(v.toString().replace(/[^0-9.-]/g, ""))));
  
  let highlightIndex = -1;
  if (highlight && numericValues.some((v) => !isNaN(v))) {
    const validValues = numericValues.filter((v) => !isNaN(v));
    const targetValue = highlight === "lowest" ? Math.min(...validValues) : Math.max(...validValues);
    highlightIndex = numericValues.findIndex((v) => v === targetValue);
  }

  return (
    <div className="grid border-b border-border/50 last:border-0" style={{ gridTemplateColumns: `200px repeat(${values.length}, 1fr)` }}>
      <div className="px-4 py-3 text-sm text-muted-foreground">{label}</div>
      {values.map((value, idx) => (
        <div
          key={idx}
          className={cn(
            "px-4 py-3 text-sm font-mono tabular-nums text-right",
            highlightIndex === idx && "text-primary font-medium"
          )}
        >
          {value}
        </div>
      ))}
    </div>
  );
}

export default function Compare() {
  const { scenarios, isLoaded } = useScenarios();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedScenarios = selectedIds
    .map((id) => scenarios.find((s) => s.id === id))
    .filter((s): s is Scenario => s !== undefined);

  const availableScenarios = scenarios.filter((s) => !selectedIds.includes(s.id));

  const addScenario = (id: string) => {
    if (selectedIds.length < 4) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const removeScenario = (id: string) => {
    setSelectedIds(selectedIds.filter((i) => i !== id));
  };

  if (!isLoaded) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Compare Scenarios</h1>
          <p className="mt-1 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (scenarios.length < 2) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Compare Scenarios</h1>
          <p className="mt-1 text-muted-foreground">
            Compare up to 4 scenarios side-by-side
          </p>
        </div>

        <div className="card-elevated flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <GitCompare className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">Need more scenarios</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Save at least 2 scenarios to compare them. Create scenarios using the calculator.
          </p>
          <Button asChild className="mt-6 gap-2">
            <Link to="/">
              <Calculator className="h-4 w-4" />
              Open calculator
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compare Scenarios</h1>
        <p className="mt-1 text-muted-foreground">
          Compare up to 4 scenarios side-by-side
        </p>
      </div>

      {/* Scenario selector */}
      <div className="flex flex-wrap items-center gap-3">
        {selectedScenarios.map((scenario) => (
          <div
            key={scenario.id}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
          >
            <span className="text-sm font-medium">{scenario.name}</span>
            <button
              onClick={() => removeScenario(scenario.id)}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

        {selectedIds.length < 4 && availableScenarios.length > 0 && (
          <Select onValueChange={addScenario}>
            <SelectTrigger className="w-48">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span>Add scenario</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {availableScenarios.map((scenario) => (
                <SelectItem key={scenario.id} value={scenario.id}>
                  {scenario.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Comparison table */}
      {selectedScenarios.length >= 2 ? (
        <div className="card-elevated overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Header */}
            <div
              className="grid border-b border-border bg-muted/50"
              style={{ gridTemplateColumns: `200px repeat(${selectedScenarios.length}, 1fr)` }}
            >
              <div className="px-4 py-3 text-sm font-medium text-muted-foreground">Metric</div>
              {selectedScenarios.map((s) => (
                <div key={s.id} className="px-4 py-3 text-sm font-medium text-right">
                  {s.name}
                </div>
              ))}
            </div>

            {/* Loan details */}
            <div className="bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Loan Details
            </div>
            <ComparisonRow
              label="Purchase price"
              values={selectedScenarios.map((s) => formatCurrency(s.inputs.purchasePrice))}
            />
            <ComparisonRow
              label="Down payment"
              values={selectedScenarios.map((s) => 
                s.inputs.downPaymentType === "percent" 
                  ? formatPercent(s.inputs.downPayment)
                  : formatCurrency(s.inputs.downPayment)
              )}
            />
            <ComparisonRow
              label="Loan amount"
              values={selectedScenarios.map((s) => formatCurrency(s.results.loanAmount))}
              highlight="lowest"
            />
            <ComparisonRow
              label="Interest rate"
              values={selectedScenarios.map((s) => formatPercent(s.inputs.interestRate))}
              highlight="lowest"
            />
            <ComparisonRow
              label="Loan term"
              values={selectedScenarios.map((s) => `${s.inputs.loanTerm} years`)}
            />

            {/* Monthly costs */}
            <div className="bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Monthly Costs
            </div>
            <ComparisonRow
              label="Total payment"
              values={selectedScenarios.map((s) => formatCurrency(s.results.monthlyTotal))}
              highlight="lowest"
            />
            <ComparisonRow
              label="Principal & interest"
              values={selectedScenarios.map((s) => formatCurrency(s.results.monthlyPrincipalInterest))}
              highlight="lowest"
            />
            <ComparisonRow
              label="Property tax"
              values={selectedScenarios.map((s) => formatCurrency(s.results.monthlyPropertyTax))}
            />
            <ComparisonRow
              label="Home insurance"
              values={selectedScenarios.map((s) => formatCurrency(s.results.monthlyHomeInsurance))}
            />
            {selectedScenarios.some((s) => s.results.monthlyPMI > 0) && (
              <ComparisonRow
                label="PMI"
                values={selectedScenarios.map((s) => 
                  s.results.monthlyPMI > 0 ? formatCurrency(s.results.monthlyPMI) : "—"
                )}
              />
            )}
            {selectedScenarios.some((s) => s.results.monthlyHOA > 0) && (
              <ComparisonRow
                label="HOA"
                values={selectedScenarios.map((s) => 
                  s.results.monthlyHOA > 0 ? formatCurrency(s.results.monthlyHOA) : "—"
                )}
              />
            )}

            {/* Totals */}
            <div className="bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Costs
            </div>
            <ComparisonRow
              label="Total interest"
              values={selectedScenarios.map((s) => formatCurrency(s.results.totalInterest))}
              highlight="lowest"
            />
            <ComparisonRow
              label="Total cost"
              values={selectedScenarios.map((s) => formatCurrency(s.results.totalCost))}
              highlight="lowest"
            />
            <ComparisonRow
              label="Payoff date"
              values={selectedScenarios.map((s) => formatDate(s.results.payoffDate))}
            />
          </div>
        </div>
      ) : (
        <div className="card-elevated flex flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Select at least 2 scenarios to compare
          </p>
        </div>
      )}
    </div>
  );
}
