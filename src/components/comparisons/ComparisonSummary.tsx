/**
 * Quantified Decision Summary for Comparisons
 * 
 * Displays a dynamically generated analytical summary of the comparison
 * with "Under these assumptions" decision statement. Neutral, institutional tone.
 * 
 * Supports 2 or 3 scenario comparisons:
 * - 2 scenarios: Single set of A vs B deltas
 * - 3 scenarios: Two groups (A vs B, C vs B)
 * 
 * Includes:
 * - Decision statement (lowest projected cost)
 * - Key metrics row with delta percentages
 * - Methodology disclaimer
 */

import { ScenarioData } from "@/lib/scenarioContract";
import {
  calculateDeltas,
  calculateThreeWayDeltas,
  determinePattern,
  generateSummaryCopy,
  generateThreeWaySummaryCopy,
  formatDollarFirstDelta,
  formatSignedBasisPoints,
  formatLtvDelta,
  determineLowestCost,
  ComparisonDeltas,
} from "@/lib/comparisonSummary";

interface ComparisonSummaryProps {
  scenarioA: ScenarioData;
  scenarioB: ScenarioData;
  scenarioC?: ScenarioData | null;
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

/**
 * Render key differences for a single comparison pair
 * Using dollar-first display: dollars first, percentages second
 * Includes "Why" explanation when rate/term are same
 */
function KeyDifferencesBlock({ 
  deltas, 
  label,
  showLabel = false,
  sameRateExplanation = false,
}: { 
  deltas: ComparisonDeltas; 
  label?: string;
  showLabel?: boolean;
  sameRateExplanation?: boolean;
}) {
  return (
    <div>
      {showLabel && label && (
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
          {label}
        </div>
      )}
      
      {/* Desktop: responsive auto-fit grid that reflows at all breakpoints */}
      <div className="hidden sm:grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4 lg:gap-6">
        <DesktopMetricItem 
          label="Monthly payment" 
          value={formatDollarFirstDelta(deltas.monthlyPaymentDollarDelta, deltas.monthlyPaymentDelta, "/mo")} 
        />
        <DesktopMetricItem 
          label="Total cost over time" 
          value={formatDollarFirstDelta(deltas.totalCostDollarDelta, deltas.totalCostDelta)} 
        />
        <DesktopMetricItem 
          label="Total interest" 
          value={formatDollarFirstDelta(deltas.totalInterestDollarDelta, deltas.totalInterestDelta)} 
        />
        <DesktopMetricItem 
          label="Interest rate (assumed)" 
          value={formatSignedBasisPoints(deltas.interestRateDelta)} 
        />
        <DesktopMetricItem 
          label="Loan size vs home value" 
          value={formatLtvDelta(deltas.ltvDelta)} 
        />
      </div>

      {/* Mobile: stacked rows with dividers */}
      <div className="sm:hidden">
        <MobileMetricRow 
          label="Monthly payment" 
          value={formatDollarFirstDelta(deltas.monthlyPaymentDollarDelta, deltas.monthlyPaymentDelta, "/mo")} 
        />
        <MobileMetricRow 
          label="Total cost over time" 
          value={formatDollarFirstDelta(deltas.totalCostDollarDelta, deltas.totalCostDelta)} 
        />
        <MobileMetricRow 
          label="Total interest" 
          value={formatDollarFirstDelta(deltas.totalInterestDollarDelta, deltas.totalInterestDelta)} 
        />
        <MobileMetricRow 
          label="Interest rate (assumed)" 
          value={formatSignedBasisPoints(deltas.interestRateDelta)} 
        />
        <MobileMetricRow 
          label="Loan size vs home value" 
          value={formatLtvDelta(deltas.ltvDelta)} 
        />
      </div>
      
      {/* "Why" explanation for same rate comparisons */}
      {sameRateExplanation && Math.abs(deltas.interestRateDelta ?? 0) < 1 && (
        <div className="mt-2 text-xs text-muted-foreground/80 italic">
          Why: {deltas.loanAmountDelta && deltas.loanAmountDelta > 0 ? "larger" : "smaller"} loan balance at the same interest rate
        </div>
      )}
    </div>
  );
}

export function ComparisonSummary({ scenarioA, scenarioB, scenarioC }: ComparisonSummaryProps) {
  const hasScenarioC = !!scenarioC;
  
  // Calculate deltas
  const threeWayDeltas = calculateThreeWayDeltas(scenarioA, scenarioB, scenarioC);
  const { aVsB, cVsB } = threeWayDeltas;
  
  // Determine lowest cost for baseline label
  const lowestCost = determineLowestCost(scenarioA, scenarioB, scenarioC);
  
  // Generate summary copy with scenario data for "Under these assumptions" format
  const summaryCopy = hasScenarioC
    ? generateThreeWaySummaryCopy(
        threeWayDeltas,
        scenarioA.name,
        scenarioB.name,
        scenarioC!.name,
        scenarioA,
        scenarioB,
        scenarioC!
      )
    : generateSummaryCopy(
        aVsB,
        determinePattern(aVsB),
        scenarioA.name,
        scenarioB.name,
        scenarioA,
        scenarioB
      );

  const nameA = scenarioA.name || "Scenario A";
  const nameB = scenarioB.name || "Scenario B";
  const nameC = scenarioC?.name || "Scenario C";

  return (
    <div className="relative border-l-2 border-border/30 bg-muted/20 rounded-r-lg overflow-hidden w-full max-w-full">
      <div className="py-5 px-4 sm:py-6 sm:px-6 lg:px-8 overflow-hidden">
        {/* Label */}
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
          Comparison summary
        </div>
        
        {/* Summary text - decision statement with max-width for readability */}
        <div className="space-y-2 mb-5 max-w-[720px]">
          {summaryCopy.map((sentence, index) => (
            <p key={index} className="text-sm text-foreground/85 leading-[1.65] break-words">
              {sentence}
            </p>
          ))}
        </div>

        {/* Key Metrics - "How the options compare" */}
        <div className="pt-4 border-t border-border/30">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              How the options compare
            </div>
          </div>
          
          {hasScenarioC ? (
            // 3-scenario layout: two stacked groups with metric spacing
            <div className="space-y-6">
              <KeyDifferencesBlock 
                deltas={aVsB} 
                label={`${nameA} vs ${nameB}`}
                showLabel={true}
              />
              {cVsB && (
                <KeyDifferencesBlock 
                  deltas={cVsB} 
                  label={`${nameC} vs ${nameB}`}
                  showLabel={true}
                />
              )}
            </div>
          ) : (
            // 2-scenario layout: single group
            <KeyDifferencesBlock deltas={aVsB} />
          )}
          
          {/* Single quiet disclosure */}
          <div className="mt-5 text-[11px] text-muted-foreground/70 leading-relaxed max-w-[720px]">
            <p>Results are modeled estimates based on user-provided inputs and are not financial advice.</p>
          </div>
        </div>
      </div>
    </div>
  );
}