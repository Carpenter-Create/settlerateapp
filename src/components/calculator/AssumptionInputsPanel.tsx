/**
 * Loan Assumption Input Panel
 * 
 * Input form for Loan Assumption scenarios.
 * Institutional, restrained UI following the Mercury-leaning standard.
 */

import { useState, useCallback } from "react";
import { MortgageInputs } from "@/lib/mortgage";
import { 
  AssumptionInputs, 
  AssumedLoanInputs, 
  GapLoanInputs, 
  GapMethod,
  DEFAULT_ASSUMPTION_INPUTS,
  DEFAULT_ASSUMED_LOAN_INPUTS,
  DEFAULT_GAP_INPUTS
} from "@/lib/assumption";
import { RateMeta, DEFAULT_RATE_META, isRateLocked, RateKey } from "@/lib/rateMeta";
import { CurrencyInput } from "./CurrencyInput";
import { PercentInput } from "./PercentInput";
import { InputField } from "./InputField";
import { RateSourceSelector } from "./RateSourceSelector";
import { AdvisorRateLock } from "./AdvisorRateLock";
import { ChevronDown, ChevronUp, Info, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useAuth } from "@/contexts/AuthContext";

interface AssumptionInputsPanelProps {
  inputs: MortgageInputs;
  onBatchUpdate: (updates: Partial<MortgageInputs>) => void;
}

const GAP_METHOD_LABELS: Record<GapMethod, { label: string; description: string }> = {
  cash: { label: "Cash", description: "Pay the gap in cash" },
  second_loan: { label: "Second loan", description: "Finance with a new mortgage" },
  heloc: { label: "HELOC", description: "Home equity line of credit" },
};

export function AssumptionInputsPanel({ inputs, onBatchUpdate }: AssumptionInputsPanelProps) {
  const assumption = inputs.assumption ?? DEFAULT_ASSUMPTION_INPUTS;
  const assumed = assumption.assumed ?? DEFAULT_ASSUMED_LOAN_INPUTS;
  const gap = assumption.gap ?? DEFAULT_GAP_INPUTS;
  const rateMeta = inputs.rateMeta ?? DEFAULT_RATE_META;
  const { isAdvisor } = useCapabilities();
  const { user } = useAuth();
  
  const [showEscrow, setShowEscrow] = useState(
    assumed.monthlyPmi > 0 || assumed.monthlyEscrow > 0
  );

  // Check lock status for each rate
  const isAssumedAprLocked = isRateLocked(rateMeta, "assumption.assumed_apr");
  const isGapSecondAprLocked = isRateLocked(rateMeta, "assumption.gap_second_apr");
  const isGapHelocAprLocked = isRateLocked(rateMeta, "assumption.gap_heloc_apr");

  // Determine which rate keys are relevant based on gap method
  const getRelevantRateKeys = useCallback((): RateKey[] => {
    const keys: RateKey[] = ["assumption.assumed_apr"];
    if (gap.method === "second_loan") {
      keys.push("assumption.gap_second_apr");
    } else if (gap.method === "heloc") {
      keys.push("assumption.gap_heloc_apr");
    }
    return keys;
  }, [gap.method]);

  const updateAssumption = useCallback((updates: Partial<AssumptionInputs>) => {
    onBatchUpdate({
      assumption: { ...assumption, ...updates },
    });
  }, [assumption, onBatchUpdate]);

  const updateAssumed = useCallback((updates: Partial<AssumedLoanInputs>) => {
    updateAssumption({
      assumed: { ...assumed, ...updates },
    });
  }, [assumed, updateAssumption]);

  const updateGap = useCallback((updates: Partial<GapLoanInputs>) => {
    updateAssumption({
      gap: { ...gap, ...updates },
    });
  }, [gap, updateAssumption]);

  const updateRateMeta = useCallback((newRateMeta: RateMeta) => {
    onBatchUpdate({
      rateMeta: newRateMeta,
    });
  }, [onBatchUpdate]);

  const handleLockRate = useCallback((rateKey: RateKey, lock: boolean) => {
    if (!user?.id) return;
    
    const current = rateMeta.components[rateKey] ?? { 
      sourceType: "user_entered", 
      sourceNote: null, 
      locked: false, 
      lockedBy: null, 
      lockedAt: null 
    };
    
    updateRateMeta({
      ...rateMeta,
      components: {
        ...rateMeta.components,
        [rateKey]: {
          ...current,
          locked: lock,
          lockedBy: lock ? user.id : null,
          lockedAt: lock ? new Date().toISOString() : null,
        },
      },
    });
  }, [rateMeta, updateRateMeta, user?.id]);

  const handleLockAll = useCallback((lock: boolean) => {
    const keys = getRelevantRateKeys();
    keys.forEach(key => handleLockRate(key, lock));
  }, [getRelevantRateKeys, handleLockRate]);

  // Calculate gap amount for display
  const gapAmount = Math.max(0, assumption.purchasePrice - assumed.balance - assumption.downPaymentCash);

  return (
    <div className="space-y-5">
      {/* Explainer */}
      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
        <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Assumption</strong> = taking over an existing loan's rate and remaining term.</p>
          <p><strong>Gap</strong> = the amount not covered by the assumed loan.</p>
        </div>
      </div>

      {/* Transaction details */}
      <div className="grid gap-5 md:grid-cols-2">
        <InputField 
          label="Purchase price" 
          description="Transaction amount"
        >
          <CurrencyInput
            value={assumption.purchasePrice}
            onChange={(v) => updateAssumption({ purchasePrice: v })}
            min={0}
          />
        </InputField>

        <InputField 
          label="Cash from buyer" 
          description="Down payment cash you'll provide"
        >
          <CurrencyInput
            value={assumption.downPaymentCash}
            onChange={(v) => updateAssumption({ downPaymentCash: v })}
            min={0}
          />
        </InputField>
      </div>

      <div className="divider-subtle" />

      {/* Assumed loan section */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium">Assumed loan</h3>
        <p className="text-xs text-muted-foreground">Details of the existing loan you're taking over</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <InputField 
          label="Remaining balance" 
          description="Current principal balance"
        >
          <CurrencyInput
            value={assumed.balance}
            onChange={(v) => updateAssumed({ balance: v })}
            min={0}
          />
        </InputField>

        <div className="space-y-3">
          <InputField 
            label={
              <span className="flex items-center gap-1.5">
                Interest rate (assumed)
                {isAssumedAprLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
              </span>
            }
            description="Rate on assumed loan"
          >
            <PercentInput
              value={assumed.apr}
              onChange={(v) => updateAssumed({ apr: v })}
              min={0}
              max={15}
              step={0.125}
              disabled={isAssumedAprLocked}
            />
          </InputField>
          <RateSourceSelector
            rateSourceType="user_entered"
            rateSourceNote={null}
            onUpdate={() => {}}
            rateKey="assumption.assumed_apr"
            rateMeta={rateMeta}
            onUpdateRateMeta={updateRateMeta}
            isLocked={isAssumedAprLocked}
          />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <InputField 
          label="Remaining term" 
          description="Years left on the loan"
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={Math.round(assumed.remainingMonths / 12)}
              onChange={(e) => updateAssumed({ 
                remainingMonths: Math.max(1, parseInt(e.target.value) || 0) * 12 
              })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              min={1}
              max={40}
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">years</span>
          </div>
        </InputField>

        <InputField 
          label="Assumption fees" 
          description="Fees to assume the loan"
          optional
        >
          <CurrencyInput
            value={assumption.assumptionFees}
            onChange={(v) => updateAssumption({ assumptionFees: v })}
            min={0}
          />
        </InputField>
      </div>

      {/* Escrow/PMI toggle */}
      <button
        type="button"
        onClick={() => setShowEscrow(!showEscrow)}
        className="flex w-full items-center justify-between py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <span>PMI & escrow</span>
        {showEscrow ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {showEscrow && (
        <div className="grid gap-5 md:grid-cols-2 animate-slide-up">
          <InputField 
            label="Monthly PMI" 
            description="If applicable"
            optional
          >
            <CurrencyInput
              value={assumed.monthlyPmi}
              onChange={(v) => updateAssumed({ monthlyPmi: v })}
              min={0}
            />
          </InputField>

          <InputField 
            label="Monthly escrow" 
            description="Taxes & insurance"
            optional
          >
            <CurrencyInput
              value={assumed.monthlyEscrow}
              onChange={(v) => updateAssumed({ monthlyEscrow: v })}
              min={0}
            />
          </InputField>
        </div>
      )}

      <div className="divider-subtle" />

      {/* Gap financing section */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Gap financing</h3>
          {gapAmount > 0 && (
            <span className="text-sm font-medium tabular-nums">
              ${gapAmount.toLocaleString()} needed
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">How you'll cover the difference</p>
      </div>

      {/* Gap method selector */}
      <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-background p-1">
        {(Object.keys(GAP_METHOD_LABELS) as GapMethod[]).map((method) => {
          const isSelected = gap.method === method;
          return (
            <button
              key={method}
              type="button"
              onClick={() => updateGap({ method })}
              title={GAP_METHOD_LABELS[method].description}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-all",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {GAP_METHOD_LABELS[method].label}
            </button>
          );
        })}
      </div>

      {/* Gap financing inputs based on method */}
      {gap.method === "second_loan" && (
        <div className="grid gap-5 md:grid-cols-2 animate-slide-up">
          <div className="space-y-3">
            <InputField 
              label={
                <span className="flex items-center gap-1.5">
                  Second loan APR (assumed)
                  {isGapSecondAprLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                </span>
              }
              description="Rate for the gap loan"
            >
              <PercentInput
                value={gap.loanApr}
                onChange={(v) => updateGap({ loanApr: v })}
                min={0}
                max={20}
                step={0.125}
                disabled={isGapSecondAprLocked}
              />
            </InputField>
            <RateSourceSelector
              rateSourceType="user_entered"
              rateSourceNote={null}
              onUpdate={() => {}}
              rateKey="assumption.gap_second_apr"
              rateMeta={rateMeta}
              onUpdateRateMeta={updateRateMeta}
              isLocked={isGapSecondAprLocked}
            />
          </div>

          <InputField 
            label="Second loan term" 
            description="Years for the gap loan"
          >
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={Math.round(gap.loanTermMonths / 12)}
                onChange={(e) => updateGap({ 
                  loanTermMonths: Math.max(1, parseInt(e.target.value) || 0) * 12 
                })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                min={1}
                max={30}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">years</span>
            </div>
          </InputField>
        </div>
      )}

      {gap.method === "heloc" && (
        <div className="grid gap-5 md:grid-cols-2 animate-slide-up">
          <div className="space-y-3">
            <InputField 
              label={
                <span className="flex items-center gap-1.5">
                  HELOC APR (assumed)
                  {isGapHelocAprLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                </span>
              }
              description="Rate for the HELOC"
            >
              <PercentInput
                value={gap.helocApr}
                onChange={(v) => updateGap({ helocApr: v })}
                min={0}
                max={20}
                step={0.125}
                disabled={isGapHelocAprLocked}
              />
            </InputField>
            <RateSourceSelector
              rateSourceType="user_entered"
              rateSourceNote={null}
              onUpdate={() => {}}
              rateKey="assumption.gap_heloc_apr"
              rateMeta={rateMeta}
              onUpdateRateMeta={updateRateMeta}
              isLocked={isGapHelocAprLocked}
            />
          </div>

          <InputField 
            label="Repayment period" 
            description="Modeled repayment term"
          >
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={Math.round(gap.helocRepayMonths / 12)}
                onChange={(e) => updateGap({ 
                  helocRepayMonths: Math.max(1, parseInt(e.target.value) || 0) * 12 
                })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                min={1}
                max={30}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">years</span>
            </div>
          </InputField>
        </div>
      )}

      {/* Advisor rate lock controls */}
      {isAdvisor && (
        <AdvisorRateLock
          rateMeta={rateMeta}
          rateKeys={getRelevantRateKeys()}
          onLockRate={handleLockRate}
          onLockAll={handleLockAll}
        />
      )}
    </div>
  );
}
