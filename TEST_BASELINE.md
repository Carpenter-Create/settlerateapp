# SettleRate Financial Benchmark Baseline

**Branch:** `test/financial-benchmark-baseline`  
**Phase:** 1 — Test infrastructure and financial benchmark baseline  
**Calculator target:** 2.0.0  
**Baseline date:** 2026-08-03  
**Status:** CI green — lint (0 errors), typecheck, verify:benchmarks, test:run, build all pass

---

## Independent verification (`scripts/verify-benchmarks.mjs`)

Reproducible script; does **not** import production calculator code.

| Benchmark | Script verified | Method | Tolerance | Production calculator |
|-----------|-----------------|--------|-----------|----------------------|
| BM-P01 | ✅ | Standard PMT amortization | ±$0.01 | No |
| BM-P03 | ✅ | LTV + amortization (PMI is fixture input) | ±$0.01 | No |
| BM-R01 | ✅ | Standard PMT on refinance balance | ±$0.01 | No |
| BM-H02 | ✅ | Month-by-month IO draw + repay interest | ±$0.01 | No |
| BM-A02 | ✅ | Dual PMT (assumed + gap loan) | ±$0.01 | No |
| BM-P05 | ❌ | Documented in fixture; pending Phase 2 | ±$0.01 | No (not in script yet) |
| BM-P06 | ❌ | Target semantics only | — | No |
| BM-R04–R06 | ❌ | Pending Phase 2 | — | No |
| BM-M01 | ❌ | Migration field check (non-monetary) | — | N/A |
| BM-V01 | ❌ | Specification-only contract | — | N/A |

Run: `npm run verify:benchmarks`

| Category | Count |
|----------|-------|
| Active regression benchmarks | 8 |
| Active defect-documentation tests | 4 |
| Pending v2.0.0 target tests (`it.todo`) | 15 |
| Specification-only placeholders | 1 |
| **Total benchmark fixtures** | **16** |

---

## Defect registry (referenced by benchmarks)

| ID | Description | Phase |
|----|-------------|-------|
| DEF-001 | Persistence/comparison uses `calculateMortgage` for all modes; `totalCost` ranks comparisons; no dual snapshots | Phase 2–3 |
| DEF-003 | Comparison winner uses `totalCost` / all-in monthly instead of financing cost | Phase 5 |
| DEF-007 | `oneTimePrincipalPayment` ignored in amortization | Phase 2 |
| DEF-008 | `ScenarioAssumptions` stored but not applied (PMI threshold hardcoded) | Phase 2 |
| DEF-009 | Synthetic break-even rate `baseRate + 1.0%`; missing current-loan inputs | Phase 2 |
| DEF-010 | HELOC non-interest-only draw not blocked in UI | Phase 2 |

---

## Benchmark matrix

### Purchase

| ID | Type | Status | Target behavior | Current observed behavior | Defect | Phase | Verification |
|----|------|--------|-----------------|---------------------------|--------|-------|--------------|
| **BM-P01** | purchase | **active** | P&I $2,275.44; interest $459,160.16; 360 mo; LTV 80%; no PMI | `calculateMortgage` matches | — | — | ✅ `verify:benchmarks` |
| **BM-P03** | purchase | **active** | 19% down → PMI $150/mo when estimates on; 20% down → LTV 80%, no PMI | Matches at hardcoded 80% threshold | DEF-008 (threshold source) | Phase 2 | ✅ `verify:benchmarks` |
| **BM-P05** | purchase | **pending-v2** | $10k lump sum at month 1 → interest $404,312.79; payoff 332 mo | Lump sum ignored; same as P01 | DEF-007 | Phase 2 | ❌ Not in verify script yet |
| **BM-P06** | purchase | **pending-v2** | `financingCostOverHorizon` = interest + MI + fees; excludes principal | `totalCost` = loan + interest ($819,160.16) | DEF-001 | Phase 2 | ✅ Independent (target); baseline test documents v1 |

### Refinance

| ID | Type | Status | Target behavior | Current observed behavior | Defect | Phase | Verification |
|----|------|--------|-----------------|---------------------------|--------|-------|--------------|
| **BM-R01** | refinance | **active** | $300k @ 6.5%/30yr → P&I $1,896.20 | Matches | — | — | ✅ `verify:benchmarks` |
| **BM-R04** | refinance | **pending-v2** | Break-even 19 mo with current 7.5%/300mo vs new 6.5%/360mo, $6k closing | Not implemented; inputs not in type | DEF-009 | Phase 2 | ✅ Independent |
| **BM-R05** | refinance | **pending-v2** | Omit break-even when current-loan inputs absent | Synthetic rate used instead | DEF-009 | Phase 2 | ✅ Spec (omission rule) |
| **BM-R06** | refinance | **pending-v2** | No synthetic `baseRate + 1.0%` | `rateSensitivity.ts` contains pattern | DEF-009 | Phase 2 | ✅ Baseline grep test active |

### HELOC

| ID | Type | Status | Target behavior | Current observed behavior | Defect | Phase | Verification |
|----|------|--------|-----------------|---------------------------|--------|-------|--------------|
| **BM-H02** | heloc | **active** | IO draw capped at limit; end draw $50k; interest total ≈ $87,961.71 | `calculateHeloc` matches | — | — | ✅ `verify:benchmarks` |
| **BM-H04** | heloc | **pending-v2** | Interest-only draw only in remediation UI | Amortizing draw may still be selectable | DEF-010 | Phase 2 | Specification |

### Assumption

| ID | Type | Status | Target behavior | Current observed behavior | Defect | Phase | Verification |
|----|------|--------|-----------------|---------------------------|--------|-------|--------------|
| **BM-A02** | assumption | **active** | Second-loan gap: assumed P&I ≈ $1,001.25; gap ≈ $927.01; total ≈ $1,928.26; financing cost ≈ $167,236.36; LTV ≈ 57.14% | `calculateAssumption` matches | — | — | ✅ `verify:benchmarks` |
| *(BM-A02 persist)* | assumption | **pending-v2** | Save/load uses assumption results | Store uses `calculateMortgage` | DEF-001 | Phase 3 | Fixture exists |

### Cross-type comparison

| ID | Type | Status | Target behavior | Current observed behavior | Defect | Phase | Verification |
|----|------|--------|-----------------|---------------------------|--------|-------|--------------|
| **BM-C01** | cross | **pending-v2** | Rank by `financingCostOverHorizon` across P01/H02/A02 | Ranks by `totalCost` | DEF-001, DEF-003 | Phase 5 | ✅ Expected values in fixtures |
| **BM-C02** | cross | **pending-v2** | All-in monthly is secondary tie-breaker only | May determine winner today | DEF-003 | Phase 5 | Specification |
| **BM-C03** | cross | **pending-v2** | `principalReductionOverHorizon` separate from financing cost | Not exposed on unified results | DEF-001 | Phase 2 | ✅ Independent (P01 principal $360k) |

### Migration and versioning

| ID | Type | Status | Target behavior | Current observed behavior | Defect | Phase | Verification |
|----|------|--------|-----------------|---------------------------|--------|-------|--------------|
| **BM-M01** | migration | **active** | Legacy flat `inputs` → canonical namespaced v1 | `migrateScenario` preserves values | — | — | ✅ Pipeline inspection |
| **BM-V01** | versioning | **specification-only** | Dual snapshots; lazy recompute; `calculatedAt` metadata | Single results blob; overwrite on load | DEF-001 | Phase 3 | Contract documented; no API yet |

---

## Active tests (passing)

| Test file | Benchmark / topic |
|-----------|-------------------|
| `mortgage.benchmark.test.ts` | BM-P01, BM-P03 (×2), BM-R01 |
| `mortgage.benchmark.test.ts` | BM-P05 ignored lump sum (defect doc), BM-P01 totalCost semantics (defect doc) |
| `heloc.benchmark.test.ts` | BM-H02 |
| `assumption.benchmark.test.ts` | BM-A02 |
| `scenarioCalculator.benchmark.test.ts` | BM-P01, BM-H02, BM-A02 dispatch; unified totalCost baseline |
| `scenarioMigrations.test.ts` | BM-M01 |
| `financingCost.composition.test.ts` | BM-P06 totalCost baseline; BM-R06 synthetic rate grep |

---

## Pending tests (`it.todo` — 16 items)

| Benchmark | Reason | Phase |
|-----------|--------|-------|
| BM-P05 | One-time principal not applied | Phase 2 |
| BM-P01 financingCost metric | Metric not exposed | Phase 2 |
| BM-P06, BM-P03 MI composition, BM-C03 | Financing cost methodology | Phase 2 |
| BM-R04, BM-R05, BM-R06 | Break-even corrections | Phase 2 |
| BM-H04 | UI IO-only enforcement | Phase 2 |
| BM-H02 persist path | Store dispatch | Phase 2 |
| BM-A02 persist path | Store dispatch | Phase 3 |
| BM-C01, BM-C02, BM-C03 | Comparison normalization | Phase 5 |
| DEF-001 store layer | `calculateScenario` in save/load | Phase 3 |
| BM-V01 | Dual snapshot persistence | Phase 3 |

---

## Unresolved expected values

None. All fixture expected values are either independently verified or explicitly marked specification-only (BM-V01, BM-H04 UI contract, BM-R05 omission rule).

---

## Methodology vs implementation gaps

| Topic | Approved (2.0.0) | Current (1.0.0) | Deferred |
|-------|------------------|-----------------|----------|
| Primary metric | Financing cost over horizon | `totalCost` = principal + interest | — |
| Principal | Reported separately | Embedded in `totalCost` | — |
| Break-even | Requires current rate + term | Synthetic +1% rate | — |
| HELOC draw | Interest-only only | Calculator supports IO; UI may allow other modes | Amortizing draw math |
| Assumptions | Frozen at save, applied | Stored, ignored | — |
| Persistence | Dual snapshots, metadata `calculatedAt` | Single results, recompute overwrites | Full amortization on scenario row |
| Save limits | Not in remediation | Not enforced | Free-tier limits |
| Income context | Not mounted | Component exists, unused | — |

---

## CI pipeline

Workflow: `.github/workflows/ci.yml`

Steps: `npm ci` → `lint` → `typecheck` → `verify:benchmarks` → `test:run` → `build`

No production secrets required. No `continue-on-error` or failure suppression.

## ESLint

Full-repository lint with strict rules restored. **Ignored paths:** `dist` only.

Pre-existing errors fixed with behavior-neutral changes (see pre-commit report).

---

## Related files

- `docs/FINANCIAL_METHODOLOGY.md` — approved vs current vs target semantics
- `src/lib/__tests__/fixtures/` — golden JSON fixtures
- `vitest.config.ts` — Node environment, `@/` alias

---

## Production signature changes (Phase 1)

**None for financial formulas or deterministic dates.**

Infrastructure-only edits for CI green:

- Pre-existing lint errors fixed across 12 files (behavior-neutral)
- `src/lib/scenarioStore.ts` — `serializeInputsForSupabase()` Json boundary helper
- `src/hooks/useComparisons.ts` — Supabase Update typing for typecheck

### Supabase `inputs` Json boundary (`scenarioStore.ts`)

`MortgageInputs` has no index signature compatible with Supabase `Json`. `serializeInputsForSupabase()` uses JSON round-trip (`JSON.parse(JSON.stringify(inputs))`) to produce a Json-compatible value without importing calculator logic.

---

## Confirmation: out-of-scope items unchanged

- Supabase migrations — not modified  
- Supabase edge functions — not modified  
- Export pipelines — not modified  
- Routes — not modified  
- Approved copy — not modified  
- Visual design — not modified  
