# SettleRate Comparison Contract

**Status:** Phase 5 canonical comparison model  
**Methodology version:** `5.1.0` (`COMPARISON_METHODOLOGY_VERSION`)  
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
| `upfrontCashRequired` | From inputs when definable; else `null` (`cashRequiredAtClosingOrStart` alias) |
| `financingPrincipalOrDraw` | Snapshot `principalAmount` (loan / HELOC draw / assumed+gap) |
| `totalFinancingProvided` | Capital supplied by financing (same source; `null` if unknown) |
| `fundingRequirement` | Decision funding target from inputs when knowable (e.g. purchase price); else `null` |
| `decisionObjective` | Type-derived: `home_purchase` / `refinance` / `heloc_credit` / `assumption_purchase` |
| `comparisonGroupId` | Defaults to `decisionObjective`; optional explicit override |
| `comparabilityStatus` | `candidate` / `ineligible` at build; exclusions listed on participant |
| `comparabilityExclusions` | Individual-level missing-field reasons at build time |
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

## 3. Comparability gate (before ranking)

A direct financing-cost ranking requires **all** of:

1. Supported `financingCostOverHorizon`
2. Common decision horizon
3. Common `comparisonGroupId` / decision objective
4. Equivalent `totalFinancingProvided` (funding / draw) within tolerance
5. Compatible `upfrontCashRequired` treatment within tolerance

Equal horizons alone do **not** make structures comparable. A smaller HELOC draw with lower financing cost is not a superior purchase mortgage.

### Prohibited substitute winner rules (not approved)

Do **not** use cost-per-dollar borrowed, APR, monthly payment, principal reduction, or arbitrary normalization as a substitute primary ranking without separate methodology approval.

### Primary economic comparison (after the gate)

1. Require financing cost, horizon, and known `totalFinancingProvided`.
2. Select the most common decision horizon (ties → smaller horizon).
3. Select the most common comparison group (ties → lexicographically smaller id).
4. Keep the largest funding-equivalent cluster (`max − min` ≤ funding tolerance).
5. Require compatible upfront cash when cash is known for the cluster.
6. Among remaining (≥ 2), rank by lowest `financingCostOverHorizon`.
7. Never treat principal reduction as cost; never use all-in monthly as primary.

When funding equivalence cannot be established →  
`status: "indeterminate"`, `winnerScenarioId: null`, `explanationCode: "non_equivalent_funding"`  
(or `decision_objective_mismatch` / `upfront_cash_incompatible` / `missing_funding_amount` as applicable).

Side-by-side metric tables remain available without declaring a least-expensive option.

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
| `tieTolerance` | Absolute USD tolerance for financing-cost ties |
| `fundingEquivalenceTolerance` | Absolute USD tolerance for financing proceeds |
| `methodologyVersion` / calculator metadata | Provenance |

### Explanation codes

- `lowest_financing_cost`
- `financing_cost_tie`
- `horizon_incompatible`
- `missing_primary_metric`
- `missing_funding_amount`
- `decision_objective_mismatch`
- `non_equivalent_funding`
- `upfront_cash_incompatible`
- `single_scenario`
- `no_comparable_scenarios`

### Exclusion reasons

- `missing_financing_cost`
- `horizon_mismatch`
- `incomplete_snapshot`
- `unsupported_scenario_type`
- `missing_funding_amount`
- `decision_objective_mismatch`
- `non_equivalent_funding`
- `upfront_cash_incompatible`

---

## 4. Tolerances

| Constant | Value | Use |
|----------|-------|-----|
| `COMPARISON_TIE_TOLERANCE_USD` | `$1.00` | Financing-cost ties |
| `COMPARISON_FUNDING_EQUIVALENCE_TOLERANCE_USD` | `$1.00` | Equivalent financing proceeds |
| `COMPARISON_UPFRONT_CASH_TOLERANCE_USD` | `$1.00` | Compatible upfront cash |

Secondary metrics may explain tradeoffs but **must not** silently break a primary-metric tie.

---

## 5. Horizon and BM-C01

Direct winner logic requires a **common decision horizon**.

- There is **no** approved cross-horizon normalization path in Phase 5.
- Do **not** extrapolate, annualize, or fabricate values to force a ranking.

**BM-C01 audit (not economically comparable for a primary ranking):**

| Id | Type | Horizon | Financing provided | Upfront cash | Funding target | Objective |
|----|------|---------|--------------------|--------------|----------------|-----------|
| BM-P01 | purchase | 360 | $360,000 | $90,000 | $450,000 purchase | `home_purchase` |
| BM-H02 | heloc | 360 | $50,000 draw | $0 | HELOC draw | `heloc_credit` |
| BM-A02 | assumption | 300 | $300,000 ($200k assumed + $100k gap) | $50,000 | $350,000 purchase | `assumption_purchase` |

**Outcome:** `indeterminate` — equal horizons do not equate a $50k HELOC with a $360k purchase mortgage. Side-by-side display remains valid.

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
