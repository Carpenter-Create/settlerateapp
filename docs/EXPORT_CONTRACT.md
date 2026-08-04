# Export Contract (Phase 4)

Canonical export semantics for printable HTML, client downloads, share/PDF edge functions, and related report payloads. Aligns with `docs/FINANCIAL_METHODOLOGY.md` (financing cost vs principal) and Phase 3 dual snapshots (`docs/SCENARIO_PERSISTENCE.md`).

## Entry points

| Path | Role | Data source |
|------|------|-------------|
| `src/lib/exports/exportContract.ts` | Canonical payload builder | In-memory `ScenarioData` snapshots |
| `src/lib/exports/exportLayout.ts` | Printable/HTML layout adapter | Canonical export |
| `src/lib/exports/exportPDF.ts` | Client print/download wrappers | Layout → HTML |
| `src/lib/scenarioExport.ts` | Re-export shim | Client exports |
| `supabase/functions/generate-pdf` | Server PDF (jsPDF) | Supabase `derived` JSON via dual-snapshot mapper |
| `supabase/functions/export-share` | Share orchestration | Invokes generate-pdf / share token flow |
| UI: `ExportModal`, `ExportButtons`, `PrintController`, `useExportShare` | Triggers only | No calculation logic |

There is no separate CSV/JSON product export today. Share/download payloads that include scenario figures must use this contract (or the derived-JSON mapper mirror).

## Snapshot selection

| Option | Behavior |
|--------|----------|
| Default / `snapshot=active` | Export `activeSnapshot` values |
| Explicit `snapshot=original` | Export `originalSnapshot` only when requested (client option or `?snapshot=original` on generate-pdf) |
| Stale active | Export persisted active values; disclose calculator version and `recalculationAvailable`; **never recalculate during export** |

Comparison exports use each scenario’s **active** snapshot. Ranking/winner narrative may still use legacy `totalCost` until Phase 5 — labeled “(legacy)” where shown as a delta.

## Canonical metrics

Primary long-horizon metrics (never present principal repayment as “cost”):

- `financingCostOverHorizon` — borrowing costs over the modeled term; **excludes** principal repayment
- `principalReductionOverHorizon` — principal repaid over the modeled term (separate)
- `decisionHorizonMonths` — modeled term length
- `allInMonthlyHousingPayment` — **secondary** cash-flow metric, not primary ranking cost
- `totalInterest` — interest component
- `legacyTotalCost` — compatibility only; not the primary export cost label

Metadata (required on scenario exports):

- `calculatorVersion` (version of the **selected** snapshot)
- `activeCalculatorVersion` / `originalCalculatorVersion`
- `scenarioType` / `schemaVersion`
- `recalculationAvailable` / `currentCalculatorVersion`
- `snapshotSource`

Unsupported fields are **null** (or omitted in layout), never fabricated.

## Scenario-type behavior

### Purchase / refinance

Emit financing cost, principal reduction, all-in monthly, horizon, interest, LTV, principal amount. Escrow/PMI/HOA detail may come from current UI `results` only when exporting the **active** snapshot under the **current** calculator generation. Refinance may include closing costs from inputs as financing fees.

### HELOC

Use HELOC summary semantics only. Do **not** emit mortgage P&I / escrow / PMI / LTV as if they were valid HELOC amortization fields. Interest-only draw-period meaning is preserved via methodology disclosure; draw-period average is omitted when not present on the persisted summary.

### Assumption

Use assumption summary semantics only. Do **not** flatten into a standard mortgage amortization layout. Gap / assumed payment components are omitted when not present on the persisted summary (rather than inventing mortgage-shaped substitutes).

## Server / client parity

- Client: `buildCanonicalScenarioExport` → layout
- Server: `buildScenarioData` reads `derived.activeSnapshot` / `originalSnapshot` (legacy flat `derived` via adapter)
- Shared field mapping for persisted JSON: `exportSummaryFromDerivedJson` (client) mirrored by generate-pdf `buildScenarioData`
- Deno cannot import Vite `@/` modules; parity is enforced by Vitest comparing canonical export metrics to the derived-JSON mapper for the same scenario row

Intentional differences:

- Server PDF typography/spacing may differ slightly from browser print CSS
- Comparison **winner narrative** remains legacy until Phase 5 on both sides
- Escrow line-item detail on server PDF may be unavailable when only summary snapshots are stored

## Schema / deployment impact

- **No Postgres DDL.** Dual snapshots remain in `derived` JSON.
- Edge function `generate-pdf` must be redeployed for server PDF alignment.
- Client schema version unchanged (v2).

## Legacy compatibility

| Shape | Handling |
|-------|----------|
| Phase 3 dual snapshots | Preferred path |
| Legacy flat `derived` results blob | Adapter maps known fields; marks `isLegacyFlat` |
| Competing layout formatters | Client layout routes through canonical contract; server layout mirrors field semantics |

Do not delete legacy comparison narrative helpers solely for cleanup while Phase 5 ranking remains open.

## Known limitations

- HELOC draw-period average and assumption gap/assumed payment splits are not on `PersistedScenarioSummary`; exports omit them rather than recomputing
- Comparison ranking / `comparisonSummary` winner text is Phase 5
- Entitlement gates for export remain unchanged in Phase 4
- Email-report specific payloads (if any) must adopt this contract when touched; no new product surface was added here
