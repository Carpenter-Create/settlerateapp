/**
 * Analytical Surface
 * 
 * A reusable hero visual component that communicates structured mortgage 
 * scenario evaluation with institutional authority and neutrality.
 * 
 * Design Principles:
 * - Document-like, flat, calm
 * - No interactivity by default
 * - Typography carries hierarchy, not color
 * - No marketing patterns, CTAs, or persuasion
 * 
 * Canon v1.1 - Decision-Grade Document Fragment
 */

import { cn } from "@/lib/utils";

type Variant = "consumer" | "advisor" | "investor";

interface AnalyticalSurfaceProps {
  variant?: Variant;
  className?: string;
}

// Canonical scenario data - structure variables + decision-grade outcomes
const scenarios = {
  a: {
    name: "30-Year Fixed",
    context: "20% down · 6.75% · No PMI",
    // Decision-Grade Outcomes
    monthlyPayment: "$2,418",
    cashAtClose: "$97,500",
    totalInterest: "$381,204",
    principalMajority: "Year 19",
    totalCostOfCapital: "$781,204",
  },
  b: {
    name: "15-Year Fixed",
    context: "20% down · 6.50% · Accelerated equity",
    // Decision-Grade Outcomes
    monthlyPayment: "$3,212",
    cashAtClose: "$97,500",
    totalInterest: "$178,160",
    principalMajority: "Year 8",
    totalCostOfCapital: "$578,160",
  },
};

// Caption variants by audience
const captions: Record<Variant, string> = {
  consumer: "Example of normalized scenario modeling using transparent assumptions. Structure materially changes long-term cost of capital.",
  advisor: "Sample scenario comparison suitable for professional review. Structural inputs normalized for direct comparison.",
  investor: "Core analytical surface powering all scenario evaluation. Decision-grade outputs with full transparency.",
};

export function AnalyticalSurface({ 
  variant = "consumer",
  className 
}: AnalyticalSurfaceProps) {
  return (
    <div 
      className={cn(
        "w-full rounded-[10px] border border-foreground/[0.06] bg-[hsl(40_15%_94%)]",
        className
      )}
    >
      <div className="px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
        {/* Panel Header */}
        <div className="mb-6 flex items-baseline justify-between border-b border-foreground/[0.08] pb-4">
          <span className="text-xs font-medium uppercase tracking-[0.1em] text-foreground/40">
            Scenario Comparison
          </span>
          <span className="hidden text-[11px] text-foreground/30 sm:block">
            Normalized output
          </span>
        </div>

        {/* Comparison Table - Decision-Grade Document */}
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Column Headers with Context */}
            <thead>
              <tr>
                <th className="pb-2 text-left text-sm font-normal text-foreground/40"></th>
                <th className="pb-1 text-right align-bottom">
                  <div className="text-sm font-medium text-foreground/70">
                    {scenarios.a.name}
                  </div>
                  <div className="mt-1 text-[10px] font-normal text-foreground/35">
                    {scenarios.a.context}
                  </div>
                </th>
                <th className="pb-1 text-right align-bottom">
                  <div className="text-sm font-medium text-foreground/70">
                    {scenarios.b.name}
                  </div>
                  <div className="mt-1 text-[10px] font-normal text-foreground/35">
                    {scenarios.b.context}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Spacer after header */}
              <tr>
                <td colSpan={3} className="h-4" />
              </tr>

              {/* Decision-Grade Rows */}
              <tr className="border-t border-foreground/[0.06] text-sm">
                <td className="py-3 pr-4 text-left text-foreground/50">
                  Monthly Payment
                </td>
                <td className="py-3 text-right font-mono tabular-nums text-foreground/70">
                  {scenarios.a.monthlyPayment}
                </td>
                <td className="py-3 text-right font-mono tabular-nums text-foreground/70">
                  {scenarios.b.monthlyPayment}
                </td>
              </tr>
              <tr className="border-t border-foreground/[0.04] text-sm">
                <td className="py-3 pr-4 text-left text-foreground/50">
                  Cash Required at Close
                </td>
                <td className="py-3 text-right font-mono tabular-nums text-foreground/70">
                  {scenarios.a.cashAtClose}
                </td>
                <td className="py-3 text-right font-mono tabular-nums text-foreground/70">
                  {scenarios.b.cashAtClose}
                </td>
              </tr>
              <tr className="border-t border-foreground/[0.04] text-sm">
                <td className="py-3 pr-4 text-left text-foreground/50">
                  Total Interest
                </td>
                <td className="py-3 text-right font-mono tabular-nums text-foreground/70">
                  {scenarios.a.totalInterest}
                </td>
                <td className="py-3 text-right font-mono tabular-nums text-foreground/70">
                  {scenarios.b.totalInterest}
                </td>
              </tr>
              <tr className="border-t border-foreground/[0.04] text-sm">
                <td className="py-3 pr-4 text-left text-foreground/50">
                  Year Principal Overtakes Interest
                </td>
                <td className="py-3 text-right font-mono tabular-nums text-foreground/70">
                  {scenarios.a.principalMajority}
                </td>
                <td className="py-3 text-right font-mono tabular-nums text-foreground/70">
                  {scenarios.b.principalMajority}
                </td>
              </tr>
              <tr className="border-t border-foreground/[0.06] text-sm">
                <td className="py-3 pr-4 text-left text-foreground/50">
                  Total Cost of Capital
                </td>
                <td className="py-3 text-right font-mono tabular-nums text-foreground/70">
                  {scenarios.a.totalCostOfCapital}
                </td>
                <td className="py-3 text-right font-mono tabular-nums text-foreground/70">
                  {scenarios.b.totalCostOfCapital}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer - Variant-specific caption */}
        <div className="mt-6 border-t border-foreground/[0.06] pt-4">
          <p className="text-[11px] leading-relaxed text-foreground/35">
            {captions[variant]}
          </p>
        </div>
      </div>
    </div>
  );
}
