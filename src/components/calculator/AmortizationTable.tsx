import { useState } from "react";
import { AmortizationEntry } from "@/lib/mortgage";
import { formatCurrencyPrecise, formatCurrency } from "@/lib/mortgage";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface AmortizationTableProps {
  schedule: AmortizationEntry[];
  className?: string;
}

export function AmortizationTable({ schedule, className }: AmortizationTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showYearly, setShowYearly] = useState(true);

  if (schedule.length === 0) return null;

  // Group by year
  const yearlyData = schedule.reduce((acc, entry) => {
    const year = Math.ceil(entry.month / 12);
    if (!acc[year]) {
      acc[year] = {
        year,
        principal: 0,
        interest: 0,
        extraPayment: 0,
        balance: 0,
      };
    }
    acc[year].principal += entry.principal;
    acc[year].interest += entry.interest;
    acc[year].extraPayment += entry.extraPayment;
    acc[year].balance = entry.balance;
    return acc;
  }, {} as Record<number, { year: number; principal: number; interest: number; extraPayment: number; balance: number }>);

  const yearlyArray = Object.values(yearlyData);
  const displayData = showYearly ? yearlyArray : schedule;
  const visibleData = isExpanded ? displayData : displayData.slice(0, showYearly ? 5 : 12);
  const hasMore = displayData.length > visibleData.length;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Amortization schedule</h3>
        <div className="flex rounded-md border border-input bg-muted p-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowYearly(true)}
            className={cn(
              "h-7 rounded px-2.5 text-xs font-medium",
              showYearly
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-transparent"
            )}
          >
            Yearly
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowYearly(false)}
            className={cn(
              "h-7 rounded px-2.5 text-xs font-medium",
              !showYearly
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-transparent"
            )}
          >
            Monthly
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                {showYearly ? "Year" : "Month"}
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Principal</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Interest</th>
              <th className="hidden px-3 py-2.5 text-right font-medium text-muted-foreground sm:table-cell">Extra</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Balance</th>
            </tr>
          </thead>
          <tbody>
            {visibleData.map((item, index) => {
              const key = showYearly
                ? (item as typeof yearlyArray[0]).year
                : (item as AmortizationEntry).month;
              const principal = showYearly
                ? (item as typeof yearlyArray[0]).principal
                : (item as AmortizationEntry).principal;
              const interest = showYearly
                ? (item as typeof yearlyArray[0]).interest
                : (item as AmortizationEntry).interest;
              const extra = showYearly
                ? (item as typeof yearlyArray[0]).extraPayment
                : (item as AmortizationEntry).extraPayment;
              const balance = showYearly
                ? (item as typeof yearlyArray[0]).balance
                : (item as AmortizationEntry).balance;

              return (
                <tr
                  key={key}
                  className={cn(
                    "border-b border-border/50 transition-colors",
                    index % 2 === 0 ? "bg-background" : "bg-muted/30"
                  )}
                >
                  <td className="px-3 py-2.5 font-medium tabular-nums">{key}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                    {formatCurrencyPrecise(principal)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                    {formatCurrencyPrecise(interest)}
                  </td>
                  <td className="hidden px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground sm:table-cell">
                    {extra > 0 ? formatCurrencyPrecise(extra) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums font-medium">
                    {formatCurrency(Math.max(0, balance))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-muted-foreground"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="mr-2 h-4 w-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="mr-2 h-4 w-4" />
              Show all {displayData.length} {showYearly ? "years" : "months"}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
