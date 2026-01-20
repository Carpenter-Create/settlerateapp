/**
 * AdvisorRateLockPanel - Rate locking controls for advisors
 * 
 * Collapsed by default. Allows advisors to:
 * - Lock individual rate fields
 * - Lock all rates in the scenario
 * 
 * Minimal, institutional UI.
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, Lock, Unlock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  RateMeta,
  RateKey,
  RATE_KEY_LABELS,
  isRateLocked,
  lockRateField,
  unlockRateField,
  lockAllRates,
  unlockAllRates,
  hasAnyLockedRate,
} from "@/lib/rateMeta";
import { ScenarioType } from "@/lib/mortgage";

interface AdvisorRateLockPanelProps {
  rateMeta: RateMeta | undefined;
  onUpdateRateMeta: (rateMeta: RateMeta) => void;
  advisorUserId: string;
  scenarioType: ScenarioType;
}

/**
 * Get relevant rate keys for a given scenario type
 */
function getRateKeysForScenarioType(scenarioType: ScenarioType): RateKey[] {
  switch (scenarioType) {
    case "purchase":
    case "refinance":
      return ["mortgage.apr"];
    case "heloc":
      return ["heloc.apr"];
    case "assumption":
      return [
        "assumption.assumed_apr",
        "assumption.gap_second_apr",
        "assumption.gap_heloc_apr",
      ];
    default:
      return ["mortgage.apr"];
  }
}

export function AdvisorRateLockPanel({
  rateMeta,
  onUpdateRateMeta,
  advisorUserId,
  scenarioType,
}: AdvisorRateLockPanelProps) {
  const [isExpanded, setIsExpanded] = useState(hasAnyLockedRate(rateMeta));
  
  const rateKeys = getRateKeysForScenarioType(scenarioType);
  const anyLocked = hasAnyLockedRate(rateMeta);

  const handleLockRate = (rateKey: RateKey, lock: boolean) => {
    if (lock) {
      const updated = lockRateField(rateMeta, rateKey, advisorUserId);
      onUpdateRateMeta(updated);
    } else {
      const updated = unlockRateField(rateMeta, rateKey);
      onUpdateRateMeta(updated);
    }
  };

  const handleLockAll = (lock: boolean) => {
    if (lock) {
      const updated = lockAllRates(rateMeta, advisorUserId);
      onUpdateRateMeta(updated);
    } else {
      const updated = unlockAllRates(rateMeta);
      onUpdateRateMeta(updated);
    }
  };

  return (
    <div className="border-t border-border/50 pt-4 mt-4">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex items-center gap-1.5">
          {anyLocked ? (
            <Lock className="h-3 w-3" />
          ) : (
            <Unlock className="h-3 w-3" />
          )}
          Rate locking (advisor)
        </span>
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-3 pt-3 animate-slide-up">
          {/* Lock all toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="lock-all-rates"
              checked={anyLocked}
              onCheckedChange={(checked) => handleLockAll(checked as boolean)}
            />
            <Label
              htmlFor="lock-all-rates"
              className="text-sm font-normal cursor-pointer"
            >
              Lock all rates in this scenario
            </Label>
          </div>

          {/* Individual rate locks */}
          <div className="pl-4 space-y-2">
            {rateKeys.map((rateKey) => (
              <div key={rateKey} className="flex items-center space-x-2">
                <Checkbox
                  id={`lock-${rateKey}`}
                  checked={isRateLocked(rateMeta, rateKey)}
                  onCheckedChange={(checked) => handleLockRate(rateKey, checked as boolean)}
                />
                <Label
                  htmlFor={`lock-${rateKey}`}
                  className="text-xs font-normal cursor-pointer text-muted-foreground"
                >
                  {RATE_KEY_LABELS[rateKey]}
                </Label>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground/70 leading-snug pt-1">
            Locked rates cannot be edited by the client.
          </p>
        </div>
      )}
    </div>
  );
}
