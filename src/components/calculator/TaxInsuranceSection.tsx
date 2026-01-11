import { useState, useCallback } from "react";
import { MortgageInputs } from "@/lib/mortgage";
import { getZipEstimate, isValidZipCode } from "@/lib/zipEstimates";
import { CurrencyInput } from "./CurrencyInput";
import { PercentInput } from "./PercentInput";
import { InputField } from "./InputField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Sparkles, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TaxInsuranceSectionProps {
  inputs: MortgageInputs;
  ltvRatio: number;
  onUpdate: <K extends keyof MortgageInputs>(key: K, value: MortgageInputs[K]) => void;
  onBatchUpdate: (updates: Partial<MortgageInputs>) => void;
}

export function TaxInsuranceSection({
  inputs,
  ltvRatio,
  onUpdate,
  onBatchUpdate,
}: TaxInsuranceSectionProps) {
  const [isExpanded, setIsExpanded] = useState(inputs.includeEstimates);
  const [zipInput, setZipInput] = useState(inputs.zipCode ?? "");

  const requiresPMI = ltvRatio > 80;

  const handleToggleEstimates = useCallback((checked: boolean) => {
    onUpdate("includeEstimates", checked);
    setIsExpanded(checked);
    
    // If turning on and no values set, apply national defaults
    if (checked && inputs.propertyTaxRate === null) {
      const defaults = getZipEstimate();
      onBatchUpdate({
        includeEstimates: true,
        propertyTaxRate: defaults.propertyTaxRate,
        homeInsuranceMonthly: defaults.homeInsuranceMonthly,
        pmiMonthly: requiresPMI ? defaults.pmiMonthly : 0,
        hoaMonthly: 0,
      });
    }
  }, [inputs.propertyTaxRate, onUpdate, onBatchUpdate, requiresPMI]);

  const handleUseZipEstimate = useCallback(() => {
    if (!zipInput) {
      toast.error("Please enter a ZIP code");
      return;
    }

    if (!isValidZipCode(zipInput)) {
      toast.error("Please enter a valid 5-digit ZIP code");
      return;
    }

    const estimate = getZipEstimate(zipInput);
    
    onBatchUpdate({
      zipCode: zipInput,
      usedZipEstimate: true,
      includeEstimates: true,
      propertyTaxRate: estimate.propertyTaxRate,
      propertyTaxMode: "rate",
      homeInsuranceMonthly: estimate.homeInsuranceMonthly,
      pmiMonthly: requiresPMI ? estimate.pmiMonthly : 0,
    });

    setIsExpanded(true);

    const stateMsg = estimate.state 
      ? `Based on ${estimate.state} averages.` 
      : "Using national averages.";
    
    toast.success("Estimates applied", {
      description: `${stateMsg} You can adjust these anytime.`,
    });
  }, [zipInput, onBatchUpdate, requiresPMI]);

  const handlePropertyTaxModeChange = useCallback((mode: "rate" | "annual") => {
    onUpdate("propertyTaxMode", mode);
    // Clear the other value when switching
    if (mode === "rate") {
      onUpdate("propertyTaxAnnual", null);
    } else {
      onUpdate("propertyTaxRate", null);
    }
  }, [onUpdate]);

  const handleClearEstimates = useCallback(() => {
    onUpdate("usedZipEstimate", false);
  }, [onUpdate]);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
          >
            <span>Taxes & insurance</span>
            <span className="text-muted-foreground font-normal">(optional)</span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <p className="text-xs text-muted-foreground">
            Add estimates to see a more realistic monthly total.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            id="include-estimates"
            checked={inputs.includeEstimates}
            onCheckedChange={handleToggleEstimates}
          />
          <Label htmlFor="include-estimates" className="text-sm text-muted-foreground cursor-pointer">
            Include
          </Label>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="space-y-5 animate-slide-up">
          {/* ZIP Estimate Helper */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                We'll prefill a starting estimate. You can edit anytime.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="ZIP code"
                value={zipInput}
                onChange={(e) => setZipInput(e.target.value.replace(/\D/g, "").slice(0, 5))}
                className="w-full sm:w-32"
                maxLength={5}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleUseZipEstimate}
                className="gap-2 w-full sm:w-auto"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Use ZIP estimate
              </Button>
            </div>
          </div>

          {/* Estimate Badge Notice */}
          {inputs.usedZipEstimate && (
            <div className="flex items-center justify-between gap-2 rounded-md bg-accent/50 px-3 py-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs font-normal">
                  Estimate
                </Badge>
                <span className="text-xs text-accent-foreground">
                  Using ZIP-level averages. Update when you have exact numbers.
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearEstimates}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {/* Property Tax */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-2">
                Property tax
                {inputs.usedZipEstimate && (
                  <Badge variant="outline" className="text-[10px] font-normal">
                    Est
                  </Badge>
                )}
              </Label>
              <div className="flex rounded-md border border-border bg-background p-0.5">
                <button
                  type="button"
                  onClick={() => handlePropertyTaxModeChange("rate")}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded transition-colors",
                    inputs.propertyTaxMode === "rate"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  % of value
                </button>
                <button
                  type="button"
                  onClick={() => handlePropertyTaxModeChange("annual")}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded transition-colors",
                    inputs.propertyTaxMode === "annual"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Annual $
                </button>
              </div>
            </div>
            {inputs.propertyTaxMode === "rate" ? (
              <PercentInput
                value={inputs.propertyTaxRate ?? 0}
                onChange={(v) => onUpdate("propertyTaxRate", v)}
                min={0}
                max={10}
                step={0.01}
              />
            ) : (
              <CurrencyInput
                value={inputs.propertyTaxAnnual ?? 0}
                onChange={(v) => onUpdate("propertyTaxAnnual", v)}
                min={0}
              />
            )}
          </div>

          {/* Home Insurance */}
          <InputField
            label={
              <span className="flex items-center gap-2">
                Home insurance
                {inputs.usedZipEstimate && (
                  <Badge variant="outline" className="text-[10px] font-normal">
                    Est
                  </Badge>
                )}
              </span>
            }
            description="Monthly amount"
          >
            <CurrencyInput
              value={inputs.homeInsuranceMonthly ?? 0}
              onChange={(v) => onUpdate("homeInsuranceMonthly", v)}
              min={0}
            />
          </InputField>

          {/* HOA */}
          <InputField label="HOA" description="Monthly amount" optional>
            <CurrencyInput
              value={inputs.hoaMonthly ?? 0}
              onChange={(v) => onUpdate("hoaMonthly", v)}
              min={0}
            />
          </InputField>

          {/* PMI - only show if LTV > 80% */}
          {requiresPMI && (
            <InputField
              label={
                <span className="flex items-center gap-2">
                  PMI
                  {inputs.usedZipEstimate && (
                    <Badge variant="outline" className="text-[10px] font-normal">
                      Est
                    </Badge>
                  )}
                </span>
              }
              description="Monthly private mortgage insurance"
            >
              <CurrencyInput
                value={inputs.pmiMonthly ?? 0}
                onChange={(v) => onUpdate("pmiMonthly", v)}
                min={0}
              />
            </InputField>
          )}
        </div>
      )}
    </div>
  );
}
