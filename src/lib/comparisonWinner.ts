/**
 * Canonical comparison winner logic (Phase 5 / DEF-003).
 *
 * Primary metric: financingCostOverHorizon under a shared decision horizon.
 * All-in monthly payment is secondary presentation only — never the primary winner.
 * Principal reduction is never treated as cost.
 *
 * See docs/COMPARISON_CONTRACT.md.
 */

import {
  COMPARISON_METHODOLOGY_VERSION,
  COMPARISON_TIE_TOLERANCE_USD,
  type CanonicalComparisonOptions,
  type CanonicalComparisonParticipant,
  type ComparisonExclusionReason,
  type ComparisonWinnerResult,
  buildComparisonParticipants,
} from "@/lib/comparisonContract";
import { CALCULATOR_VERSION, type ScenarioData } from "@/lib/scenarioContract";

export type { ComparisonWinnerResult } from "@/lib/comparisonContract";

interface Eligible {
  participant: CanonicalComparisonParticipant;
  financingCost: number;
  horizon: number;
}

function exclude(
  scenarioId: string,
  reason: ComparisonExclusionReason
): { scenarioId: string; reason: ComparisonExclusionReason } {
  return { scenarioId, reason };
}

/**
 * Determine the primary economic comparison outcome among participants.
 */
export function determineComparisonWinnerFromParticipants(
  participants: CanonicalComparisonParticipant[]
): ComparisonWinnerResult {
  const staleScenarioIds = participants
    .filter((p) => p.staleCalculation)
    .map((p) => p.scenarioId);

  const calculatorVersionMetadata = {
    currentCalculatorVersion: CALCULATOR_VERSION,
    participantVersions: participants.map((p) => ({
      scenarioId: p.scenarioId,
      calculatorVersion: p.calculatorVersion,
    })),
  };

  const base = {
    primaryMetric: "financingCostOverHorizon" as const,
    tieTolerance: COMPARISON_TIE_TOLERANCE_USD,
    methodologyVersion: COMPARISON_METHODOLOGY_VERSION,
    calculatorVersionMetadata,
    staleScenarioIds,
  };

  if (participants.length < 2) {
    return {
      ...base,
      winnerScenarioId: null,
      status: "indeterminate",
      comparisonHorizonMonths: participants[0]?.decisionHorizonMonths ?? null,
      delta: null,
      explanationCode: "single_scenario",
      excludedScenarioIds: [],
      explanation:
        "At least two scenarios are required for a primary economic comparison.",
    };
  }

  const excluded: { scenarioId: string; reason: ComparisonExclusionReason }[] =
    [];
  const withPrimary: CanonicalComparisonParticipant[] = [];

  for (const p of participants) {
    if (p.financingCostOverHorizon == null) {
      excluded.push(exclude(p.scenarioId, "missing_financing_cost"));
      continue;
    }
    if (p.decisionHorizonMonths == null || p.decisionHorizonMonths <= 0) {
      excluded.push(exclude(p.scenarioId, "incomplete_snapshot"));
      continue;
    }
    withPrimary.push(p);
  }

  if (withPrimary.length < 2) {
    return {
      ...base,
      winnerScenarioId: null,
      status: "indeterminate",
      comparisonHorizonMonths: null,
      delta: null,
      explanationCode: "missing_primary_metric",
      excludedScenarioIds: excluded,
      explanation:
        "A primary economic comparison requires financing cost over a modeled term for at least two scenarios.",
    };
  }

  // Choose the most common horizon among scenarios that have primary metrics.
  const horizonCounts = new Map<number, number>();
  for (const p of withPrimary) {
    const h = p.decisionHorizonMonths!;
    horizonCounts.set(h, (horizonCounts.get(h) ?? 0) + 1);
  }
  let comparisonHorizonMonths = withPrimary[0].decisionHorizonMonths!;
  let bestCount = 0;
  for (const [h, count] of horizonCounts) {
    if (
      count > bestCount ||
      (count === bestCount && h < comparisonHorizonMonths)
    ) {
      bestCount = count;
      comparisonHorizonMonths = h;
    }
  }

  const eligible: Eligible[] = [];
  for (const p of withPrimary) {
    if (p.decisionHorizonMonths !== comparisonHorizonMonths) {
      excluded.push(exclude(p.scenarioId, "horizon_mismatch"));
      continue;
    }
    eligible.push({
      participant: p,
      financingCost: p.financingCostOverHorizon!,
      horizon: p.decisionHorizonMonths!,
    });
  }

  if (eligible.length < 2) {
    return {
      ...base,
      winnerScenarioId: null,
      status: "indeterminate",
      comparisonHorizonMonths,
      delta: null,
      explanationCode: "horizon_incompatible",
      excludedScenarioIds: excluded,
      explanation:
        "Scenarios do not share a common decision horizon for a direct financing-cost comparison. No winner is declared.",
    };
  }

  eligible.sort((a, b) => {
    if (a.financingCost !== b.financingCost) {
      return a.financingCost - b.financingCost;
    }
    return a.participant.scenarioId.localeCompare(b.participant.scenarioId);
  });

  const lowest = eligible[0];
  const withinTolerance = eligible.filter(
    (e) =>
      Math.abs(e.financingCost - lowest.financingCost) <=
      COMPARISON_TIE_TOLERANCE_USD
  );

  if (withinTolerance.length > 1) {
    return {
      ...base,
      winnerScenarioId: null,
      status: "tie",
      comparisonHorizonMonths,
      delta: 0,
      explanationCode: "financing_cost_tie",
      excludedScenarioIds: excluded,
      explanation: `Under these assumptions, ${withinTolerance.length} scenarios have essentially the same financing cost over ${comparisonHorizonMonths} months (within $${COMPARISON_TIE_TOLERANCE_USD.toFixed(2)}). No single least-expensive option is declared.`,
    };
  }

  const runnerUp = eligible[1];
  const delta = runnerUp.financingCost - lowest.financingCost;

  return {
    ...base,
    winnerScenarioId: lowest.participant.scenarioId,
    status: "winner",
    comparisonHorizonMonths,
    delta,
    explanationCode: "lowest_financing_cost",
    excludedScenarioIds: excluded,
    explanation: `Under these assumptions, ${lowest.participant.scenarioName} has the lowest financing cost over the modeled term (${comparisonHorizonMonths} months). Financing cost excludes principal repayment.`,
  };
}

/**
 * Build participants from scenarios and determine the winner.
 * Defaults to activeSnapshot; never recalculates.
 */
export function determineComparisonWinner(
  scenarios: ScenarioData[],
  options: CanonicalComparisonOptions = {}
): ComparisonWinnerResult {
  const participants = buildComparisonParticipants(scenarios, options);
  return determineComparisonWinnerFromParticipants(participants);
}

/**
 * Map a winner result to the legacy A/B/C label used by comparisonSummary adapters.
 */
export function winnerLabelForScenarios(
  result: ComparisonWinnerResult,
  scenarioA: ScenarioData,
  scenarioB: ScenarioData,
  scenarioC?: ScenarioData | null
): "A" | "B" | "C" | null {
  if (result.status !== "winner" || !result.winnerScenarioId) return null;
  if (result.winnerScenarioId === scenarioA.id) return "A";
  if (result.winnerScenarioId === scenarioB.id) return "B";
  if (scenarioC && result.winnerScenarioId === scenarioC.id) return "C";
  return null;
}
