import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScenarios, Scenario } from "@/hooks/useScenarios";
import { formatCurrency, formatPercent } from "@/lib/mortgage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  MoreHorizontal, 
  Copy, 
  Trash2, 
  Pencil, 
  FolderOpen,
  Calculator,
  Home,
  RefreshCw
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

interface ScenarioCardProps {
  scenario: Scenario;
  onOpen: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

function ScenarioCard({ scenario, onOpen, onRename, onDuplicate, onDelete }: ScenarioCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(scenario.name);

  const handleSaveName = () => {
    if (editName.trim() && editName !== scenario.name) {
      onRename(scenario.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open if clicking on input or dropdown
    if ((e.target as HTMLElement).closest('input, button, [role="menu"]')) {
      return;
    }
    onOpen(scenario.id);
  };

  const isPurchase = scenario.inputs.scenarioType === "purchase";

  return (
    <div 
      className="card-interactive p-5 cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isPurchase ? (
              <Home className="h-3 w-3 text-muted-foreground shrink-0" strokeWidth={1.5} />
            ) : (
              <RefreshCw className="h-3 w-3 text-muted-foreground shrink-0" strokeWidth={1.5} />
            )}
            <span className="text-xs text-muted-foreground">
              {isPurchase ? "Purchase" : "Refinance"}
            </span>
          </div>
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") {
                  setEditName(scenario.name);
                  setIsEditing(false);
                }
              }}
              className="h-8 text-sm font-medium"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3 className="truncate text-sm font-medium text-foreground">
              {scenario.name}
            </h3>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatRelativeTime(scenario.updatedAt)}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon-sm" className="shrink-0">
              <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Pencil className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(scenario.id)}>
              <Copy className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(scenario.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Primary number, then label */}
      <div className="mt-4">
        <p className="font-mono text-xl font-medium tabular-nums">
          {formatCurrency(scenario.results.monthlyTotal)}
        </p>
        <p className="text-xs text-muted-foreground">monthly payment</p>
      </div>

      {/* Secondary metrics */}
      <div className="mt-3 flex items-baseline gap-4 text-xs text-muted-foreground">
        <span className="font-mono tabular-nums">
          {formatCurrency(scenario.results.totalInterest)}
        </span>
        <span>total interest</span>
      </div>

      {/* Tags - minimal */}
      <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
        {isPurchase ? (
          <span className="rounded border border-border px-1.5 py-0.5">
            {formatCurrency(scenario.inputs.purchasePrice)}
          </span>
        ) : (
          <span className="rounded border border-border px-1.5 py-0.5">
            {formatCurrency(scenario.inputs.currentLoanBalance)}
          </span>
        )}
        <span className="rounded border border-border px-1.5 py-0.5">
          {formatPercent(scenario.inputs.interestRate)}
        </span>
        <span className="rounded border border-border px-1.5 py-0.5">
          {scenario.inputs.loanTerm}yr
        </span>
      </div>
    </div>
  );
}

export default function Scenarios() {
  const navigate = useNavigate();
  const { scenarios, updateScenario, duplicateScenario, deleteScenario, isLoaded } = useScenarios();

  const handleOpen = (id: string) => {
    navigate(`/?scenario=${id}`);
  };

  const handleRename = (id: string, name: string) => {
    updateScenario(id, { name });
    toast.success("Scenario renamed");
  };

  const handleDuplicate = (id: string) => {
    const newScenario = duplicateScenario(id);
    if (newScenario) {
      // Navigate to the duplicated scenario
      navigate(`/?scenario=${newScenario.id}`);
      toast.success("Scenario duplicated", {
        description: `Created "${newScenario.name}"`,
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteScenario(id);
    toast.success("Scenario deleted");
  };

  // Sort by updated date, newest first
  const sortedScenarios = [...scenarios].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );

  return (
    <div className="space-y-8">
      <div>
        <h1>Saved Scenarios</h1>
        <p className="mt-1">
          Review and compare your saved mortgage analyses
        </p>
      </div>

      {!isLoaded ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-elevated h-48 animate-pulse p-5">
              <div className="h-5 w-2/3 rounded bg-muted" />
              <div className="mt-2 h-3 w-1/3 rounded bg-muted" />
              <div className="mt-6 h-8 w-1/2 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : sortedScenarios.length === 0 ? (
        <div className="card-elevated flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border">
            <FolderOpen className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h3 className="mt-4 font-serif text-lg">No scenarios</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Use the calculator to create and save mortgage scenarios for comparison.
          </p>
          <Button asChild size="sm" className="mt-6 gap-1.5">
            <Link to="/">
              <Calculator className="h-3.5 w-3.5" strokeWidth={1.5} />
              Open calculator
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedScenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              onOpen={handleOpen}
              onRename={handleRename}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
