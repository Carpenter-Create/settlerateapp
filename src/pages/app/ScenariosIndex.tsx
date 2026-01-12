import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, MoreHorizontal, FileEdit, Copy, Trash2, GitCompare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useScenarios } from "@/hooks/useScenarios";
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scenarioToDelete, setScenarioToDelete] = useState<ScenarioData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  
  // Selection state for comparison
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isSelectionMode = selectedIds.size > 0;

  // Sort scenarios by updated_at desc
  const sortedScenarios = [...scenarios].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  // Navigate to scenario detail view (only when not in selection mode)
  const handleRowClick = (scenario: ScenarioData) => {
    if (isSelectionMode) {
      toggleSelection(scenario.id);
    } else {
      navigate(`/app/scenarios/${scenario.id}`);
    }
  };

  // Navigate to calculator (for mobile card compatibility)
  const handleOpen = (scenario: ScenarioData) => {
    if (isSelectionMode) {
      toggleSelection(scenario.id);
    } else {
      navigate(`/app/scenarios/${scenario.id}`);
    }
  };

  // Toggle scenario selection
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 2) {
        next.add(id);
      } else {
        // Replace oldest selection with new one
        const [first] = next;
        next.delete(first);
        next.add(id);
      }
      return next;
    });
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Navigate to comparison
  const handleCompare = () => {
    if (selectedIds.size !== 2) return;
    const [a, b] = Array.from(selectedIds);
    navigate(`/app/compare?a=${a}&b=${b}`);
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
      // Remove from selection if selected
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(scenarioToDelete.id);
        return next;
      });
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-32" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          {!isMobile && <Skeleton className="h-9 w-32" />}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className={isMobile ? "h-28 w-full rounded-[14px]" : "h-14 w-full"} />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (sortedScenarios.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
        <h1 className="text-2xl font-medium tracking-tight">
          No saved scenarios
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          Create your first scenario to model a purchase or refinance.
        </p>
        <Button asChild className="mt-8">
          <Link to="/app/calculator">
            <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
            New scenario
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">
            Scenarios
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSelectionMode 
              ? `${selectedIds.size} of 2 selected for comparison`
              : "Saved mortgage models for comparison and export."}
          </p>
        </div>
        {/* Desktop action buttons */}
        {!isMobile && (
          <div className="flex items-center gap-2">
            {isSelectionMode ? (
              <>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  <X className="mr-1.5 h-4 w-4" />
                  Cancel
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCompare}
                  disabled={selectedIds.size !== 2}
                >
                  <GitCompare className="mr-1.5 h-4 w-4" />
                  Compare
                </Button>
              </>
            ) : (
              <>
                {sortedScenarios.length >= 2 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      // Select first two scenarios to enter selection mode
                      const [first, second] = sortedScenarios;
                      setSelectedIds(new Set([first.id, second.id]));
                    }}
                  >
                    <GitCompare className="mr-1.5 h-4 w-4" />
                    Compare
                  </Button>
                )}
                <Button asChild variant="outline" className="rounded-md">
                  <Link to="/app/calculator">
                    <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    New scenario
                  </Link>
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Mobile: Card-based layout */}
      {isMobile ? (
        <div className="space-y-3 pb-20">
          {sortedScenarios.map((scenario) => (
            <div key={scenario.id} className="relative">
              {isSelectionMode && (
                <div 
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelection(scenario.id);
                  }}
                >
                  <Checkbox 
                    checked={selectedIds.has(scenario.id)}
                    className="h-5 w-5"
                  />
                </div>
              )}
              <div className={isSelectionMode ? "pl-12" : ""}>
                <ScenarioCard
                  scenario={scenario}
                  onOpen={handleOpen}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDeleteClick}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Desktop: Institutional table layout */
        <div className="border border-border rounded-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                {isSelectionMode && (
                  <TableHead className="w-[50px] h-10"></TableHead>
                )}
                <TableHead className="w-[35%] h-10 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Name
                </TableHead>
                <TableHead className="h-10 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Monthly
                </TableHead>
                <TableHead className="h-10 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Rate
                </TableHead>
                <TableHead className="hidden h-10 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground md:table-cell">
                  Loan
                </TableHead>
                <TableHead className="hidden h-10 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground lg:table-cell">
                  Updated
                </TableHead>
                <TableHead className="w-[50px] h-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedScenarios.map((scenario) => (
                <TableRow
                  key={scenario.id}
                  className={`cursor-pointer h-14 border-b border-border/50 last:border-b-0 hover:bg-muted/30 ${
                    selectedIds.has(scenario.id) ? "bg-muted/50" : ""
                  }`}
                  onClick={() => handleRowClick(scenario)}
                  onMouseEnter={() => setHoveredRowId(scenario.id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                >
                  {isSelectionMode && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={selectedIds.has(scenario.id)}
                        onCheckedChange={() => toggleSelection(scenario.id)}
                        className="h-4 w-4"
                      />
                    </TableCell>
                  )}
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
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(scenario); }}>
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

      {/* Mobile: Floating action buttons */}
      {isMobile && (
        isSelectionMode ? (
          <div className="fixed bottom-6 left-4 right-4 z-50 flex gap-3">
            <Button 
              variant="outline"
              className="flex-1 rounded-full bg-background shadow-lg"
              onClick={clearSelection}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              className="flex-1 rounded-full shadow-lg"
              onClick={handleCompare}
              disabled={selectedIds.size !== 2}
            >
              <GitCompare className="mr-2 h-4 w-4" />
              Compare
            </Button>
          </div>
        ) : (
          <div className="fixed bottom-6 right-4 z-50 flex flex-col gap-3">
            {sortedScenarios.length >= 2 && (
              <Button
                variant="outline"
                className="rounded-full bg-background px-5 py-3 shadow-lg"
                onClick={() => {
                  const [first, second] = sortedScenarios;
                  setSelectedIds(new Set([first.id, second.id]));
                }}
              >
                <GitCompare className="mr-2 h-4 w-4" />
                Compare
              </Button>
            )}
            <Link
              to="/app/calculator"
              className="flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background shadow-lg transition-transform active:scale-95"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              New scenario
            </Link>
          </div>
        )
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete scenario?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{scenarioToDelete?.name || "Untitled scenario"}". 
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
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
