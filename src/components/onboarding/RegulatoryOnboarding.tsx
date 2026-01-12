/**
 * RegulatoryOnboarding - Boundary-First Consent Flow
 * 
 * Establishes SettleRate as an analytical, non-advisory platform.
 * Requires explicit acknowledgment prior to entry.
 * 
 * Flow: Context → Scope → Consent → Entry
 * 
 * No excitement. No urgency.
 */

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface RegulatoryOnboardingProps {
  open: boolean;
  onComplete: () => void;
}

type Step = 1 | 2 | 3 | 4;

const scopeDoes = [
  "Models mortgage scenarios using standardized assumptions",
  "Surfaces long-term cost and structural tradeoffs",
  "Produces documentation suitable for professional review",
];

const scopeDoesNot = [
  "Recommend loans or lenders",
  "Optimize for approval or savings",
  "Provide financial, legal, or tax advice",
];

export function RegulatoryOnboarding({ open, onComplete }: RegulatoryOnboardingProps) {
  const [step, setStep] = useState<Step>(1);
  const [acknowledged, setAcknowledged] = useState(false);

  const handleNext = useCallback(() => {
    if (step < 4) {
      setStep((s) => (s + 1) as Step);
    }
  }, [step]);

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-lg p-0 gap-0 [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Progress indicator */}
        <div className="flex items-center gap-1 px-6 pt-6">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                s <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="px-6 py-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="font-serif text-xl font-medium tracking-[-0.01em]">
                  Independent mortgage analysis
                </h2>
                <p className="text-sm leading-relaxed text-foreground/70">
                  SettleRate provides structured analysis to help evaluate mortgage 
                  scenarios under consistent assumptions. It does not recommend 
                  products, providers, or strategies.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="font-serif text-xl font-medium tracking-[-0.01em]">
                  What SettleRate does—and does not do
                </h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">
                    SettleRate does
                  </p>
                  <ul className="space-y-2 text-sm text-foreground/70">
                    {scopeDoes.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/30" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">
                    SettleRate does not
                  </p>
                  <ul className="space-y-2 text-sm text-foreground/70">
                    {scopeDoesNot.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/30" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="font-serif text-xl font-medium tracking-[-0.01em]">
                  Interpretation and responsibility
                </h2>
                <p className="text-sm leading-relaxed text-foreground/70">
                  Outputs are illustrative and based on stated assumptions. 
                  Decisions and outcomes remain the responsibility of the user.
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-md border border-border bg-muted/30 p-4">
                <Checkbox
                  id="acknowledge"
                  checked={acknowledged}
                  onCheckedChange={(checked) => setAcknowledged(checked === true)}
                  className="mt-0.5"
                />
                <label 
                  htmlFor="acknowledge" 
                  className="text-sm leading-relaxed text-foreground/80 cursor-pointer"
                >
                  I understand SettleRate provides analytical modeling only.
                </label>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="font-serif text-xl font-medium tracking-[-0.01em]">
                  Create your first scenario
                </h2>
                <p className="text-sm leading-relaxed text-foreground/70">
                  Start by defining the structure you want to evaluate.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-border px-6 py-4">
          {step === 1 && (
            <Button onClick={handleNext} className="w-full">
              Continue
            </Button>
          )}

          {step === 2 && (
            <Button onClick={handleNext} className="w-full">
              Acknowledge and continue
            </Button>
          )}

          {step === 3 && (
            <Button 
              onClick={handleNext} 
              className="w-full"
              disabled={!acknowledged}
            >
              Begin analysis
            </Button>
          )}

          {step === 4 && (
            <Button onClick={handleComplete} className="w-full">
              Proceed to scenario setup
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
