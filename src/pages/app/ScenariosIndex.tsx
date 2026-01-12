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
import { useScenarios } from "@/hooks/useScenarios";
import { ScenarioData } from "@/lib/scenarioContract";
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
 * Format percentage for display
 */
function formatPercent(value: number): string {
  return `${value.toFixed(3)}%`;
}

export default function ScenariosIndex() {
  const navigate = useNavigate();
  const { scenarios, isLoaded, duplicateScenario, deleteScenario } = useScenarios();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scenarioToDelete, setScenarioToDelete] = useState<ScenarioData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sort scenarios by updated_at desc
  const sortedScenarios = [...scenarios].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const handleOpen = (scenario: ScenarioData) => {
    navigate(`/app/calculator?scenario=${scenario.id}`);
  };

  const handleDuplicate = async (scenario: ScenarioData) => {
    try {
      const duplicated = await duplicateScenario(scenario.id);
      if (duplicated) {
        toast.success("Scenario duplicated");
        navigate(`/app/calculator?scenario=${duplicated.id}`);
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
      <div className="space-y-space-section">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-32" />
            <Skeleton className="mt-2 h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (sortedScenarios.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h1 className="font-serif text-2xl font-normal tracking-tight sm:text-3xl">
          No saved scenarios yet.
        </h1>
        <p className="mt-4 max-w-md text-sm text-muted-foreground">
          Create your first scenario to model a purchase or refinance.
        </p>
        <Button asChild size="lg" className="mt-10 gap-2">
          <Link to="/app/calculator">
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Create your first scenario
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-space-section">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-normal tracking-tight sm:text-3xl">
            Scenarios
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your saved mortgage scenarios.
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5">
          <Link to="/app/calculator">
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            New scenario
          </Link>
        </Button>
      </div>

      {/* Scenarios table */}
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[35%]">Name</TableHead>
              <TableHead className="text-right">Monthly</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Rate</TableHead>
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
                onClick={() => handleOpen(scenario)}
              >
                <TableCell className="font-medium">
                  {scenario.name || "Untitled scenario"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(scenario.results.monthlyTotal)}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums sm:table-cell">
                  {formatPercent(scenario.inputs.shared.interestRate)}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums md:table-cell">
                  {formatCurrency(scenario.results.loanAmount)}
                </TableCell>
                <TableCell className="hidden text-right text-muted-foreground lg:table-cell">
                  {formatRelativeTime(new Date(scenario.updatedAt))}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpen(scenario); }}>
                        <FileEdit className="mr-2 h-4 w-4" />
                        Open
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
