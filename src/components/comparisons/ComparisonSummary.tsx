/**
 * Quantified Decision Summary for Comparisons
 * 
 * Displays a dynamically generated analytical summary of the comparison
 * with percentage-based differences. Neutral, institutional tone.
 * 
 * Includes:
 * - Prose summary (2-4 sentences)
 * - Key metrics row with delta percentages
 */

import { ScenarioData } from "@/lib/scenarioContract";
import {
  calculateDeltas,
  determinePattern,
  generateSummaryCopy,
  formatSignedDelta,
  formatSignedBasisPoints,
  formatLtvDelta,
} from "@/lib/comparisonSummary";

interface ComparisonSummaryProps {
  scenarioA: ScenarioData;
  scenarioB: ScenarioData;
}

interface MetricItemProps {
  label: string;
  value: string;
}

function MetricItem({ label, value }: MetricItemProps) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground font-normal">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function ComparisonSummary({ scenarioA, scenarioB }: ComparisonSummaryProps) {
  const deltas = calculateDeltas(scenarioA, scenarioB);
  const pattern = determinePattern(deltas);
  const summaryCopy = generateSummaryCopy(
    deltas,
    pattern,
    scenarioA.name,
    scenarioB.name
  );

  return (
    <div className="relative pl-4 border-l-2 border-border/40 bg-muted/30 py-5 px-5 sm:py-6 sm:px-6 rounded-r-sm">
      {/* Label */}
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
        Comparison summary
      </div>
      
      {/* Summary text */}
      <div className="space-y-2 mb-5">
        {summaryCopy.map((sentence, index) => (
          <p key={index} className="text-sm text-foreground/90 leading-relaxed">
            {sentence}
          </p>
        ))}
      </div>

      {/* Key Metrics Row */}
      <div className="pt-4 border-t border-border/40">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
          Key differences
        </div>
        
        {/* Desktop: single row */}
        <div className="hidden sm:flex sm:flex-row sm:gap-8">
          <MetricItem 
            label="Monthly payment" 
            value={formatSignedDelta(deltas.monthlyPaymentDelta)} 
          />
          <MetricItem 
            label="Total cost" 
            value={formatSignedDelta(deltas.totalCostDelta)} 
          />
          <MetricItem 
            label="Total interest" 
            value={formatSignedDelta(deltas.totalInterestDelta)} 
          />
          <MetricItem 
            label="Interest rate" 
            value={formatSignedBasisPoints(deltas.interestRateDelta)} 
          />
          <MetricItem 
            label="LTV" 
            value={formatLtvDelta(deltas.ltvDelta)} 
          />
        </div>

        {/* Mobile: stacked grid */}
        <div className="sm:hidden grid grid-cols-2 gap-x-6 gap-y-3">
          <MetricItem 
            label="Monthly payment" 
            value={formatSignedDelta(deltas.monthlyPaymentDelta)} 
          />
          <MetricItem 
            label="Total cost" 
            value={formatSignedDelta(deltas.totalCostDelta)} 
          />
          <MetricItem 
            label="Total interest" 
            value={formatSignedDelta(deltas.totalInterestDelta)} 
          />
          <MetricItem 
            label="Interest rate" 
            value={formatSignedBasisPoints(deltas.interestRateDelta)} 
          />
          <MetricItem 
            label="LTV" 
            value={formatLtvDelta(deltas.ltvDelta)} 
          />
        </div>
      </div>
    </div>
  );
}
