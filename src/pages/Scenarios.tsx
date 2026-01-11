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
      className="card-interactive p-5 animate-fade-in cursor-pointer transition-all hover:border-primary/30"
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isPurchase ? (
              <Home className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
              className="h-8 text-base font-medium"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3 className="truncate text-base font-medium text-foreground">
              {scenario.name}
            </h3>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">
            Updated {formatRelativeTime(scenario.updatedAt)}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon-sm" className="shrink-0">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(scenario.id)}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(scenario.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Monthly payment</p>
          <p className="font-mono text-lg font-semibold tabular-nums">
            {formatCurrency(scenario.results.monthlyTotal)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total interest</p>
          <p className="font-mono text-sm tabular-nums text-muted-foreground">
            {formatCurrency(scenario.results.totalInterest)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
        {isPurchase ? (
          <span className="rounded bg-muted px-2 py-1">
            {formatCurrency(scenario.inputs.purchasePrice)}
          </span>
        ) : (
          <span className="rounded bg-muted px-2 py-1">
            {formatCurrency(scenario.inputs.currentLoanBalance)} balance
          </span>
        )}
        <span className="rounded bg-muted px-2 py-1">
          {formatPercent(scenario.inputs.interestRate)} APR
        </span>
        <span className="rounded bg-muted px-2 py-1">
          {scenario.inputs.loanTerm} years
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
        <h1 className="text-2xl font-semibold tracking-tight">Saved Scenarios</h1>
        <p className="mt-1 text-muted-foreground">
          Click a scenario to open and edit it
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
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FolderOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">No scenarios yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Use the calculator to create and save mortgage scenarios for comparison.
          </p>
          <Button asChild className="mt-6 gap-2">
            <Link to="/">
              <Calculator className="h-4 w-4" />
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
