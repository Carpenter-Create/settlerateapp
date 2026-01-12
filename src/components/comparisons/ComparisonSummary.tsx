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

/**
 * Desktop MetricItem - horizontal compact display
 */
function DesktopMetricItem({ label, value }: MetricItemProps) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground font-normal">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}

/**
 * Mobile MetricRow - full-width row with label left, value right
 * Height: 48-52px for comfortable tapping and scanning
 */
function MobileMetricRow({ label, value }: MetricItemProps) {
  return (
    <div className="flex items-center justify-between h-12 border-b border-border/30 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-[15px] font-medium tabular-nums">{value}</span>
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
    <div className="relative pl-4 border-l-2 border-border/30 bg-muted/20 py-4 px-4 sm:py-6 sm:px-6 rounded-r-sm">
      {/* Label */}
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2.5 sm:mb-3">
        Comparison summary
      </div>
      
      {/* Summary text */}
      <div className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-5">
        {summaryCopy.map((sentence, index) => (
          <p key={index} className="text-sm text-foreground/85 leading-[1.6]">
            {sentence}
          </p>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="pt-3.5 sm:pt-4 border-t border-border/30">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2.5 sm:mb-3">
          Key differences
        </div>
        
        {/* Desktop: single row */}
        <div className="hidden sm:flex sm:flex-row sm:gap-8">
          <DesktopMetricItem 
            label="Monthly payment" 
            value={formatSignedDelta(deltas.monthlyPaymentDelta)} 
          />
          <DesktopMetricItem 
            label="Total cost" 
            value={formatSignedDelta(deltas.totalCostDelta)} 
          />
          <DesktopMetricItem 
            label="Total interest" 
            value={formatSignedDelta(deltas.totalInterestDelta)} 
          />
          <DesktopMetricItem 
            label="Interest rate" 
            value={formatSignedBasisPoints(deltas.interestRateDelta)} 
          />
          <DesktopMetricItem 
            label="LTV" 
            value={formatLtvDelta(deltas.ltvDelta)} 
          />
        </div>

        {/* Mobile: stacked rows with dividers */}
        <div className="sm:hidden">
          <MobileMetricRow 
            label="Monthly payment" 
            value={formatSignedDelta(deltas.monthlyPaymentDelta)} 
          />
          <MobileMetricRow 
            label="Total cost" 
            value={formatSignedDelta(deltas.totalCostDelta)} 
          />
          <MobileMetricRow 
            label="Total interest" 
            value={formatSignedDelta(deltas.totalInterestDelta)} 
          />
          <MobileMetricRow 
            label="Interest rate" 
            value={formatSignedBasisPoints(deltas.interestRateDelta)} 
          />
          <MobileMetricRow 
            label="LTV" 
            value={formatLtvDelta(deltas.ltvDelta)} 
          />
        </div>
      </div>
    </div>
  );
}
