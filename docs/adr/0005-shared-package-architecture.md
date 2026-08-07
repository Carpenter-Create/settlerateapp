# ADR 0005: Shared package architecture

- Status: accepted
- Date: 2026-08-06
- Epic: Phase 8.1 / Epic 5 (Shared Core Package)
- Deciders: Founder / Adam Carpenter

## Context

SettleRate currently duplicates drift-sensitive business contracts between the
Vite/React client (`src/lib/`) and Supabase Edge Functions
(`supabase/functions/_shared/`). After PR 2–3, entitlement, checkout
maintenance, subscription guards, observability redaction, and pure billing
snapshot mappers are single-sourced in `@settlerate/core` with re-export
shims / runtime adapters (shim-purity gated). Remaining shared/runtime
boundaries are limited to modules intentionally retained outside core,
including Stripe customer-resolution orchestration, Edge observability
runtime helpers, and export-runtime mappings. Runtime-specific orchestration
remains in adapters where required. Export semantics are protected by
`docs/EXPORT_CONTRACT.md` with a client builder and a server derived-JSON
mapper that must stay semantically aligned.

Roadmap Epic 5 calls for a shared `packages/core` so these contracts have one
canonical implementation across browser, Node test/scripts, and Deno Edge
runtimes. Without a binding ADR, agents could move UI/DOM code into the shared
package, change export or entitlement semantics during relocation, introduce a
second permanent mirror, or begin Next.js/AWS migration under the guise of
packaging.

**Epic 5 PR 0 is policy/governance only.** It does not create `packages/core`,
modify workspace configuration, move runtime code, change tests/CI, or begin
implementation PRs.

Related ADR still required (not written by this PR): **0012 — Entitlement
logic location** (SQL authority vs TS evaluator placement). This ADR does
**not** change the rule that database RPCs remain authoritative for grants;
it only decides how shared TypeScript contracts are packaged.

## Decision

### 1. Package purpose and boundary

**Canonical location:** `packages/core` (roadmap terminology preserved).

**Purpose:** Hold only deterministic, environment-neutral business contracts
and pure transformations that must remain identical across more than one
runtime (browser/Vite, Node tests/scripts, Deno Edge Functions).

**Belonging rule:** A symbol (or extractable subset of a file) may enter
`packages/core` only if:

1. it is **pure and deterministic** (no I/O, no SDK calls, no env reads, no
   randomness — see §4). Same inputs must yield the same outputs;
2. dependency injection of async retrieve/search/create callbacks does **not**
   make an orchestration function core-eligible if those callbacks perform
   network, billing, or Stripe side effects;
3. it encodes a contract or transformation that already has, or will have,
   more than one runtime consumer; and
4. relocating it does not require changing financial, entitlement, billing,
   checkout-maintenance, or export semantics.

Files may be **split**: pure types/mappers move to core; orchestration and
nondeterministic helpers remain in runtime adapters (or a “shared contract +
runtime adapter” split).

**Not a utilities package.** General helpers, React components, Supabase
clients, Stripe SDK wrappers, DOM printers, Vite config, and one-runtime
adapters stay outside `packages/core`.

### 2. Initial candidate inventory (repository-derived)

Classification key:

| Class | Meaning |
|-------|---------|
| **Move** | Approved Epic 5 candidate for `packages/core` |
| **Runtime-specific** | Stays in browser or Deno adapter layers |
| **Shared + adapters** | Pure contract/types in core; platform wiring stays outside |
| **Excluded** | Out of Epic 5 scope |
| **Unresolved** | Needs implementation-PR inspection before move |

| Candidate | Paths today | Class | Rationale |
|-----------|-------------|-------|-----------|
| Entitlement contract / evaluation | Canonical: `packages/core/src/entitlement/entitlementContract.ts` (`@settlerate/core/entitlement`); shims at former app/Edge paths | **Move** (PR 2) | Pure; dual consumers; shim-purity gated |
| Professional price allowlist / plan mapping | Same module (`PROFESSIONAL_PRICE_IDS`, `isAllowlistedProfessionalPrice`, `resolvePlanCodeFromPrice`) | **Move** | Part of entitlement contract |
| Checkout maintenance parse/response | Canonical: `packages/core/src/checkout/checkoutMaintenance.ts` (`@settlerate/core/checkout-maintenance`); shims at former paths | **Move** (PR 3) | Pure; env string injected by caller |
| Professional subscription guards | Canonical: `packages/core/src/checkout/professionalSubscriptionGuard.ts` (`@settlerate/core/subscription-guard`); shims at former paths | **Move** (PR 3) | Pure; allowlist callback injected |
| Stripe billing snapshot — pure mappers/types | Canonical: `packages/core/src/billing/stripeBillingSnapshot.ts` (`@settlerate/core/billing-snapshot`) | **Move** (PR 3) | Deterministic structural mapping; no network |
| Stripe billing snapshot — retrieval orchestration | Runtime adapters: `src/lib/stripeBillingSnapshot.ts`, `_shared/stripeBillingSnapshot.ts` (`resolveSubscriptionBillingSnapshot`) | **Runtime-specific** (Stripe/runtime adapter) | Invokes injected retrieve; DI does not make it side-effect-free |
| Stripe customer resolve — pure types/helpers | `_shared/stripeCustomerResolve.ts`: `StripeCustomerLike`; `StripeCustomerResolution`; `resolveStripeCustomerByUserId`; `stripeCustomerMetadataSearchQuery` (and other purely structural types as appropriate) | **Move** | Deterministic selection/query-string helpers |
| Stripe customer resolve — checkout orchestration | Same file: `resolveCheckoutCustomer` (+ `CheckoutCustomerResolutionDeps` wiring used only by it) | **Shared + adapters** / **Runtime-specific** orchestration | Injected deps may query billing, search Stripe, verify ownership, and create customers — stays in Edge/Stripe adapter |
| Observability redaction | Canonical: `packages/core/src/observability/observabilityRedaction.ts` (`@settlerate/core/observability-redaction`); shims at former paths | **Move** (PR 3) | Pure; dual consumers; shim-purity gated |
| Edge observability — deterministic helpers | `_shared/observability.ts`: `isEdgeObservabilityEnabled`; `buildEdgeExtra`; `EdgeObservabilityContext` (and structural types) | **Move** | Pure/deterministic; not a copy of client observability |
| Edge observability — request ID generation | `_shared/observability.ts`: `generateRequestId` | **Runtime-specific** | Uses `crypto.randomUUID()` — environment-neutral but **nondeterministic**; keep in adapter. Core may hold ID types, validation/normalization, or accept an injected ID |
| App origin allowlist for Checkout/Portal | `_shared/appOrigin.ts` | **Shared + adapters** | Pure allowlist + `Request` (Fetch standard). Keep function-local wiring in Edge adapters |
| Auth redirect origin helper | `src/lib/authRedirect.ts` | **Shared + adapters** | Shared origin-allowlist constants may live in core; `VITE_APP_ORIGIN` injection stays browser-side. Do not merge APIs blindly with `appOrigin` |
| Client Sentry init / capture | `src/lib/observability.ts` | **Runtime-specific** | `@sentry/react`, `import.meta.env` |
| Edge Sentry SDK wiring | `_shared/sentry.ts` | **Runtime-specific** | `npm:@sentry/deno`, Deno env |
| Observability release helper | `src/lib/observabilityRelease.ts` | **Runtime-specific** | Build/CI env (`VERCEL_GIT_COMMIT_SHA` / `GITHUB_SHA`) for Vite |
| Export summary from derived JSON / server mapper | `src/lib/exports/exportContract.ts` (`exportSummaryFromDerivedJson`) + `supabase/functions/generate-pdf/mapDerivedForExport.ts` | **Unresolved → prefer Move if decoupling succeeds** | Semantic parity today via fixtures; unify only if types can be shared without pulling the mortgage engine or changing `docs/EXPORT_CONTRACT.md` |
| Canonical scenario export builder | `src/lib/exports/exportContract.ts` (`buildCanonicalScenarioExport`) | **Unresolved** | Depends on `@/lib/mortgage`, `@/lib/scenarioContract`, `@/lib/scenarioPersistence` types — may need type extraction first |
| Export HTML layout | `src/lib/exports/exportLayout.ts` | **Runtime-specific** | Presentation adapter |
| Export PDF / print | `src/lib/exports/exportPDF.ts` | **Runtime-specific** | DOM (`document`, `window.print`) |
| UI Stripe price display / PRICING | `src/lib/stripe.ts` | **Runtime-specific** | UI amounts; may import allowlist symbols from core |
| Entitlement resolver (RPC client) | `src/lib/entitlementResolver.ts` | **Runtime-specific** | Supabase client; no confirmed production importers (possible dead code — verify in implementation) |
| Authz / admin capabilities | `src/lib/authz.ts` | **Runtime-specific** | Supabase client |
| Mortgage formulas / calculator | `src/lib/mortgage*` (and benchmarks) | **Excluded** | Financial engine; not Epic 5 |
| SQL entitlement RPCs | `public.evaluate_entitlement`, `feature_allowed`, migrations | **Excluded** | Authority stays in Postgres; TS package must stay parity-tested, not replace SQL |
| Next.js / AWS / Cloudflare adapters | — | **Excluded** | Future consumers allowed by design; migration not authorized |

### 3. Runtime compatibility

**Supported consumers (Epic 5):**

1. Browser / Vite application (`src/`)
2. Node-based tests and scripts (`vitest`, `scripts/*.mjs`)
3. Supabase Edge Functions on Deno (`supabase/functions/`)

**Future consumers (design-only):** Next.js / AWS runtimes may import
`packages/core` later. Epic 5 must not begin those platform migrations.

**Constraints for `packages/core`:**

- Standards-based **ESM** only (`"type": "module"`).
- **Prohibited in core:** Node-only APIs, Deno-only APIs, DOM APIs, Supabase
  client, Stripe SDK, filesystem, `process.env`, `import.meta.env`, React,
  framework routers.
- **Allowed:** ECMAScript language features; Fetch API types such as
  `Request` when used as pure inputs (no network).
- **Not core-eligible despite being environment-neutral:** nondeterministic
  APIs such as `crypto.randomUUID()` (adapters generate IDs; core may
  validate/normalize or accept injected IDs).
- **Environment access:** callers inject env strings, SDK clients, retrieve
  functions, and request IDs; core never reads env itself and never
  generates random IDs.
- **Consumption model (initial):** TypeScript **source** is consumed directly
  via npm workspaces + package `exports` (no mandatory compile step in the
  first scaffold). A build step may be added later if Deno/Vite require it —
  separately authorized within an implementation PR.
- **Deno resolution:** no permanent copy-mirrors. Prefer a Deno import map /
  `deno.json` (or Supabase-supported equivalent) mapping
  `@settlerate/core` (or agreed package name) to `packages/core` source.
  Relative imports into `packages/core` are acceptable as a temporary bridge
  with an explicit deletion condition.
- **npm workspaces:** `"workspaces": ["packages/*"]` and
  `packages/core/package.json` are added in **PR 1** (scaffold).
- **Import path:** application and tests migrate to a stable package name
  (recommended `@settlerate/core`); temporary re-export shims may remain at
  old `src/lib/*` and `_shared/*` paths until removed.

### 4. Pure core versus adapters

| Layer | Contents |
|-------|----------|
| **Core** (`packages/core`) | Domain contracts, pure deterministic evaluators/mappers, shared constants, structural Stripe-like types |
| **Browser adapters** | `src/lib/observability.ts`, `exportPDF.ts`, Vite/`import.meta.env` wiring |
| **Supabase/Deno adapters** | `_shared/sentry.ts`, `generateRequestId`, function `index.ts` handlers, `Deno.env` reads |
| **Stripe / billing adapters** | Stripe SDK client construction; `resolveSubscriptionBillingSnapshot`; `resolveCheckoutCustomer`; other injectable retrieve/search/create orchestration |
| **Persistence/DB adapters** | Supabase JS client, SQL RPCs |
| **UI presentation adapters** | React components, `exportLayout`, pricing display |

**Core must not:** perform network calls, database queries, auth resolution,
env reads, Stripe/Supabase SDK calls, browser storage, logging/telemetry side
effects, or nondeterministic ID generation.

**Dependency injection rule:** Injecting an async function that performs I/O
does **not** make the caller core-eligible. Orchestrators such as
`resolveSubscriptionBillingSnapshot` and `resolveCheckoutCustomer` remain in
runtime adapters even when their deps are parameters.

**Justified exceptions:** none. Reading fields from an injected `Request` for
pure allowlist checks is allowed; generating UUIDs is not.

### 5. Source-of-truth rule

- Each shared business behavior has **one** canonical implementation in
  `packages/core`.
- **No permanent manual copy synchronization.** Existing “Keep in sync”
  comments are transitional debt to eliminate.
- **No two canonical implementations.** Hash gates that compare two trees are
  replaced by single-source imports (or temporary shims that only re-export).
- Tests must import or exercise the **same** canonical module wherever
  technically possible (Vitest and Deno both resolve to `packages/core`).
- **Temporary compatibility shims** (re-exports at old paths) are allowed
  during migration and must declare a deletion condition: “remove when all
  importers use `@settlerate/core` and CI proves both runtimes.”

### 6. Export-contract fence

Epic 5 **may** relocate export-related implementation and update imports.

Epic 5 **may not** change, without separate explicit architectural
authorization:

- export fields or field meanings;
- omission rules;
- snapshot-selection behavior;
- historical-value behavior;
- calculator-version disclosure;
- comparison winner language;
- any other behavior governed by `docs/EXPORT_CONTRACT.md`.

Protected surfaces remain: `docs/EXPORT_CONTRACT.md`,
`supabase/functions/generate-pdf/mapDerivedForExport.ts`,
`src/lib/exports/`.

### 7. Financial and entitlement semantics

Extraction must be **behavior-preserving**.

Epic 5 must **not** change: mortgage formulas; calculator versions; benchmark
values; financing-cost semantics; entitlement outcomes; plan mappings;
scenario limits; billing status interpretation; checkout maintenance
behavior; admin bypass semantics; Stripe price allowlists.

Discovered defects are reported and handled under a separately authorized
defect PR — never silently “fixed” during relocation.

SQL entitlement RPCs remain authoritative for grants. The shared TS
evaluator stays a parity surface for Edge/UI (see also future ADR 0012).

### 8. Dependency direction

```
runtime adapters / application / edge functions
        ↓
packages/core
        ↓
(no application, framework, infrastructure, or runtime-specific code)
```

`packages/core` must not import from: `src/`, `supabase/functions/`, React
components, application contexts, infrastructure code, or runtime adapters.

**External packages:** runtime dependencies inside core are disallowed by
default. Type-only imports from ambient/DOM lib types are avoided; prefer
structural typing. If a tiny pure dependency is ever proposed (e.g. a types
package), it requires a separate authorized decision — not implied by this ADR.

### 9. Public API and exports

Principles for the future package:

- Explicit **named exports** from stable domain entry points (e.g.
  `entitlement`, `checkoutMaintenance`, `billingSnapshot`, `redaction`).
- No broad wildcard barrel that unintentionally exports internals.
- Internal helpers remain non-exported or clearly marked `@internal`.
- Repository-local compatibility: consumers track `main`; no npm publish in
  Epic 5.
- No circular dependencies within the package.

**Proposed layout** (PR 1 creates the scaffold shell only; domain folders
arrive in later authorized PRs):

```
packages/core/
  package.json
  README.md
  tsconfig.json
  deno.json                  # import-map proof for @settlerate/core → src
  src/
    index.ts                 # curated public re-exports only (scaffold marker in PR 1)
    entitlement/             # PR 2+
    checkout/                # PR 3+
    billing/                 # PR 3–4+
    observability/           # PR 3–4+
    origin/                  # PR 4+
    exports/                 # PR 5 if justified
```

Exact domain filenames are fixed in implementation PRs.

### 10. Testing standard

Future Epic 5 implementation PRs must ensure:

- Existing behavioral tests remain green before and after each move.
- Contract tests execute against the shared implementation.
- Browser/Node (Vitest) and Deno consumers prove parity for migrated modules.
- `npm run verify:benchmarks` remains authoritative for financial BM fixtures.
- Export parity remains protected (`exportContract` / `exportParity` tests;
  Deno `test:export-parity-deno` should be wired into CI when export code is
  touched or as part of Epic 5 closure).
- Entitlement SQL parity (`test:entitlement-sql`) remains protected.
- No snapshot-only evidence for critical financial or authorization behavior.
- CI tests every supported runtime/import path for migrated modules.

**Dual-run during extraction:** required while both a shim path and the
package path exist — either (a) shim is a pure re-export (preferred) so one
implementation is loaded, or (b) temporary equality assertions compare old and
new until the shim is deleted. Prefer (a).

### 11. Migration sequence (binding proposal)

Each step is a **separately authorized** implementation PR. Order derived from
current mirrors and risk (pure, already-duplicated modules first; export last
because of type coupling).

| PR | Scope |
|----|--------|
| **PR 0** | This ADR + minimum governance status (no code moves) |
| **PR 1** | Workspace / `packages/core` scaffold; package name + exports map; typecheck/CI wiring; **no behavioral migration** |
| **PR 2** | Move `entitlementContract` (incl. price allowlist / plan mapping); replace dual trees with shims → core; keep SQL parity + hash/shim gates green |
| **PR 3** | Move `checkoutMaintenance`, `professionalSubscriptionGuard`, `observabilityRedaction`, and **pure** billing-snapshot mappers/types (`mapSubscriptionToBillingSnapshot`, period/invoice extractors, structural Stripe-like types). Leave `resolveSubscriptionBillingSnapshot` in a Stripe/runtime adapter (shim may re-export adapter + core). |
| **PR 4** | Move **pure** customer-resolve helpers (`StripeCustomerLike`, `StripeCustomerResolution`, `resolveStripeCustomerByUserId`, `stripeCustomerMetadataSearchQuery`); shared origin helpers (`appOrigin` pure parts); deterministic Edge observability helpers (`isEdgeObservabilityEnabled`, `buildEdgeExtra`, structural context types). Leave `resolveCheckoutCustomer` and `generateRequestId` in runtime adapters; leave Sentry SDK adapters in place. |
| **PR 5** | Export-related relocation **only if** pure mappers can move without semantic change and without importing the mortgage engine; otherwise defer with founder decision and close Epic 5 without export move |
| **PR 6** | Remove temporary shims/mirrors; update docs/import maps; prove browser + Node + Deno single-source; Epic 5 closure |

Do not begin PR 1+ automatically.

### 12. Acceptance criteria (Epic 5 complete when)

1. ADR 0005 is accepted and remains binding.
2. Canonical `packages/core` exists and is the sole implementation for migrated
   modules.
3. Approved **Move** symbols (and any export subset authorized in PR 5) are
   migrated. Orchestration/nondeterministic symbols classified
   **Runtime-specific** / adapter-side remain outside core (not silently
   relocated).
4. No permanent manual mirrors remain for migrated **Move** logic.
5. Browser, Node, and Deno compatibility are proven in CI for migrated paths.
6. Existing behavior, benchmarks, entitlement SQL parity, and export contract
   semantics are unchanged.
7. Dependency boundaries in §8 are enforced (no core → `src/` / functions
   imports).
8. Validation suite green: `lint`, `typecheck`, `verify:benchmarks`,
   `test:run`, `test:entitlement-sql`, `build`, plus Deno parity commands
   required by migrated modules.
9. Documentation and workspace/import-map configuration are updated.
10. No application behavior regression; no unauthorized platform migration.

### 13. Non-goals

Explicitly excluded from Epic 5:

- Next.js, AWS, or Cloudflare migration
- Supabase replacement
- Database schema reconciliation (Epic 6)
- Staging environment (Epic 7)
- Billing recovery (Epic 8)
- Production deployment / secret changes
- UI redesign
- Mortgage formula or calculator-version changes
- Export semantic changes
- Generalized monorepo restructuring beyond `packages/core`
- Publishing packages to the public npm registry
- Broad dependency upgrades unless separately authorized
- Writing ADR 0012 in this PR (still required before entitlement-authority
  redesign; not required to extract the existing TS mirror into `packages/core`)

## Repository inspection record

Inspected 2026-08-06 on `main` (post Epic 4 closure).

### Current duplicated / mirrored modules

| Pair | Identity |
|------|----------|
| Entitlement → `@settlerate/core/entitlement` (PR 2); app/Edge shims | Shim-purity + SQL parity gated by Vitest + `scripts/test-entitlement-sql.mjs` |
| Checkout / guards / redaction → core subpaths (PR 3); app/Edge shims | Shim-purity gated by `verify-core-boundaries` + Vitest |
| Billing pure mappers → `@settlerate/core/billing-snapshot` (PR 3) | Architecture tests prove `resolveSubscriptionBillingSnapshot` is runtime-only |
| `_shared/stripeCustomerResolve.ts` | No `src/lib` copy; Vitest imports Edge file; **contains both** pure helpers and `resolveCheckoutCustomer` orchestration |
| `_shared/observability.ts` | Not a client copy; mixes deterministic helpers with nondeterministic `generateRequestId` |
| Export client vs `generate-pdf/mapDerivedForExport.ts` | Semantic parity via fixtures — not a file copy |

### Current runtime consumers (representative)

- Edge: `create-checkout`, `check-subscription`, `stripe-webhook`,
  `customer-portal`, `generate-pdf`, `export-share` import `_shared`
  modules as applicable (`resolveCheckoutCustomer` / billing snapshot
  resolve used from checkout/webhook/portal paths).
- App: entitlement constants/types via `@/lib/entitlementContract`; export UI
  via `src/lib/exports/*`; client observability via `src/lib/observability.ts`.
- Tests: Vitest imports both `@/lib/*` and relative
  `supabase/functions/_shared/*` / `generate-pdf/mapDerivedForExport.ts`.

### Environment-specific dependencies

- **Move** symbols are free of env/SDK/DOM deps and of randomness.
- `resolveSubscriptionBillingSnapshot` / `resolveCheckoutCustomer` depend on
  injected async I/O (adapter-side).
- `generateRequestId` uses `crypto.randomUUID()` (adapter-side).
- Client observability uses `import.meta.env` + `@sentry/react`.
- Edge Sentry uses `npm:@sentry/deno`.
- `exportPDF` uses DOM.
- `exportContract` builder imports mortgage/scenario types from `src/lib`.

### Known test coverage

- Entitlement: `entitlementContract.test.ts`, `entitlementSqlParity.test.ts`,
  `npm run test:entitlement-sql`
- Checkout / guards / snapshots: dedicated Vitest files under
  `src/lib/__tests__/`
- Observability / redaction: Vitest + redaction mirror assert
- Export: `exportContract.test.ts`, `exportParity.test.ts`, optional
  `npm run test:export-parity-deno` (**not currently a CI step**)
- Benchmarks: `npm run verify:benchmarks` (financial BM; not shared-core)

### Unresolved architectural risks

1. Export builder’s dependency on mortgage/scenario types may block a clean
   core move without a type-extraction sub-step.
2. Deno package resolution strategy (import map vs relative bridge) must be
   proven in PR 1–2 without reintroducing copy mirrors.
3. `entitlementResolver.ts` appears unused — confirm before spending migration
   effort.
4. `authRedirect` vs `appOrigin` share allowlist intent but different APIs —
   unify constants carefully; do not force a single function shape.
5. ADR 0012 remains open for deeper entitlement-authority questions beyond
   packaging the existing TS evaluator.
6. Split files (`stripeBillingSnapshot`, `stripeCustomerResolve`,
   `_shared/observability`) need careful shim design so adapters keep
   orchestration/ID generation while core owns pure symbols only.

## Consequences

- Epic 5 implementation PRs must follow this ADR; PR 0 authorizes none of them.
- Agents must not create `packages/core` or alter workspaces until PR 1 is
  authorized.
- Manual dual-tree maintenance is acknowledged as transitional debt with a
  defined retirement path.
- Export and financial/entitlement fences remain hard constraints.
- Epic 6+ remain unauthorized.

## Alternatives considered

- **Keep permanent dual trees with hash gates only.** Rejected — scales
  poorly; three pairs already lack hash gates and show comment drift.
- **Publish `@settlerate/core` to npm.** Rejected for Epic 5 — repository
  workspace is sufficient; publish is a later product decision.
- **Put shared code only under `supabase/functions/_shared` and import from
  the app.** Rejected — inverts dependency direction and couples the browser
  bundle to Edge layout.
- **Move the entire mortgage calculator into `packages/core` in Epic 5.**
  Rejected — out of scope; high risk; not required to stop current
  entitlement/billing drift.
- **Require a compiled JS emit before any consumer uses core.** Deferred —
  start with TS source + bundler/Deno resolution; add emit only if required.

## Epic 5 PR sequence (binding)

| PR | Scope | Status |
|----|--------|--------|
| **PR 0** | This ADR + minimum governance status updates | Complete / merged |
| **PR 1** | `packages/core` workspace scaffold (no behavioral migration) | Complete / merged |
| **PR 2** | Entitlement contract extraction | Complete / merged |
| **PR 3** | Checkout maintenance, guards, redaction, **pure** billing-snapshot mappers (not `resolveSubscriptionBillingSnapshot`) | **In progress** |
| **PR 4** | **Pure** customer-resolve helpers (not `resolveCheckoutCustomer`), origin helpers, deterministic Edge observability (not `generateRequestId`) | Not authorized |
| **PR 5** | Export-related relocation if justified and behavior-preserving | Not authorized |
| **PR 6** | Remove shims; Epic 5 closure | Not authorized |

**Epic 5 status:** In progress — PR 3 (checkout maintenance, subscription
guards, observability redaction, pure billing-snapshot mappers in
`@settlerate/core`; `resolveSubscriptionBillingSnapshot` remains
runtime-only). Do not begin PR 4–6 automatically.
