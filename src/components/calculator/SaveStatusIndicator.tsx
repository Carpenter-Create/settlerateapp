import { SaveStatus } from "@/hooks/useScenarios";
import { cn } from "@/lib/utils";
import { Check, Loader2, AlertCircle } from "lucide-react";

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  className?: string;
}

export function SaveStatusIndicator({ status, className }: SaveStatusIndicatorProps) {
  if (status === "idle") return null;

  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 text-xs transition-opacity duration-200",
        status === "saved" && "text-muted-foreground",
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
      {status === "saved" && (
        <>
          <Check className="h-3 w-3" />
          <span>Saved</span>
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
