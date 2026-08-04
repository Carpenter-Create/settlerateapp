import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Pencil, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useScenarios } from "@/hooks/useScenarios";
import { useCapabilities } from "@/hooks/useCapabilities";
import { ScenarioData } from "@/lib/scenarioContract";
import { TRANSACTION_TYPE_LABELS } from "@/lib/mortgage";
import { ScenarioExportButton } from "@/components/export/ExportButtons";
import { toast } from "sonner";
import { resolveDuplicateScenarioControl } from "@/lib/duplicateScenarioControl";

/**
 * Format currency for display
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage for display
 */
function formatPercent(value: number): string {
  const decimals = value % 0.01 !== 0 ? 3 : 2;
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get monthly payment from scenario
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
  
  const propertyTaxMonthly = results.monthlyPropertyTax ?? 0;
  const homeInsuranceMonthly = results.monthlyHomeInsurance ?? 0;
  const hoaMonthly = results.monthlyHOA ?? 0;
  const pmiMonthly = results.monthlyPMI ?? 0;
  
  return monthlyPI + propertyTaxMonthly + homeInsuranceMonthly + hoaMonthly + pmiMonthly;
}

/**
 * Metadata item component
 */
function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm tabular-nums text-foreground">{value}</span>
    </div>
  );
}

/**
 * Section component for content blocks
 * 
 * TYPOGRAPHY (LOCKED):
 * - Section title uses brand serif (font-serif) for hierarchy
 * - Content uses body font only
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="font-serif text-base font-normal tracking-tight text-foreground">
        {title}
      </h2>
      <div className="rounded-sm border border-border bg-card p-4">
        {children}
      </div>
    </div>
  );
}

export default function ScenarioDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { scenarios, isLoaded, duplicateScenario, deleteScenario } = useScenarios();
  const {
    canDuplicateScenario,
    canUpdateScenario,
    entitlementStatus,
    isScenarioMutationBlocked,
    atScenarioLimit,
  } = useCapabilities();
  const duplicateControl = resolveDuplicateScenarioControl({
    canDuplicateScenario,
    isEntitlementPending: isScenarioMutationBlocked,
    atScenarioLimit,
    entitlementStatus,
  });
  const readOnlyAccount = entitlementStatus === "read_only";
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Find the scenario
  const scenario = scenarios.find((s) => s.id === id);

  // Redirect if scenario not found after loading
  useEffect(() => {
    if (isLoaded && !scenario) {
      navigate("/app/scenarios", { replace: true });
    }
  }, [isLoaded, scenario, navigate]);

  const handleDuplicate = async () => {
    if (!scenario || !duplicateControl.allowed) return;
    try {
      const duplicated = await duplicateScenario(scenario.id);
      if (duplicated) {
        toast.success("Scenario duplicated");
        navigate(`/app/scenarios/${duplicated.id}`);
      }
    } catch (error) {
      toast.error("Failed to duplicate scenario");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!scenario) return;
    
    setIsDeleting(true);
    try {
      await deleteScenario(scenario.id);
      toast.success("Scenario deleted");
      navigate("/app/scenarios", { replace: true });
    } catch (error) {
      toast.error("Failed to delete scenario");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Loading state
  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-12 w-24" />
          <Skeleton className="h-12 w-24" />
          <Skeleton className="h-12 w-24" />
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // Scenario not found
  if (!scenario) {
    return null; // Will redirect via useEffect
  }

  const monthlyPayment = getMonthlyPayment(scenario);
  const scenarioType = TRANSACTION_TYPE_LABELS[scenario.inputs.mode] || "Purchase";

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="space-y-4">
        {/* Back navigation + actions */}
        <div className="flex items-center justify-between">
          <Link
            to="/app/scenarios"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Scenarios
          </Link>
          
          {/* Desktop actions */}
          <div className="hidden items-center gap-2 md:flex">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDuplicate}
              className="text-muted-foreground"
              disabled={!duplicateControl.allowed}
              title={duplicateControl.title}
            >
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Title - brand serif for page headings */}
        <h1 className="font-serif text-2xl font-normal tracking-tight">
          {scenario.name || "Untitled scenario"}
        </h1>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <MetadataItem label="Loan Amount" value={formatCurrency(scenario.results.loanAmount)} />
          <MetadataItem label="Rate" value={formatPercent(scenario.inputs.shared.interestRate)} />
          <MetadataItem label="Term" value={`${scenario.inputs.shared.loanTerm} years`} />
          <MetadataItem label="Updated" value={formatDate(new Date(scenario.updatedAt))} />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {canUpdateScenario ? (
            <Button asChild className="rounded-md">
              <Link to={`/app/calculator?scenario=${scenario.id}`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit scenario
              </Link>
            </Button>
          ) : (
            <Button className="rounded-md" disabled title={readOnlyAccount ? "Read-only until billing is updated" : undefined}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit scenario
            </Button>
          )}
          <ScenarioExportButton scenario={scenario} />
        </div>
        {readOnlyAccount && (
          <p className="text-sm text-muted-foreground">
            This scenario is read-only until billing is updated. You may still delete it.
          </p>
        )}
      </div>

      <Separator />

      {/* Summary section */}
      <Section title="Summary">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Monthly Payment</p>
            <p className="text-lg font-medium tabular-nums">
              {monthlyPayment != null ? formatCurrency(monthlyPayment) : "—"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Principal & Interest</p>
            <p className="text-lg font-medium tabular-nums">
              {formatCurrency(scenario.results.monthlyPrincipalInterest)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Interest</p>
            <p className="text-lg font-medium tabular-nums">
              {formatCurrency(scenario.results.totalInterest)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Cost</p>
            <p className="text-lg font-medium tabular-nums">
              {formatCurrency(scenario.results.totalCost)}
            </p>
          </div>
        </div>
      </Section>

      {/* Assumptions section */}
      <Section title="Assumptions">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Type</p>
            <p className="text-sm">{scenarioType}</p>
          </div>
          {scenario.inputs.mode === "purchase" && scenario.inputs.purchase && (
            <>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Purchase Price</p>
                <p className="text-sm tabular-nums">
                  {formatCurrency(scenario.inputs.purchase.purchasePrice)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Down Payment</p>
                <p className="text-sm tabular-nums">
                  {scenario.inputs.purchase.downPaymentType === "percent"
                    ? `${scenario.inputs.purchase.downPayment}%`
                    : formatCurrency(scenario.inputs.purchase.downPayment)}
                </p>
              </div>
            </>
          )}
          {scenario.inputs.mode === "refinance" && scenario.inputs.refinance && (
            <>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Current Balance</p>
                <p className="text-sm tabular-nums">
                  {formatCurrency(scenario.inputs.refinance.currentLoanBalance)}
                </p>
              </div>
              {scenario.inputs.refinance.estimatedHomeValue && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Estimated Value</p>
                  <p className="text-sm tabular-nums">
                    {formatCurrency(scenario.inputs.refinance.estimatedHomeValue)}
                  </p>
                </div>
              )}
            </>
          )}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Property Taxes</p>
            <p className="text-sm tabular-nums">
              {scenario.results.monthlyPropertyTax > 0 
                ? `${formatCurrency(scenario.results.monthlyPropertyTax)}/mo`
                : "Not specified"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Home Insurance</p>
            <p className="text-sm tabular-nums">
              {scenario.results.monthlyHomeInsurance > 0 
                ? `${formatCurrency(scenario.results.monthlyHomeInsurance)}/mo`
                : "Not specified"}
            </p>
          </div>
        </div>
      </Section>

      {/* Notes section (placeholder for future functionality) */}
      <Section title="Notes">
        <p className="text-sm text-muted-foreground italic">
          No notes added to this scenario.
        </p>
      </Section>

      {/* Mobile actions */}
      <div className="flex flex-col gap-2 pt-4 md:hidden">
        <Button variant="outline" onClick={handleDuplicate} className="w-full" disabled={!duplicateControl.allowed} title={duplicateControl.title}>
          <Copy className="mr-2 h-4 w-4" />
          Duplicate scenario
        </Button>
        <Button
          variant="outline"
          onClick={() => setDeleteDialogOpen(true)}
          className="w-full text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete scenario
        </Button>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete scenario</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
