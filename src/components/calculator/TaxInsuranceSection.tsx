import { useState, useCallback } from "react";
import { MortgageInputs, SharedInputs } from "@/lib/mortgage";
import { getZipEstimate, isValidZipCode } from "@/lib/zipEstimates";
import { CurrencyInput } from "./CurrencyInput";
import { PercentInput } from "./PercentInput";
import { InputField } from "./InputField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Info, Pencil, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TaxInsuranceSectionProps {
  inputs: MortgageInputs;
  ltvRatio: number;
  onBatchUpdate: (updates: Partial<MortgageInputs>) => void;
}

/**
 * TaxInsuranceSection - Single source of truth for taxes & insurance inputs
 * 
 * Mode-based rendering:
 * - 'estimated': ZIP input + auto-filled values (read-only display with Edit link)
 * - 'manual': Direct editable fields
 * 
 * IMPORTANT: This component renders ONCE in ScenarioEditor. 
 * The GuidedStart wizard has its own ZIP input for initial setup,
 * which pre-populates these same canonical fields.
 */
export function TaxInsuranceSection({
  inputs,
  ltvRatio,
  onBatchUpdate,
}: TaxInsuranceSectionProps) {
  const shared = inputs.shared;
  const [isExpanded, setIsExpanded] = useState(shared.includeEstimates);
  const [zipInput, setZipInput] = useState(shared.zipCode ?? "");

  const requiresPMI = ltvRatio > 80;

  // Determine current mode based on state
  const isEstimateMode = shared.usedZipEstimate && shared.zipCode;

  const updateShared = (updates: Partial<SharedInputs>) => {
    onBatchUpdate({
      shared: { ...shared, ...updates },
    });
  };

  const handleToggleEstimates = useCallback((checked: boolean) => {
    setIsExpanded(checked);
    
    // If turning on and no values set, apply national defaults
    if (checked && shared.propertyTaxRate === null) {
      const defaults = getZipEstimate();
      updateShared({
        includeEstimates: true,
        propertyTaxRate: defaults.propertyTaxRate,
        homeInsuranceMonthly: defaults.homeInsuranceMonthly,
        pmiMonthly: requiresPMI ? defaults.pmiMonthly : 0,
        hoaMonthly: 0,
      });
    } else {
      updateShared({ includeEstimates: checked });
    }
  }, [shared, requiresPMI]);

  const handleApplyZipEstimate = useCallback(() => {
    if (!zipInput) {
      toast.error("Please enter a ZIP code");
      return;
    }

    if (!isValidZipCode(zipInput)) {
      toast.error("Please enter a valid 5-digit ZIP code");
      return;
    }

    const estimate = getZipEstimate(zipInput);
    
    updateShared({
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
      description: `${stateMsg} Values are editable.`,
    });
  }, [zipInput, shared, requiresPMI]);

  const handleSwitchToManual = useCallback(() => {
    // Switch to manual mode - keep values but clear the estimate flag
    updateShared({ usedZipEstimate: false });
  }, [shared]);

  const handleSwitchToEstimate = useCallback(() => {
    // Switch back to estimate mode - reapply ZIP estimate if available
    if (shared.zipCode && isValidZipCode(shared.zipCode)) {
      const estimate = getZipEstimate(shared.zipCode);
      updateShared({
        usedZipEstimate: true,
        propertyTaxRate: estimate.propertyTaxRate,
        propertyTaxMode: "rate",
        homeInsuranceMonthly: estimate.homeInsuranceMonthly,
        pmiMonthly: requiresPMI ? estimate.pmiMonthly : 0,
      });
      toast.success("Estimates restored");
    }
  }, [shared, requiresPMI]);

  const handlePropertyTaxModeChange = useCallback((mode: "rate" | "annual") => {
    if (mode === "rate") {
      updateShared({ propertyTaxMode: mode, propertyTaxAnnual: null });
    } else {
      updateShared({ propertyTaxMode: mode, propertyTaxRate: null });
    }
  }, [shared]);

  // Calculate display values
  const displayPropertyTax = shared.propertyTaxMode === "rate" 
    ? shared.propertyTaxRate 
    : shared.propertyTaxAnnual;
  const displayInsurance = shared.homeInsuranceMonthly;

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
            <span>Estimated taxes & insurance</span>
            <span className="text-muted-foreground font-normal">(optional)</span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <p className="text-xs text-muted-foreground">
            Adds taxes, insurance, and other costs to monthly projection.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            id="include-estimates"
            checked={shared.includeEstimates}
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
          {/* Mode: Estimated (ZIP-based) */}
          {isEstimateMode ? (
            <div className="space-y-4">
              {/* Estimate Summary Row */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-normal shrink-0">
                        ZIP {shared.zipCode}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Regional estimates
                      </span>
                    </div>
                    <div className="grid gap-1.5 text-sm">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-muted-foreground">Property tax</span>
                        <span className="font-mono tabular-nums">
                          {shared.propertyTaxMode === "rate" 
                            ? `${(shared.propertyTaxRate ?? 0).toFixed(2)}%` 
                            : `$${(shared.propertyTaxAnnual ?? 0).toLocaleString()}/yr`}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-muted-foreground">Home insurance</span>
                        <span className="font-mono tabular-nums">
                          ${(shared.homeInsuranceMonthly ?? 0).toLocaleString()}/mo
                        </span>
                      </div>
                      {shared.hoaMonthly !== null && shared.hoaMonthly > 0 && (
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-muted-foreground">HOA</span>
                          <span className="font-mono tabular-nums">
                            ${shared.hoaMonthly.toLocaleString()}/mo
                          </span>
                        </div>
                      )}
                      {requiresPMI && shared.pmiMonthly !== null && shared.pmiMonthly > 0 && (
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-muted-foreground">PMI</span>
                          <span className="font-mono tabular-nums">
                            ${shared.pmiMonthly.toLocaleString()}/mo
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSwitchToManual}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                </div>
              </div>
              
              {/* HOA - always editable even in estimate mode */}
              <InputField label="HOA dues" description="Monthly assessment" optional>
                <CurrencyInput
                  value={shared.hoaMonthly ?? 0}
                  onChange={(v) => updateShared({ hoaMonthly: v })}
                  min={0}
                />
              </InputField>
            </div>
          ) : (
            /* Mode: Manual Entry */
            <div className="space-y-5">
              {/* ZIP Estimate Helper - only show if no ZIP applied yet */}
              {!shared.zipCode && (
                <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Enter ZIP for regional estimates, or enter values manually below.
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
                      onClick={handleApplyZipEstimate}
                      className="w-full sm:w-auto"
                    >
                      Apply estimate
                    </Button>
                  </div>
                </div>
              )}

              {/* Restore estimate option - show if user switched from estimate to manual */}
              {shared.zipCode && !shared.usedZipEstimate && (
                <button
                  type="button"
                  onClick={handleSwitchToEstimate}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Undo2 className="h-3 w-3" />
                  Restore ZIP {shared.zipCode} estimates
                </button>
              )}

              {/* Property Tax */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Property tax</Label>
                  <div className="flex rounded-md border border-border bg-background p-0.5">
                    <button
                      type="button"
                      onClick={() => handlePropertyTaxModeChange("rate")}
                      className={cn(
                        "px-3 py-1 text-xs font-medium rounded transition-colors",
                        shared.propertyTaxMode === "rate"
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
                        shared.propertyTaxMode === "annual"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Annual $
                    </button>
                  </div>
                </div>
                {shared.propertyTaxMode === "rate" ? (
                  <PercentInput
                    value={shared.propertyTaxRate ?? 0}
                    onChange={(v) => updateShared({ propertyTaxRate: v })}
                    min={0}
                    max={10}
                    step={0.01}
                  />
                ) : (
                  <CurrencyInput
                    value={shared.propertyTaxAnnual ?? 0}
                    onChange={(v) => updateShared({ propertyTaxAnnual: v })}
                    min={0}
                  />
                )}
              </div>

              {/* Home Insurance */}
              <InputField label="Home insurance" description="Monthly premium">
                <CurrencyInput
                  value={shared.homeInsuranceMonthly ?? 0}
                  onChange={(v) => updateShared({ homeInsuranceMonthly: v })}
                  min={0}
                />
              </InputField>

              {/* HOA */}
              <InputField label="HOA dues" description="Monthly assessment" optional>
                <CurrencyInput
                  value={shared.hoaMonthly ?? 0}
                  onChange={(v) => updateShared({ hoaMonthly: v })}
                  min={0}
                />
              </InputField>

              {/* PMI - only show if LTV > 80% */}
              {requiresPMI && (
                <InputField label="PMI" description="Monthly mortgage insurance premium">
                  <CurrencyInput
                    value={shared.pmiMonthly ?? 0}
                    onChange={(v) => updateShared({ pmiMonthly: v })}
                    min={0}
                  />
                </InputField>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
