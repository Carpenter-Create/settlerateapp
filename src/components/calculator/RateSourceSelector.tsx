/**
 * RateSourceSelector - Optional disclosure for rate source metadata
 * 
 * Collapsed by default. When expanded, allows selecting:
 * - Rate source type (user_entered, advisor_quote, market_index, assumption)
 * - Optional note field for context
 * 
 * Also handles locked state display.
 */

import { useState } from "react";
import { RateSourceType, RATE_SOURCE_LABELS, SharedInputs } from "@/lib/mortgage";
import { RateKey, RateMeta, getEffectiveRateSource, isRateLocked, setComponentRateSource } from "@/lib/rateMeta";
import { ChevronDown, ChevronUp, Lock } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface RateSourceSelectorProps {
  rateSourceType: RateSourceType;
  rateSourceNote: string | null;
  onUpdate: (updates: Partial<SharedInputs>) => void;
  /** Rate key for component-level metadata (optional) */
  rateKey?: RateKey;
  /** Full rate metadata object (for component-level sources) */
  rateMeta?: RateMeta;
  /** Callback for updating rate meta (for component-level sources) */
  onUpdateRateMeta?: (rateMeta: RateMeta) => void;
  /** Whether the rate is locked by an advisor */
  isLocked?: boolean;
}

export function RateSourceSelector({
  rateSourceType,
  rateSourceNote,
  onUpdate,
  rateKey,
  rateMeta,
  onUpdateRateMeta,
  isLocked = false,
}: RateSourceSelectorProps) {
  // Determine if we're using component-level or shared-level metadata
  const useComponentLevel = rateKey && rateMeta && onUpdateRateMeta;
  
  // Get effective values
  const effectiveSourceType = useComponentLevel 
    ? getEffectiveRateSource(rateMeta, rateKey).sourceType 
    : rateSourceType;
  const effectiveSourceNote = useComponentLevel 
    ? getEffectiveRateSource(rateMeta, rateKey).sourceNote 
    : rateSourceNote;
  const effectiveLocked = useComponentLevel 
    ? isRateLocked(rateMeta, rateKey) 
    : isLocked;

  const [isExpanded, setIsExpanded] = useState(
    effectiveSourceType !== "user_entered" || 
    (effectiveSourceNote !== null && effectiveSourceNote !== "")
  );

  const rateSourceOptions: RateSourceType[] = [
    "user_entered",
    "advisor_quote",
    "market_index",
    "assumption",
  ];

  const handleSourceTypeChange = (value: string) => {
    if (useComponentLevel) {
      const updated = setComponentRateSource(rateMeta, rateKey, {
        sourceType: value as RateSourceType,
      });
      onUpdateRateMeta(updated);
    } else {
      onUpdate({ rateSourceType: value as RateSourceType });
    }
  };

  const handleSourceNoteChange = (value: string) => {
    const noteValue = value || null;
    if (useComponentLevel) {
      const updated = setComponentRateSource(rateMeta, rateKey, {
        sourceNote: noteValue,
      });
      onUpdateRateMeta(updated);
    } else {
      onUpdate({ rateSourceNote: noteValue });
    }
  };

  return (
    <div className="space-y-2">
      {/* Current rate source display */}
      <div className="flex items-center gap-1.5">
        {effectiveLocked && (
          <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
        <p className="text-xs text-muted-foreground">
          Rate source: {RATE_SOURCE_LABELS[effectiveSourceType]}
        </p>
      </div>

      {/* Locked message */}
      {effectiveLocked && (
        <p className="text-xs text-muted-foreground/70 pl-4">
          Locked by advisor
        </p>
      )}

      {/* Note display when locked */}
      {effectiveLocked && effectiveSourceNote && (
        <p className="text-xs text-muted-foreground/70 pl-4">
          {effectiveSourceNote}
        </p>
      )}

      {/* Expandable selector - only if not locked */}
      {!effectiveLocked && (
        <>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center justify-between py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>Rate source (optional)</span>
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {isExpanded && (
            <div className="space-y-4 pt-2 animate-slide-up">
              <RadioGroup
                value={effectiveSourceType}
                onValueChange={handleSourceTypeChange}
                className="space-y-2"
              >
                {rateSourceOptions.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <RadioGroupItem value={type} id={`rate-source-${rateKey ?? 'shared'}-${type}`} />
                    <Label
                      htmlFor={`rate-source-${rateKey ?? 'shared'}-${type}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {RATE_SOURCE_LABELS[type]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              <div className="space-y-1.5">
                <Label htmlFor={`rate-source-note-${rateKey ?? 'shared'}`} className="text-xs text-muted-foreground">
                  Source note (optional)
                </Label>
                <Input
                  id={`rate-source-note-${rateKey ?? 'shared'}`}
                  value={effectiveSourceNote ?? ""}
                  onChange={(e) => handleSourceNoteChange(e.target.value)}
                  placeholder={
                    effectiveSourceType === "market_index"
                      ? 'e.g., "Prime + 1.25%"'
                      : 'e.g., "Quoted by lender on Jan 19"'
                  }
                  className="text-sm"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
