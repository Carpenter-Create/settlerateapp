/**
 * HELOC Results Card
 * 
 * Displays HELOC calculation results in an institutional format.
 */

import { useMemo } from "react";
import { HelocResults } from "@/lib/heloc";
import { formatCurrency } from "@/lib/mortgage";

interface HelocResultsCardProps {
  results: HelocResults;
  apr: number;
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

export function HelocResultsCard({ results, apr, className }: HelocResultsCardProps) {
  const payoffDate = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + results.timelineMonthsTotal);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  }, [results.timelineMonthsTotal]);

  const totalYears = Math.round(results.timelineMonthsTotal / 12);

  return (
    <div className={className}>
      {/* Primary metric */}
      <div className="mb-4 text-center">
        <p className="text-sm text-muted-foreground mb-1">Repayment payment</p>
        <p className="text-3xl font-medium tabular-nums">
          {formatCurrency(results.paymentRepay)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">per month after draw period</p>
      </div>

      <div className="divider-subtle" />

      {/* Draw period payments */}
      <div className="py-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Draw Period (Interest-Only)
        </p>
        <ResultRow label="Average monthly" value={formatCurrency(results.paymentDrawAvg)} />
        <ResultRow label="Maximum monthly" value={formatCurrency(results.paymentDrawMax)} />
      </div>

      <div className="divider-subtle" />

      {/* Credit summary */}
      <div className="py-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Line Summary
        </p>
        <ResultRow label="Balance at draw end" value={formatCurrency(results.balanceEndDraw)} />
        <ResultRow label="APR" value={`${apr.toFixed(2)}%`} />
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
            label="Total fees" 
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
        <ResultRow label="Payoff date" value={payoffDate} />
        <ResultRow label="Total term" value={`${totalYears} years`} />
      </div>
    </div>
  );
}