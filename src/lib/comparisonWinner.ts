/**
 * Canonical comparison winner logic (Phase 5 / DEF-003).
 *
 * Primary metric: financingCostOverHorizon under a shared decision horizon,
 * shared decision objective/comparison group, and equivalent funding proceeds.
 * All-in monthly payment is secondary presentation only — never the primary winner.
 * Principal reduction is never treated as cost.
 * Cost-per-dollar, APR, and arbitrary normalization are not substitute winner rules.
 *
 * See docs/COMPARISON_CONTRACT.md.
 */

import {
  COMPARISON_FUNDING_EQUIVALENCE_TOLERANCE_USD,
  COMPARISON_METHODOLOGY_VERSION,
  COMPARISON_TIE_TOLERANCE_USD,
  COMPARISON_UPFRONT_CASH_TOLERANCE_USD,
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

function withinTolerance(a: number, b: number, tolerance: number): boolean {
  return Math.abs(a - b) <= tolerance;
}

function selectMajorityValue<T extends string | number>(
  values: T[]
): T {
  const counts = new Map<T, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best = values[0];
  let bestCount = 0;
  for (const [v, count] of counts) {
    const isBetterCount = count > bestCount;
    const isTieBreak =
      count === bestCount &&
      (typeof v === "number"
        ? (v as number) < (best as number)
        : String(v) < String(best));
    if (isBetterCount || isTieBreak) {
      best = v;
      bestCount = count;
    }
  }
  return best;
}

function largestFundingCluster(
  participants: CanonicalComparisonParticipant[]
): CanonicalComparisonParticipant[] {
  const sorted = [...participants].sort(
    (a, b) => (a.totalFinancingProvided ?? 0) - (b.totalFinancingProvided ?? 0)
  );
  let bestCluster: CanonicalComparisonParticipant[] = [];
  let start = 0;
  for (let end = 0; end < sorted.length; end++) {
    while (
      sorted[end].totalFinancingProvided! - sorted[start].totalFinancingProvided! >
      COMPARISON_FUNDING_EQUIVALENCE_TOLERANCE_USD
    ) {
      start += 1;
    }
    const cluster = sorted.slice(start, end + 1);
    if (cluster.length > bestCluster.length) {
      bestCluster = cluster;
    }
  }
  return bestCluster;
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
    fundingEquivalenceTolerance: COMPARISON_FUNDING_EQUIVALENCE_TOLERANCE_USD,
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
        "At least two scenarios are required for a primary economic comparison. Side-by-side metrics may still be reviewed without declaring a least-expensive option.",
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
    if (p.totalFinancingProvided == null) {
      excluded.push(exclude(p.scenarioId, "missing_funding_amount"));
      continue;
    }
    withPrimary.push(p);
  }

  if (withPrimary.length < 2) {
    const code =
      excluded.some((e) => e.reason === "missing_funding_amount") &&
      !excluded.every((e) => e.reason === "missing_financing_cost")
        ? "missing_funding_amount"
        : "missing_primary_metric";
    return {
      ...base,
      winnerScenarioId: null,
      status: "indeterminate",
      comparisonHorizonMonths: null,
      delta: null,
      explanationCode: code,
      excludedScenarioIds: excluded,
      explanation:
        "A primary economic comparison requires financing cost, decision horizon, and a known financing amount for at least two scenarios. Side-by-side metrics remain available without declaring a least-expensive option.",
    };
  }

  // Choose the most common horizon among scenarios that have primary metrics.
  const comparisonHorizonMonths = selectMajorityValue(
    withPrimary.map((p) => p.decisionHorizonMonths!)
  );

  const horizonMatched: CanonicalComparisonParticipant[] = [];
  for (const p of withPrimary) {
    if (p.decisionHorizonMonths !== comparisonHorizonMonths) {
      excluded.push(exclude(p.scenarioId, "horizon_mismatch"));
      continue;
    }
    horizonMatched.push(p);
  }

  if (horizonMatched.length < 2) {
    return {
      ...base,
      winnerScenarioId: null,
      status: "indeterminate",
      comparisonHorizonMonths,
      delta: null,
      explanationCode: "horizon_incompatible",
      excludedScenarioIds: excluded,
      explanation:
        "Scenarios do not share a common decision horizon for a direct financing-cost comparison. No least-expensive option is declared; side-by-side metrics remain available.",
    };
  }

  // Common decision objective / comparison group.
  const comparisonGroupId = selectMajorityValue(
    horizonMatched.map((p) => p.comparisonGroupId)
  );
  const groupMatched: CanonicalComparisonParticipant[] = [];
  for (const p of horizonMatched) {
    if (p.comparisonGroupId !== comparisonGroupId) {
      excluded.push(exclude(p.scenarioId, "decision_objective_mismatch"));
      continue;
    }
    groupMatched.push(p);
  }

  if (groupMatched.length < 2) {
    return {
      ...base,
      winnerScenarioId: null,
      status: "indeterminate",
      comparisonHorizonMonths,
      delta: null,
      explanationCode: "decision_objective_mismatch",
      excludedScenarioIds: excluded,
      explanation:
        "These scenarios do not share the same decision objective, so financing cost alone cannot identify a least-expensive option. Side-by-side metrics remain available for review.",
    };
  }

  // Equivalent funding / financing proceeds.
  const fundingCluster = largestFundingCluster(groupMatched);
  for (const p of groupMatched) {
    if (!fundingCluster.some((c) => c.scenarioId === p.scenarioId)) {
      excluded.push(exclude(p.scenarioId, "non_equivalent_funding"));
    }
  }

  if (fundingCluster.length < 2) {
    return {
      ...base,
      winnerScenarioId: null,
      status: "indeterminate",
      comparisonHorizonMonths,
      delta: null,
      explanationCode: "non_equivalent_funding",
      excludedScenarioIds: excluded,
      explanation:
        "These scenarios do not provide equivalent financing amounts, so a lower financing cost may only reflect a smaller borrowing amount—not a comparable financing structure. No least-expensive option is declared; side-by-side metrics remain available.",
    };
  }

  // Compatible upfront-cash treatment within the funding-equivalent set.
  const cashValues = fundingCluster.map((p) => p.upfrontCashRequired);
  const knownCash = cashValues.filter((v): v is number => v != null);
  let cashMatched = fundingCluster;

  if (knownCash.length > 0 && knownCash.length < fundingCluster.length) {
    for (const p of fundingCluster) {
      if (p.upfrontCashRequired == null) {
        excluded.push(exclude(p.scenarioId, "upfront_cash_incompatible"));
      }
    }
    cashMatched = fundingCluster.filter((p) => p.upfrontCashRequired != null);
  }

  if (cashMatched.length >= 2) {
    const cashKnown = cashMatched.every((p) => p.upfrontCashRequired != null);
    if (cashKnown) {
      const minCash = Math.min(
        ...cashMatched.map((p) => p.upfrontCashRequired!)
      );
      const maxCash = Math.max(
        ...cashMatched.map((p) => p.upfrontCashRequired!)
      );
      if (maxCash - minCash > COMPARISON_UPFRONT_CASH_TOLERANCE_USD) {
        for (const p of cashMatched) {
          excluded.push(exclude(p.scenarioId, "upfront_cash_incompatible"));
        }
        return {
          ...base,
          winnerScenarioId: null,
          status: "indeterminate",
          comparisonHorizonMonths,
          delta: null,
          explanationCode: "upfront_cash_incompatible",
          excludedScenarioIds: excluded,
          explanation:
            "Upfront cash requirements are not compatible across these scenarios, so a primary financing-cost ranking is not declared. Side-by-side metrics remain available.",
        };
      }
    }
  }

  if (cashMatched.length < 2) {
    return {
      ...base,
      winnerScenarioId: null,
      status: "indeterminate",
      comparisonHorizonMonths,
      delta: null,
      explanationCode: "upfront_cash_incompatible",
      excludedScenarioIds: excluded,
      explanation:
        "Upfront cash requirements cannot be compared consistently across these scenarios. No least-expensive option is declared; side-by-side metrics remain available.",
    };
  }

  const eligible: Eligible[] = cashMatched.map((p) => ({
    participant: p,
    financingCost: p.financingCostOverHorizon!,
    horizon: p.decisionHorizonMonths!,
  }));

  eligible.sort((a, b) => {
    if (a.financingCost !== b.financingCost) {
      return a.financingCost - b.financingCost;
    }
    return a.participant.scenarioId.localeCompare(b.participant.scenarioId);
  });

  const lowest = eligible[0];
  const withinTie = eligible.filter((e) =>
    withinTolerance(
      e.financingCost,
      lowest.financingCost,
      COMPARISON_TIE_TOLERANCE_USD
    )
  );

  if (withinTie.length > 1) {
    return {
      ...base,
      winnerScenarioId: null,
      status: "tie",
      comparisonHorizonMonths,
      delta: 0,
      explanationCode: "financing_cost_tie",
      excludedScenarioIds: excluded,
      explanation: `Under these assumptions, ${withinTie.length} scenarios have essentially the same financing cost over ${comparisonHorizonMonths} months (within $${COMPARISON_TIE_TOLERANCE_USD.toFixed(2)}). No single least-expensive option is declared.`,
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
    explanation: `Under these assumptions, ${lowest.participant.scenarioName} has the lowest financing cost over the modeled term (${comparisonHorizonMonths} months) among scenarios with equivalent financing amounts. Financing cost excludes principal repayment.`,
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
