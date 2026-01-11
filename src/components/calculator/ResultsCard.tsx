import { MortgageResults } from "@/lib/mortgage";
import { formatCurrency, formatCurrencyPrecise, formatDate, formatPercent } from "@/lib/mortgage";
import { Badge } from "@/components/ui/badge";
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
  isEstimate?: boolean;
}

function ResultRow({ label, value, primary, accent, isEstimate }: ResultRowProps) {
  return (
    <div className="flex items-center justify-between py-2 gap-2">
      <span className={cn(
        "text-sm flex items-center gap-1.5",
        primary ? "font-medium text-foreground" : "text-muted-foreground"
      )}>
        {label}
        {isEstimate && (
          <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0">
            Est
          </Badge>
        )}
      </span>
      <span className={cn(
        "font-mono tabular-nums text-right",
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
    usedEstimates,
    scenarioType,
    cashOutAmount,
    closingCostsIncluded,
  } = results;

  const hasAdditionalCosts = monthlyPropertyTax > 0 || monthlyHomeInsurance > 0 || monthlyPMI > 0 || monthlyHOA > 0;
  const isRefinance = scenarioType === "refinance";

  return (
    <div className={cn("space-y-6", className)}>
      {/* Main result */}
      <div className="text-center py-6">
        <div className="flex items-center justify-center gap-2 mb-1">
          <p className="text-sm text-muted-foreground">
            {isRefinance ? "New monthly payment" : "Monthly payment"}
          </p>
          {usedEstimates && (
            <Badge variant="secondary" className="text-xs font-normal">
              Includes estimates
            </Badge>
          )}
        </div>
        <p className="currency-display">{formatCurrency(monthlyTotal)}</p>
        <p className="text-xs text-muted-foreground mt-2">
          {hasAdditionalCosts 
            ? "Principal & interest + taxes + insurance"
            : "Principal & interest only"}
        </p>
      </div>

      <div className="divider-subtle" />

      {/* Payment breakdown */}
      <div className="space-y-0.5">
        <h3 className="text-sm font-medium text-foreground mb-3">Monthly breakdown</h3>
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

      <div className="divider-subtle" />

      {/* Loan summary */}
      <div className="space-y-0.5">
        <h3 className="text-sm font-medium text-foreground mb-3">
          {isRefinance ? "New loan summary" : "Loan summary"}
        </h3>
        <ResultRow 
          label={isRefinance ? "New loan amount" : "Loan amount"} 
          value={formatCurrency(loanAmount)} 
        />
        {isRefinance && cashOutAmount !== undefined && cashOutAmount > 0 && (
          <ResultRow label="Cash out" value={formatCurrency(cashOutAmount)} />
        )}
        {isRefinance && closingCostsIncluded !== undefined && closingCostsIncluded > 0 && (
          <ResultRow label="Closing costs (financed)" value={formatCurrency(closingCostsIncluded)} />
        )}
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
              <strong>PMI {isRefinance ? "may be " : ""}required.</strong>{" "}
              {isRefinance 
                ? "Your new loan-to-value ratio is above 80%."
                : "Your down payment is less than 20%, so private mortgage insurance applies until you reach 20% equity."}
            </p>
          </div>
        </>
      )}

      {usedEstimates && (
        <>
          <div className="divider-subtle" />
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Using ZIP estimates.</strong> Update taxes and insurance with exact numbers when available for the most accurate calculation.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
