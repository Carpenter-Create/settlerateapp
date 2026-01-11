import { SaveStatus } from "@/hooks/useScenarios";
import { cn } from "@/lib/utils";
import { Check, Loader2, AlertCircle, Circle } from "lucide-react";

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  isDirty?: boolean;
  className?: string;
}

export function SaveStatusIndicator({ status, isDirty = false, className }: SaveStatusIndicatorProps) {
  // Show nothing in idle state with no unsaved changes
  if (status === "idle" && !isDirty) return null;

  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 text-xs transition-opacity duration-200",
        (status === "saved" && !isDirty) && "text-muted-foreground",
        (status === "draft" || isDirty) && "text-muted-foreground",
        status === "saving" && "text-muted-foreground",
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
      {status === "saved" && !isDirty && (
        <>
          <Check className="h-3 w-3" />
          <span>Saved</span>
        </>
      )}
      {(status === "draft" || (status === "saved" && isDirty)) && isDirty && (
        <>
          <Circle className="h-2.5 w-2.5 fill-current" />
          <span>Unsaved</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-3 w-3" />
          <span>Error saving</span>
        </>
      )}
    </div>
  );
}
