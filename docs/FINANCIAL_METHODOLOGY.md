# SettleRate Financial Methodology

**Status:** Founder-approved target for calculator version **2.0.0**  
**Last updated:** 2026-08-03  
**Scope:** Defines calculation semantics for pre-migration remediation. Distinguishes current **1.0.0** behavior, target **2.0.0** behavior, and **deferred** scope.

---

## 1. Purpose

This document is the authoritative reference for how SettleRate models mortgage scenarios, compares outcomes, and reports financing costs. It governs benchmark tests in `src/lib/__tests__/fixtures/` and future calculator implementation in Phase 2+.

---

## 2. Primary comparison metric: financing cost

### Approved methodology (2.0.0 target)

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

Do **not** define total cost as **loan principal + interest**.

### Current behavior (1.0.0)

- `calculateMortgage()` sets `totalCost = loanAmount + totalInterest` (`src/lib/mortgage.ts`).
- `comparisonSummary.determineLowestCost()` ranks by `results.totalCost` (`src/lib/comparisonSummary.ts`).
- This conflates principal with financing cost and is **not** approved methodology.

### Target behavior (2.0.0)

- Introduce `financingCostOverHorizon` per transaction type.
- Comparison winner uses financing cost; tie-breakers: total interest → all-in monthly → LTV.
- Exports label financing cost and principal reduction separately.

---

## 3. Decision horizon by scenario type

| Type | Horizon | Source |
|------|---------|--------|
| Purchase / Refinance | Full modeled loan term (`payoffMonths`) | `src/lib/mortgage.ts` |
| HELOC | Draw period + repayment period | `src/lib/heloc.ts` |
| Assumption | Assumed loan remaining term (gap instrument costs included over its term) | `src/lib/assumption.ts` |

Horizon must be stated in comparison and export copy (“over the modeled term”).

---

## 4. Principal and equity

- Principal is **not** a cost.
- `principalReductionOverHorizon` = cumulative scheduled + extra principal over the horizon.
- Equity framing may reference down payment + principal reduction (exports).

---

## 5. Taxes, insurance, HOA, PMI

- Escrow (tax, insurance, HOA) affects **all-in monthly housing payment** only when `shared.includeEstimates === true`.
- **PMI/MI premiums** count toward **financing cost** when required and modeled.
- PMI required when LTV **exceeds** frozen `ScenarioAssumptions.pmiRemovalThreshold` (default 80%).
- v1 remediation: static PMI for life of schedule (no mid-schedule removal unless added later).

### Current vs target

| Topic | 1.0.0 | 2.0.0 |
|-------|-------|-------|
| PMI threshold | Hardcoded 80% in code | Uses frozen `assumptions.pmiRemovalThreshold` |
| Assumptions object | Stored, not applied | Applied in calculations |

---

## 6. One-time principal timing

**Target (2.0.0):** Apply lump sum at **month 1 before first payment**, reducing opening balance.

**Current (1.0.0):** `oneTimePrincipalPayment` collected in UI but **not** applied in amortization (`DEF-007`).

---

## 7. Refinance break-even

**Target (2.0.0):** Requires optional inputs:

- `currentInterestRate`
- `currentRemainingTermMonths`

Compute break-even only when both exist and monthly savings &gt; 0:

```
breakEvenMonths = ceil(closingCosts / (currentPI − newPI))
```

When absent: **omit** break-even value and narrative.

**Current (1.0.0):** Uses synthetic `baseRate + 1.0%` in `src/lib/rateSensitivity.ts` (`DEF-009`) — **must be removed**.

---

## 8. HELOC scope (remediation version)

- **Interest-only draw periods only.**
- Non-interest-only draw is **deferred** until implemented and benchmark-tested.
- UI must not offer unsupported draw modes in remediation.

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
- Payoff dates: production uses calendar `setMonth`; tests inject fixed `asOfDate` when added (Phase 2+).

---

## 11. Comparison normalization (2.0.0)

Unified projection fields (from `calculateScenario()`):

| Field | Role |
|-------|------|
| `financingCostOverHorizon` | Primary rank |
| `principalReductionOverHorizon` | Separate reporting |
| `allInMonthlyHousingPayment` | Secondary cash flow |
| `monthlyPaymentPrimary` | Type-appropriate primary payment |
| `rateForComparison` | Rate/APR column |
| `decisionHorizonMonths` | Disclosure |

**Note:** `calculateScenario()` already dispatches correctly for HELOC/assumption; **persistence** and **comparison UI** still use mortgage-shaped stored results (`DEF-001`, `DEF-003`).

---

## 12. Calculator and schema versioning

| Version | Meaning |
|---------|---------|
| `1.0.0` | Current production baseline (`CALCULATOR_VERSION` in `src/lib/scenarioContract.ts`) |
| `2.0.0` | **Major** — financing cost semantics, persistence contract, corrected save/load, break-even, one-time principal, assumptions applied |

### Persistence target (Phase 3 — not implemented in Phase 1)

Persist:

- `inputs`, `assumptions`, `schemaVersion`
- `originalCalculatorVersion`, `activeCalculatorVersion`
- `originalSnapshot`, `activeSnapshot` (summary only — **no** full amortization schedule by default)
- `calculatedAt` as **record metadata**, not inside deterministic result objects

**Lazy recompute on open:** preserve original snapshot; update active snapshot when calculator version advances. Do not silently overwrite historical records.

Amortization schedules: regenerate on demand; frozen exports may embed immutable schedules.

---

## 13. Deferred scope (not part of remediation)

- Free-tier scenario save limits
- Income context (`IncomeContext` component)
- HELOC amortizing-draw behavior
- AWS / Cloudflare migration
- Supabase schema/export changes (Phase 1)
- OAuth providers
- Mid-schedule PMI removal modeling

---

## 14. Related documentation

- `docs/COPY_STANDARD.md` — comparison language (“least expensive”, not “best”)
- `docs/ROLES_AND_ENTITLEMENTS.md` — entitlements (save limits deferred)
- `TEST_BASELINE.md` — benchmark status matrix
- `src/lib/__tests__/fixtures/` — golden fixtures
