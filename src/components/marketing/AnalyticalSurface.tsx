/**
 * Analytical Surface
 * 
 * A document-style hero visual representing a normalized mortgage scenario comparison.
 * The visual appears as a cropped excerpt from a professional analysis report—not a 
 * dashboard or calculator. Uses neutral, off-white background, subtle borders, 
 * restrained typography, and no charts or marketing accents.
 * 
 * Design Principles:
 * - Document-like, flat, calm
 * - No interactivity
 * - Typography carries hierarchy, not color
 * - No marketing patterns, CTAs, or persuasion
 * - Implies professional review, not consumer browsing
 * 
 * Canon v1.2 - Decision-Grade Document Fragment (Locked)
 */

import { cn } from "@/lib/utils";

interface AnalyticalSurfaceProps {
  className?: string;
}

// Canonical scenario data - structure variables + decision-grade outcomes
const scenarios = {
  a: {
    name: "30-Year Fixed",
    context: "20% down · 6.75% · No PMI",
    // Decision-Grade Outcomes
    monthlyPayment: "$2,418",
    totalInterest: "$381,204",
    cashAtClose: "$97,500",
    principalMajority: "Year 19",
    totalCostOfCapital: "$781,204",
  },
  b: {
    name: "15-Year Fixed",
    context: "20% down · 6.50% · Accelerated equity",
    // Decision-Grade Outcomes
    monthlyPayment: "$3,212",
    totalInterest: "$178,160",
    cashAtClose: "$97,500",
    principalMajority: "Year 8",
    totalCostOfCapital: "$578,160",
  },
};

// Single framing caption
const caption = "Example of normalized scenario modeling using transparent assumptions.";

export function AnalyticalSurface({ className }: AnalyticalSurfaceProps) {
  return (
    <div 
      className={cn(
        // Container styling handled by parent when wrapped
        // Standalone: off-white/parchment, subtle border, minimal radius
        className
      )}
    >
      <div className="px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
        {/* Header Row */}
        <div className="mb-6 flex items-baseline justify-between border-b border-foreground/[0.08] pb-4">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-foreground/40">
            Scenario Comparison
          </span>
          <span className="hidden text-[10px] text-foreground/30 sm:block">
            Normalized output
          </span>
        </div>

        {/* Comparison Table - Decision-Grade Document */}
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Column Headers with Context Subtext */}
            <thead>
              <tr>
                <th className="pb-2 text-left text-sm font-normal text-foreground/40"></th>
                <th className="pb-1 text-right align-bottom">
                  <div className="text-sm font-medium text-foreground/70">
                    {scenarios.a.name}
                  </div>
                  <div className="mt-1 text-[10px] font-normal leading-tight text-foreground/35">
                    {scenarios.a.context}
                  </div>
                </th>
                <th className="pb-1 text-right align-bottom">
                  <div className="text-sm font-medium text-foreground/70">
                    {scenarios.b.name}
                  </div>
                  <div className="mt-1 text-[10px] font-normal leading-tight text-foreground/35">
                    {scenarios.b.context}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Spacer after header */}
              <tr>
                <td colSpan={3} className="h-5" />
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
                  Total Interest Paid
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
                  Year Principal Exceeds Interest
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

        {/* Footer Caption */}
        <div className="mt-6 border-t border-foreground/[0.06] pt-4">
          <p className="text-[11px] leading-relaxed text-foreground/35">
            {caption}
          </p>
        </div>
      </div>
    </div>
  );
}
