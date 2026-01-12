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
 * Canon v1 - Locked Structure
 */

import { cn } from "@/lib/utils";

type Variant = "consumer" | "advisor" | "investor";

interface AnalyticalSurfaceProps {
  variant?: Variant;
  className?: string;
}

// Canonical scenario data - structural inputs + modeled outcomes
const scenarios = {
  a: {
    name: "30-Year Fixed",
    // Structural Inputs
    downPayment: "10%",
    pmi: "Yes",
    loanAmount: "$405,000",
    // Modeled Outcomes
    monthlyPayment: "$2,418",
    totalInterest: "$381,204",
    principalMajority: "Year 19",
  },
  b: {
    name: "15-Year Fixed",
    // Structural Inputs
    downPayment: "20%",
    pmi: "No",
    loanAmount: "$360,000",
    // Modeled Outcomes
    monthlyPayment: "$3,212",
    totalInterest: "$192,110",
    principalMajority: "Year 8",
  },
};

// Caption variants by audience
const captions: Record<Variant, string> = {
  consumer: "Example of normalized scenario modeling using transparent assumptions. Down payment, PMI, and loan structure materially change outcomes.",
  advisor: "Sample scenario comparison suitable for professional review. Structural inputs normalized for direct comparison.",
  investor: "Core analytical surface powering all scenario evaluation. Inputs and outcomes surfaced with full transparency.",
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

        {/* Comparison Table - Canonical Structure */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="pb-4 text-left text-sm font-normal text-foreground/40"></th>
                <th className="pb-4 text-right text-sm font-medium text-foreground/70">
                  {scenarios.a.name}
                </th>
                <th className="pb-4 text-right text-sm font-medium text-foreground/70">
                  {scenarios.b.name}
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Structural Inputs Tier - Visually Secondary */}
              <tr>
                <td 
                  colSpan={3} 
                  className="pb-2 pt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-foreground/30"
                >
                  Structural Inputs
                </td>
              </tr>
              <tr className="text-xs">
                <td className="py-2 pr-4 text-left text-foreground/40">
                  Down Payment
                </td>
                <td className="py-2 text-right font-mono tabular-nums text-foreground/50">
                  {scenarios.a.downPayment}
                </td>
                <td className="py-2 text-right font-mono tabular-nums text-foreground/50">
                  {scenarios.b.downPayment}
                </td>
              </tr>
              <tr className="text-xs">
                <td className="py-2 pr-4 text-left text-foreground/40">
                  PMI Required
                </td>
                <td className="py-2 text-right font-mono tabular-nums text-foreground/50">
                  {scenarios.a.pmi}
                </td>
                <td className="py-2 text-right font-mono tabular-nums text-foreground/50">
                  {scenarios.b.pmi}
                </td>
              </tr>
              <tr className="text-xs">
                <td className="py-2 pr-4 text-left text-foreground/40">
                  Loan Amount
                </td>
                <td className="py-2 text-right font-mono tabular-nums text-foreground/50">
                  {scenarios.a.loanAmount}
                </td>
                <td className="py-2 text-right font-mono tabular-nums text-foreground/50">
                  {scenarios.b.loanAmount}
                </td>
              </tr>

              {/* Divider between inputs and outcomes */}
              <tr>
                <td colSpan={3} className="py-3">
                  <div className="h-px bg-foreground/[0.08]" />
                </td>
              </tr>

              {/* Modeled Outcomes Tier - Visual Focus */}
              <tr>
                <td 
                  colSpan={3} 
                  className="pb-2 pt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-foreground/30"
                >
                  Modeled Outcomes
                </td>
              </tr>
              <tr className="text-sm">
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
                  Time to Principal Majority
                </td>
                <td className="py-3 text-right font-mono tabular-nums text-foreground/70">
                  {scenarios.a.principalMajority}
                </td>
                <td className="py-3 text-right font-mono tabular-nums text-foreground/70">
                  {scenarios.b.principalMajority}
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
