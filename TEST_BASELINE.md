# SettleRate Financial Benchmark Baseline

**Branch:** `feat/phase3-scenario-persistence`  
**Phase:** 3 — Scenario persistence alignment (dual snapshots + `calculateScenario` dispatch)  
**Calculator version:** 2.0.0 (`CALCULATOR_VERSION` in `src/lib/calculatorVersion.ts`)  
**Schema version:** 2 (dual-snapshot persistence shape)  
**Baseline date:** 2026-08-03  
**Status:** CI green on branch — lint (0 errors), typecheck, verify:benchmarks, test:run (**51 passed | 2 todo**), build all pass

---

## Independent verification (`scripts/verify-benchmarks.mjs`)

Reproducible script; does **not** import production calculator code.

| Benchmark | Script verified | Method | Tolerance | Production calculator |
|-----------|-----------------|--------|-----------|----------------------|
| BM-P01 | ✅ | Standard PMT amortization | ±$0.01 | No |
| BM-P03 | ✅ | LTV + amortization (PMI is fixture input) | ±$0.01 | No |
| BM-P05 | ✅ | Lump sum at origination + amortize remainder | ±$0.01 | No |
| BM-R01 | ✅ | Standard PMT on refinance balance | ±$0.01 | No |
| BM-R04 | ✅ | Explicit current-loan P&I vs new P&I break-even | ±$0.01 / exact months | No |
| BM-H02 | ✅ | Month-by-month IO draw + repay interest | ±$0.01 | No |
| BM-A02 | ✅ | Dual PMT (assumed + gap loan) | ±$0.01 | No |
| BM-P06 | — | Composition asserted in Vitest (not in verify script) | ±$0.01 | No |
| BM-R05 | — | Omission rule asserted in Vitest | — | No |
| BM-R06 | — | Source grep asserted in Vitest (no `baseRate + 1.0`) | — | No |
| BM-M01 | — | Migration field check (non-monetary) | — | N/A |
| BM-V01 | — | Dual-snapshot + lazy recompute asserted in Vitest | — | N/A |

Run: `npm run verify:benchmarks` — **7** independently verified benchmarks (P01, P03, P05, R01, R04, H02, A02).

| Category | Count |
|----------|-------|
| Independently verified (`verify:benchmarks`) | 7 |
| Remaining `it.todo` | 2 (BM-C01, BM-C02 — Phase 5) |
| **Total benchmark fixtures** | **16** |

---

## Defect registry (referenced by benchmarks)

| ID | Description | Phase | Status on this branch |
|----|-------------|-------|------------------------|
| DEF-001 | Persistence used `calculateMortgage` for all modes; dual snapshots absent; comparison still ranks by `totalCost` | Phase 3 (store) / Phase 5 (winner) | **Store dispatch resolved** — dual snapshots + `calculateScenario`; winner still Phase 5 |
| DEF-003 | Comparison winner uses `totalCost` / all-in monthly instead of financing cost | Phase 5 | Open |
| DEF-007 | `oneTimePrincipalPayment` ignored in amortization | Phase 2 | **Resolved** |
| DEF-008 | `ScenarioAssumptions` stored but not applied | Phase 2 | **Resolved** |
| DEF-009 | Synthetic break-even rate `baseRate + 1.0%`; missing current-loan inputs | Phase 2 | **Resolved** |
| DEF-010 | HELOC non-interest-only draw not blocked | Phase 2 | **Resolved** |

---

## Benchmark matrix

### Purchase

| ID | Type | Status | Target behavior | Current observed behavior | Defect | Phase | Verification |
|----|------|--------|-----------------|---------------------------|--------|-------|--------------|
| **BM-P01** | purchase | **active** | P&I $2,275.44; interest $459,160.16; 360 mo; LTV 80%; no PMI | Matches; `financingCostOverHorizon` = interest | — | — | ✅ `verify:benchmarks` + Vitest |
| **BM-P03** | purchase | **active** | 19% down → PMI when estimates on; 20% down → no PMI; threshold from assumptions | Uses frozen `pmiRemovalThreshold` | DEF-008 | Phase 2 | ✅ `verify:benchmarks` + Vitest |
| **BM-P05** | purchase | **active** | $10k lump sum at month 1 → interest $404,312.79; payoff 332 mo | Lump sum applied before first payment | DEF-007 | Phase 2 | ✅ `verify:benchmarks` + Vitest |
| **BM-P06** | purchase | **active** | `financingCostOverHorizon` = interest + MI + fees; excludes principal | Metric exposed; excludes principal | DEF-001 (metric) | Phase 2 | ✅ Vitest composition |

### Refinance

| ID | Type | Status | Target behavior | Current observed behavior | Defect | Phase | Verification |
|----|------|--------|-----------------|---------------------------|--------|-------|--------------|
| **BM-R01** | refinance | **active** | $300k @ 6.5%/30yr → P&I $1,896.20 | Matches | — | — | ✅ `verify:benchmarks` |
| **BM-R04** | refinance | **active** | Break-even 19 mo with current 7.5%/300mo vs new 6.5%/360mo, $6k closing | Explicit current-loan inputs; break-even 19 | DEF-009 | Phase 2 | ✅ `verify:benchmarks` + Vitest |
| **BM-R05** | refinance | **active** | Omit break-even when current-loan inputs absent | `null` break-even; no break-even narrative | DEF-009 | Phase 2 | ✅ Vitest |
| **BM-R06** | refinance | **active** | No synthetic `baseRate + 1.0%` | Pattern absent from `rateSensitivity.ts` | DEF-009 | Phase 2 | ✅ Vitest source grep |

### HELOC

| ID | Type | Status | Target behavior | Current observed behavior | Defect | Phase | Verification |
|----|------|--------|-----------------|---------------------------|--------|-------|--------------|
| **BM-H02** | heloc | **active** | IO draw capped at limit; end draw $50k; interest total ≈ $87,961.71 | `calculateHeloc` matches | — | — | ✅ `verify:benchmarks` |
| **BM-H04** | heloc | **active** (engine) | Interest-only draw only | Engine rejects non-IO; UI has no non-IO control | DEF-010 | Phase 2 | ✅ Vitest |

### Assumption

| ID | Type | Status | Target behavior | Current observed behavior | Defect | Phase | Verification |
|----|------|--------|-----------------|---------------------------|--------|-------|--------------|
| **BM-A02** | assumption | **active** | Second-loan gap financing matches fixture | `calculateAssumption` matches; `calculateScenario` dispatches | — | — | ✅ `verify:benchmarks` |
| *(BM-A02 persist)* | assumption | **active** | Save/load uses assumption results | Round-trip via dual snapshots + `calculateScenario` | DEF-001 | Phase 3 | ✅ Vitest persistence |

### Cross-type comparison

| ID | Type | Status | Target behavior | Current observed behavior | Defect | Phase | Verification |
|----|------|--------|-----------------|---------------------------|--------|-------|--------------|
| **BM-C01** | cross | **pending** | Rank by `financingCostOverHorizon` across P01/H02/A02 | Still ranks by `totalCost` | DEF-003 | Phase 5 | ✅ Expected values in fixtures |
| **BM-C02** | cross | **pending** | All-in monthly is secondary tie-breaker only | Winner may still use all-in / totalCost | DEF-003 | Phase 5 | Specification |
| **BM-C03** | cross | **active** | `principalReductionOverHorizon` separate from financing cost | Exposed on mortgage + unified results | — | Phase 2 | ✅ Vitest |

### Migration and versioning

| ID | Type | Status | Target behavior | Current observed behavior | Defect | Phase | Verification |
|----|------|--------|-----------------|---------------------------|--------|-------|--------------|
| **BM-M01** | migration | **active** | Legacy flat `inputs` → canonical namespaced schema (now v2) | `migrateScenario` preserves values through v0→v1→v2 | — | — | ✅ Pipeline inspection |
| **BM-V01** | versioning | **active** | Dual snapshots; explicit recompute; `calculatedAt` metadata | Hydration restores snapshots; stale flag; explicit persist recalculation | DEF-001 | Phase 3 | ✅ Vitest + `docs/SCENARIO_PERSISTENCE.md` |

---

## Active tests

| Test file | Benchmark / topic |
|-----------|-------------------|
| `mortgage.benchmark.test.ts` | BM-P01, BM-P03, BM-R01; BM-P05; financing cost; frozen PMI; legacy `totalCost` |
| `heloc.benchmark.test.ts` | BM-H02; BM-H04 engine rejection |
| `assumption.benchmark.test.ts` | BM-A02 |
| `scenarioCalculator.benchmark.test.ts` | BM-P01/H02/A02 dispatch + financing fields; BM-C03; unified `totalCost` baseline |
| `scenarioMigrations.test.ts` | BM-M01 |
| `scenarioPersistence.test.ts` | DEF-001 dispatch; BM-V01 dual snapshots; stale open; explicit persist recalculation; duplicate v2; round trips; legacy hydration |
| `financingCost.composition.test.ts` | BM-P06, BM-P03 MI, BM-C03, BM-R04–R06, frozen assumptions in sensitivity |
| `scenarioInputSerialization.test.ts` | Create/update Supabase persistence parity |

---

## Remaining pending tests (`it.todo` — 2)

| Benchmark / defect | Exact todo summary | Phase |
|--------------------|--------------------|-------|
| **BM-C01** | Comparison normalization — `financingCostOverHorizon` ranks BM-P01 lowest among P01/H02/A02 | Phase 5 |
| **BM-C02** | All-in monthly secondary — winner must not be determined by `allInMonthlyHousingPayment` alone | Phase 5 |

---

## Unresolved expected values

None for Phase 3 persistence. Phase 5 comparison winner fixtures remain specification-only until that phase.

---

## Methodology vs implementation gaps

| Topic | Approved | Current on this branch | Deferred |
|-------|----------|------------------------|----------|
| Financing cost metric | `financingCostOverHorizon` | Exposed on mortgage + unified results | Comparison UI winner (Phase 5) |
| Principal | Reported separately | `principalReductionOverHorizon` exposed | Export labeling (later) |
| Break-even | Explicit current rate + term | Implemented; synthetic rate removed | — |
| HELOC draw | Interest-only only | Engine rejects non-IO; UI has no non-IO control | Amortizing draw math |
| Assumptions | Frozen at save, applied | Applied in calc / sensitivity / integrity | — |
| Calculator version | 2.0.0 | `CALCULATOR_VERSION = "2.0.0"` | — |
| Persistence | Dual snapshots, `calculateScenario` dispatch | Implemented (`docs/SCENARIO_PERSISTENCE.md`) | Broad schema redesign |
| Comparison winner | Financing cost primary | Still `totalCost` in `comparisonSummary` | Phase 5 |
| Save limits / income context | Deferred | Unchanged | — |

---

## CI pipeline

Workflow: `.github/workflows/ci.yml`

Steps: `npm ci` → `lint` → `typecheck` → `verify:benchmarks` → `test:run` → `build`

No production secrets required. No `continue-on-error` or failure suppression.

## ESLint

Full-repository lint with strict rules restored. **Ignored paths:** `dist` only.

---

## Related files

- `docs/FINANCIAL_METHODOLOGY.md` — approved vs current vs deferred semantics
- `docs/SCENARIO_PERSISTENCE.md` — dual-snapshot persistence contract
- `src/lib/__tests__/fixtures/` — golden JSON fixtures
- `vitest.config.ts` — Node environment, `@/` alias
- `AGENTS.md` / `.cursor/rules/` — cross-agent governance

---

## Confirmation: out-of-scope items unchanged

- Supabase DDL migrations — not modified  
- Supabase edge functions — not modified  
- Export pipelines — not modified  
- Routes — not modified  
- Approved copy — not modified  
- Visual redesign — not modified  
- Comparison winner logic — not modified (Phase 5)  
- AWS / Next.js migration — not started  
