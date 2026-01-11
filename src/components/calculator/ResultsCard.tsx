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
  accent?: boolean;
}

function ResultRow({ label, value, primary, accent }: ResultRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className={cn(
        "text-sm",
        primary ? "font-medium text-foreground" : "text-muted-foreground"
      )}>
        {label}
      </span>
      <span className={cn(
        "font-mono tabular-nums",
        primary ? "text-lg font-semibold text-foreground" : "text-sm",
        accent && "text-primary font-medium"
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
  } = results;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Main result */}
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground mb-1">Monthly payment</p>
        <p className="currency-display">{formatCurrency(monthlyTotal)}</p>
        <p className="text-xs text-muted-foreground mt-2">
          Principal & interest + taxes + insurance
        </p>
      </div>

      <div className="divider-subtle" />

      {/* Payment breakdown */}
      <div className="space-y-0.5">
        <h3 className="text-sm font-medium text-foreground mb-3">Monthly breakdown</h3>
        <ResultRow label="Principal & interest" value={formatCurrencyPrecise(monthlyPrincipalInterest)} />
        <ResultRow label="Property tax" value={formatCurrencyPrecise(monthlyPropertyTax)} />
        <ResultRow label="Home insurance" value={formatCurrencyPrecise(monthlyHomeInsurance)} />
        {requiresPMI && monthlyPMI > 0 && (
          <ResultRow label="PMI" value={formatCurrencyPrecise(monthlyPMI)} />
        )}
        {monthlyHOA > 0 && (
          <ResultRow label="HOA" value={formatCurrencyPrecise(monthlyHOA)} />
        )}
        <div className="pt-2 mt-2 border-t border-border">
          <ResultRow label="Total" value={formatCurrencyPrecise(monthlyTotal)} primary />
        </div>
      </div>

      <div className="divider-subtle" />

      {/* Loan summary */}
      <div className="space-y-0.5">
        <h3 className="text-sm font-medium text-foreground mb-3">Loan summary</h3>
        <ResultRow label="Loan amount" value={formatCurrency(loanAmount)} />
        <ResultRow label="Loan-to-value" value={formatPercent(ltvRatio)} />
        <ResultRow label="Total interest" value={formatCurrency(totalInterest)} />
        <ResultRow label="Total cost" value={formatCurrency(totalCost)} primary />
      </div>

      <div className="divider-subtle" />

      {/* Timeline */}
      <div className="space-y-0.5">
        <h3 className="text-sm font-medium text-foreground mb-3">Timeline</h3>
        <ResultRow 
          label="Payoff date" 
          value={formatDate(payoffDate)} 
          accent 
        />
        <ResultRow 
          label="Months to payoff" 
          value={`${payoffMonths} months`} 
        />
      </div>

      {requiresPMI && (
        <>
          <div className="divider-subtle" />
          <div className="rounded-md bg-accent/50 p-3">
            <p className="text-xs text-accent-foreground">
              <strong>PMI required.</strong> Your down payment is less than 20%, so private mortgage insurance applies until you reach 20% equity.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
