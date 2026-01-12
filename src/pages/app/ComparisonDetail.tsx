/**
 * Comparison Detail View
 * 
 * Institutional, analytical comparison of two saved mortgage scenarios.
 * Designed for advisor and lender review - no recommendations or color-coding.
 * Loads from saved comparison record by ID.
 * 
 * HARDENED FOR PRODUCTION:
 * - Explicit loading states (never blank)
 * - Graceful error handling (API failures, missing data)
 * - Clear recovery paths to /app/comparisons
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, GitCompare, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineEditableName } from "@/components/ui/InlineEditableName";
import { useScenarios } from "@/hooks/useScenarios";
import { useComparisons, SavedComparison } from "@/hooks/useComparisons";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScenarioData } from "@/lib/scenarioContract";
import { TRANSACTION_TYPE_LABELS } from "@/lib/mortgage";
import { ComparisonExportButton } from "@/components/export/ExportButtons";
import { toast } from "sonner";

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  const decimals = value % 0.01 !== 0 ? 3 : 2;
  return `${value.toFixed(decimals)}%`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Calculate payoff date from scenario
 */
function getPayoffDate(scenario: ScenarioData): string {
  const term = scenario.inputs.shared?.loanTerm || 30;
  const payoffDate = new Date();
  payoffDate.setFullYear(payoffDate.getFullYear() + term);
  return formatDate(payoffDate);
}

/**
 * Get monthly payment (P&I only)
 */
function getMonthlyPI(scenario: ScenarioData): number | null {
  const results = scenario.results;
  const inputs = scenario.inputs;
  
  if (!results || !inputs) return null;
  
  const loanAmount = results.loanAmount;
  const interestRate = inputs.shared?.interestRate;
  const loanTerm = inputs.shared?.loanTerm;
  
  if (loanAmount == null || interestRate == null || loanTerm == null) {
    return null;
  }
  
  const monthlyRate = interestRate / 100 / 12;
  const totalPayments = loanTerm * 12;
  
  if (loanAmount > 0 && monthlyRate > 0) {
    return (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments))) /
      (Math.pow(1 + monthlyRate, totalPayments) - 1);
  } else if (loanAmount > 0 && monthlyRate === 0) {
    return loanAmount / totalPayments;
  }
  
  return null;
}

/**
 * Get property value for display
 */
function getPropertyValue(scenario: ScenarioData): number | null {
  if (scenario.inputs.mode === "purchase") {
    return scenario.inputs.purchase?.purchasePrice || null;
  }
  return scenario.inputs.refinance?.estimatedHomeValue || null;
}

// ============================================================================
// LOADING STATE COMPONENT
// ============================================================================

function LoadingState() {
  const isMobile = useIsMobile();
  
  return (
    <div className="space-y-6" role="status" aria-label="Loading comparison">
      {/* Header skeleton */}
      <div>
        <Skeleton className="h-6 w-28 mb-4" />
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-40" />
      </div>
      
      {/* Content skeleton */}
      {isMobile ? (
        <div className="space-y-4">
          <Skeleton className="h-80 w-full rounded-sm" />
          <Skeleton className="h-80 w-full rounded-sm" />
        </div>
      ) : (
        <>
          <Skeleton className="h-16 w-full rounded-sm" />
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-sm" />
            <Skeleton className="h-32 w-full rounded-sm" />
            <Skeleton className="h-48 w-full rounded-sm" />
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// ERROR STATE COMPONENTS
// ============================================================================

interface ErrorStateProps {
  title: string;
  message: string;
  showRetry?: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
}

function ErrorState({ title, message, showRetry, onRetry, isRetrying }: ErrorStateProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
        <AlertTriangle className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h1 className="text-xl font-medium tracking-tight">
        {title}
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        {message}
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        {showRetry && onRetry && (
          <Button 
            variant="outline" 
            onClick={onRetry}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try again
              </>
            )}
          </Button>
        )}
        <Button asChild variant={showRetry ? "ghost" : "outline"}>
          <Link to="/app/comparisons">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to comparisons
          </Link>
        </Button>
      </div>
    </div>
  );
}

function ComparisonNotFoundState() {
  return (
    <ErrorState
      title="Comparison not found"
      message="This comparison may have been deleted or you don't have access to it."
    />
  );
}

function ScenariosUnavailableState() {
  return (
    <ErrorState
      title="Comparison unavailable"
      message="One or more scenarios in this comparison could not be loaded. The underlying scenarios may have been deleted."
    />
  );
}

// ============================================================================
// COMPARISON COMPONENTS
// ============================================================================

interface ComparisonRowProps {
  label: string;
  valueA: string | null;
  valueB: string | null;
}

/**
 * ComparisonRow - Institutional-grade table row
 * 
 * Styling rules:
 * - Labels: text-sm, muted, normal weight
 * - Values: text-sm, font-medium (NOT bold), tabular-nums for alignment
 * - Generous cell padding: py-4 px-4 desktop
 * - Subtle row separator
 */
function ComparisonRow({ label, valueA, valueB }: ComparisonRowProps) {
  return (
    <div className="grid grid-cols-3 gap-x-6 border-b border-border/60 last:border-b-0">
      <div className="py-4 px-4 text-sm text-muted-foreground font-normal">{label}</div>
      <div className="py-4 px-4 text-sm text-right font-medium tabular-nums">{valueA ?? "—"}</div>
      <div className="py-4 px-4 text-sm text-right font-medium tabular-nums">{valueB ?? "—"}</div>
    </div>
  );
}

interface ComparisonSectionProps {
  title: string;
  children: React.ReactNode;
  isFirst?: boolean;
}

/**
 * ComparisonSection - Institutional ledger section
 * 
 * Styling rules:
 * - Section headers: text-xs, uppercase, tracking-wider, muted
 * - Spacing: mt-8 mb-3 (first section uses mt-4)
 * - Container: subtle border, no elevation
 */
function ComparisonSection({ title, children, isFirst = false }: ComparisonSectionProps) {
  return (
    <div className={isFirst ? "mt-4" : "mt-8"}>
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="border border-border rounded-sm overflow-hidden bg-card">
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// MOBILE LAYOUT
// ============================================================================

interface MobileScenarioBlockProps {
  scenario: ScenarioData;
  label: "A" | "B";
}

function MobileScenarioBlock({ scenario, label }: MobileScenarioBlockProps) {
  const monthlyPI = getMonthlyPI(scenario);
  const propertyValue = getPropertyValue(scenario);
  
  return (
    <div className="border border-border rounded-sm overflow-hidden bg-card">
      <div className="bg-muted/40 px-4 py-3 border-b border-border/50">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
          Scenario {label}
        </div>
        <div className="font-medium">{scenario.name || "Untitled scenario"}</div>
      </div>
      
      {/* Scenario Overview */}
      <div className="px-4 py-3 border-b border-border/30">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
          Overview
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Loan type</span>
            <span>{TRANSACTION_TYPE_LABELS[scenario.inputs.mode]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Loan amount</span>
            <span className="tabular-nums">{formatCurrency(scenario.results.loanAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Term</span>
            <span>{scenario.inputs.shared?.loanTerm || 30} years</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Interest rate</span>
            <span className="tabular-nums">{formatPercent(scenario.inputs.shared?.interestRate || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">LTV</span>
            <span className="tabular-nums">{formatPercent(scenario.results.ltvRatio || 0)}</span>
          </div>
        </div>
      </div>
      
      {/* Monthly Payment */}
      <div className="px-4 py-3 border-b border-border/30">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
          Monthly Payment
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Principal & interest</span>
            <span className="tabular-nums">{monthlyPI ? formatCurrency(monthlyPI) : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total monthly</span>
            <span className="tabular-nums font-medium">{scenario.results.monthlyTotal ? formatCurrency(scenario.results.monthlyTotal) : "—"}</span>
          </div>
        </div>
      </div>
      
      {/* Long-term Cost */}
      <div className="px-4 py-3 border-b border-border/30">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
          Long-term Cost
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total payments</span>
            <span className="tabular-nums">{scenario.results.totalCost ? formatCurrency(scenario.results.totalCost) : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total interest</span>
            <span className="tabular-nums">{formatCurrency(scenario.results.totalInterest)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payoff date</span>
            <span>{getPayoffDate(scenario)}</span>
          </div>
        </div>
      </div>
      
      {/* Assumptions */}
      <div className="px-4 py-3">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
          Assumptions
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Property value</span>
            <span className="tabular-nums">{propertyValue ? formatCurrency(propertyValue) : "—"}</span>
          </div>
          {scenario.inputs.shared?.propertyTaxAnnual != null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Property taxes</span>
              <span className="tabular-nums">{formatCurrency(scenario.inputs.shared.propertyTaxAnnual)}/yr</span>
            </div>
          )}
          {scenario.inputs.shared?.homeInsuranceMonthly != null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Insurance</span>
              <span className="tabular-nums">{formatCurrency(scenario.inputs.shared.homeInsuranceMonthly * 12)}/yr</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STABLE VIEW STATE MACHINE
// ============================================================================

type ViewStatus =
  | "loading"
  | "ready"
  | "not_found"
  | "scenarios_unavailable"
  | "error"
  | "unavailable";

type ReadyPayload = {
  comparison: SavedComparison;
  scenarioA: ScenarioData;
  scenarioB: ScenarioData;
};

// ============================================================================
// MAIN COMPARISON DETAIL VIEW
// ============================================================================

export default function ComparisonDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isMobile = useIsMobile();
  const { scenarios, isLoaded: scenariosLoaded } = useScenarios();
  const { getComparison, renameComparison, isLoaded: comparisonsLoaded } = useComparisons();

  // Local state for the comparison name (for optimistic updates)
  const [localName, setLocalName] = useState<string | null>(null);

  const [status, setStatus] = useState<ViewStatus>("loading");
  const [ready, setReady] = useState<ReadyPayload | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Prevent accidental repeat loads for the same id (fixes mobile flicker)
  const [ranForId, setRanForId] = useState<string | null>(null);

  // Reset state when the route id changes
  useEffect(() => {
    setStatus("loading");
    setReady(null);
    setRanForId(null);
    setLocalName(null);
  }, [id]);

  const loadOnce = useCallback(async () => {
    if (!id) {
      setStatus("unavailable");
      return;
    }

    try {
      const comp = await getComparison(id);

      if (!comp) {
        setStatus("not_found");
        return;
      }

      // Resolve scenarios from the loaded scenario store (stable, no extra network)
      const scenarioA = scenarios.find((s) => s.id === comp.scenario_a_id) ?? null;
      const scenarioB = scenarios.find((s) => s.id === comp.scenario_b_id) ?? null;

      if (!scenarioA || !scenarioB) {
        setStatus("scenarios_unavailable");
        return;
      }

      setReady({ comparison: comp, scenarioA, scenarioB });
      setLocalName(comp.name);
      setStatus("ready");
    } catch (error) {
      console.error("Failed to load comparison:", error);
      setStatus("error");
    }
  }, [id, getComparison, scenarios]);

  // Initial load: once per id, after auth + scenario store are ready
  useEffect(() => {
    if (!id) {
      setStatus("unavailable");
      return;
    }
    if (!comparisonsLoaded || !scenariosLoaded) return;
    if (status === "ready") return;
    if (ranForId === id) return;

    setRanForId(id);
    void loadOnce();
  }, [id, comparisonsLoaded, scenariosLoaded, status, ranForId, loadOnce]);

  // Retry handler (explicit user action)
  const handleRetry = async () => {
    setIsRetrying(true);
    setStatus("loading");
    setRanForId(null);
    await loadOnce();
    setIsRetrying(false);
  };

  // Rename handler
  const handleRename = useCallback(async (newName: string) => {
    if (!id) return;
    try {
      await renameComparison({ id, name: newName });
      setLocalName(newName);
      toast.success("Comparison renamed.");
    } catch (error) {
      toast.error("Unable to save name");
      throw error; // Re-throw so InlineEditableName knows to revert
    }
  }, [id, renameComparison]);

  // ==========================================================================
  // RENDER STATES (NO OSCILLATION)
  // ==========================================================================

  if (status === "loading") {
    return <LoadingState />;
  }

  if (status === "error") {
    return (
      <ErrorState
        title="Unable to load comparison"
        message="There was a problem connecting to the server. Please check your connection and try again."
        showRetry
        onRetry={handleRetry}
        isRetrying={isRetrying}
      />
    );
  }

  if (status === "unavailable") {
    return (
      <ErrorState
        title="Comparison unavailable"
        message="This comparison link is invalid or incomplete."
      />
    );
  }

  if (status === "not_found") {
    return <ComparisonNotFoundState />;
  }

  if (status === "scenarios_unavailable") {
    return <ScenariosUnavailableState />;
  }

  if (!ready) {
    return <LoadingState />;
  }

  const validComparison = ready.comparison;
  const validScenarioA = ready.scenarioA;
  const validScenarioB = ready.scenarioB;

  // Mobile layout
  if (isMobile) {
    return (
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-2"
            onClick={() => navigate("/app/comparisons")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Comparisons
          </Button>
          <h1 className="text-2xl font-medium tracking-tight pb-5">
            <InlineEditableName
              value={localName || validComparison.name}
              onSave={handleRename}
              maxLength={80}
            />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Created {formatFullDate(new Date(validComparison.created_at))}
          </p>
        </div>

        {/* Export action */}
        <div className="flex justify-end">
          <ComparisonExportButton
            scenarioA={validScenarioA}
            scenarioB={validScenarioB}
            variant="outline"
            size="sm"
          />
        </div>

        {/* Mobile stacked layout */}
        <div className="space-y-6">
          <MobileScenarioBlock scenario={validScenarioA} label="A" />
          <MobileScenarioBlock scenario={validScenarioB} label="B" />
        </div>
      </div>
    );
  }

  // Desktop layout
  const monthlyPIA = getMonthlyPI(validScenarioA);
  const monthlyPIB = getMonthlyPI(validScenarioB);
  const propertyValueA = getPropertyValue(validScenarioA);
  const propertyValueB = getPropertyValue(validScenarioB);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-2"
            onClick={() => navigate("/app/comparisons")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Comparisons
          </Button>
          <h1 className="text-2xl font-medium tracking-tight pb-5">
            <InlineEditableName
              value={localName || validComparison.name}
              onSave={handleRename}
              maxLength={80}
            />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Created {formatFullDate(new Date(validComparison.created_at))}
          </p>
        </div>
        
        <ComparisonExportButton
          scenarioA={validScenarioA}
          scenarioB={validScenarioB}
          variant="outline"
        />
      </div>

      {/* Scenario headers - institutional ledger style */}
      <div className="grid grid-cols-3 gap-x-6 border-b border-border pb-4 px-4">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Metric
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">{validScenarioA.name || "Untitled"}</div>
          <div className="text-xs text-muted-foreground">Scenario A</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">{validScenarioB.name || "Untitled"}</div>
          <div className="text-xs text-muted-foreground">Scenario B</div>
        </div>
      </div>

      {/* Section 1: Scenario Overview */}
      <ComparisonSection title="Scenario overview" isFirst>
        <ComparisonRow 
          label="Loan type" 
          valueA={TRANSACTION_TYPE_LABELS[validScenarioA.inputs.mode]}
          valueB={TRANSACTION_TYPE_LABELS[validScenarioB.inputs.mode]}
        />
        <ComparisonRow 
          label="Loan amount" 
          valueA={formatCurrency(validScenarioA.results.loanAmount)}
          valueB={formatCurrency(validScenarioB.results.loanAmount)}
        />
        <ComparisonRow 
          label="Term" 
          valueA={`${validScenarioA.inputs.shared?.loanTerm || 30} years`}
          valueB={`${validScenarioB.inputs.shared?.loanTerm || 30} years`}
        />
        <ComparisonRow 
          label="Interest rate (assumed)" 
          valueA={formatPercent(validScenarioA.inputs.shared?.interestRate || 0)}
          valueB={formatPercent(validScenarioB.inputs.shared?.interestRate || 0)}
        />
        <ComparisonRow 
          label="LTV" 
          valueA={validScenarioA.results.ltvRatio ? formatPercent(validScenarioA.results.ltvRatio) : null}
          valueB={validScenarioB.results.ltvRatio ? formatPercent(validScenarioB.results.ltvRatio) : null}
        />
      </ComparisonSection>

      {/* Section 2: Monthly Payment */}
      <ComparisonSection title="Monthly payment">
        <ComparisonRow 
          label="Principal & interest" 
          valueA={monthlyPIA ? formatCurrency(monthlyPIA) : null}
          valueB={monthlyPIB ? formatCurrency(monthlyPIB) : null}
        />
        <ComparisonRow 
          label="Total monthly payment" 
          valueA={validScenarioA.results.monthlyTotal ? formatCurrency(validScenarioA.results.monthlyTotal) : null}
          valueB={validScenarioB.results.monthlyTotal ? formatCurrency(validScenarioB.results.monthlyTotal) : null}
        />
      </ComparisonSection>

      {/* Section 3: Long-term Cost */}
      <ComparisonSection title="Long-term cost">
        <ComparisonRow 
          label="Total payments" 
          valueA={validScenarioA.results.totalCost ? formatCurrency(validScenarioA.results.totalCost) : null}
          valueB={validScenarioB.results.totalCost ? formatCurrency(validScenarioB.results.totalCost) : null}
        />
        <ComparisonRow 
          label="Total interest" 
          valueA={formatCurrency(validScenarioA.results.totalInterest)}
          valueB={formatCurrency(validScenarioB.results.totalInterest)}
        />
        <ComparisonRow 
          label="Payoff date" 
          valueA={getPayoffDate(validScenarioA)}
          valueB={getPayoffDate(validScenarioB)}
        />
      </ComparisonSection>

      {/* Section 4: Assumptions */}
      <ComparisonSection title="Assumptions">
        <ComparisonRow 
          label="Property value" 
          valueA={propertyValueA ? formatCurrency(propertyValueA) : null}
          valueB={propertyValueB ? formatCurrency(propertyValueB) : null}
        />
        <ComparisonRow 
          label="Property taxes (annual)" 
          valueA={validScenarioA.inputs.shared?.propertyTaxAnnual != null 
            ? formatCurrency(validScenarioA.inputs.shared.propertyTaxAnnual) 
            : null}
          valueB={validScenarioB.inputs.shared?.propertyTaxAnnual != null 
            ? formatCurrency(validScenarioB.inputs.shared.propertyTaxAnnual) 
            : null}
        />
        <ComparisonRow 
          label="Home insurance (annual)" 
          valueA={validScenarioA.inputs.shared?.homeInsuranceMonthly != null 
            ? formatCurrency(validScenarioA.inputs.shared.homeInsuranceMonthly * 12) 
            : null}
          valueB={validScenarioB.inputs.shared?.homeInsuranceMonthly != null 
            ? formatCurrency(validScenarioB.inputs.shared.homeInsuranceMonthly * 12) 
            : null}
        />
      </ComparisonSection>
    </div>
  );
}
