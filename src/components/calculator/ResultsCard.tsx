import { MortgageResults, calculateAnnualSnapshot } from "@/lib/mortgage";
import { formatCurrency, formatCurrencyPrecise, formatDate, formatPercent } from "@/lib/mortgage";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface ResultsCardProps {
  results: MortgageResults;
  className?: string;
}

interface ResultRowProps {
  label: string;
  value: string;
  primary?: boolean;
  isEstimate?: boolean;
}

function ResultRow({ label, value, primary, isEstimate }: ResultRowProps) {
  return (
    <div className="flex items-baseline justify-between py-1.5 gap-4">
      <span className="text-sm text-muted-foreground">
        {label}
        {isEstimate && (
          <span className="ml-1.5 text-xs text-muted-foreground/70">est.</span>
        )}
      </span>
      <span className={cn(
        "font-mono tabular-nums text-right",
        primary ? "text-base font-medium text-foreground" : "text-sm text-foreground"
      )}>
        {value}
      </span>
    </div>
  );
}

export function ResultsCard({ results, className }: ResultsCardProps) {
  const {
    loanAmount,
    monthlyTotal,
    monthlyPrincipalInterest,
    monthlyPropertyTax,
    monthlyHomeInsurance,
    monthlyPMI,
    monthlyHOA,
    totalInterest,
    totalCost,
    payoffDate,
    payoffMonths,
    ltvRatio,
    requiresPMI,
    usedEstimates,
    mode,
    cashOutAmount,
    closingCostsIncluded,
  } = results;

  // Calculate Year 1 annual snapshot
  const annualSnapshot = useMemo(() => calculateAnnualSnapshot(results), [results]);

  const hasAdditionalCosts = monthlyPropertyTax > 0 || monthlyHomeInsurance > 0 || monthlyPMI > 0 || monthlyHOA > 0;
  const isRefinance = mode === "refinance";

  return (
    <div className={cn("space-y-6", className)}>
      {/* Primary outcome - number first, label second */}
      <div className="py-4">
        <p className="currency-display mb-1">{formatCurrency(monthlyTotal)}</p>
        <p className="text-sm text-muted-foreground">
          Total Monthly Payment
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {isRefinance ? "Your full estimated new housing cost" : "Your full estimated housing cost"}
        </p>
      </div>

      <div className="divider-subtle" />

      {/* Payment breakdown - table-like */}
      <div>
        <p className="section-label mb-1">Payment Breakdown</p>
        <p className="text-xs text-muted-foreground/70 mb-3">See details</p>
        <div className="space-y-0">
          <ResultRow 
            label="Principal & Interest" 
            value={formatCurrencyPrecise(monthlyPrincipalInterest)} 
          />
          {monthlyPropertyTax > 0 && (
            <ResultRow 
              label="Property Tax" 
              value={formatCurrencyPrecise(monthlyPropertyTax)}
              isEstimate={usedEstimates}
            />
          )}
          {monthlyHomeInsurance > 0 && (
            <ResultRow 
              label="Home Insurance" 
              value={formatCurrencyPrecise(monthlyHomeInsurance)}
              isEstimate={usedEstimates}
            />
          )}
          {requiresPMI && monthlyPMI > 0 && (
            <ResultRow 
              label="PMI" 
              value={formatCurrencyPrecise(monthlyPMI)}
              isEstimate={usedEstimates}
            />
          )}
          {monthlyHOA > 0 && (
            <ResultRow label="HOA" value={formatCurrencyPrecise(monthlyHOA)} />
          )}
          <div className="pt-2 mt-2 border-t border-border">
            <ResultRow label="Total Monthly Payment" value={formatCurrencyPrecise(monthlyTotal)} primary />
          </div>
        </div>
        <p className="text-xs text-muted-foreground/70 mt-3">
          This includes loan payment, taxes, insurance, and HOA if applicable.
        </p>
      </div>

      <div className="divider-subtle" />

      {/* Loan summary */}
      <div>
        <p className="section-label mb-1">
          Assumptions
        </p>
        <p className="text-xs text-muted-foreground/70 mb-3">What this is based on</p>
        <div className="space-y-0">
          <ResultRow 
            label={isRefinance ? "New loan amount" : "Loan amount"} 
            value={formatCurrency(loanAmount)} 
          />
          {isRefinance && cashOutAmount !== undefined && cashOutAmount > 0 && (
            <ResultRow label="Cash out" value={formatCurrency(cashOutAmount)} />
          )}
          {isRefinance && closingCostsIncluded !== undefined && closingCostsIncluded > 0 && (
            <ResultRow label="Financed closing costs" value={formatCurrency(closingCostsIncluded)} />
          )}
          <ResultRow label="Loan-to-value ratio" value={formatPercent(ltvRatio)} />
          <ResultRow label="Total interest (projected)" value={formatCurrency(totalInterest)} />
          <ResultRow label="Total cost (projected)" value={formatCurrency(totalCost)} primary />
        </div>
        <p className="text-xs text-muted-foreground/70 mt-3">
          Changing any assumption will change the results.
        </p>
      </div>

      <div className="divider-subtle" />

      {/* Timeline */}
      <div>
        <p className="section-label mb-3">Projected timeline</p>
        <div className="space-y-0">
          <ResultRow 
            label="Estimated payoff date" 
            value={formatDate(payoffDate)} 
          />
          <ResultRow 
            label="Term length (months)" 
            value={`${payoffMonths}`} 
          />
        </div>
      </div>

      <div className="divider-subtle" />

      {/* Annual perspective (Year 1) - secondary, contextual */}
      <div>
        <p className="section-label mb-3">Year 1 allocation (projected)</p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          In the first year, approximately {formatCurrency(annualSnapshot.annualPayments)} is allocated to this obligation. 
          Of that, {formatCurrency(annualSnapshot.annualInterest)} is interest and {formatCurrency(annualSnapshot.annualPrincipalReduction)} reduces principal.
        </p>
        <div className="space-y-0">
          <ResultRow label="Annual payments" value={formatCurrency(annualSnapshot.annualPayments)} />
          <ResultRow label="Annual interest" value={formatCurrency(annualSnapshot.annualInterest)} />
          <ResultRow label="Principal reduction" value={formatCurrency(annualSnapshot.annualPrincipalReduction)} />
        </div>
      </div>

      {/* Notes - understated */}
      {(requiresPMI || usedEstimates) && (
        <>
          <div className="divider-subtle" />
          <div className="space-y-2 text-xs text-muted-foreground">
            {requiresPMI && (
              <p>
                PMI {isRefinance ? "may be " : "is "}applicable when {isRefinance 
                  ? "loan-to-value ratio exceeds 80%."
                  : "down payment is less than 20%."}
              </p>
            )}
            {usedEstimates && (
              <p>
                Estimates are based on ZIP-level averages for taxes and insurance.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
