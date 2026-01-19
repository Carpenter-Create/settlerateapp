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
  formatSignedDelta,
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
 * Using plain-English labels that homeowners can understand
 */
function KeyDifferencesBlock({ 
  deltas, 
  label,
  showLabel = false 
}: { 
  deltas: ComparisonDeltas; 
  label?: string;
  showLabel?: boolean;
}) {
  return (
    <div>
      {showLabel && label && (
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
          {label}
        </div>
      )}
      
      {/* Desktop: single row */}
      <div className="hidden sm:flex sm:flex-row sm:gap-8">
        <DesktopMetricItem 
          label="Monthly payment" 
          value={formatSignedDelta(deltas.monthlyPaymentDelta)} 
        />
        <DesktopMetricItem 
          label="Total cost over time" 
          value={formatSignedDelta(deltas.totalCostDelta)} 
        />
        <DesktopMetricItem 
          label="Total interest" 
          value={formatSignedDelta(deltas.totalInterestDelta)} 
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
          value={formatSignedDelta(deltas.monthlyPaymentDelta)} 
        />
        <MobileMetricRow 
          label="Total cost over time" 
          value={formatSignedDelta(deltas.totalCostDelta)} 
        />
        <MobileMetricRow 
          label="Total interest" 
          value={formatSignedDelta(deltas.totalInterestDelta)} 
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
    <div className="relative pl-4 border-l-2 border-border/30 bg-muted/20 py-4 px-4 sm:py-6 sm:px-6 rounded-r-sm">
      {/* Label */}
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2.5 sm:mb-3">
        Comparison summary
      </div>
      
      {/* Summary text - decision statement */}
      <div className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-5">
        {summaryCopy.map((sentence, index) => (
          <p key={index} className="text-sm text-foreground/85 leading-[1.6]">
            {sentence}
          </p>
        ))}
      </div>

      {/* Key Metrics - renamed to "Why this option costs less" */}
      <div className="pt-3.5 sm:pt-4 border-t border-border/30">
        <div className="flex items-center gap-2 mb-2.5 sm:mb-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {hasScenarioC ? "How the options compare" : "How the options compare"}
          </div>
        </div>
        
        {hasScenarioC ? (
          // 3-scenario layout: two stacked groups
          <div className="space-y-5">
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
        
        {/* Footnote explaining the comparison */}
        <div className="mt-4 text-[11px] text-muted-foreground/70 leading-relaxed space-y-1">
          <p>Percentages compare each option to the others using the same assumptions.</p>
          <p>Rates shown are inputs provided by the user or advisor and are not lender quotes.</p>
        </div>
      </div>
    </div>
  );
}