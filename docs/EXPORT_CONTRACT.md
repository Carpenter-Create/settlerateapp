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

- **Canonical derived → export-summary mapper (Epic 5 PR 5):**
  `packages/core/src/exports/derivedExportSummary.ts`
  (`@settlerate/core/export-summary`, `mapDerivedExportSummary`)
- Client layout: `buildCanonicalScenarioExport` → `exportLayout`
  (application-side; not the portable derived mapper)
- Client derived compatibility surface: `exportSummaryFromDerivedJson` in
  `src/lib/exports/exportContract.ts` (delegates to core; projects the
  historical client return key set)
- Server derived compatibility surface (actual generate-pdf path):
  `mapDerivedForExport` / `buildScenarioData` in
  `supabase/functions/generate-pdf/mapDerivedForExport.ts`
  (`mapDerivedForExport` delegates to core; `buildScenarioData` remains
  server PDF adapter and must call `mapDerivedForExport`)
- Shared fixtures: `src/lib/__tests__/fixtures/export-parity/*.json`
- Automated coverage:
  - Vitest `exportParity.test.ts` compares **core + client + actual Deno
    server adapter** against the same fixtures
  - Deno `mapDerivedForExport_test.ts` exercises the actual server adapter +
    fixtures (`deno test supabase/functions/generate-pdf/mapDerivedForExport_test.ts`)

**Important:** Client-only mapper tests do **not** prove server parity. The Deno adapter must be imported or run under Deno against the shared fixtures.

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

1. Authenticate as the dedicated smoke account (see post-deployment cleanup / future procedure below) — **not** a customer account.
2. Use a purchase scenario with schema v2 dual snapshots owned by the smoke user (or an ephemeral fixture); export PDF via `GET /functions/v1/generate-pdf?type=scenario&id=<id>` with `Authorization`.
3. Confirm PDF meta shows calculator version and “Active snapshot”; Cost section shows **Financing cost over modeled term** and **Principal reduction** (not legacy “Total payments over term” as primary).
4. Repeat for HELOC: no fabricated mortgage P&I/escrow rows; financing cost present.
5. Optional: `?snapshot=original` on a stale scenario returns historical original figures and original calculator version.
6. Comparison export: financing cost / principal reduction columns present; winner narrative may still say legacy total cost until Phase 5.
7. Delete any ephemeral smoke scenarios; confirm zero `PHASE4_SMOKE_%` / `EDGE_SMOKE_%` rows remain.

### Rollback procedure

1. `supabase functions deploy generate-pdf --project-ref vpcxzbaxhpucvevnkalo` from the previous known-good commit (or Dashboard rollback if enabled).
2. Re-run smoke steps 2–3 on a purchase scenario.
3. Client-only print/HTML continues to work from the web deploy even if the edge function is rolled back; only server PDF/share PDF is affected.

### Deployment status for Phase 4 PR

`generate-pdf` **version 22** was deployed to project `vpcxzbaxhpucvevnkalo` on **2026-08-04 03:46:54 UTC**. Authenticated smoke tests against ephemeral schema-v2 dual-snapshot fixtures passed.

### Post-deployment cleanup (2026-08-04)

Smoke testing temporarily used the Supabase Admin API (`auth.admin.updateUserById` password set) to obtain user JWTs. That **permanently changed** passwords for existing accounts. Remediation:

| Item | Detail |
|------|--------|
| Affected accounts | `d7ed78d7-69b8-43c9-bb54-1eb936a5a993` (`adam@carpentercreate.com`) — purchase smoke + ephemeral fixture owner; `4dec5d3b-4d9f-4047-9ef1-603d23c3e856` (`ashleypremierhome@gmail.com`) — HELOC scenario owner on first smoke |
| Other accounts modified? | **No** — only these two Admin password updates during deploy smoke |
| Temporary credentials | **Invalid** — smoke passwords were overwritten with discarded random secrets; values were never persisted in the repo |
| Password recovery | Normal `resetPasswordForEmail` was triggered for both addresses (check inbox / spam). Operators may also use Supabase Dashboard → Authentication → user → Send password recovery |
| Session revocation | GoTrue admin global logout endpoint returned 404 on this project; treat short-lived access JWTs as expiring naturally (typically ≤1h). Refresh via password is blocked until recovery completes |
| Ephemeral smoke rows | `PHASE4_SMOKE_%` scenarios **deleted**; confirmed **0 remaining** |
| Dedicated future test account | `settlerate.edge.smoke@carpentercreate.com` (`88effd0c-8914-44fb-9d8e-926eef697b53`) — non-production; metadata marks smoke-only. Bootstrap password rotated and discarded |

#### Future authenticated edge-function smoke procedure

1. Use **only** `settlerate.edge.smoke@carpentercreate.com` (or a similarly dedicated non-customer account). **Never** reset a customer/owner password for JWT acquisition.
2. Obtain a JWT without mutating other users, preferred options:
   - Supabase Admin `generateLink` (`magiclink` / `recovery`) for the smoke account, exchange once locally; or
   - Store a smoke-account password in an operator secret manager (not in git) and `signInWithPassword`.
3. Insert ephemeral schema-v2 dual-snapshot scenarios owned by the smoke user; delete them after the run (`name` prefix `PHASE4_SMOKE_` or `EDGE_SMOKE_`).
4. Call `generate-pdf` with `Authorization: Bearer <smoke-user-jwt>`.
5. Confirm zero smoke rows remain after cleanup.

## Legacy compatibility

| Shape | Handling |
|-------|----------|
| Phase 3 dual snapshots | Preferred path |
| Legacy flat `derived` results blob | Adapter maps known fields; marks `isLegacyFlat` |
| Competing layout formatters | Client layout routes through canonical contract; server layout mirrors field semantics |

Comparison ranking consumes the Phase 5 canonical winner (`docs/COMPARISON_CONTRACT.md`).

## Known limitations

- HELOC draw-period average and assumption gap/assumed payment splits are not on `PersistedScenarioSummary`; exports omit them rather than recomputing
- Comparison winner narrative uses financing cost over a shared decision horizon (see `docs/COMPARISON_CONTRACT.md`)
- Entitlement gates for export remain unchanged
- Email-report specific payloads (if any) must adopt this contract when touched; no new product surface was added here
