import { MortgageResults } from "@/lib/mortgage";
import { formatCurrency, formatCurrencyPrecise, formatDate, formatPercent } from "@/lib/mortgage";
import { cn } from "@/lib/utils";

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

  const hasAdditionalCosts = monthlyPropertyTax > 0 || monthlyHomeInsurance > 0 || monthlyPMI > 0 || monthlyHOA > 0;
  const isRefinance = mode === "refinance";

  return (
    <div className={cn("space-y-6", className)}>
      {/* Primary outcome - number first, label second */}
      <div className="py-4">
        <p className="currency-display mb-1">{formatCurrency(monthlyTotal)}</p>
        <p className="text-sm text-muted-foreground">
          {isRefinance ? "new monthly payment" : "monthly payment"}
          {usedEstimates && " · includes estimates"}
        </p>
      </div>

      <div className="divider-subtle" />

      {/* Payment breakdown - table-like */}
      <div>
        <p className="section-label mb-3">Monthly breakdown</p>
        <div className="space-y-0">
          <ResultRow 
            label="Principal & interest" 
            value={formatCurrencyPrecise(monthlyPrincipalInterest)} 
          />
          {monthlyPropertyTax > 0 && (
            <ResultRow 
              label="Property tax" 
              value={formatCurrencyPrecise(monthlyPropertyTax)}
              isEstimate={usedEstimates}
            />
          )}
          {monthlyHomeInsurance > 0 && (
            <ResultRow 
              label="Home insurance" 
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
            <ResultRow label="Total" value={formatCurrencyPrecise(monthlyTotal)} primary />
          </div>
        </div>
      </div>

      <div className="divider-subtle" />

      {/* Loan summary */}
      <div>
        <p className="section-label mb-3">
          {isRefinance ? "New loan summary" : "Loan summary"}
        </p>
        <div className="space-y-0">
          <ResultRow 
            label={isRefinance ? "New loan amount" : "Loan amount"} 
            value={formatCurrency(loanAmount)} 
          />
          {isRefinance && cashOutAmount !== undefined && cashOutAmount > 0 && (
            <ResultRow label="Cash out" value={formatCurrency(cashOutAmount)} />
          )}
          {isRefinance && closingCostsIncluded !== undefined && closingCostsIncluded > 0 && (
            <ResultRow label="Closing costs financed" value={formatCurrency(closingCostsIncluded)} />
          )}
          <ResultRow label="Loan-to-value" value={formatPercent(ltvRatio)} />
          <ResultRow label="Total interest" value={formatCurrency(totalInterest)} />
          <ResultRow label="Total cost" value={formatCurrency(totalCost)} primary />
        </div>
      </div>

      <div className="divider-subtle" />

      {/* Timeline */}
      <div>
        <p className="section-label mb-3">Timeline</p>
        <div className="space-y-0">
          <ResultRow 
            label="Payoff date" 
            value={formatDate(payoffDate)} 
          />
          <ResultRow 
            label="Months to payoff" 
            value={`${payoffMonths}`} 
          />
        </div>
      </div>

      {/* Notes - understated */}
      {(requiresPMI || usedEstimates) && (
        <>
          <div className="divider-subtle" />
          <div className="space-y-2 text-xs text-muted-foreground">
            {requiresPMI && (
              <p>
                PMI {isRefinance ? "may be " : ""}required. {isRefinance 
                  ? "Loan-to-value ratio is above 80%."
                  : "Down payment is less than 20%."}
              </p>
            )}
            {usedEstimates && (
              <p>
                Using ZIP-based estimates for taxes and insurance.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
