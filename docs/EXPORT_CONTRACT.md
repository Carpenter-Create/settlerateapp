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

- Client layout: `buildCanonicalScenarioExport` → `exportLayout`
- Client derived mapper: `exportSummaryFromDerivedJson` in `src/lib/exports/exportContract.ts`
- Server derived mapper (actual generate-pdf path): `mapDerivedForExport` / `buildScenarioData` in `supabase/functions/generate-pdf/mapDerivedForExport.ts`
- Shared fixtures: `src/lib/__tests__/fixtures/export-parity/*.json`
- Automated coverage:
  - Vitest `exportParity.test.ts` imports the **actual** Deno module and compares both mappers to fixtures
  - Deno `mapDerivedForExport_test.ts` exercises the same module + fixtures (`deno test supabase/functions/generate-pdf/mapDerivedForExport_test.ts`)

**Important:** Client-only mapper tests do **not** prove server parity. The Deno implementation must be imported or run under Deno against the shared fixtures.

Intentional differences:

- Server PDF typography/spacing may differ slightly from browser print CSS
- Comparison **winner narrative** remains legacy until Phase 5 on both sides
- Escrow line-item detail on server PDF may be unavailable when only summary snapshots are stored
- `ScenarioResults.ltvRatio` is numeric on the server layout object; null summary LTV projects to `0` for PDF tables while the shared summary mapper returns `null`

## Schema / deployment impact

- **No Postgres DDL.** Dual snapshots remain in `derived` JSON.
- Edge function `generate-pdf` must be redeployed for server PDF alignment (see deployment checklist below).
- Client schema version unchanged (v2).

## Deployment checklist — `generate-pdf`

Phase 4 client export alignment ships with the web app deploy. **Server PDF alignment requires a separate edge-function deploy.** Repository governance does **not** authorize agents to deploy edge functions by default; a human operator (or an explicitly authorized deploy task) must run this.

| Item | Value |
|------|--------|
| Function name | `generate-pdf` |
| Project ref | `vpcxzbaxhpucvevnkalo` (see `supabase/config.toml`) |
| JWT verify | `verify_jwt = false` in `supabase/config.toml` (auth checked inside the function via user JWT) |
| Approved command | `supabase functions deploy generate-pdf --project-ref vpcxzbaxhpucvevnkalo` |
| Alternate | Supabase Dashboard → Edge Functions → `generate-pdf` → Deploy from linked repo/CLI |
| Required env (platform-provided) | `SUPABASE_URL`, `SUPABASE_ANON_KEY` (read via `Deno.env` in the function) |
| Required secrets | None beyond project defaults for this function (caller supplies `Authorization` bearer token) |
| Related function | `export-share` invokes PDF generation; redeploy `generate-pdf` even if `export-share` is unchanged |
| Safe after merge? | **Yes** — mapping is additive/corrective for Phase 3 `derived` dual snapshots; deploy after merge to `main` (or from the release commit). No DDL. Rollback = redeploy previous function bundle. |

### Smoke-test procedure (post-deploy)

1. Authenticate as a user who can export (Professional Review / admin per product rules).
2. Open a purchase scenario saved under schema v2 dual snapshots; export PDF via the in-app export flow (or `GET /functions/v1/generate-pdf?type=scenario&id=<id>` with `Authorization`).
3. Confirm PDF meta shows calculator version and “Active snapshot”; Cost section shows **Financing cost over modeled term** and **Principal reduction** (not legacy “Total payments over term” as primary).
4. Repeat for HELOC: no fabricated mortgage P&I/escrow rows; financing cost present.
5. Optional: `?snapshot=original` on a stale scenario returns historical original figures and original calculator version.
6. Comparison export: financing cost / principal reduction columns present; winner narrative may still say legacy total cost until Phase 5.

### Rollback procedure

1. `supabase functions deploy generate-pdf --project-ref vpcxzbaxhpucvevnkalo` from the previous known-good commit (or Dashboard rollback if enabled).
2. Re-run smoke steps 2–3 on a purchase scenario.
3. Client-only print/HTML continues to work from the web deploy even if the edge function is rolled back; only server PDF/share PDF is affected.

### Deployment status for Phase 4 PR

Deployment is **out of scope for automated PR closeout** unless an authorized operator runs the command above. Treat “edge deploy of `generate-pdf`” as a **remaining blocker for production server PDF correctness** until completed.

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
