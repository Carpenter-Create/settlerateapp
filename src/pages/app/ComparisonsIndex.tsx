/**
 * Comparisons Index Page
 * 
 * A dedicated workspace for reviewing and managing scenario comparisons.
 * Professional Review tier and admin only.
 * 
 * PRODUCTION-HARDENED:
 * - Explicit loading/empty/error states
 * - Mobile: swipe-to-delete with iOS patterns
 * - Desktop: dropdown actions
 * - Never blank, always recoverable
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { GitCompare, Lock, Trash2, Eye, MoreHorizontal, AlertTriangle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { RenameComparisonDialog } from "@/components/comparisons/RenameComparisonDialog";
import { useScenarios } from "@/hooks/useScenarios";
import { useComparisons, SavedComparison } from "@/hooks/useComparisons";
import { useCapabilities } from "@/hooks/useCapabilities";
import { ScenarioData } from "@/lib/scenarioContract";
import { useIsMobile } from "@/hooks/use-mobile";
import { SwipeToDelete } from "@/components/mobile/SwipeToDelete";
import { ListCard } from "@/components/ui/ListCard";
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

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getMonthlyPayment(scenario: ScenarioData): number | null {
  if (scenario.results?.monthlyTotal != null && scenario.results.monthlyTotal > 0) {
    return scenario.results.monthlyTotal;
  }
  return null;
}

// ============================================================================
// SCENARIO SELECTOR (MODAL/SHEET)
// ============================================================================

interface ScenarioSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarios: ScenarioData[];
  onConfirm: (scenarioA: ScenarioData, scenarioB: ScenarioData) => Promise<void>;
  isCreating?: boolean;
}

function ScenarioSelector({ open, onOpenChange, scenarios, onConfirm, isCreating }: ScenarioSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobile();

  const toggleSelection = (id: string) => {
    setSubmitError(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 2) {
        next.add(id);
      }
      // Don't allow more than 2 selections
      return next;
    });
  };

  const handleConfirm = async () => {
    if (isSubmitting || isCreating) return;

    if (selectedIds.size !== 2) {
      setSubmitError("Select exactly two scenarios.");
      return;
    }

    const [aId, bId] = Array.from(selectedIds);
    const scenarioA = scenarios.find((s) => s.id === aId);
    const scenarioB = scenarios.find((s) => s.id === bId);

    if (!scenarioA || !scenarioB) {
      setSubmitError("Unable to create comparison. Try again.");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(scenarioA, scenarioB);
      // parent will close + navigate on success
    } catch (e) {
      setSubmitError("Unable to create comparison. Try again.");
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedIds(new Set());
      setSubmitError(null);
      setIsSubmitting(false);
    }
    onOpenChange(newOpen);
  };

  const isDisabled = (id: string) => {
    // Disable if we have 2 selected and this one isn't one of them
    return selectedIds.size >= 2 && !selectedIds.has(id);
  };

  const content = (
    <>
      <div className="text-xs text-muted-foreground mb-4">
        Select exactly two scenarios. ({selectedIds.size}/2 selected)
      </div>

      <div className={isMobile ? "flex-1 overflow-y-auto -mx-4 px-4" : "max-h-[50vh] overflow-y-auto -mx-6 px-6"}>
        <div className="space-y-1">
          {scenarios.map((scenario) => {
            const isSelected = selectedIds.has(scenario.id);
            const disabled = isDisabled(scenario.id);
            const monthlyPayment = getMonthlyPayment(scenario);

            return (
              <button
                key={scenario.id}
                onClick={() => !disabled && toggleSelection(scenario.id)}
                disabled={disabled || isSubmitting || isCreating}
                className={`w-full flex items-center gap-3 rounded-md px-3 py-3 text-left transition-colors ${
                  isSelected
                    ? "bg-muted/60"
                    : disabled
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-muted/30"
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  disabled={disabled || isSubmitting || isCreating}
                  className="h-4 w-4 pointer-events-none"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {scenario.name || "Untitled scenario"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPercent(scenario.inputs.shared?.interestRate || 0)} · {scenario.inputs.shared?.loanTerm || 30}yr · {formatCurrency(scenario.results?.loanAmount || 0)}
                  </div>
                </div>
                {monthlyPayment && (
                  <div className="text-sm font-medium tabular-nums text-muted-foreground">
                    {formatCurrency(monthlyPayment)}/mo
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

  const footer = (
    <>
      <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting || isCreating}>
        Cancel
      </Button>
      <Button
        onClick={handleConfirm}
        disabled={selectedIds.size !== 2 || isSubmitting || isCreating}
      >
        {isSubmitting || isCreating ? "Creating comparison..." : "Compare selected scenarios"}
      </Button>
    </>
  );

  const errorBlock = submitError ? (
    <div className="mt-3 text-sm text-destructive">
      {submitError}
    </div>
  ) : null;

  // Mobile: use Sheet
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col">
          <SheetHeader>
            <SheetTitle>New comparison</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden flex flex-col py-4">
            {content}
            {errorBlock}
          </div>
          <SheetFooter className="flex-row gap-3 pt-4 border-t">
            {footer}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: use Dialog
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New comparison</DialogTitle>
        </DialogHeader>
        {content}
        {errorBlock}
        <DialogFooter>
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// LOCKED STATE (Non-eligible users)
// ============================================================================

function LockedState() {
  const navigate = useNavigate();
  
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
        <Lock className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h1 className="text-2xl font-medium tracking-tight">
        Comparisons
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        Side-by-side scenario comparison is available on the Professional Review tier.
      </p>
      <Button 
        variant="outline" 
        className="mt-8"
        onClick={() => navigate("/app/account")}
      >
        View plans
      </Button>
    </div>
  );
}

// ============================================================================
// LOADING STATE
// ============================================================================

function LoadingState() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading comparisons">
      <div>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <Skeleton className="h-10 w-40" />
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

// ============================================================================
// MOBILE COMPARISON CARD
// ============================================================================

interface MobileComparisonCardProps {
  comparison: SavedComparison;
  onView: () => void;
  onDelete: () => void;
  onRename: () => void;
  isDeleting: boolean;
}

function MobileComparisonCard({
  comparison,
  onView,
  onDelete,
  onRename,
  isDeleting,
}: MobileComparisonCardProps) {
  return (
    <SwipeToDelete onDelete={onDelete} disabled={isDeleting}>
      <ListCard
        title={comparison.name}
        metadata={formatDate(new Date(comparison.created_at))}
        onClick={onView}
        onTitleClick={onRename}
      />
    </SwipeToDelete>
  );
}

// ============================================================================
// MAIN COMPARISONS INDEX
// ============================================================================

export default function ComparisonsIndex() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { scenarios, isLoaded: scenariosLoaded } = useScenarios();
  const { comparisons, isLoaded: comparisonsLoaded, createComparison, renameComparison, deleteComparison, isCreating, isDeleting } = useComparisons();
  const { isLoading: capsLoading, canUsePro, isAdmin } = useCapabilities();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [comparisonToDelete, setComparisonToDelete] = useState<SavedComparison | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [comparisonToRename, setComparisonToRename] = useState<SavedComparison | null>(null);

  // Open rename dialog
  const openRenameDialog = (comparison: SavedComparison) => {
    setComparisonToRename(comparison);
    setRenameDialogOpen(true);
  };

  // Rename handler
  const handleRename = useCallback(async (newName: string) => {
    if (!comparisonToRename) return;
    try {
      await renameComparison({ id: comparisonToRename.id, name: newName });
      toast.success("Comparison renamed.");
    } catch (error) {
      throw error; // Let dialog handle the error
    }
  }, [comparisonToRename, renameComparison]);

  // Sort scenarios by updated_at desc
  const sortedScenarios = [...scenarios].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  // Create scenario lookup map
  const scenarioMap = new Map(scenarios.map(s => [s.id, s]));

  // Handle comparison creation (atomic: create → navigate once)
  const handleCreateComparison = async (scenarioA: ScenarioData, scenarioB: ScenarioData) => {
    const name = `${scenarioA.name || "Untitled"} vs ${scenarioB.name || "Untitled"}`;
    const comparison = await createComparison({
      name,
      scenario_a_id: scenarioA.id,
      scenario_b_id: scenarioB.id,
    });

    setSelectorOpen(false);
    navigate(`/app/comparisons/${comparison.id}`);
  };

  // Handle delete - opens confirmation dialog
  const handleDeleteClick = (comparison: SavedComparison) => {
    setComparisonToDelete(comparison);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!comparisonToDelete) return;
    try {
      await deleteComparison(comparisonToDelete.id);
      toast.success("Comparison deleted");
    } catch (error) {
      toast.error("Failed to delete comparison");
    } finally {
      setDeleteDialogOpen(false);
      setComparisonToDelete(null);
    }
  };

  // Loading state
  if (!scenariosLoaded || !comparisonsLoaded || capsLoading) {
    return <LoadingState />;
  }

  // Access control: Professional Review tier and admin only
  if (!canUsePro && !isAdmin) {
    return <LockedState />;
  }

  // Not enough scenarios to compare
  if (sortedScenarios.length < 2) {
    return (
      <div className="space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">
            Comparisons
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Side-by-side review of saved mortgage scenarios.
          </p>
        </div>

        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center px-4 border border-border rounded-sm bg-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            <GitCompare className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium">
            No comparisons available
          </p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {sortedScenarios.length === 0 
              ? "Create at least two scenarios to compare."
              : "Create one more scenario to enable comparison."}
          </p>
          <Button 
            variant="outline" 
            className="mt-6"
            onClick={() => navigate("/app/calculator")}
          >
            Create scenario
          </Button>
        </div>
      </div>
    );
  }

  // Has comparisons - show list
  const hasComparisons = comparisons.length > 0;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">
            Comparisons
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Side-by-side review of saved mortgage scenarios.
          </p>
        </div>
        {!isMobile && (
          <Button variant="outline" onClick={() => setSelectorOpen(true)}>
            <GitCompare className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Create comparison
          </Button>
        )}
      </div>

      {/* Empty state */}
      {!hasComparisons && (
        <div className="border border-border rounded-sm bg-card px-6 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto mb-4">
            <GitCompare className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium">
            No comparisons created.
          </p>
          <p className="mt-2 max-w-sm mx-auto text-sm text-muted-foreground">
            Select two scenarios to compare.
          </p>
          <Button 
            variant="outline" 
            className="mt-6"
            onClick={() => setSelectorOpen(true)}
          >
            Create comparison
          </Button>
        </div>
      )}

      {/* Comparisons list */}
      {hasComparisons && (
        isMobile ? (
          // Mobile: Card-based list with swipe-to-delete
          <div className="space-y-3 pb-24">
            {/* Swipe hint */}
            <p className="text-xs text-muted-foreground/60 px-1">
              Swipe to delete
            </p>
            
            {comparisons.map((comparison) => (
              <MobileComparisonCard
                key={comparison.id}
                comparison={comparison}
                onView={() => navigate(`/app/comparisons/${comparison.id}`)}
                onDelete={() => handleDeleteClick(comparison)}
                onRename={() => openRenameDialog(comparison)}
                isDeleting={isDeleting}
              />
            ))}
          </div>
        ) : (
          // Desktop: Table layout
          <div className="border border-border rounded-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="h-12 py-4 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Comparison
                  </TableHead>
                  <TableHead className="h-12 py-4 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Scenarios
                  </TableHead>
                  <TableHead className="h-12 py-4 px-4 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Created
                  </TableHead>
                  <TableHead className="w-[60px] h-12 py-4 px-4"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisons.map((comparison) => {
                  const scenarioA = scenarioMap.get(comparison.scenario_a_id);
                  const scenarioB = scenarioMap.get(comparison.scenario_b_id);
                  const hasInvalidScenarios = !scenarioA || !scenarioB;
                  
                  return (
                    <TableRow
                      key={comparison.id}
                      className="cursor-pointer h-14 border-b border-border/60 last:border-b-0 hover:bg-muted/30"
                      onClick={() => navigate(`/app/comparisons/${comparison.id}`)}
                      onMouseEnter={() => setHoveredRowId(comparison.id)}
                      onMouseLeave={() => setHoveredRowId(null)}
                    >
                      <TableCell 
                        className="py-4 px-4"
                        onClick={(e) => { e.stopPropagation(); openRenameDialog(comparison); }}
                      >
                        <span 
                          className="text-sm font-medium text-foreground cursor-pointer hover:text-muted-foreground transition-colors truncate block"
                          title="Click to rename"
                        >
                          {comparison.name}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-4 text-sm text-muted-foreground">
                        {hasInvalidScenarios ? (
                          <span className="flex items-center gap-1.5 text-muted-foreground/70">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Scenarios unavailable
                          </span>
                        ) : (
                          <span className="truncate block max-w-[200px]">
                            {scenarioA?.name || "Unknown"} vs {scenarioB?.name || "Unknown"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 px-4 text-sm text-right text-muted-foreground tabular-nums">
                        {formatRelativeTime(new Date(comparison.created_at))}
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <div 
                          className="transition-opacity duration-150"
                          style={{ opacity: hoveredRowId === comparison.id ? 1 : 0 }}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/app/comparisons/${comparison.id}`); }}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  openRenameDialog(comparison);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(comparison); }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )
      )}

      {/* Mobile: Floating action button */}
      {isMobile && (
        <div className="fixed bottom-6 right-4 z-50">
          <Button
            onClick={() => setSelectorOpen(true)}
            className="rounded-full shadow-lg px-5 py-3"
          >
            <GitCompare className="mr-2 h-4 w-4" strokeWidth={2} />
            Create comparison
          </Button>
        </div>
      )}

      {/* Scenario selector */}
      <ScenarioSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        scenarios={sortedScenarios}
        onConfirm={handleCreateComparison}
        isCreating={isCreating}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete comparison</AlertDialogTitle>
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

      {/* Rename dialog */}
      <RenameComparisonDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        currentName={comparisonToRename?.name || ""}
        onSave={handleRename}
      />
    </div>
  );
}
