# SettleRate Financial Methodology

**Status:** Founder-approved methodology for calculator version **2.0.0**  
**Last updated:** 2026-08-03  
**Scope:** Defines calculation semantics for pre-migration remediation. Distinguishes **implemented 2.0.0 engine behavior**, remaining **deferred** scope (Phase 3+), and historical **1.0.0** gaps where still relevant.

---

## 1. Purpose

This document is the authoritative reference for how SettleRate models mortgage scenarios, compares outcomes, and reports financing costs. It governs benchmark tests in `src/lib/__tests__/fixtures/` and calculator implementation.

---

## 2. Primary comparison metric: financing cost

### Approved methodology (2.0.0)

**Financing cost over the selected decision horizon** is the **primary** metric for comparisons and “least expensive option” ranking.

Financing cost **includes**:

- Interest
- Financing fees
- Discount points
- Mortgage insurance (PMI/MI premiums where modeled)
- Other explicitly defined borrowing costs

Financing cost **excludes**:

- **Principal repayment** (equity accumulation, not a financing cost)

**Principal reduction** is reported separately as `principalReductionOverHorizon`.

**All-in monthly housing payment** (P&I + escrow when enabled) is a **secondary** cash-flow metric. It must **not** determine the primary comparison winner.

### Prohibited definition

Do **not** define total cost as **loan principal + interest** for comparison purposes.

### Current implemented behavior (2.0.0 engine)

- `calculateMortgage()` exposes `financingCostOverHorizon` = interest + MI premiums over horizon + refinance closing costs when applicable; **excludes principal**.
- `principalReductionOverHorizon` is reported separately.
- `calculateScenario()` maps these fields for purchase, refinance, HELOC, and assumption.
- Legacy field `totalCost` remains `loanAmount + totalInterest` for compatibility; it is **not** the approved primary comparison metric.

### Still deferred

- **Comparison winner logic (Phase 5 / DEF-003):** `comparisonSummary.determineLowestCost()` still ranks by `results.totalCost`.
- **Exports:** financing cost / principal reduction labeling in export pipelines is not part of Phase 2 closeout.

---

## 3. Decision horizon by scenario type

| Type | Horizon | Source |
|------|---------|--------|
| Purchase / Refinance | Full modeled loan term (`payoffMonths`) | `src/lib/mortgage.ts` |
| HELOC | Draw period + repayment period | `src/lib/heloc.ts` |
| Assumption | Assumed loan remaining term (gap instrument costs included over its term) | `src/lib/assumption.ts` |

Horizon must be stated in comparison and export copy (“over the modeled term”). `decisionHorizonMonths` is exposed on mortgage and unified results.

---

## 4. Principal and equity

- Principal is **not** a cost.
- `principalReductionOverHorizon` = cumulative scheduled + extra + origination principal over the horizon.
- Equity framing may reference down payment + principal reduction (exports — deferred).

---

## 5. Taxes, insurance, HOA, PMI

- Escrow (tax, insurance, HOA) affects **all-in monthly housing payment** only when `shared.includeEstimates === true`.
- **PMI/MI premiums** count toward **financing cost** when required and modeled.
- PMI required when LTV **exceeds** frozen `ScenarioAssumptions.pmiRemovalThreshold` (default 80%).
- Remediation: static PMI for life of schedule (no mid-schedule removal unless added later).

### Current vs historical

| Topic | Historical 1.0.0 | Current 2.0.0 |
|-------|------------------|---------------|
| PMI threshold | Hardcoded 80% in code | Uses frozen `assumptions.pmiRemovalThreshold` |
| Assumptions object | Stored, not applied | Applied in calculations, sensitivity, and integrity checks |

---

## 6. One-time principal timing

**Current (2.0.0):** Apply lump sum at **month 1 before first payment**, reducing opening balance (`DEF-007` resolved; BM-P05 active).

**Historical (1.0.0):** `oneTimePrincipalPayment` was collected in UI but not applied in amortization.

---

## 7. Refinance break-even

**Current (2.0.0):** Requires optional inputs:

- `currentInterestRate`
- `currentRemainingTermMonths`

Compute break-even only when both exist and monthly savings &gt; 0:

```
breakEvenMonths = ceil(closingCosts / (currentPI − newPI))
```

When absent: **omit** break-even value and narrative.

Synthetic `baseRate + 1.0%` has been **removed** from `src/lib/rateSensitivity.ts` (`DEF-009` resolved; BM-R04/R05/R06 active).

---

## 8. HELOC scope (remediation version)

- **Interest-only draw periods only.**
- Non-interest-only draw math remains **deferred** until implemented and benchmark-tested.
- **Current enforcement (DEF-010 / BM-H04):**
  - `calculateHeloc()` **rejects** `interestOnlyDraw=false`.
  - `HelocInputsPanel` does **not** expose a non-interest-only control.
  - No additional UI redesign is required for Phase 2.

`calculateHeloc()` in `src/lib/heloc.ts` is the authoritative module for HELOC math.

---

## 9. Loan assumption

- Gap amount = `purchasePrice − assumed.balance − downPaymentCash`.
- Gap methods: cash, second_loan, heloc (per `src/lib/assumption.ts`).
- LTV for assumption = `assumed.balance / purchasePrice` (assumed loan vs price).
- Financing cost = sum of interest components + assumption fees.

---

## 10. Rounding and tolerance

- Internal: IEEE double precision; no intermediate rounding.
- Display: UI formatting rules unchanged.
- **Benchmark tolerance:** ±$0.01 monetary; exact integer months where specified.
- Payoff dates: production uses calendar `setMonth`; tests may inject fixed `asOfDate` when needed.

---

## 11. Comparison normalization (2.0.0)

Unified projection fields (from `calculateScenario()`):

| Field | Role |
|-------|------|
| `financingCostOverHorizon` | Primary rank (**engine exposed**; UI winner deferred) |
| `principalReductionOverHorizon` | Separate reporting (**engine exposed**) |
| `allInMonthlyHousingPayment` | Secondary cash flow |
| `monthlyPaymentPrimary` | Type-appropriate primary payment |
| `rateForComparison` | Rate/APR column |
| `decisionHorizonMonths` | Disclosure |

**Note:** `calculateScenario()` dispatches correctly for HELOC/assumption and exposes financing fields.

**Still deferred:**

- **Persistence dispatch (Phase 3 / DEF-001):** save/load still call `calculateMortgage` for all modes (mortgage-shaped stored results).
- **Comparison UI winner (Phase 5 / DEF-003):** still uses `totalCost` ranking.

---

## 12. Calculator and schema versioning

| Version | Meaning |
|---------|---------|
| `1.0.0` | Historical production baseline before Phase 2 semantics |
| `2.0.0` | **Current** (`CALCULATOR_VERSION` in `src/lib/scenarioContract.ts`) — financing cost metrics, one-time principal, applied assumptions, refinance break-even, HELOC IO enforcement |

### Persistence target (Phase 3 — not implemented)

Persist:

- `inputs`, `assumptions`, `schemaVersion`
- `originalCalculatorVersion`, `activeCalculatorVersion`
- `originalSnapshot`, `activeSnapshot` (summary only — **no** full amortization schedule by default)
- `calculatedAt` as **record metadata**, not inside deterministic result objects

**Lazy recompute on open:** preserve original snapshot; update active snapshot when calculator version advances. Do not silently overwrite historical records.

Amortization schedules: regenerate on demand; frozen exports may embed immutable schedules.

Phase 2 does **not** implement dual-snapshot persistence, automatic historical recomputation, or Supabase schema changes.

---

## 13. Deferred scope (not part of Phase 2)

- Comparison winner logic (`comparisonSummary`) — **Phase 5**
- `calculateScenario` persistence dispatch — **Phase 3**
- Original/active snapshot persistence (BM-V01) — **Phase 3**
- Export pipeline refactors
- Entitlements / free-tier scenario save limits
- Supabase schema changes
- Income context (`IncomeContext` component)
- HELOC amortizing-draw behavior
- AWS / Cloudflare / Next.js migration
- OAuth providers
- Mid-schedule PMI removal modeling

---

## 14. Related documentation

- `docs/COPY_STANDARD.md` — comparison language (“least expensive”, not “best”)
- `docs/ROLES_AND_ENTITLEMENTS.md` — entitlements (save limits deferred)
- `TEST_BASELINE.md` — benchmark status matrix
- `src/lib/__tests__/fixtures/` — golden fixtures
- `AGENTS.md` / `.cursor/rules/` — cross-agent governance
