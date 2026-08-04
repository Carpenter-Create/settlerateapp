/**
 * Comparison Detail View
 * 
 * Institutional, analytical comparison of 2 or 3 saved mortgage scenarios.
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
import { ArrowLeft, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineEditableName } from "@/components/ui/InlineEditableName";
import { useScenarios } from "@/hooks/useScenarios";
import { useComparisons, SavedComparison } from "@/hooks/useComparisons";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScenarioData } from "@/lib/scenarioContract";
import { TRANSACTION_TYPE_LABELS } from "@/lib/mortgage";
import { ComparisonExportModal } from "@/components/export/ExportModal";
import { useCapabilities } from "@/hooks/useCapabilities";
import { resolveComparisonUpdateControl } from "@/lib/comparisonUpdateControl";
import { ComparisonSummary } from "@/components/comparisons/ComparisonSummary";
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
      {/* Brand serif for error state headings */}
      <h1 className="font-serif text-xl font-normal tracking-tight">
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
// COMPARISON COMPONENTS - SUPPORT 2 OR 3 SCENARIOS
// ============================================================================

interface ComparisonRowProps {
  label: string;
  valueA: string | null;
  valueB: string | null;
  valueC?: string | null;
}

/**
 * ComparisonRow - Institutional-grade table row (2 or 3 scenarios)
 * Uses min-widths for columns to maintain readability while allowing scroll
 */
function ComparisonRow({ label, valueA, valueB, valueC }: ComparisonRowProps) {
  const hasC = valueC !== undefined;
  
  return (
    <div className="flex border-b border-border/40 last:border-b-0">
      {/* Label cell: flexible width, min-width for readability */}
      <div className="flex-1 min-w-[140px] py-[14px] px-4 sm:px-5 text-sm text-muted-foreground font-normal leading-snug">
        {label}
      </div>
      {/* Value cells: fixed min-width, right-aligned */}
      <div className="min-w-[100px] sm:min-w-[120px] py-[14px] px-4 sm:px-5 text-sm text-right font-normal tabular-nums">
        {valueA ?? "—"}
      </div>
      <div className="min-w-[100px] sm:min-w-[120px] py-[14px] px-4 sm:px-5 text-sm text-right font-normal tabular-nums">
        {valueB ?? "—"}
      </div>
      {hasC && (
        <div className="min-w-[100px] sm:min-w-[120px] py-[14px] px-4 sm:px-5 text-sm text-right font-normal tabular-nums">
          {valueC ?? "—"}
        </div>
      )}
    </div>
  );
}

interface ComparisonSectionProps {
  title: string;
  children: React.ReactNode;
}

/**
 * ComparisonSection - Institutional ledger section with horizontal scroll wrapper
 * 40px margin-top for major section gaps
 * Section headers use serif for headings only
 */
function ComparisonSection({ title, children }: ComparisonSectionProps) {
  return (
    <div className="mt-10">
      <h2 className="mb-3 font-serif text-base font-normal tracking-tight text-foreground">
        {title}
      </h2>
      {/* Scroll wrapper for narrow viewports */}
      <div className="overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <div className="border border-border/50 rounded-lg overflow-hidden bg-card min-w-[460px] lg:min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MOBILE LAYOUT
// ============================================================================

interface MobileScenarioBlockProps {
  scenario: ScenarioData;
  label: "A" | "B" | "C";
}

/**
 * Mobile metric row - clean left-right layout with proper height
 * Increased padding: 14-18px vertical, 16px horizontal
 */
function MobileMetricRow({ 
  label, 
  value, 
  isBold = false 
}: { 
  label: string; 
  value: string; 
  isBold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between min-h-[48px] py-3.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      {/* Font weight: normal for most values, medium only for key figures */}
      <span className={`text-[15px] tabular-nums ${isBold ? 'font-medium' : 'font-normal'}`}>
        {value}
      </span>
    </div>
  );
}

/**
 * Mobile section wrapper with proper padding and no edge-touching
 * Minimum 16px internal padding on all sides
 */
function MobileSection({ 
  title, 
  children 
}: { 
  title: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-border/50 bg-card overflow-hidden">
      <div className="px-4 py-3 bg-muted/30 border-b border-border/40">
        {/* Section title uses system font (body), not serif */}
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </div>
      </div>
      {/* Generous internal padding: 16px horizontal */}
      <div className="px-4 divide-y divide-border/30">
        {children}
      </div>
    </div>
  );
}

function MobileScenarioBlock({ scenario, label }: MobileScenarioBlockProps) {
  const monthlyPI = getMonthlyPI(scenario);
  const propertyValue = getPropertyValue(scenario);
  
  return (
    <div className="space-y-4">
      {/* Scenario header */}
      <div className="px-1">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
          Scenario {label}
        </div>
        <div className="text-lg font-medium leading-snug break-words">
          {scenario.name || "Untitled scenario"}
        </div>
      </div>
      
      {/* Overview */}
      <MobileSection title="Overview">
        <MobileMetricRow 
          label="Loan type" 
          value={TRANSACTION_TYPE_LABELS[scenario.inputs.mode]} 
        />
        <MobileMetricRow 
          label="Loan amount" 
          value={formatCurrency(scenario.results.loanAmount)} 
        />
        <MobileMetricRow 
          label="Term" 
          value={`${scenario.inputs.shared?.loanTerm || 30} years`} 
        />
        <MobileMetricRow 
          label="Interest rate (assumed)" 
          value={formatPercent(scenario.inputs.shared?.interestRate || 0)} 
        />
        <MobileMetricRow 
          label="LTV" 
          value={formatPercent(scenario.results.ltvRatio || 0)} 
        />
      </MobileSection>
      
      {/* Monthly Payment */}
      <MobileSection title="Monthly payment">
        <MobileMetricRow 
          label="Principal & interest" 
          value={monthlyPI ? formatCurrency(monthlyPI) : "—"} 
        />
        <MobileMetricRow 
          label="Total monthly" 
          value={scenario.results.monthlyTotal ? formatCurrency(scenario.results.monthlyTotal) : "—"}
          isBold
        />
      </MobileSection>
      
      {/* Long-term Cost */}
      <MobileSection title="Cost over modeled term">
        <MobileMetricRow 
          label="Financing cost" 
          value={
            scenario.activeSnapshot?.summary?.financingCostOverHorizon != null
              ? formatCurrency(scenario.activeSnapshot.summary.financingCostOverHorizon)
              : "—"
          } 
        />
        <MobileMetricRow 
          label="Total interest" 
          value={
            scenario.activeSnapshot?.summary?.totalInterest != null
              ? formatCurrency(scenario.activeSnapshot.summary.totalInterest)
              : formatCurrency(scenario.results.totalInterest)
          } 
        />
        <MobileMetricRow 
          label="Payoff date" 
          value={getPayoffDate(scenario)} 
        />
      </MobileSection>
      
      {/* Assumptions */}
      <MobileSection title="Assumptions">
        <MobileMetricRow 
          label="Property value" 
          value={propertyValue ? formatCurrency(propertyValue) : "—"} 
        />
        {scenario.inputs.shared?.propertyTaxAnnual != null && (
          <MobileMetricRow 
            label="Property taxes" 
            value={`${formatCurrency(scenario.inputs.shared.propertyTaxAnnual)}/yr`} 
          />
        )}
        {scenario.inputs.shared?.homeInsuranceMonthly != null && (
          <MobileMetricRow 
            label="Insurance" 
            value={`${formatCurrency(scenario.inputs.shared.homeInsuranceMonthly * 12)}/yr`} 
          />
        )}
      </MobileSection>
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
  scenarioC: ScenarioData | null;
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
  const {
    canExport,
    canUpdateComparison,
    entitlementStatus,
    isEntitlementPending,
    isLoading: capabilitiesLoading,
  } = useCapabilities();
  const renameControl = resolveComparisonUpdateControl({
    canUpdateComparison,
    isEntitlementPending,
    entitlementStatus,
  });

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
      const scenarioC = comp.scenario_c_id 
        ? scenarios.find((s) => s.id === comp.scenario_c_id) ?? null 
        : null;

      if (!scenarioA || !scenarioB) {
        setStatus("scenarios_unavailable");
        return;
      }
      
      // If scenario_c_id exists but couldn't be resolved, that's also an error
      if (comp.scenario_c_id && !scenarioC) {
        setStatus("scenarios_unavailable");
        return;
      }

      setReady({ comparison: comp, scenarioA, scenarioB, scenarioC });
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
    if (!renameControl.allowed || !id) return;
    try {
      await renameComparison({ id, name: newName });
      setLocalName(newName);
      toast.success("Comparison renamed.");
    } catch (error) {
      toast.error("Unable to save name");
      throw error; // Re-throw so InlineEditableName knows to revert
    }
  }, [id, renameComparison, renameControl.allowed]);

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
  const validScenarioC = ready.scenarioC;
  const hasScenarioC = !!validScenarioC;

  // Mobile layout - Institutional-grade with safe areas and clean hierarchy
  if (isMobile) {
    return (
      <div className="w-full max-w-[1120px] mx-auto px-4 pb-6" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="space-y-6">
          {/* Header area */}
          <div className="space-y-4">
            {/* Back navigation */}
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2"
              onClick={() => navigate("/app/comparisons")}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Comparisons
            </Button>
            
            {/* Title - brand serif, proper wrapping, no clipping */}
            <h1 className="font-serif text-xl font-normal tracking-tight leading-snug max-w-full [overflow-wrap:anywhere] [word-break:break-word]">
              <InlineEditableName
                value={localName || validComparison.name}
                onSave={handleRename}
                maxLength={80}
                allowWrap
                disabled={!renameControl.allowed}
              />
            </h1>
            
            {/* Meta row */}
            <p className="text-[13px] text-muted-foreground">
              Created {formatFullDate(new Date(validComparison.created_at))}
            </p>
            
            {/* Actions row - full width export modal button */}
            <div className="pt-1">
              <ComparisonExportModal
                scenarioA={validScenarioA}
                scenarioB={validScenarioB}
                scenarioC={validScenarioC}
                comparisonId={id!}
                variant="outline"
                size="default"
                className="w-full h-11"
                disabled={capabilitiesLoading || !canExport}
              />
            </div>
          </div>

          {/* Quantified Decision Summary - 32px gap from header */}
          <div className="pt-2">
            <ComparisonSummary 
              scenarioA={validScenarioA} 
              scenarioB={validScenarioB} 
              scenarioC={validScenarioC}
            />
          </div>
          
          {/* Scenario blocks with visual separation - 40px gap */}
          <div className="space-y-10 pt-4">
            <MobileScenarioBlock scenario={validScenarioA} label="A" />
            
            {/* Visual separator between scenarios */}
            <div className="border-t border-border/40" />
            
            <MobileScenarioBlock scenario={validScenarioB} label="B" />
            
            {hasScenarioC && (
              <>
                <div className="border-t border-border/40" />
                <MobileScenarioBlock scenario={validScenarioC} label="C" />
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop/Tablet layout
  const monthlyPIA = getMonthlyPI(validScenarioA);
  const monthlyPIB = getMonthlyPI(validScenarioB);
  const monthlyPIC = validScenarioC ? getMonthlyPI(validScenarioC) : null;
  const propertyValueA = getPropertyValue(validScenarioA);
  const propertyValueB = getPropertyValue(validScenarioB);
  const propertyValueC = validScenarioC ? getPropertyValue(validScenarioC) : null;

  return (
    <div className="w-full max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 overflow-x-hidden">
      <div className="pb-12">
        {/* Header - 32px gap to summary */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div className="min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 mb-2"
              onClick={() => navigate("/app/comparisons")}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Comparisons
            </Button>
            {/* Title - brand serif for page headings, proper wrapping */}
            <h1 className="font-serif text-xl sm:text-2xl font-normal tracking-tight pb-2 max-w-full [overflow-wrap:anywhere] [word-break:break-word]">
              <InlineEditableName
                value={localName || validComparison.name}
                onSave={handleRename}
                maxLength={80}
                allowWrap
                disabled={!renameControl.allowed}
              />
            </h1>
            <p className="text-sm text-muted-foreground">
              Created {formatFullDate(new Date(validComparison.created_at))}
            </p>
          </div>
          
          <div className="flex-shrink-0">
            <ComparisonExportModal
              scenarioA={validScenarioA}
              scenarioB={validScenarioB}
              scenarioC={validScenarioC}
              comparisonId={id!}
              variant="outline"
              disabled={capabilitiesLoading || !canExport}
            />
          </div>
        </div>

        {/* Quantified Decision Summary - 32px gap from header */}
        <ComparisonSummary 
          scenarioA={validScenarioA} 
          scenarioB={validScenarioB}
          scenarioC={validScenarioC}
        />

        {/* Scenario headers - 40px gap from summary */}
        {/* Horizontal scroll wrapper for narrow viewports */}
        <div className="overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 mt-10">
          <div className="min-w-[460px] lg:min-w-0">
            <div className="flex border-b border-border/50 pb-4 px-4 sm:px-5">
              <div className="flex-1 min-w-[140px] text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Metric
              </div>
              <div className="min-w-[100px] sm:min-w-[120px] text-right px-4 sm:px-5">
                <div className="text-sm font-normal truncate">{validScenarioA.name || "Untitled"}</div>
                <div className="text-xs text-muted-foreground">Scenario A</div>
              </div>
              <div className="min-w-[100px] sm:min-w-[120px] text-right px-4 sm:px-5">
                <div className="text-sm font-normal truncate">{validScenarioB.name || "Untitled"}</div>
                <div className="text-xs text-muted-foreground">Scenario B</div>
              </div>
              {hasScenarioC && (
                <div className="min-w-[100px] sm:min-w-[120px] text-right px-4 sm:px-5">
                  <div className="text-sm font-normal truncate">{validScenarioC.name || "Untitled"}</div>
                  <div className="text-xs text-muted-foreground">Scenario C</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 1: Scenario Overview */}
        <ComparisonSection title="Scenario overview">
          <ComparisonRow 
            label="Loan type" 
            valueA={TRANSACTION_TYPE_LABELS[validScenarioA.inputs.mode]}
            valueB={TRANSACTION_TYPE_LABELS[validScenarioB.inputs.mode]}
            valueC={hasScenarioC ? TRANSACTION_TYPE_LABELS[validScenarioC.inputs.mode] : undefined}
          />
          <ComparisonRow 
            label="Loan amount" 
            valueA={formatCurrency(validScenarioA.results.loanAmount)}
            valueB={formatCurrency(validScenarioB.results.loanAmount)}
            valueC={hasScenarioC ? formatCurrency(validScenarioC.results.loanAmount) : undefined}
          />
          <ComparisonRow 
            label="Term" 
            valueA={`${validScenarioA.inputs.shared?.loanTerm || 30} years`}
            valueB={`${validScenarioB.inputs.shared?.loanTerm || 30} years`}
            valueC={hasScenarioC ? `${validScenarioC.inputs.shared?.loanTerm || 30} years` : undefined}
          />
          <ComparisonRow 
            label="Interest rate (assumed)" 
            valueA={formatPercent(validScenarioA.inputs.shared?.interestRate || 0)}
            valueB={formatPercent(validScenarioB.inputs.shared?.interestRate || 0)}
            valueC={hasScenarioC ? formatPercent(validScenarioC.inputs.shared?.interestRate || 0) : undefined}
          />
          <ComparisonRow 
            label="LTV" 
            valueA={validScenarioA.results.ltvRatio ? formatPercent(validScenarioA.results.ltvRatio) : null}
            valueB={validScenarioB.results.ltvRatio ? formatPercent(validScenarioB.results.ltvRatio) : null}
            valueC={hasScenarioC ? (validScenarioC.results.ltvRatio ? formatPercent(validScenarioC.results.ltvRatio) : null) : undefined}
          />
        </ComparisonSection>

        {/* Section 2: Monthly Payment */}
        <ComparisonSection title="Monthly payment">
          <ComparisonRow 
            label="Principal & interest" 
            valueA={monthlyPIA ? formatCurrency(monthlyPIA) : null}
            valueB={monthlyPIB ? formatCurrency(monthlyPIB) : null}
            valueC={hasScenarioC ? (monthlyPIC ? formatCurrency(monthlyPIC) : null) : undefined}
          />
          <ComparisonRow 
            label="Total monthly payment" 
            valueA={validScenarioA.results.monthlyTotal ? formatCurrency(validScenarioA.results.monthlyTotal) : null}
            valueB={validScenarioB.results.monthlyTotal ? formatCurrency(validScenarioB.results.monthlyTotal) : null}
            valueC={hasScenarioC ? (validScenarioC.results.monthlyTotal ? formatCurrency(validScenarioC.results.monthlyTotal) : null) : undefined}
          />
        </ComparisonSection>

        {/* Section 3: Cost over modeled term */}
        <ComparisonSection title="Cost over modeled term">
          <ComparisonRow 
            label="Financing cost over modeled term" 
            valueA={
              validScenarioA.activeSnapshot?.summary?.financingCostOverHorizon != null
                ? formatCurrency(validScenarioA.activeSnapshot.summary.financingCostOverHorizon)
                : null
            }
            valueB={
              validScenarioB.activeSnapshot?.summary?.financingCostOverHorizon != null
                ? formatCurrency(validScenarioB.activeSnapshot.summary.financingCostOverHorizon)
                : null
            }
            valueC={
              hasScenarioC
                ? (validScenarioC.activeSnapshot?.summary?.financingCostOverHorizon != null
                    ? formatCurrency(validScenarioC.activeSnapshot.summary.financingCostOverHorizon)
                    : null)
                : undefined
            }
          />
          <ComparisonRow 
            label="Total interest" 
            valueA={
              validScenarioA.activeSnapshot?.summary?.totalInterest != null
                ? formatCurrency(validScenarioA.activeSnapshot.summary.totalInterest)
                : formatCurrency(validScenarioA.results.totalInterest)
            }
            valueB={
              validScenarioB.activeSnapshot?.summary?.totalInterest != null
                ? formatCurrency(validScenarioB.activeSnapshot.summary.totalInterest)
                : formatCurrency(validScenarioB.results.totalInterest)
            }
            valueC={
              hasScenarioC
                ? (validScenarioC.activeSnapshot?.summary?.totalInterest != null
                    ? formatCurrency(validScenarioC.activeSnapshot.summary.totalInterest)
                    : formatCurrency(validScenarioC.results.totalInterest))
                : undefined
            }
          />
          <ComparisonRow 
            label="Payoff date" 
            valueA={getPayoffDate(validScenarioA)}
            valueB={getPayoffDate(validScenarioB)}
            valueC={hasScenarioC ? getPayoffDate(validScenarioC) : undefined}
          />
        </ComparisonSection>

        {/* Section 4: Assumptions */}
        <ComparisonSection title="Assumptions">
          <ComparisonRow 
            label="Property value" 
            valueA={propertyValueA ? formatCurrency(propertyValueA) : null}
            valueB={propertyValueB ? formatCurrency(propertyValueB) : null}
            valueC={hasScenarioC ? (propertyValueC ? formatCurrency(propertyValueC) : null) : undefined}
          />
          <ComparisonRow 
            label="Property taxes (annual)" 
            valueA={validScenarioA.inputs.shared?.propertyTaxAnnual != null 
              ? formatCurrency(validScenarioA.inputs.shared.propertyTaxAnnual) 
              : null}
            valueB={validScenarioB.inputs.shared?.propertyTaxAnnual != null 
              ? formatCurrency(validScenarioB.inputs.shared.propertyTaxAnnual) 
              : null}
            valueC={hasScenarioC ? (validScenarioC.inputs.shared?.propertyTaxAnnual != null 
              ? formatCurrency(validScenarioC.inputs.shared.propertyTaxAnnual) 
              : null) : undefined}
          />
          <ComparisonRow 
            label="Home insurance (annual)" 
            valueA={validScenarioA.inputs.shared?.homeInsuranceMonthly != null 
              ? formatCurrency(validScenarioA.inputs.shared.homeInsuranceMonthly * 12) 
              : null}
            valueB={validScenarioB.inputs.shared?.homeInsuranceMonthly != null 
              ? formatCurrency(validScenarioB.inputs.shared.homeInsuranceMonthly * 12) 
              : null}
            valueC={hasScenarioC ? (validScenarioC.inputs.shared?.homeInsuranceMonthly != null 
              ? formatCurrency(validScenarioC.inputs.shared.homeInsuranceMonthly * 12) 
              : null) : undefined}
          />
        </ComparisonSection>
      </div>
    </div>
  );
}
