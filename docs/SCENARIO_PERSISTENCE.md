# Scenario Persistence Contract (Phase 3)

Authoritative dual-snapshot persistence for SettleRate scenarios. Aligns with `docs/FINANCIAL_METHODOLOGY.md` §12 and BM-V01 / DEF-001 (store dispatch).

## Terminology

| Concept | Meaning |
|---------|---------|
| `originalSnapshot` | Immutable historical summary from the scenario’s original save / established baseline |
| `activeSnapshot` | Current summary used by the application; may be recalculated under a newer calculator |
| `originalCalculatorVersion` | Calculator version that produced `originalSnapshot` |
| `activeCalculatorVersion` | Calculator version that produced `activeSnapshot` |
| `calculatorVersion` | Compatibility alias of `activeCalculatorVersion` |
| `calculatedAt` | ISO metadata on each snapshot — **not** part of deterministic math |
| `results` | UI/compat projection of the **active** calculation (mortgage modes may include a regenerated amortization schedule) |

Do not introduce competing names (`originalCalculation` / `activeCalculation`) in code. Those phrases in product discussion map to the snapshot fields above.

## Authoritative calculation dispatch

All create, update, duplicate, hydrate, and recalculate paths must use `calculateScenario` (via `computeScenarioBundle` / `hydrateScenarioData`):

| Mode | Calculator |
|------|------------|
| `purchase` | `calculateMortgage` |
| `refinance` | `calculateMortgage` |
| `heloc` | `calculateHeloc` only — **never** `calculateMortgage` |
| `assumption` | `calculateAssumption` only — **never** `calculateMortgage` |

## Persisted shape

### In-memory / local fallback (`ScenarioData`)

- `inputs`, `assumptions`, `schemaVersion` (current: **2**)
- `originalSnapshot`, `activeSnapshot` (summary only — **no** full amortization by default)
- `originalCalculatorVersion`, `activeCalculatorVersion`
- `results` — derived projection for existing UI surfaces

### Supabase

No table migration in Phase 3. Dual-snapshot fields are stored in the existing JSON `derived` column:

```json
{
  "assumptions": { "...": "..." },
  "sourceScenarioId": null,
  "calculatorVersion": "2.0.0",
  "originalCalculatorVersion": "2.0.0",
  "activeCalculatorVersion": "2.0.0",
  "originalSnapshot": {
    "calculatorVersion": "2.0.0",
    "calculatedAt": "2026-08-03T00:00:00.000Z",
    "summary": { "type": "purchase", "monthlyPaymentPrimary": 0, "...": "..." }
  },
  "activeSnapshot": { "...": "same shape..." }
}
```

`inputs` continue to use `serializeInputsForSupabase` / `deserializeInputsFromSupabase` with create/update parity for all modes.

## Snapshot summary contents

Each snapshot `summary` is a `PersistedScenarioSummary`: unified comparison metrics only (payment, interest, financing cost, principal reduction, horizon, LTV, principal amount, type). Amortization schedules are **not** persisted; regenerate on demand when `activeCalculatorVersion` matches the running calculator.

## Hydration

Implemented by `hydrateScenarioData`:

1. **Both snapshots present** — restore both; regenerate live `results` when active version is current.
2. **Only one snapshot present** — mirror that snapshot into both.
3. **Legacy single `results` blob** — assign the same summarized legacy result to **both** `originalSnapshot` and `activeSnapshot`, preserving the stored `calculatorVersion`.
4. **Neither snapshots nor results** — recovery compute once via `calculateScenario` (broken/incomplete records only).
5. **Lazy recompute on open** (default): if `activeCalculatorVersion !== CALCULATOR_VERSION`, recompute **active only**; never mutate `originalSnapshot`.

Hydration does **not** silently overwrite historical originals.

## Recalculation

- Must be intentional: `recalculateActiveSnapshot`, input updates via `updateScenarioInputs`, or lazy recompute on open when the calculator version advances.
- Updates `activeSnapshot` + `activeCalculatorVersion` (+ `results` / `calculatorVersion` alias) only.
- Leaves `originalSnapshot` and `originalCalculatorVersion` unchanged.
- No version history beyond this bounded dual-snapshot model in Phase 3.

## Input updates vs original baseline

`updateScenarioInputs` recomputes the active snapshot from the new inputs under the current calculator while preserving the original snapshot as the audit baseline of the first established calculation.

## Schema

| Version | Meaning |
|---------|---------|
| 0 | Pre-versioning / legacy flat inputs |
| 1 | Namespaced inputs + assumptions |
| 2 | Dual-snapshot fields (promoted in migration; snapshots often filled at hydration) |

Client `schema_version` column may store `2`. No Postgres DDL change is required for Phase 3.

## Out of scope (later phases)

- Comparison winner normalization (Phase 5)
- Export pipeline changes
- Entitlement / save-limit enforcement
- Broad schema redesign or deletion of legacy fields
- Next.js / AWS migration
