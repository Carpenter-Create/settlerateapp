/**
 * HELOC Input Panel
 * 
 * Input form for Home Equity Line of Credit scenarios.
 * Institutional, restrained UI following the Mercury-leaning standard.
 */

import { useState, useCallback } from "react";
import { MortgageInputs } from "@/lib/mortgage";
import { HelocInputs, DEFAULT_HELOC_INPUTS } from "@/lib/heloc";
import { RateMeta, DEFAULT_RATE_META, isRateLocked } from "@/lib/rateMeta";
import { CurrencyInput } from "./CurrencyInput";
import { PercentInput } from "./PercentInput";
import { InputField } from "./InputField";
import { RateSourceSelector } from "./RateSourceSelector";
import { AdvisorRateLock } from "./AdvisorRateLock";
import { ChevronDown, ChevronUp, Info, Lock } from "lucide-react";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useAuth } from "@/contexts/AuthContext";

interface HelocInputsPanelProps {
  inputs: MortgageInputs;
  onBatchUpdate: (updates: Partial<MortgageInputs>) => void;
}

export function HelocInputsPanel({ inputs, onBatchUpdate }: HelocInputsPanelProps) {
  const heloc = inputs.heloc ?? DEFAULT_HELOC_INPUTS;
  const rateMeta = inputs.rateMeta ?? DEFAULT_RATE_META;
  const { isAdvisor } = useCapabilities();
  const { user } = useAuth();
  
  const [showAdvanced, setShowAdvanced] = useState(
    heloc.annualFee > 0 || heloc.closingCosts > 0 || heloc.monthlyDraw > 0
  );

  const isAprLocked = isRateLocked(rateMeta, "heloc.apr");

  const updateHeloc = useCallback((updates: Partial<HelocInputs>) => {
    onBatchUpdate({
      heloc: { ...heloc, ...updates },
    });
  }, [heloc, onBatchUpdate]);

  const updateRateMeta = useCallback((newRateMeta: RateMeta) => {
    onBatchUpdate({
      rateMeta: newRateMeta,
    });
  }, [onBatchUpdate]);

  const handleLockRate = useCallback((rateKey: "heloc.apr", lock: boolean) => {
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
    handleLockRate("heloc.apr", lock);
  }, [handleLockRate]);

  return (
    <div className="space-y-5">
      {/* Rate disclaimer */}
      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
        <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">
          Modeled using current APR. HELOC rates can change.
        </p>
      </div>

      {/* Primary HELOC inputs */}
      <div className="grid gap-5 md:grid-cols-2">
        <InputField 
          label="Credit limit" 
          description="Maximum available credit"
        >
          <CurrencyInput
            value={heloc.creditLimit}
            onChange={(v) => updateHeloc({ creditLimit: v })}
            min={0}
          />
        </InputField>

        <InputField 
          label="Current balance" 
          description="Outstanding balance at start of analysis"
        >
          <CurrencyInput
            value={heloc.currentBalance}
            onChange={(v) => updateHeloc({ currentBalance: v })}
            min={0}
          />
        </InputField>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <InputField 
            label={
              <span className="flex items-center gap-1.5">
                APR (assumed)
                {isAprLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
              </span>
            }
            description="Current annual percentage rate"
          >
            <PercentInput
              value={heloc.apr}
              onChange={(v) => updateHeloc({ apr: v })}
              min={0}
              max={25}
              step={0.125}
              disabled={isAprLocked}
            />
          </InputField>
          <RateSourceSelector
            rateSourceType="user_entered"
            rateSourceNote={null}
            onUpdate={() => {}}
            rateKey="heloc.apr"
            rateMeta={rateMeta}
            onUpdateRateMeta={updateRateMeta}
            isLocked={isAprLocked}
          />
        </div>
      </div>

      {/* Advisor rate lock controls */}
      {isAdvisor && (
        <AdvisorRateLock
          rateMeta={rateMeta}
          rateKeys={["heloc.apr"]}
          onLockRate={handleLockRate}
          onLockAll={handleLockAll}
        />
      )}

      {/* Term inputs */}
      <div className="grid gap-5 md:grid-cols-2">
        <InputField 
          label="Draw period" 
          description="Years you can draw funds"
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={Math.round(heloc.drawMonths / 12)}
              onChange={(e) => updateHeloc({ 
                drawMonths: Math.max(1, parseInt(e.target.value) || 0) * 12,
                drawMonthsUsed: Math.min(heloc.drawMonthsUsed, parseInt(e.target.value) * 12 || 120)
              })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              min={1}
              max={30}
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">years</span>
          </div>
        </InputField>

        <InputField 
          label="Repayment period" 
          description="Years to repay after draw ends"
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={Math.round(heloc.repayMonths / 12)}
              onChange={(e) => updateHeloc({ 
                repayMonths: Math.max(1, parseInt(e.target.value) || 0) * 12 
              })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              min={1}
              max={30}
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">years</span>
          </div>
        </InputField>
      </div>

      {/* Advanced options toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex w-full items-center justify-between py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <span>Draws & fees</span>
        {showAdvanced ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {showAdvanced && (
        <div className="space-y-5 animate-slide-up">
          <div className="grid gap-5 md:grid-cols-2">
            <InputField 
              label="Monthly draw amount" 
              description="Amount to draw each month during draw period"
              optional
            >
              <CurrencyInput
                value={heloc.monthlyDraw}
                onChange={(v) => updateHeloc({ monthlyDraw: v })}
                min={0}
              />
            </InputField>

            <InputField 
              label="Draw period used" 
              description="Months you plan to draw funds"
              optional
            >
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={heloc.drawMonthsUsed}
                  onChange={(e) => updateHeloc({ 
                    drawMonthsUsed: Math.min(
                      Math.max(0, parseInt(e.target.value) || 0),
                      heloc.drawMonths
                    )
                  })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  min={0}
                  max={heloc.drawMonths}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">months</span>
              </div>
            </InputField>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <InputField 
              label="Annual fee" 
              description="Yearly fee for maintaining the line"
              optional
            >
              <CurrencyInput
                value={heloc.annualFee}
                onChange={(v) => updateHeloc({ annualFee: v })}
                min={0}
              />
            </InputField>

            <InputField 
              label="Closing costs" 
              description="One-time setup fees"
              optional
            >
              <CurrencyInput
                value={heloc.closingCosts}
                onChange={(v) => updateHeloc({ closingCosts: v })}
                min={0}
              />
            </InputField>
          </div>
        </div>
      )}
    </div>
  );
}
