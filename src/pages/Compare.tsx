import { useState, useMemo } from "react";
import { useScenarios, Scenario } from "@/hooks/useScenarios";
import { formatCurrency, formatPercent, formatDate, calculateDownPaymentAmount } from "@/lib/mortgage";
import { Button } from "@/components/ui/button";
import { Calculator, GitCompare, Plus, X, Download, Share2, Settings2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ComparisonMetric {
  key: string;
  label: string;
  getValue: (s: Scenario) => number | string;
  format: "currency" | "percent" | "months" | "date" | "text";
  lowerIsBetter?: boolean;
}

// Core metrics in the specified order
const COMPARISON_METRICS: ComparisonMetric[] = [
  {
    key: "interestRate",
    label: "Interest rate",
    getValue: (s) => s.inputs.interestRate,
    format: "percent",
    lowerIsBetter: true,
  },
  {
    key: "monthlyPayment",
    label: "Monthly payment",
    getValue: (s) => s.results.monthlyTotal,
    format: "currency",
    lowerIsBetter: true,
  },
  {
    key: "cashAtClose",
    label: "Cash required at close",
    getValue: (s) => {
      if (s.inputs.scenarioType === "purchase") {
        const downPayment = calculateDownPaymentAmount(
          s.inputs.purchasePrice,
          s.inputs.downPayment,
          s.inputs.downPaymentType
        );
        // Rough estimate: down payment + ~3% closing costs
        return downPayment + (s.inputs.purchasePrice * 0.03);
      }
      return s.inputs.financeClosingCosts ? 0 : s.inputs.closingCosts;
    },
    format: "currency",
    lowerIsBetter: true,
  },
  {
    key: "totalInterest",
    label: "Total interest (full term)",
    getValue: (s) => s.results.totalInterest,
    format: "currency",
    lowerIsBetter: true,
  },
  {
    key: "payoffMonths",
    label: "Time to payoff",
    getValue: (s) => s.results.payoffMonths,
    format: "months",
    lowerIsBetter: true,
  },
  {
    key: "ltvRatio",
    label: "Loan-to-value",
    getValue: (s) => s.results.ltvRatio,
    format: "percent",
    lowerIsBetter: true,
  },
  {
    key: "totalCost",
    label: "Total cost",
    getValue: (s) => s.results.totalCost,
    format: "currency",
    lowerIsBetter: true,
  },
];

function formatMetricValue(value: number | string, format: ComparisonMetric["format"]): string {
  if (typeof value === "string") return value;
  switch (format) {
    case "currency":
      return formatCurrency(value);
    case "percent":
      return formatPercent(value);
    case "months":
      return `${value} mo`;
    case "date":
      return formatDate(new Date(value));
    default:
      return String(value);
  }
}

function findBestIndex(
  scenarios: Scenario[],
  metric: ComparisonMetric
): number {
  if (scenarios.length < 2) return -1;
  
  const values = scenarios.map((s) => {
    const v = metric.getValue(s);
    return typeof v === "number" ? v : parseFloat(String(v));
  });
  
  if (values.some((v) => isNaN(v))) return -1;
  
  const target = metric.lowerIsBetter
    ? Math.min(...values)
    : Math.max(...values);
  
  return values.indexOf(target);
}

function generateExplanation(scenarios: Scenario[]): string {
  if (scenarios.length < 2) return "";
  
  const [a, b] = scenarios;
  const monthlyDiff = Math.abs(a.results.monthlyTotal - b.results.monthlyTotal);
  const interestDiff = Math.abs(a.results.totalInterest - b.results.totalInterest);
  
  const lowerMonthly = a.results.monthlyTotal < b.results.monthlyTotal ? a : b;
  const lowerInterest = a.results.totalInterest < b.results.totalInterest ? a : b;
  
  if (lowerMonthly === lowerInterest) {
    return `${lowerMonthly.name} results in ${formatCurrency(monthlyDiff)} less per month and ${formatCurrency(interestDiff)} less in total interest over the loan term. The decision depends on your cash position at close and long-term cost tolerance.`;
  }
  
  return `${lowerMonthly.name} has a lower monthly payment by ${formatCurrency(monthlyDiff)}, while ${lowerInterest.name} saves ${formatCurrency(interestDiff)} in total interest. Consider your monthly budget constraints against long-term cost.`;
}

export default function Compare() {
  const { scenarios, isLoaded } = useScenarios();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [emphasizedId, setEmphasizedId] = useState<string | null>(null);

  const selectedScenarios = selectedIds
    .map((id) => scenarios.find((s) => s.id === id))
    .filter((s): s is Scenario => s !== undefined);

  const availableScenarios = scenarios.filter((s) => !selectedIds.includes(s.id));

  // Auto-emphasize the scenario with lowest total cost
  const autoEmphasizedId = useMemo(() => {
    if (selectedScenarios.length < 2) return null;
    const sorted = [...selectedScenarios].sort(
      (a, b) => a.results.totalCost - b.results.totalCost
    );
    return sorted[0]?.id ?? null;
  }, [selectedScenarios]);

  const currentEmphasis = emphasizedId ?? autoEmphasizedId;

  const addScenario = (id: string) => {
    if (selectedIds.length < 4) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const removeScenario = (id: string) => {
    setSelectedIds(selectedIds.filter((i) => i !== id));
    if (emphasizedId === id) setEmphasizedId(null);
  };

  // Decision context - aggregate info
  const decisionContext = useMemo(() => {
    if (selectedScenarios.length === 0) return null;
    
    const prices = selectedScenarios
      .filter((s) => s.inputs.scenarioType === "purchase")
      .map((s) => s.inputs.purchasePrice);
    
    const loanAmounts = selectedScenarios.map((s) => s.results.loanAmount);
    const terms = [...new Set(selectedScenarios.map((s) => s.inputs.loanTerm))];
    
    return {
      propertyPrice: prices.length > 0 ? Math.max(...prices) : null,
      loanRange: {
        min: Math.min(...loanAmounts),
        max: Math.max(...loanAmounts),
      },
      terms: terms.sort((a, b) => a - b),
    };
  }, [selectedScenarios]);

  const explanation = useMemo(
    () => generateExplanation(selectedScenarios),
    [selectedScenarios]
  );

  if (!isLoaded) {
    return (
      <div className="space-y-8">
        <div>
          <h1>Compare Scenarios</h1>
          <p className="mt-1">Loading scenarios...</p>
        </div>
      </div>
    );
  }

  if (scenarios.length < 2) {
    return (
      <div className="space-y-8">
        <div>
          <h1>Compare Scenarios</h1>
          <p className="mt-1">
            Review mortgage options side-by-side
          </p>
        </div>

        <div className="card-elevated flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border">
            <GitCompare className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h3 className="mt-4 font-serif text-lg">Insufficient scenarios</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Save at least 2 scenarios to compare them.
          </p>
          <Button asChild size="sm" className="mt-6 gap-1.5">
            <Link to="/">
              <Calculator className="h-3.5 w-3.5" strokeWidth={1.5} />
              Open calculator
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1>Compare Scenarios</h1>
        <p className="mt-1">
          Review mortgage options side-by-side to understand the tradeoffs
        </p>
      </div>

      {/* Scenario selector - minimal */}
      <div className="flex flex-wrap items-center gap-2">
        {selectedScenarios.map((scenario) => (
          <div
            key={scenario.id}
            className={cn(
              "flex items-center gap-2 rounded border px-3 py-1.5 text-sm",
              currentEmphasis === scenario.id
                ? "border-foreground/30 bg-muted/50"
                : "border-border"
            )}
          >
            <span className="font-medium">{scenario.name}</span>
            <button
              onClick={() => removeScenario(scenario.id)}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label={`Remove ${scenario.name}`}
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        ))}

        {selectedIds.length < 4 && availableScenarios.length > 0 && (
          <Select onValueChange={addScenario}>
            <SelectTrigger className="h-8 w-40 text-sm">
              <div className="flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
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

      {/* Decision context block - static, above fold */}
      {decisionContext && selectedScenarios.length >= 2 && (
        <div className="flex flex-wrap gap-x-8 gap-y-2 border-y border-border py-4 text-sm">
          {decisionContext.propertyPrice && (
            <div>
              <span className="text-muted-foreground">Property price</span>
              <span className="ml-2 font-mono tabular-nums">
                {formatCurrency(decisionContext.propertyPrice)}
              </span>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Loan amount</span>
            <span className="ml-2 font-mono tabular-nums">
              {decisionContext.loanRange.min === decisionContext.loanRange.max
                ? formatCurrency(decisionContext.loanRange.min)
                : `${formatCurrency(decisionContext.loanRange.min)} – ${formatCurrency(decisionContext.loanRange.max)}`}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Term</span>
            <span className="ml-2 font-mono tabular-nums">
              {decisionContext.terms.join(", ")} years
            </span>
          </div>
        </div>
      )}

      {/* Comparison table */}
      {selectedScenarios.length >= 2 ? (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[500px] text-sm">
            {/* Header row - scenario names */}
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 pr-4 text-left font-normal text-muted-foreground w-48" />
                {selectedScenarios.map((s) => (
                  <th
                    key={s.id}
                    className={cn(
                      "py-3 px-4 text-right font-medium",
                      currentEmphasis === s.id && "bg-muted/30"
                    )}
                  >
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Data rows */}
            <tbody>
              {COMPARISON_METRICS.map((metric) => {
                const bestIndex = findBestIndex(selectedScenarios, metric);
                
                return (
                  <tr key={metric.key} className="border-b border-border/50">
                    <td className="py-3 pr-4 text-muted-foreground">
                      {metric.label}
                    </td>
                    {selectedScenarios.map((s, idx) => {
                      const value = metric.getValue(s);
                      const formatted = formatMetricValue(value, metric.format);
                      const isBest = idx === bestIndex && selectedScenarios.length > 1;
                      
                      return (
                        <td
                          key={s.id}
                          className={cn(
                            "py-3 px-4 text-right font-mono tabular-nums",
                            currentEmphasis === s.id && "bg-muted/30",
                            isBest ? "font-medium text-foreground" : "text-foreground/80"
                          )}
                        >
                          {formatted}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card-elevated flex flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Select at least 2 scenarios to compare
          </p>
        </div>
      )}

      {/* Explanation band */}
      {selectedScenarios.length >= 2 && explanation && (
        <div className="border-t border-border pt-6">
          <p className="section-label mb-2">Summary</p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            {explanation}
          </p>
        </div>
      )}

      {/* Procedural actions - muted, non-emotional */}
      {selectedScenarios.length >= 2 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-6">
          <Button variant="outline" size="sm" className="gap-1.5" disabled>
            <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
            Export summary
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" disabled>
            <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            Share for review
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5" disabled>
            <Settings2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            Adjust assumptions
          </Button>
        </div>
      )}

      {/* Risk notes - footnote style */}
      {selectedScenarios.length >= 2 && (
        <div className="text-xs text-muted-foreground/70 space-y-1">
          <p>
            Cash at close estimate includes down payment and approximately 3% closing costs.
          </p>
          <p>
            All figures assume standard amortization with no prepayment penalties.
          </p>
        </div>
      )}
    </div>
  );
}
