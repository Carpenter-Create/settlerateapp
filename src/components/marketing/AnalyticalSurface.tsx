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

// Canonical scenario data - normalized inputs, surfaced outputs
const scenarios = {
  a: {
    name: "30-Year Fixed",
    monthlyPayment: "$2,418",
    totalInterest: "$381,204",
    principalMajority: "Year 19",
  },
  b: {
    name: "15-Year Fixed",
    monthlyPayment: "$3,212",
    totalInterest: "$192,110",
    principalMajority: "Year 8",
  },
};

// Caption variants by audience
const captions: Record<Variant, string> = {
  consumer: "Example of normalized scenario modeling using transparent assumptions.",
  advisor: "Sample scenario comparison suitable for professional review.",
  investor: "Core analytical surface powering all scenario evaluation.",
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
            <tbody className="font-mono text-sm tabular-nums">
              <tr className="border-t border-foreground/[0.06]">
                <td className="py-3 pr-4 text-left text-foreground/50">
                  Monthly Payment
                </td>
                <td className="py-3 text-right text-foreground/70">
                  {scenarios.a.monthlyPayment}
                </td>
                <td className="py-3 text-right text-foreground/70">
                  {scenarios.b.monthlyPayment}
                </td>
              </tr>
              <tr className="border-t border-foreground/[0.06]">
                <td className="py-3 pr-4 text-left text-foreground/50">
                  Total Interest
                </td>
                <td className="py-3 text-right text-foreground/70">
                  {scenarios.a.totalInterest}
                </td>
                <td className="py-3 text-right text-foreground/70">
                  {scenarios.b.totalInterest}
                </td>
              </tr>
              <tr className="border-t border-foreground/[0.06]">
                <td className="py-3 pr-4 text-left text-foreground/50">
                  Time to Principal Majority
                </td>
                <td className="py-3 text-right text-foreground/70">
                  {scenarios.a.principalMajority}
                </td>
                <td className="py-3 text-right text-foreground/70">
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
