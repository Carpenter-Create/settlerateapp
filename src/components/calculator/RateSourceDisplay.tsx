/**
 * RateSourceDisplay - Shows rate source metadata
 * 
 * Minimal display for showing rate provenance.
 * Informational only - no lock status.
 */

import { RATE_SOURCE_LABELS } from "@/lib/rateMeta";
import { RateSourceType } from "@/lib/mortgage";

interface RateSourceDisplayProps {
  sourceType: RateSourceType;
  sourceNote?: string | null;
  className?: string;
}

export function RateSourceDisplay({
  sourceType,
  sourceNote,
  className = "",
}: RateSourceDisplayProps) {
  return (
    <div className={`space-y-0.5 ${className}`}>
      <span className="text-xs text-muted-foreground">
        Rate source: {RATE_SOURCE_LABELS[sourceType]}
      </span>
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
}: {
  sourceType: RateSourceType;
}) {
  if (sourceType === "user_entered") {
    return null; // Don't show badge for default
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      {RATE_SOURCE_LABELS[sourceType]}
    </span>
  );
}
