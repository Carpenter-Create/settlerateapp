import { SaveStatus } from "@/hooks/useScenarios";
import { cn } from "@/lib/utils";
import { Check, Loader2, AlertCircle, Circle } from "lucide-react";

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  isDirty?: boolean;
  isEditing?: boolean; // True when viewing a saved scenario
  className?: string;
}

/**
 * SaveStatusIndicator - Displays scenario state with subtle clarity
 * 
 * States (LOCKED):
 * - Saved scenario (no changes): "Saved scenario"
 * - Saved scenario (with changes): "Unsaved changes"
 * - New scenario: shows nothing (no indicator needed)
 * - Saving: "Saving…"
 * - Error: "Error saving"
 */
export function SaveStatusIndicator({ 
  status, 
  isDirty = false, 
  isEditing = false,
  className 
}: SaveStatusIndicatorProps) {
  // For new/unsaved calculator states, show nothing (per spec)
  if (!isEditing && status === "idle" && !isDirty) return null;

  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 text-xs transition-opacity duration-200",
        "text-muted-foreground",
        status === "error" && "text-destructive",
        className
      )}
    >
      {status === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Saving…</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-3 w-3" />
          <span>Error saving</span>
        </>
      )}
      {/* Saved scenario with no changes */}
      {status !== "saving" && status !== "error" && isEditing && !isDirty && (
        <span>Saved</span>
      )}
      {/* Saved scenario with unsaved changes */}
      {status !== "saving" && status !== "error" && isEditing && isDirty && (
        <span>Changes not saved</span>
      )}
    </div>
  );
}
