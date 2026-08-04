import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, MoreHorizontal, FileEdit, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/layout/PageShell";
import { useScenarios } from "@/hooks/useScenarios";
import { useCapabilities } from "@/hooks/useCapabilities";
import { ScenarioData } from "@/lib/scenarioContract";
import { ScenarioCard } from "@/components/scenarios/ScenarioCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

/**
 * Format relative time for display
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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
 * Format percentage for display (2 decimals, or 3 if stored with higher precision)
 */
function formatPercent(value: number): string {
  const decimals = value % 0.01 !== 0 ? 3 : 2;
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get monthly payment from scenario using deterministic priority:
 * Priority A: Use stored computed value (monthlyTotal)
 * Priority B: Compute from components if needed
 * Priority C: Return null if required fields missing
 */
function getMonthlyPayment(scenario: ScenarioData): number | null {
  // Priority A: Use stored computed value
  if (scenario.results?.monthlyTotal != null && scenario.results.monthlyTotal > 0) {
    return scenario.results.monthlyTotal;
  }
  
  // Priority B: Compute from components
  const results = scenario.results;
  const inputs = scenario.inputs;
  
  if (!results || !inputs) return null;
  
  // Check for required fields
  const loanAmount = results.loanAmount;
  const interestRate = inputs.shared?.interestRate;
  const loanTerm = inputs.shared?.loanTerm;
  
  if (loanAmount == null || interestRate == null || loanTerm == null) {
    return null; // Priority C: fallback
  }
  
  // Calculate P&I using standard amortization formula
  const monthlyRate = interestRate / 100 / 12;
  const totalPayments = loanTerm * 12;
  
  let monthlyPI = 0;
  if (loanAmount > 0 && monthlyRate > 0) {
    monthlyPI = (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments))) /
      (Math.pow(1 + monthlyRate, totalPayments) - 1);
  } else if (loanAmount > 0 && monthlyRate === 0) {
    monthlyPI = loanAmount / totalPayments;
  }
  
  // Add other components
  const propertyTaxMonthly = results.monthlyPropertyTax ?? 0;
  const homeInsuranceMonthly = results.monthlyHomeInsurance ?? 0;
  const hoaMonthly = results.monthlyHOA ?? 0;
  const pmiMonthly = results.monthlyPMI ?? 0;
  
  return monthlyPI + propertyTaxMonthly + homeInsuranceMonthly + hoaMonthly + pmiMonthly;
}

export default function ScenariosIndex() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { scenarios, isLoaded, duplicateScenario, deleteScenario } = useScenarios();
  const { canSave, canDuplicateScenario, atScenarioLimit, entitlementStatus } = useCapabilities();
  const limitTitle = atScenarioLimit
    ? "Free plan limit reached (3 saved scenarios)."
    : undefined;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scenarioToDelete, setScenarioToDelete] = useState<ScenarioData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // Sort scenarios by updated_at desc
  const sortedScenarios = [...scenarios].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  // Navigate to scenario detail view
  const handleRowClick = (scenario: ScenarioData) => {
    navigate(`/app/scenarios/${scenario.id}`);
  };

  // Navigate to scenario detail (for mobile card compatibility)
  const handleOpen = (scenario: ScenarioData) => {
    navigate(`/app/scenarios/${scenario.id}`);
  };

  const handleDuplicate = async (scenario: ScenarioData) => {
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

  const handleDeleteClick = (scenario: ScenarioData) => {
    setScenarioToDelete(scenario);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!scenarioToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteScenario(scenarioToDelete.id);
      toast.success("Scenario deleted");
    } catch (error) {
      toast.error("Failed to delete scenario");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setScenarioToDelete(null);
    }
  };

  // Loading state
  if (!isLoaded) {
    return (
      <PageShell title="Scenarios" subtitle="Saved mortgage models for comparison and export.">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className={isMobile ? "h-28 w-full rounded-[14px]" : "h-14 w-full"} />
          ))}
        </div>
      </PageShell>
    );
  }

  // Empty state
  if (sortedScenarios.length === 0) {
    return (
      <PageShell title="Scenarios" subtitle="Saved mortgage models for comparison and export.">
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
          <p className="text-sm font-medium">No saved scenarios</p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Create your first scenario to model a purchase or refinance.
          </p>
          <Button asChild className="mt-6" disabled={!canSave}>
            <Link to="/app/calculator">
              <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
              New scenario
            </Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const desktopActions = !isMobile ? (
    canSave ? (
      <Button asChild variant="outline">
        <Link to="/app/calculator">
          <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
          New scenario
        </Link>
      </Button>
    ) : (
      <Button variant="outline" disabled title={limitTitle}>
        <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
        New scenario
      </Button>
    )
  ) : undefined;

  return (
    <PageShell
      title="Scenarios"
      subtitle="Saved mortgage models for comparison and export."
      actions={desktopActions}
    >
      {entitlementStatus === "read_only" && (
        <p className="mb-4 text-sm text-muted-foreground">
          Your subscription is past due. Scenarios are read-only until billing is updated. You may still delete scenarios.
        </p>
      )}
      {atScenarioLimit && entitlementStatus === "free" && (
        <p className="mb-4 text-sm text-muted-foreground">
          You have reached the free plan limit of 3 saved scenarios.
        </p>
      )}
      {/* Mobile: Card-based layout */}
      {isMobile ? (
        <div className="space-y-3 pb-20">
          {sortedScenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              onOpen={handleOpen}
              onDuplicate={handleDuplicate}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      ) : (
        /* Desktop: Institutional table layout */
        <div className="border border-border rounded-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/40">
                <TableHead className="w-[35%]">Name</TableHead>
                <TableHead className="text-right">Monthly</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="hidden text-right md:table-cell">Loan</TableHead>
                <TableHead className="hidden text-right lg:table-cell">Updated</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedScenarios.map((scenario) => (
                <TableRow
                  key={scenario.id}
                  className="cursor-pointer"
                  onClick={() => handleRowClick(scenario)}
                  onMouseEnter={() => setHoveredRowId(scenario.id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                >
                  <TableCell className="font-medium text-foreground">
                    {scenario.name || "Untitled scenario"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-foreground">
                    {(() => {
                      const monthlyPayment = getMonthlyPayment(scenario);
                      return monthlyPayment != null ? formatCurrency(monthlyPayment) : "—";
                    })()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatPercent(scenario.inputs.shared.interestRate)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">
                    {formatCurrency(scenario.results.loanAmount)}
                  </TableCell>
                  <TableCell className="hidden text-right text-muted-foreground lg:table-cell">
                    {formatRelativeTime(new Date(scenario.updatedAt))}
                  </TableCell>
                  <TableCell>
                    <div 
                      className="transition-opacity duration-150"
                      style={{ opacity: hoveredRowId === scenario.id ? 1 : 0 }}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/app/calculator?scenario=${scenario.id}`); }}>
                            <FileEdit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); handleDuplicate(scenario); }}
                            disabled={!canDuplicateScenario}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(scenario); }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Mobile: Floating action button */}
      {isMobile && canSave && (
        <div className="fixed bottom-6 right-4 z-50">
          <Link
            to="/app/calculator"
            className="flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background shadow-lg transition-transform active:scale-95"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            New scenario
          </Link>
        </div>
      )}

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
    </PageShell>
  );
}
