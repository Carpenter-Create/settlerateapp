/**
 * RateSourceSelector - Optional disclosure for rate source metadata
 * 
 * Collapsed by default. When expanded, allows selecting:
 * - Rate source type (user_entered, advisor_quote, market_index, assumption)
 * - Optional note field for context
 */

import { useState } from "react";
import { RateSourceType, RATE_SOURCE_LABELS, SharedInputs } from "@/lib/mortgage";
import { ChevronDown, ChevronUp } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface RateSourceSelectorProps {
  rateSourceType: RateSourceType;
  rateSourceNote: string | null;
  onUpdate: (updates: Partial<SharedInputs>) => void;
}

export function RateSourceSelector({
  rateSourceType,
  rateSourceNote,
  onUpdate,
}: RateSourceSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(
    rateSourceType !== "user_entered" || (rateSourceNote !== null && rateSourceNote !== "")
  );

  const rateSourceOptions: RateSourceType[] = [
    "user_entered",
    "advisor_quote",
    "market_index",
    "assumption",
  ];

  return (
    <div className="space-y-2">
      {/* Current rate source display */}
      <p className="text-xs text-muted-foreground">
        Rate source: {RATE_SOURCE_LABELS[rateSourceType]}
      </p>

      {/* Expandable selector */}
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
            value={rateSourceType}
            onValueChange={(value) => onUpdate({ rateSourceType: value as RateSourceType })}
            className="space-y-2"
          >
            {rateSourceOptions.map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <RadioGroupItem value={type} id={`rate-source-${type}`} />
                <Label
                  htmlFor={`rate-source-${type}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {RATE_SOURCE_LABELS[type]}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="space-y-1.5">
            <Label htmlFor="rate-source-note" className="text-xs text-muted-foreground">
              Source note (optional)
            </Label>
            <Input
              id="rate-source-note"
              value={rateSourceNote ?? ""}
              onChange={(e) => onUpdate({ rateSourceNote: e.target.value || null })}
              placeholder='e.g., "Quoted by lender on Jan 19" or "Prime + 1.25%"'
              className="text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
