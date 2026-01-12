/**
 * Scenario Comparison View
 * 
 * Institutional, analytical comparison of two saved mortgage scenarios.
 * Designed for advisor and lender review - no recommendations or color-coding.
 */

import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useScenarios } from "@/hooks/useScenarios";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScenarioData } from "@/lib/scenarioContract";
import { TRANSACTION_TYPE_LABELS } from "@/lib/mortgage";
import { ComparisonExportButton } from "@/components/export/ExportButtons";

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
 * Get monthly payment
 */
function getMonthlyPayment(scenario: ScenarioData): number | null {
  if (scenario.results?.monthlyTotal != null && scenario.results.monthlyTotal > 0) {
    return scenario.results.monthlyTotal;
  }
  
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
  
  let monthlyPI = 0;
  if (loanAmount > 0 && monthlyRate > 0) {
    monthlyPI = (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments))) /
      (Math.pow(1 + monthlyRate, totalPayments) - 1);
  } else if (loanAmount > 0 && monthlyRate === 0) {
    monthlyPI = loanAmount / totalPayments;
  }
  
  return monthlyPI;
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
// COMPARISON SECTION COMPONENT
// ============================================================================

interface ComparisonRowProps {
  label: string;
  valueA: string | null;
  valueB: string | null;
}

function ComparisonRow({ label, valueA, valueB }: ComparisonRowProps) {
  return (
    <div className="grid grid-cols-3 border-b border-border/50 last:border-b-0">
      <div className="py-3 text-sm text-muted-foreground">{label}</div>
      <div className="py-3 text-right font-medium tabular-nums">{valueA ?? "—"}</div>
      <div className="py-3 text-right font-medium tabular-nums">{valueB ?? "—"}</div>
    </div>
  );
}

interface ComparisonSectionProps {
  title: string;
  children: React.ReactNode;
}

function ComparisonSection({ title, children }: ComparisonSectionProps) {
  return (
    <div className="mt-8 first:mt-0">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="border border-border rounded-sm overflow-hidden bg-card">
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// MOBILE COMPARISON LAYOUT
// ============================================================================

interface MobileScenarioBlockProps {
  scenario: ScenarioData;
  label: "A" | "B";
}

function MobileScenarioBlock({ scenario, label }: MobileScenarioBlockProps) {
  const monthlyPayment = getMonthlyPayment(scenario);
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
            <span className="tabular-nums">{monthlyPayment ? formatCurrency(monthlyPayment) : "—"}</span>
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
// MAIN COMPARISON VIEW
// ============================================================================

export default function Compare() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { scenarios, isLoaded } = useScenarios();

  // Get scenario IDs from URL params
  const scenarioAId = searchParams.get("a");
  const scenarioBId = searchParams.get("b");

  // Find scenarios
  const scenarioA = scenarios.find((s) => s.id === scenarioAId);
  const scenarioB = scenarios.find((s) => s.id === scenarioBId);

  // Loading state
  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  // Invalid scenarios
  if (!scenarioA || !scenarioB) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
        <h1 className="text-2xl font-medium tracking-tight">
          Scenarios not found
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          Select two scenarios from the list to compare.
        </p>
        <Button asChild className="mt-8" variant="outline">
          <Link to="/app/scenarios">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to scenarios
          </Link>
        </Button>
      </div>
    );
  }

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
            onClick={() => navigate("/app/scenarios")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Scenarios
          </Button>
          <h1 className="text-2xl font-medium tracking-tight">
            Scenario comparison
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Side-by-side analysis for review.
          </p>
        </div>

        {/* Export action */}
        <div className="flex justify-end">
          <ComparisonExportButton
            scenarioA={scenarioA}
            scenarioB={scenarioB}
            variant="outline"
            size="sm"
          />
        </div>

        {/* Mobile stacked layout */}
        <div className="space-y-6">
          <MobileScenarioBlock scenario={scenarioA} label="A" />
          <MobileScenarioBlock scenario={scenarioB} label="B" />
        </div>
      </div>
    );
  }

  // Desktop layout
  const monthlyPaymentA = getMonthlyPayment(scenarioA);
  const monthlyPaymentB = getMonthlyPayment(scenarioB);
  const propertyValueA = getPropertyValue(scenarioA);
  const propertyValueB = getPropertyValue(scenarioB);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-2"
            onClick={() => navigate("/app/scenarios")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Scenarios
          </Button>
          <h1 className="text-2xl font-medium tracking-tight">
            Scenario comparison
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Side-by-side analysis for review.
          </p>
        </div>
        
        <ComparisonExportButton
          scenarioA={scenarioA}
          scenarioB={scenarioB}
          variant="outline"
        />
      </div>

      {/* Scenario headers */}
      <div className="grid grid-cols-3 border-b border-border pb-3">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Metric
        </div>
        <div className="text-right">
          <div className="font-medium">{scenarioA.name || "Untitled"}</div>
          <div className="text-xs text-muted-foreground">Scenario A</div>
        </div>
        <div className="text-right">
          <div className="font-medium">{scenarioB.name || "Untitled"}</div>
          <div className="text-xs text-muted-foreground">Scenario B</div>
        </div>
      </div>

      {/* Section 1: Scenario Overview */}
      <ComparisonSection title="Scenario overview">
        <ComparisonRow 
          label="Loan type" 
          valueA={TRANSACTION_TYPE_LABELS[scenarioA.inputs.mode]}
          valueB={TRANSACTION_TYPE_LABELS[scenarioB.inputs.mode]}
        />
        <ComparisonRow 
          label="Loan amount" 
          valueA={formatCurrency(scenarioA.results.loanAmount)}
          valueB={formatCurrency(scenarioB.results.loanAmount)}
        />
        <ComparisonRow 
          label="Term" 
          valueA={`${scenarioA.inputs.shared?.loanTerm || 30} years`}
          valueB={`${scenarioB.inputs.shared?.loanTerm || 30} years`}
        />
        <ComparisonRow 
          label="Interest rate (assumed)" 
          valueA={formatPercent(scenarioA.inputs.shared?.interestRate || 0)}
          valueB={formatPercent(scenarioB.inputs.shared?.interestRate || 0)}
        />
        <ComparisonRow 
          label="LTV" 
          valueA={scenarioA.results.ltvRatio ? formatPercent(scenarioA.results.ltvRatio) : null}
          valueB={scenarioB.results.ltvRatio ? formatPercent(scenarioB.results.ltvRatio) : null}
        />
      </ComparisonSection>

      {/* Section 2: Monthly Payment */}
      <ComparisonSection title="Monthly payment">
        <ComparisonRow 
          label="Principal & interest" 
          valueA={monthlyPaymentA ? formatCurrency(monthlyPaymentA) : null}
          valueB={monthlyPaymentB ? formatCurrency(monthlyPaymentB) : null}
        />
        <ComparisonRow 
          label="Total monthly payment" 
          valueA={scenarioA.results.monthlyTotal ? formatCurrency(scenarioA.results.monthlyTotal) : null}
          valueB={scenarioB.results.monthlyTotal ? formatCurrency(scenarioB.results.monthlyTotal) : null}
        />
      </ComparisonSection>

      {/* Section 3: Long-term Cost */}
      <ComparisonSection title="Long-term cost">
        <ComparisonRow 
          label="Total payments over term" 
          valueA={scenarioA.results.totalCost ? formatCurrency(scenarioA.results.totalCost) : null}
          valueB={scenarioB.results.totalCost ? formatCurrency(scenarioB.results.totalCost) : null}
        />
        <ComparisonRow 
          label="Total interest paid" 
          valueA={formatCurrency(scenarioA.results.totalInterest)}
          valueB={formatCurrency(scenarioB.results.totalInterest)}
        />
        <ComparisonRow 
          label="Projected payoff date" 
          valueA={getPayoffDate(scenarioA)}
          valueB={getPayoffDate(scenarioB)}
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
          label="Taxes (annual)" 
          valueA={scenarioA.inputs.shared?.propertyTaxAnnual ? formatCurrency(scenarioA.inputs.shared.propertyTaxAnnual) : null}
          valueB={scenarioB.inputs.shared?.propertyTaxAnnual ? formatCurrency(scenarioB.inputs.shared.propertyTaxAnnual) : null}
        />
        <ComparisonRow 
          label="Insurance (annual)" 
          valueA={scenarioA.inputs.shared?.homeInsuranceMonthly ? formatCurrency(scenarioA.inputs.shared.homeInsuranceMonthly * 12) : null}
          valueB={scenarioB.inputs.shared?.homeInsuranceMonthly ? formatCurrency(scenarioB.inputs.shared.homeInsuranceMonthly * 12) : null}
        />
      </ComparisonSection>
    </div>
  );
}
