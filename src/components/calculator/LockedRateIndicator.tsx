/**
 * LockedRateIndicator - Shows lock status for advisor-locked rates
 * 
 * Minimal, institutional display. No clutter.
 */

import { Lock } from "lucide-react";

interface LockedRateIndicatorProps {
  className?: string;
}

export function LockedRateIndicator({ className = "" }: LockedRateIndicatorProps) {
  return (
    <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
      <Lock className="h-3 w-3" />
      <span>Locked by advisor</span>
    </div>
  );
}
