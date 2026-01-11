import { Link, useNavigate } from "react-router-dom";
import { useComparisons } from "@/hooks/useComparisons";
import { useScenarios } from "@/hooks/useScenarios";
import { Button } from "@/components/ui/button";
import { GitCompare, Trash2, Calendar, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Comparisons() {
  const navigate = useNavigate();
  const { comparisons, isLoaded, deleteComparison } = useComparisons();
  const { scenarios, isLoaded: scenariosLoaded } = useScenarios();

  const handleOpenComparison = (comparison: { id: string; scenarioIds: string[] }) => {
    // Navigate to compare page with scenario IDs as query params
    const params = new URLSearchParams();
    params.set("comparison", comparison.id);
    comparison.scenarioIds.forEach((id) => params.append("s", id));
    navigate(`/compare?${params.toString()}`);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this comparison?")) {
      deleteComparison(id);
    }
  };

  // Check for missing scenarios in each comparison
  const getComparisonStatus = (scenarioIds: string[]) => {
    if (!scenariosLoaded) return { valid: true, missingCount: 0 };
    const missing = scenarioIds.filter((id) => !scenarios.find((s) => s.id === id));
    return {
      valid: missing.length === 0,
      missingCount: missing.length,
    };
  };

  if (!isLoaded || !scenariosLoaded) {
    return (
      <div className="space-y-8">
        <div>
          <h1>Saved Comparisons</h1>
          <p className="mt-1 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (comparisons.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1>Saved Comparisons</h1>
          <p className="mt-1 text-muted-foreground">
            Review decision artifacts from past analyses
          </p>
        </div>

        <div className="card-elevated flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border">
            <GitCompare className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h3 className="mt-4 font-serif text-lg">No saved comparisons</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Compare scenarios and save your analysis to create decision artifacts.
          </p>
          <Button asChild size="sm" className="mt-6 gap-1.5">
            <Link to="/compare">
              <GitCompare className="h-3.5 w-3.5" strokeWidth={1.5} />
              Compare scenarios
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1>Saved Comparisons</h1>
          <p className="mt-1 text-muted-foreground">
            Review decision artifacts from past analyses
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link to="/compare">
            <GitCompare className="h-3.5 w-3.5" strokeWidth={1.5} />
            New comparison
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        {comparisons.map((comparison) => {
          const status = getComparisonStatus(comparison.scenarioIds);
          
          return (
            <div
              key={comparison.id}
              onClick={() => handleOpenComparison(comparison)}
              className={cn(
                "group flex items-center justify-between rounded border px-4 py-3 transition-colors cursor-pointer",
                status.valid
                  ? "border-border hover:border-foreground/20 hover:bg-muted/30"
                  : "border-border/50 bg-muted/20"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">{comparison.name}</h3>
                  {!status.valid && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <AlertCircle className="h-3 w-3" strokeWidth={1.5} />
                      {status.missingCount} scenario{status.missingCount > 1 ? "s" : ""} unavailable
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" strokeWidth={1.5} />
                    {formatDate(new Date(comparison.createdAt))}
                  </span>
                  <span>{comparison.scenarioIds.length} scenarios</span>
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => handleDelete(e, comparison.id)}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
