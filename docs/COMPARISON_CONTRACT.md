# SettleRate Comparison Contract

**Status:** Phase 5 canonical comparison model  
**Methodology version:** `5.0.0` (`COMPARISON_METHODOLOGY_VERSION`)  
**Calculator version:** `2.0.0`  
**Authority:** `docs/FINANCIAL_METHODOLOGY.md` §2–3; implementation in `src/lib/comparisonContract.ts` and `src/lib/comparisonWinner.ts`

SettleRate comparisons are **neutral decision support**. Copy uses “least expensive” / “lower financing cost” — never “best,” “recommended,” or lender/product advice.

---

## 1. Canonical participant contract

Each compared scenario is normalized to a `CanonicalComparisonParticipant`:

| Field | Notes |
|-------|--------|
| `scenarioId` | Stable id |
| `scenarioName` | Display name |
| `scenarioType` | `purchase` \| `refinance` \| `heloc` \| `assumption` |
| `snapshotKind` | `active` (default) or `original` |
| `calculatorVersion` | Version of the selected snapshot |
| `decisionHorizonMonths` | Persisted horizon; `null` if unavailable |
| `financingCostOverHorizon` | **Primary** economic metric; excludes principal |
| `principalReductionOverHorizon` | Reported separately; never ranked as cost |
| `cashRequiredAtClosingOrStart` | From inputs when definable; else `null` |
| `allInMonthlyHousingPayment` | **Secondary** cash-flow metric |
| `endingLoanBalance` | `null` when not persisted / unsupported |
| `modeledEquityAtHorizon` | `null` when not persisted / unsupported |
| `totalInterestOverHorizon` | From snapshot summary when present |
| `modeledMortgageInsurance` | Line-item when available without recalculation; else `null` |
| `definedFinancingFees` | Mode-specific fees when known; else `null` / `0` for purchase |
| `unsupportedMetrics` | Explicit list of mortgage-only fields not applicable |
| `staleCalculation` | Active snapshot behind current calculator |

**Null policy:** Use `null` for unavailable values. Do **not** substitute zero for unsupported or unknown metrics.

---

## 2. Snapshot selection

| Option | Behavior |
|--------|----------|
| Default | Compare `activeSnapshot` |
| Explicit `{ snapshot: "original" }` | Compare `originalSnapshot` |
| Recalculation | **Never** during comparison |
| Stale active | Comparable using persisted values; `staleCalculation` / `staleScenarioIds` disclose version lag |

---

## 3. Winner methodology

### Primary economic comparison

1. Require `financingCostOverHorizon` and a positive `decisionHorizonMonths` for eligibility.
2. Select the **most common** decision horizon among eligible scenarios (ties broken by smaller horizon).
3. Exclude scenarios whose horizon ≠ comparison horizon (`horizon_mismatch`).
4. Among remaining eligible scenarios (≥ 2), rank by lowest `financingCostOverHorizon`.
5. **Do not** treat principal reduction as cost.
6. **Do not** use all-in monthly payment as the primary winner criterion.

### Winner result contract

| Field | Meaning |
|-------|---------|
| `winnerScenarioId` | Winning id, or `null` |
| `status` | `winner` \| `tie` \| `indeterminate` |
| `primaryMetric` | Always `financingCostOverHorizon` |
| `comparisonHorizonMonths` | Shared horizon used, or `null` |
| `delta` | Financing-cost gap to runner-up (winner), `0` (tie), or `null` |
| `explanationCode` | Machine-stable reason code |
| `excludedScenarioIds` | `{ scenarioId, reason }[]` |
| `staleScenarioIds` | Ids with stale active snapshots |
| `tieTolerance` | Absolute USD tolerance |
| `methodologyVersion` / calculator metadata | Provenance |

### Explanation codes

- `lowest_financing_cost`
- `financing_cost_tie`
- `horizon_incompatible`
- `missing_primary_metric`
- `single_scenario`
- `no_comparable_scenarios`

### Exclusion reasons

- `missing_financing_cost`
- `horizon_mismatch`
- `incomplete_snapshot`
- `unsupported_scenario_type`

---

## 4. Tie tolerance

`COMPARISON_TIE_TOLERANCE_USD = 1.00`

If two or more eligible scenarios differ by ≤ $1.00 on financing cost, status is **`tie`**. Secondary metrics may explain tradeoffs in narrative UI but **must not** silently break a primary-metric tie.

---

## 5. Horizon rule

Direct winner logic requires a **common decision horizon**.

- There is **no** approved cross-horizon normalization path in Phase 5.
- Do **not** extrapolate, annualize, or fabricate values to force a winner.
- When fewer than two scenarios share the selected horizon → `indeterminate` / `horizon_incompatible`.

Example (BM-C01): BM-P01 and BM-H02 share 360 months; BM-A02 at 300 months is excluded; winner is BM-H02 (lowest financing cost at 360).

---

## 6. Scenario-type rules

### Purchase / refinance

- Use canonical financing-cost semantics (interest + modeled MI + defined financing fees).
- Keep principal reduction separate.
- Preserve closing-cost treatment already encoded in the snapshot.

### HELOC

- Use HELOC-specific financing cost from the snapshot.
- Do **not** fabricate amortization, escrow, PMI, LTV, or standard mortgage payment fields.
- List those fields under `unsupportedMetrics`.

### Assumption

- Preserve assumption-specific financing cost (assumed + gap instruments).
- Do **not** flatten into unsupported single-mortgage fields.
- Equity / ending balance remain `null` until persisted support exists.

---

## 7. Secondary dimensions

Presented for context; not primary winner criteria:

- All-in monthly housing payment
- Upfront cash requirement
- Principal reduction
- Ending balance / modeled equity (when supported)
- Total interest
- Financing fees
- Mortgage insurance (when line-item available)

---

## 8. Legacy compatibility

- `comparisonSummary.determineLowestCost()` is a **compatibility adapter** over `determineComparisonWinner()`.
- `ComparisonDeltas.totalCostDelta` / `totalCostDollarDelta` are aliases of financing-cost deltas.
- Server `generate-pdf` comparison narrative uses the same financing-cost + shared-horizon rules (mirrored for Deno).
- There is **one** authoritative winner engine on the client: `comparisonWinner.ts`.

---

## 9. UI / export labels

Material label corrections (Phase 5):

| Prior (inaccurate) | Canonical |
|--------------------|-----------|
| Total cost over time | Financing cost over modeled term |
| Total payments (legacy principal+interest) | Financing cost over modeled term |
| Total cost (legacy) in export key-diff | Financing cost over modeled term |

Neutral framing only; no product or lender recommendations.

---

## 10. Related documents

- `docs/FINANCIAL_METHODOLOGY.md`
- `docs/EXPORT_CONTRACT.md`
- `TEST_BASELINE.md` (DEF-003, BM-C01, BM-C02)
- `docs/COPY_STANDARD.md`
