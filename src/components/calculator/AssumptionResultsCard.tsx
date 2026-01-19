/**
 * Assumption Results Card
 * 
 * Displays Loan Assumption calculation results in an institutional format.
 */

import { useMemo } from "react";
import { AssumptionResults, GapMethod } from "@/lib/assumption";
import { formatCurrency } from "@/lib/mortgage";

interface AssumptionResultsCardProps {
  results: AssumptionResults;
  assumedApr: number;
  gapMethod: GapMethod;
  gapApr?: number;
  className?: string;
}

interface ResultRowProps {
  label: string;
  value: string;
  isPrimary?: boolean;
  isEstimate?: boolean;
}

function ResultRow({ label, value, isPrimary = false, isEstimate = false }: ResultRowProps) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className={`text-sm ${isPrimary ? "font-medium" : "text-muted-foreground"}`}>
        {label}
        {isEstimate && <span className="text-xs text-muted-foreground ml-1">(est.)</span>}
      </span>
      <span className={`tabular-nums ${isPrimary ? "text-lg font-medium" : "text-sm"}`}>
        {value}
      </span>
    </div>
  );
}

const GAP_METHOD_DISPLAY: Record<GapMethod, string> = {
  cash: "Cash",
  second_loan: "Second loan",
  heloc: "HELOC",
};

export function AssumptionResultsCard({ 
  results, 
  assumedApr, 
  gapMethod,
  gapApr,
  className 
}: AssumptionResultsCardProps) {
  const payoffDate = useMemo(() => {
    return results.assumedPayoffDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  }, [results.assumedPayoffDate]);

  return (
    <div className={className}>
      {/* Primary metric */}
      <div className="mb-4 text-center">
        <p className="text-sm text-muted-foreground mb-1">Total monthly payment</p>
        <p className="text-3xl font-medium tabular-nums">
          {formatCurrency(results.paymentTotal)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">assumed loan + gap financing</p>
      </div>

      <div className="divider-subtle" />

      {/* Payment breakdown */}
      <div className="py-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Payment Breakdown
        </p>
        <ResultRow 
          label="Assumed loan (P&I)" 
          value={formatCurrency(results.assumedPaymentPi)} 
        />
        {results.gapPayment > 0 && (
          <ResultRow 
            label={`Gap (${GAP_METHOD_DISPLAY[gapMethod]})`}
            value={formatCurrency(results.gapPayment)} 
          />
        )}
        <ResultRow 
          label="Combined total" 
          value={formatCurrency(results.paymentTotal)} 
          isPrimary
        />
      </div>

      <div className="divider-subtle" />

      {/* Loan summary */}
      <div className="py-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Loan Summary
        </p>
        <ResultRow label="Assumed loan rate" value={`${assumedApr.toFixed(2)}%`} />
        {gapApr && gapMethod !== "cash" && (
          <ResultRow label="Gap financing rate" value={`${gapApr.toFixed(2)}%`} />
        )}
        <ResultRow label="LTV ratio" value={`${results.ltvRatio.toFixed(1)}%`} />
        {results.gapAmount > 0 && (
          <ResultRow label="Gap amount" value={formatCurrency(results.gapAmount)} />
        )}
      </div>

      <div className="divider-subtle" />

      {/* Long-term cost */}
      <div className="py-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Long-Term Cost
        </p>
        <ResultRow 
          label="Total interest" 
          value={formatCurrency(results.interestTotal)} 
        />
        {results.feesTotal > 0 && (
          <ResultRow 
            label="Assumption fees" 
            value={formatCurrency(results.feesTotal)} 
          />
        )}
        <ResultRow 
          label="Total cost" 
          value={formatCurrency(results.costTotal)} 
          isPrimary
        />
      </div>

      <div className="divider-subtle" />

      {/* Timeline */}
      <div className="py-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Timeline
        </p>
        <ResultRow label="Assumed loan payoff" value={payoffDate} />
      </div>
    </div>
  );
}