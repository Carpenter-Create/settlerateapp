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
| `results` | UI/compat projection of the **active** calculation (mortgage modes may include a regenerated amortization schedule when versions match) |
| `recalculationAvailable` | Deterministic stale flag: `activeCalculatorVersion !== CALCULATOR_VERSION` |

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

1. **Both snapshots present** — restore both **exactly as persisted** (no silent overwrite).
2. **Only one snapshot present** — mirror that snapshot into both.
3. **Legacy single `results` blob** — assign the same summarized legacy result to **both** `originalSnapshot` and `activeSnapshot`, preserving the stored `calculatorVersion`.
4. **Neither snapshots nor results** — recovery compute once via `calculateScenario` (broken/incomplete records only).
5. **Stale active version** — do **not** recalculate on open. Project UI `results` from the persisted active summary and expose `recalculationAvailable: true` via `getScenarioRecalculationState`.
6. **Current active version** — may regenerate typed `results` / amortization for UI from inputs under the same calculator generation; snapshots remain the persisted values.

Hydration never replaces `activeSnapshot` because `CALCULATOR_VERSION` advanced.

## Stale-version / recalculation-available state

```ts
getScenarioRecalculationState(scenario) => {
  recalculationAvailable: boolean; // activeCalculatorVersion !== CALCULATOR_VERSION
  activeCalculatorVersion: string;
  originalCalculatorVersion: string;
  currentCalculatorVersion: string; // CALCULATOR_VERSION
}
```

Phase 3 does **not** add public UI for this flag. Callers may read the state and invoke `ScenarioStore.recalculateScenario(id)`.

## Recalculation (explicit only)

Recalculation is intentional and durable:

| Path | Behavior |
|------|----------|
| `ScenarioStore.recalculateScenario(id)` | Preferred: `recalculateActiveSnapshot` then **immediate persist** via the shared scenario update path |
| `recalculateActiveSnapshot(scenario)` | Pure in-memory transform (tests / composition); must not be used alone for durable state |
| `updateScenarioInputs` | Input edit recomputes active and persists through `updateScenario` |

Explicit recalculation:

- updates `activeSnapshot` + `activeCalculatorVersion` (+ `results` / `calculatorVersion` alias) only
- leaves `originalSnapshot` and `originalCalculatorVersion` **byte-stable**
- persists the new active snapshot immediately (no in-memory-only divergence)
- does not create version history beyond this bounded dual-snapshot model

## Duplication (`duplicate_scenario` RPC)

The SQL RPC inserts a copy of the source row (may still carry pre-v2 `derived`). The client **must not** leave that row dependent on a later reload:

1. Call `duplicate_scenario`
2. Fetch the new row id
3. `materializeDuplicatedScenario(source, serverRow)` — schema **2**, dual snapshots, version aliases
4. Persist immediately via `updateInSupabase` (same update path as other writes)

Offline/fallback duplication uses `duplicateScenarioData` directly (already schema v2).

## Input updates vs original baseline

`updateScenarioInputs` recomputes the active snapshot from the new inputs under the current calculator while preserving the original snapshot as the audit baseline of the first established calculation. The store persists that update immediately.

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
- Public recalculation UI control
- Next.js / AWS migration
