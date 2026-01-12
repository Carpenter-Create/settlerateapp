import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useScenarios, Scenario } from "@/hooks/useScenarios";
import { useComparisons } from "@/hooks/useComparisons";
import { formatCurrency, formatPercent, formatDate, calculateDownPaymentAmount, calculateAnnualSnapshot } from "@/lib/mortgage";
import { 
  generateComparisonSummary, 
  detectMaterialChanges,
  MaterialChange,
} from "@/lib/comparisonContract";
import { exportComparisonSummaryPDF, exportAssumptionsSheetPDF, exportBothPDFs } from "@/lib/comparisonExportV2";
import { generateRateSensitivityNarrative, RateSensitivityResult } from "@/lib/rateSensitivity";
import { IncomeContext, calculateHousingPercentOfIncome } from "@/components/calculator/IncomeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, GitCompare, Plus, X, Download, Share2, Settings2, Save, FolderOpen, AlertCircle, FileText } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ComparisonMetric {
  key: string;
  label: string;
  getValue: (s: Scenario) => number | string;
  format: "currency" | "percent" | "months" | "date" | "text";
  lowerIsBetter?: boolean;
}

function getInterestRate(s: Scenario): number {
  return s.inputs.shared.interestRate;
}

function getLoanTermYears(s: Scenario): number {
  return s.inputs.shared.loanTerm;
}

const COMPARISON_METRICS: ComparisonMetric[] = [
  {
    key: "interestRate",
    label: "Interest rate",
    getValue: (s) => getInterestRate(s),
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
      if (s.inputs.mode === "purchase") {
        const { purchasePrice, downPayment, downPaymentType } = s.inputs.purchase;
        const downPaymentAmount = calculateDownPaymentAmount(
          purchasePrice,
          downPayment,
          downPaymentType
        );
        return downPaymentAmount + (purchasePrice * 0.03);
      }
      const closingCosts = s.inputs.refinance.closingCosts ?? 0;
      return closingCosts;
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

export default function Compare() {
  const [searchParams] = useSearchParams();
  const { scenarios, isLoaded } = useScenarios();
  const { saveComparison, getComparison, updateComparison, markComparisonAsViewed } = useComparisons();
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [emphasizedId, setEmphasizedId] = useState<string | null>(null);
  const [activeComparisonId, setActiveComparisonId] = useState<string | null>(null);
  const [missingScenarios, setMissingScenarios] = useState<string[]>([]);
  const [materialChanges, setMaterialChanges] = useState<MaterialChange[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [comparisonName, setComparisonName] = useState("");
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [grossMonthlyIncome, setGrossMonthlyIncome] = useState<number | null>(null);
  
  // Track if we've already marked this comparison as viewed
  const hasMarkedViewedRef = useRef<string | null>(null);
  
  // Check if viewing in read-only shared mode
  const isSharedView = searchParams.get("view") === "shared";

  // Restore from URL params and detect changes
  useEffect(() => {
    if (!isLoaded) return;
    
    const comparisonId = searchParams.get("comparison");
    const scenarioIdsFromUrl = searchParams.getAll("s");
    
    if (comparisonId) {
      const comparison = getComparison(comparisonId);
      if (comparison) {
        setActiveComparisonId(comparisonId);
        
        // Check which scenarios still exist
        const existing = comparison.scenarioIds.filter((id) => 
          scenarios.find((s) => s.id === id)
        );
        const missing = comparison.scenarioIds.filter((id) => 
          !scenarios.find((s) => s.id === id)
        );
        setSelectedIds(existing);
        setMissingScenarios(missing);
        
        // Detect material changes if this comparison was viewed before
        if (comparison.lastViewedAt && comparison.scenarioSnapshots.length > 0) {
          const existingScenarios = existing
            .map((id) => scenarios.find((s) => s.id === id))
            .filter((s): s is Scenario => s !== undefined);
          
          const changes = detectMaterialChanges(comparison.scenarioSnapshots, existingScenarios);
          setMaterialChanges(changes);
        } else {
          setMaterialChanges([]);
        }
      }
    } else if (scenarioIdsFromUrl.length > 0) {
      const existing = scenarioIdsFromUrl.filter((id) =>
        scenarios.find((s) => s.id === id)
      );
      setSelectedIds(existing);
      setMaterialChanges([]);
    }
  }, [isLoaded, searchParams, scenarios, getComparison]);

  const selectedScenarios = selectedIds
    .map((id) => scenarios.find((s) => s.id === id))
    .filter((s): s is Scenario => s !== undefined);

  const availableScenarios = scenarios.filter((s) => !selectedIds.includes(s.id));

  // Mark comparison as viewed after render (update snapshot)
  useEffect(() => {
    if (!activeComparisonId || !isLoaded || selectedScenarios.length < 2) return;
    if (hasMarkedViewedRef.current === activeComparisonId) return;
    
    // Delay to ensure we've shown the changes first
    const timer = setTimeout(() => {
      markComparisonAsViewed(activeComparisonId, selectedScenarios);
      hasMarkedViewedRef.current = activeComparisonId;
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [activeComparisonId, isLoaded, selectedScenarios, markComparisonAsViewed]);

  const autoEmphasizedId = useMemo(() => {
    if (selectedScenarios.length < 2) return null;
    const sorted = [...selectedScenarios].sort(
      (a, b) => a.results.totalCost - b.results.totalCost
    );
    return sorted[0]?.id ?? null;
  }, [selectedScenarios]);

  const currentEmphasis = emphasizedId ?? autoEmphasizedId;

  const addScenario = (id: string) => {
    // Hard limit: exactly two scenarios for comparison (per v1 spec)
    if (selectedIds.length < 2) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const removeScenario = (id: string) => {
    setSelectedIds(selectedIds.filter((i) => i !== id));
    if (emphasizedId === id) setEmphasizedId(null);
  };

  const decisionContext = useMemo(() => {
    if (selectedScenarios.length === 0) return null;
    
    const prices = selectedScenarios
      .filter((s) => s.inputs.mode === "purchase")
      .map((s) => s.inputs.purchase.purchasePrice);
    
    const loanAmounts = selectedScenarios.map((s) => s.results.loanAmount);
    const terms = [...new Set(selectedScenarios.map((s) => getLoanTermYears(s)))];
    
    return {
      propertyPrice: prices.length > 0 ? Math.max(...prices) : null,
      loanRange: {
        min: Math.min(...loanAmounts),
        max: Math.max(...loanAmounts),
      },
      terms: terms.sort((a, b) => a - b),
    };
  }, [selectedScenarios]);

  const summary = useMemo(
    () => generateComparisonSummary(selectedScenarios),
    [selectedScenarios]
  );

  // Rate sensitivity analysis
  const rateSensitivity = useMemo<RateSensitivityResult | null>(() => {
    if (selectedScenarios.length < 2) return null;
    return generateRateSensitivityNarrative(selectedScenarios, -0.5);
  }, [selectedScenarios]);

  // Income context for export
  const incomeContext = useMemo(() => {
    if (!grossMonthlyIncome || selectedScenarios.length === 0) return null;
    // Use the recommended scenario's payment, or first scenario
    const referencePayment = summary?.recommendation?.scenario.results.monthlyTotal 
      ?? selectedScenarios[0]?.results.monthlyTotal 
      ?? 0;
    return {
      grossMonthlyIncome,
      percentOfIncome: calculateHousingPercentOfIncome(referencePayment, grossMonthlyIncome),
    };
  }, [grossMonthlyIncome, selectedScenarios, summary]);

  const handleOpenSaveDialog = () => {
    if (selectedIds.length < 2) return;
    
    if (activeComparisonId) {
      // If updating, just update directly (name already set)
      updateComparison(activeComparisonId, { scenarioIds: selectedIds }, selectedScenarios);
      toast("Comparison updated.");
    } else {
      // For new comparison, show naming dialog
      const defaultName = `Comparison – ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
      setComparisonName(defaultName);
      setShowSaveDialog(true);
    }
  };

  const handleConfirmSave = () => {
    if (selectedIds.length < 2) return;
    
    const name = comparisonName.trim() || `Comparison – ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
    const comparison = saveComparison(selectedIds, selectedScenarios, name);
    setActiveComparisonId(comparison.id);
    hasMarkedViewedRef.current = comparison.id;
    setShowSaveDialog(false);
    toast("Comparison saved.");
  };

  const getExportData = () => {
    const comparison = activeComparisonId ? getComparison(activeComparisonId) : null;
    return {
      comparisonName: comparison?.name ?? "Comparison",
      scenarios: selectedScenarios,
      summary,
      materialChanges,
      rateSensitivity,
      incomeContext,
    };
  };

  const handleExportSummary = () => {
    if (selectedScenarios.length < 2) return;
    exportComparisonSummaryPDF(getExportData());
  };


  const handleExportAssumptions = () => {
    if (selectedScenarios.length < 2) return;
    exportAssumptionsSheetPDF(getExportData());
  };

  const handleExportBoth = () => {
    if (selectedScenarios.length < 2) return;
    exportBothPDFs(getExportData());
  };

  const handleShare = () => {
    if (selectedIds.length < 2) return;
    
    // Generate shareable URL with scenario IDs
    const params = new URLSearchParams();
    params.set("view", "shared");
    selectedIds.forEach((id) => params.append("s", id));
    
    const url = `${window.location.origin}/compare?${params.toString()}`;
    setShareUrl(url);
    setShowShareDialog(true);
  };

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast("Link copied.");
    } catch {
      toast("Unable to copy link.");
    }
  };

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
          <h1>Scenario Comparison</h1>
          <p className="mt-1">Side-by-side analysis of mortgage scenarios.</p>
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
      {/* ========================================================================
       * COMPARE UX HIERARCHY (LOCKED ORDER - DO NOT REORDER)
       * 1. Comparison header (scenario chips, no metrics, no CTAs)
       * 2. Core comparison table (side-by-side numeric values)
       * 3. Summary (Canonical Contract: recommendation, why, tradeoffs)
       * 4. What's changed since last time (conditional)
       * 5. Actions (save, share, adjust - always last)
       * ======================================================================== */}

      {/* SECTION 1: Comparison Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1>Scenario Comparison</h1>
            {isSharedView && (
              <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted/50 rounded">
                View-only
              </span>
            )}
          </div>
          <p className="mt-1">Side-by-side view of payment, payoff timeline, and total cost.</p>
        </div>
        {!isSharedView && (
          <Button asChild size="sm" variant="ghost" className="gap-1.5">
            <Link to="/comparisons">
              <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
              Saved comparisons
            </Link>
          </Button>
        )}
      </div>

      {/* Missing scenarios notice (informational, not part of hierarchy) */}
      {missingScenarios.length > 0 && (
        <div className="flex items-start gap-3 rounded border border-border bg-muted/30 px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" strokeWidth={1.5} />
          <p className="text-muted-foreground">
            {missingScenarios.length} scenario{missingScenarios.length > 1 ? "s" : ""} in this comparison {missingScenarios.length > 1 ? "are" : "is"} no longer available.
          </p>
        </div>
      )}

      {/* Scenario chips (header, no metrics) */}
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
            {!isSharedView && (
              <button
                onClick={() => removeScenario(scenario.id)}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label={`Remove ${scenario.name}`}
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            )}
          </div>
        ))}

        {!isSharedView && selectedIds.length < 2 && availableScenarios.length > 0 && (
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

      {/* Decision context block */}
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

      {/* SECTION 2: Core Comparison Table */}
      {selectedScenarios.length >= 2 ? (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[500px] text-sm">
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

      {/* SECTION 3: Canonical Summary (Recommendation Engine Output) */}
      {selectedScenarios.length >= 2 && summary && (
        <div className="border-t border-border pt-6 space-y-6">
          {/* Recommendation headline */}
          {summary.recommendationOutput && (
            <div>
              <p className="section-label mb-2">
                {summary.recommendationOutput.isClearWinner ? "Recommendation" : "Analysis"}
              </p>
              {summary.recommendationOutput.isClearWinner && summary.recommendation ? (
                <>
                  <p className="text-sm">
                    <span className="font-serif font-medium">{summary.recommendation.scenario.name}</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                    {summary.recommendationOutput.headline}.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground max-w-2xl">
                  {summary.recommendationOutput.headline}. Both options are reasonable choices depending on your priorities.
                </p>
              )}
            </div>
          )}

          {/* Summary lines (ordered: monthly, total cost, payoff, cash at close) */}
          {summary.recommendationOutput && summary.recommendationOutput.summaryLines.length > 0 && (
            <div>
              <p className="section-label mb-2">Why it's recommended</p>
              <ul className="space-y-1.5 text-sm text-muted-foreground max-w-2xl">
                {summary.recommendationOutput.summaryLines.map((line, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-foreground/50 select-none">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tradeoff line (if conflicts exist) */}
          {summary.recommendationOutput?.tradeoffLine && (
            <div>
              <p className="section-label mb-2">Tradeoffs</p>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                {summary.recommendationOutput.tradeoffLine}
              </p>
            </div>
          )}

          {/* Alternative scenario advice */}
          {summary.alternativeScenario && !summary.recommendationOutput?.tradeoffLine && (
            <div>
              <p className="section-label mb-2">When another option may make more sense</p>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                {summary.alternativeScenario.advice}
              </p>
            </div>
          )}

          {/* Decision confidence language (no scores, no gauges) */}
          {summary.confidenceStatement && (
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl pt-2">
              {summary.confidenceStatement}
            </p>
          )}

          {/* Assumption sensitivity hints (max 2, observational) */}
          {summary.sensitivityHints.length > 0 && (
            <div className="pt-2">
              <p className="section-label mb-2">What matters most in this comparison</p>
              <ul className="space-y-1 text-sm text-muted-foreground max-w-2xl">
                {summary.sensitivityHints.map((hint, idx) => (
                  <li key={idx}>{hint}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: What's changed since last time (conditional - decision continuity) */}
      {materialChanges.length > 0 && (
        <div className="border-t border-border pt-6 space-y-3">
          <p className="section-label">What's changed since last time</p>
          <ul className="space-y-2 text-sm">
            {materialChanges.map((change, idx) => (
              <li key={idx} className="flex flex-col gap-0.5">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-muted-foreground">{change.scenarioName}:</span>
                  <span className="text-foreground">{change.fieldLabel}</span>
                  <span className="font-mono text-muted-foreground">
                    {change.oldValue} → {change.newValue}
                  </span>
                </div>
                {change.impact && (
                  <p className="text-xs text-muted-foreground">
                    {change.impact}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Annual financial snapshot (Year 1) - secondary scope */}
      {selectedScenarios.length >= 2 && (
        <div className="border-t border-border pt-6 space-y-4">
          <p className="section-label">Annual financial snapshot (Year 1)</p>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 text-left font-normal text-muted-foreground w-48" />
                  {selectedScenarios.map((s) => (
                    <th
                      key={s.id}
                      className={cn(
                        "py-2 px-4 text-right font-medium text-xs",
                        currentEmphasis === s.id && "bg-muted/30"
                      )}
                    >
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 text-muted-foreground text-xs">Annual payments</td>
                  {selectedScenarios.map((s) => {
                    const annual = calculateAnnualSnapshot(s.results);
                    return (
                      <td
                        key={s.id}
                        className={cn(
                          "py-2 px-4 text-right font-mono tabular-nums text-xs",
                          currentEmphasis === s.id && "bg-muted/30"
                        )}
                      >
                        {formatCurrency(annual.annualPayments)}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 text-muted-foreground text-xs">Annual interest</td>
                  {selectedScenarios.map((s) => {
                    const annual = calculateAnnualSnapshot(s.results);
                    return (
                      <td
                        key={s.id}
                        className={cn(
                          "py-2 px-4 text-right font-mono tabular-nums text-xs",
                          currentEmphasis === s.id && "bg-muted/30"
                        )}
                      >
                        {formatCurrency(annual.annualInterest)}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 text-muted-foreground text-xs">Principal reduction</td>
                  {selectedScenarios.map((s) => {
                    const annual = calculateAnnualSnapshot(s.results);
                    return (
                      <td
                        key={s.id}
                        className={cn(
                          "py-2 px-4 text-right font-mono tabular-nums text-xs",
                          currentEmphasis === s.id && "bg-muted/30"
                        )}
                      >
                        {formatCurrency(annual.annualPrincipalReduction)}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Income context - interpretation layer, after summary and annual snapshot */}
      {selectedScenarios.length >= 2 && (
        <div className="border-t border-border pt-6 space-y-3">
          <p className="section-label">Income context</p>
          <IncomeContext
            monthlyHousingPayment={
              summary?.recommendation?.scenario.results.monthlyTotal 
                ?? selectedScenarios[0]?.results.monthlyTotal 
                ?? 0
            }
            onIncomeChange={setGrossMonthlyIncome}
          />
        </div>
      )}

      {/* Rate sensitivity (illustrative) - decision robustness */}
      {selectedScenarios.length >= 2 && rateSensitivity?.isValid && (
        <div className="border-t border-border pt-6 space-y-3">
          <p className="section-label">Rate sensitivity (illustrative)</p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            {rateSensitivity.narrative}
          </p>
          <p className="text-xs text-muted-foreground/70">
            This is illustrative only. Rates shown are not predictions.
          </p>
        </div>
      )}

      {/* SECTION 5: Actions (always last) - hidden in shared view */}
      {selectedScenarios.length >= 2 && !isSharedView && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-6">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5"
            onClick={handleOpenSaveDialog}
          >
            <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
            {activeComparisonId ? "Update comparison" : "Save comparison"}
          </Button>
          
          {/* Export dropdown with options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={handleExportSummary}>
                <FileText className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                Comparison summary
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportAssumptions}>
                <FileText className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                Assumptions sheet
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportBoth}>
                <Download className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                Export both documents
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5"
            onClick={handleShare}
          >
            <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            Share for review
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5" disabled>
            <Settings2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            Adjust assumptions
          </Button>
        </div>
      )}

      {/* Risk notes */}
      {selectedScenarios.length >= 2 && (
        <div className="text-xs text-muted-foreground/70 space-y-1">
          <p>Cash at close estimate includes down payment and approximately 3% closing costs.</p>
          <p>All figures assume standard amortization with no prepayment penalties.</p>
        </div>
      )}

      {/* Save Comparison Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save comparison</DialogTitle>
            <DialogDescription>
              Give this comparison a name to help you recognize it later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="comparison-name" className="text-sm">Comparison name</Label>
            <Input
              id="comparison-name"
              value={comparisonName}
              onChange={(e) => setComparisonName(e.target.value)}
              placeholder="Refi options — Jan 2026"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleConfirmSave();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Comparison Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share for review</DialogTitle>
            <DialogDescription>
              Anyone with this link can view this comparison. They cannot make changes or save it.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="font-mono text-xs"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button onClick={handleCopyShareUrl} size="sm">
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Shared links are read-only and do not require an account to view.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
