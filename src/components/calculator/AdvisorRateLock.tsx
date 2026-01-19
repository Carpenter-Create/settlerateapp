/**
 * AdvisorRateLock - Toggle for advisors to lock/unlock rate fields
 * 
 * Collapsed by default. Shows lock controls for advisors.
 * Minimal, institutional UI.
 */

import { useState } from "react";
import { Lock, Unlock, ChevronDown, ChevronUp } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RateKey, RATE_KEY_LABELS, isRateLocked, RateMeta } from "@/lib/rateMeta";

interface AdvisorRateLockProps {
  rateMeta: RateMeta | undefined;
  rateKeys: RateKey[];
  onLockRate: (rateKey: RateKey, lock: boolean) => void;
  onLockAll: (lock: boolean) => void;
}

export function AdvisorRateLock({
  rateMeta,
  rateKeys,
  onLockRate,
  onLockAll,
}: AdvisorRateLockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const lockedCount = rateKeys.filter(key => isRateLocked(rateMeta, key)).length;
  const allLocked = lockedCount === rateKeys.length && rateKeys.length > 0;
  const someLocked = lockedCount > 0;

  return (
    <div className="space-y-2">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex items-center gap-1.5">
          {someLocked ? (
            <Lock className="h-3 w-3" />
          ) : (
            <Unlock className="h-3 w-3" />
          )}
          Rate locks (advisor)
          {someLocked && (
            <span className="text-muted-foreground/70">
              ({lockedCount} locked)
            </span>
          )}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-3 pt-2 pl-4 border-l-2 border-muted animate-slide-up">
          {/* Lock all toggle */}
          {rateKeys.length > 1 && (
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-border">
              <Label 
                htmlFor="lock-all-rates" 
                className="text-xs font-normal cursor-pointer"
              >
                Lock all rates
              </Label>
              <Switch
                id="lock-all-rates"
                checked={allLocked}
                onCheckedChange={onLockAll}
                className="scale-75"
              />
            </div>
          )}

          {/* Individual rate locks */}
          <div className="space-y-2">
            {rateKeys.map((key) => {
              const locked = isRateLocked(rateMeta, key);
              return (
                <div 
                  key={key} 
                  className="flex items-center justify-between gap-3"
                >
                  <Label 
                    htmlFor={`lock-${key}`} 
                    className="text-xs font-normal cursor-pointer text-muted-foreground"
                  >
                    {RATE_KEY_LABELS[key]}
                  </Label>
                  <Switch
                    id={`lock-${key}`}
                    checked={locked}
                    onCheckedChange={(checked) => onLockRate(key, checked)}
                    className="scale-75"
                  />
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-muted-foreground/70 pt-1">
            Locked rates cannot be edited by the client.
          </p>
        </div>
      )}
    </div>
  );
}
