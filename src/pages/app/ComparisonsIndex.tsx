/**
 * Comparisons Index Page
 * 
 * A dedicated workspace for reviewing and managing scenario comparisons.
 * Professional Review tier and admin only.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GitCompare, Lock } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useScenarios } from "@/hooks/useScenarios";
import { useCapabilities } from "@/hooks/useCapabilities";
import { ScenarioData } from "@/lib/scenarioContract";
import { useIsMobile } from "@/hooks/use-mobile";

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

function getMonthlyPayment(scenario: ScenarioData): number | null {
  if (scenario.results?.monthlyTotal != null && scenario.results.monthlyTotal > 0) {
    return scenario.results.monthlyTotal;
  }
  return null;
}

// ============================================================================
// SCENARIO SELECTOR DIALOG
// ============================================================================

interface ScenarioSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarios: ScenarioData[];
  onConfirm: (ids: [string, string]) => void;
}

function ScenarioSelector({ open, onOpenChange, scenarios, onConfirm }: ScenarioSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 2) {
        next.add(id);
      } else {
        // Replace oldest selection
        const [first] = next;
        next.delete(first);
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    if (selectedIds.size === 2) {
      const [a, b] = Array.from(selectedIds);
      onConfirm([a, b]);
      setSelectedIds(new Set());
      onOpenChange(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedIds(new Set());
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={isMobile ? "max-w-[calc(100vw-2rem)]" : "max-w-lg"}>
        <DialogHeader>
          <DialogTitle>Select scenarios to compare</DialogTitle>
          <DialogDescription>
            Choose exactly two scenarios for side-by-side comparison.
          </DialogDescription>
        </DialogHeader>
        
        <div className="max-h-[50vh] overflow-y-auto -mx-6 px-6">
          <div className="space-y-1">
            {scenarios.map((scenario) => {
              const isSelected = selectedIds.has(scenario.id);
              const monthlyPayment = getMonthlyPayment(scenario);
              
              return (
                <button
                  key={scenario.id}
                  onClick={() => toggleSelection(scenario.id)}
                  className={`w-full flex items-center gap-3 rounded-md px-3 py-3 text-left transition-colors ${
                    isSelected 
                      ? "bg-muted/60" 
                      : "hover:bg-muted/30"
                  }`}
                >
                  <Checkbox 
                    checked={isSelected}
                    className="h-4 w-4 pointer-events-none"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {scenario.name || "Untitled scenario"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatPercent(scenario.inputs.shared?.interestRate || 0)} · {formatRelativeTime(new Date(scenario.updatedAt))}
                    </div>
                  </div>
                  {monthlyPayment && (
                    <div className="text-sm font-medium tabular-nums">
                      {formatCurrency(monthlyPayment)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={selectedIds.size !== 2}
          >
            <GitCompare className="mr-2 h-4 w-4" />
            Compare
          </Button>
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
// MAIN COMPARISONS INDEX
// ============================================================================

export default function ComparisonsIndex() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { scenarios, isLoaded } = useScenarios();
  const { isLoading: capsLoading, canUsePro, isAdmin } = useCapabilities();
  const [selectorOpen, setSelectorOpen] = useState(false);

  // Sort scenarios by updated_at desc
  const sortedScenarios = [...scenarios].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  // Handle comparison creation
  const handleCreateComparison = (ids: [string, string]) => {
    navigate(`/app/comparisons/${ids[0]}...${ids[1]}`);
  };

  // Loading state
  if (!isLoaded || capsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Access control: Professional Review tier and admin only
  if (!canUsePro && !isAdmin) {
    return <LockedState />;
  }

  // Empty state (no scenarios to compare)
  if (sortedScenarios.length < 2) {
    return (
      <div className="space-y-6 md:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-medium tracking-tight">
            Comparisons
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Side-by-side review of saved mortgage scenarios.
          </p>
        </div>

        {/* Empty state */}
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

  // Main view with scenarios available
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

      {/* Instruction card */}
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

      {/* Scenario selector dialog */}
      <ScenarioSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        scenarios={sortedScenarios}
        onConfirm={handleCreateComparison}
      />
    </div>
  );
}
