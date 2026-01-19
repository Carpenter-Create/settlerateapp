/**
 * RateSourceDisplay - Shows rate source and lock status
 * 
 * Minimal display for showing rate provenance.
 * Shows lock status for locked rates.
 */

import { Lock } from "lucide-react";
import { RateSourceMeta, RATE_SOURCE_LABELS } from "@/lib/rateMeta";
import { RateSourceType } from "@/lib/mortgage";

interface RateSourceDisplayProps {
  sourceType: RateSourceType;
  sourceNote?: string | null;
  isLocked?: boolean;
  className?: string;
}

export function RateSourceDisplay({
  sourceType,
  sourceNote,
  isLocked = false,
  className = "",
}: RateSourceDisplayProps) {
  return (
    <div className={`space-y-0.5 ${className}`}>
      <div className="flex items-center gap-1.5">
        {isLocked && (
          <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
        <span className="text-xs text-muted-foreground">
          Rate source: {RATE_SOURCE_LABELS[sourceType]}
        </span>
      </div>
      {isLocked && (
        <p className="text-xs text-muted-foreground/70 pl-4">
          Locked by advisor
        </p>
      )}
      {sourceNote && (
        <p className="text-xs text-muted-foreground/70 pl-4">
          {sourceNote}
        </p>
      )}
    </div>
  );
}

/**
 * Compact variant for inline display
 */
export function RateSourceBadge({
  sourceType,
  isLocked = false,
}: {
  sourceType: RateSourceType;
  isLocked?: boolean;
}) {
  if (sourceType === "user_entered" && !isLocked) {
    return null; // Don't show badge for default
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      {isLocked && <Lock className="h-2.5 w-2.5" />}
      {RATE_SOURCE_LABELS[sourceType]}
    </span>
  );
}
