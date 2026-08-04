/**
 * LockedRateIndicator - Shows lock status for admin-locked rates
 */

import { Lock } from "lucide-react";

interface LockedRateIndicatorProps {
  className?: string;
}

export function LockedRateIndicator({ className = "" }: LockedRateIndicatorProps) {
  return (
    <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
      <Lock className="h-3 w-3" />
      <span>Locked by admin</span>
    </div>
  );
}
