# Phase 8.1 — Epic Boundaries

**Authority:** `docs/PHASE8_1_EXECUTION_CHARTER.md`,  
`docs/roadmap/PHASE8.1_PRODUCTION_HARDENING_AND_DECOUPLING_ROADMAP.md`

Agents may work only on the **currently authorized epic and PR**. Do not pull
forward later-epic work to “finish related items.”

---

## Epic 1 — Admin Provisioning Security

**Status:** Complete on `main` and fully effective in production (PR 0, PR 1,
and PR 2 merged; PR 1 and PR 2 migrations deployed).

**Goal:** Replace implicit/automatic admin grant risk with an explicit,
controlled bootstrap process.

### Completed work

- Explicit admin bootstrap mechanism (`docs/ADMIN_BOOTSTRAP.md`,
  `docs/adr/0001-admin-provisioning-model.md`) — live in production
- Tests for the bootstrap process and legacy-trigger removal
- Verification of existing admin access before removing legacy grant paths
- Removal of the automatic admin grant trigger after bootstrap existed and
  was tested — deployed; legacy hardcoded-email path removed in production
- Existing admin access preserved; admin promotion unchanged
- Documentation and ADRs for the admin provisioning model

### Historical prohibitions (kept for audit; Epic 1 closed)

- Removing the admin trigger before replacement is proven
- Broad roles/entitlements redesign beyond admin provisioning
- Phase 7B live smoke subscription, beta opening, or public checkout
- AWS / Cloudflare / Next.js migration
- Shared `packages/core` extraction (Epic 5)
- Schema reconciliation or broad DDL (Epic 6)
- Staging environment build-out (Epic 7)
- Billing recovery / raw Stripe payload work (Epic 8)
- Deployment pipeline redesign (Epic 9)
- Backup/restore campaigns (Epic 10)

### Epic 1 PR sequence

| PR | Scope | Status |
|----|--------|--------|
| **PR 0** | Governance only (`AGENTS.md`, `.cursor/rules/*`, `docs/PHASE8_1_*`, `docs/adr/README.md`) | Complete / merged |
| **PR 1** | Controlled admin bootstrap mechanism (implementation) | Complete / merged and deployed |
| **PR 2** | Legacy admin auto-grant trigger removal (tests + docs) | Complete / merged and deployed |

Epic 1 is complete in the repository and fully effective in production.

---

## Epic 2 — Environment and Origin Hygiene

**Status:** **Complete on `main`.** Repository work for Epic 2 is finished
(PR 0–5 merged). No Supabase Auth Dashboard redirect-allowlist change was
required: production continues to use the existing, already-allowlisted
redirect URLs by default (`VITE_APP_ORIGIN` unset). Any future
local-development redirect additions remain a separate founder-authorized
operational action (not part of this epic's closed repository work).
Authority: `docs/adr/0002-secrets-and-environment-policy.md`.

### Completed work

- ADR 0002 accepted; governance updated (PR 0, merged)
- `.env.example` added, `.env` untracked and gitignored, README setup docs
  updated (PR 1, merged)
- Obsolete Lovable preview origin removed from the Stripe return-origin
  allowlist; regression test added (PR 2, merged)
- Client-side hardcoded Edge Function host URLs replaced with a validated
  `buildEdgeFunctionUrl(VITE_SUPABASE_URL, functionName)` helper (PR 3,
  merged)
- Typed `ImportMetaEnv` declarations and fail-fast public client env
  validation (`src/lib/clientEnv.ts`) (PR 4, merged)
- `bun.lockb` removed; `lovable-tagger` removed from `package.json` and
  `vite.config.ts`; standardized on npm (PR 4, merged)
- Obsolete Lovable publishing/setup instructions removed from `README.md`;
  environment/origin control distinctions documented (PR 4, merged)
- Hardcoded production auth-redirect URLs in `src/pages/Auth.tsx` (signup
  confirmation, magic-link) and `src/pages/ResetPassword.tsx` (password
  reset) replaced with `resolveAuthOrigin()` / `buildAuthRedirectUrl()`
  (`src/lib/authRedirect.ts`); optional, exact-match-only `VITE_APP_ORIGIN`
  local-dev override added; default production output unchanged (PR 5,
  merged)

### Standing prohibitions (still apply after Epic 2 closure)

- Secret rotation in production without separate authorization
- Phase 7B live smoke / beta / public checkout / disabling
  `CHECKOUT_MAINTENANCE`
- CORS redesign (preserve `Access-Control-Allow-Origin: *` on existing Edge
  Functions unless a later epic authorizes change)
- Staging or preview deployment topology (Epic 7 / ADR 0008)
- Git history scrub of `.env`
- Supabase Auth Dashboard redirect-allowlist changes without founder
  authorization (operational action, not closed by this epic)
- Unrelated refactors; financial / entitlement / persistence / export changes

### Epic 2 PR sequence

| PR | Scope | Status |
|----|--------|--------|
| **PR 0** | ADR 0002 + minimum governance status updates | Complete / merged |
| **PR 1** | `.env.example`, `.gitignore`, stop tracking `.env`, README setup | Complete / merged |
| **PR 2** | Remove obsolete Lovable origin from Stripe return-origin allowlist | Complete / merged |
| **PR 3** | Derive Edge Function base URL from `VITE_SUPABASE_URL` via validated helper | Complete / merged |
| **PR 4** | Client env fail-fast validation; npm standardization (`bun.lockb` removal); Lovable tooling/doc cleanup; doc reconciliation | Complete / merged |
| **PR 5** | Auth-redirect hygiene: `src/lib/authRedirect.ts`, optional `VITE_APP_ORIGIN` local-dev override, exact-match allowlist, no `window.location.origin` | Complete / merged |

**Epic 2 repository work is complete.** Epic 3 is complete on `main` and
production-activated (see below). Later epics still require separate
explicit founder authorization.

---

## Epic 3 — Observability

**Status:** **Complete.** Production activated. Browser ingestion verified.
Browser symbolication verified. Edge ingestion verified. Privacy redaction
verification passed for the tested event paths. Authority:
`docs/adr/0003-observability-policy.md` (includes the production
verification record and operational baseline).

### Completed work

- ADR 0003 accepted; governance updated (PR 0)
- PR 1: client Sentry foundation (`src/lib/observability.ts`), shared
  fail-closed redaction (`@settlerate/core/observability-redaction`),
  top-level React
  error boundary (`src/components/system/ErrorBoundary.tsx`), Edge Function
  observability foundation (`supabase/functions/_shared/observability.ts`,
  `supabase/functions/_shared/sentry.ts`) wired into all six covered
  functions, hidden-source-map / conditional Sentry Vite plugin
  configuration, and focused tests. Repository remains fail-soft when DSNs
  are absent.
- CI source-map upload secrets wired; browser symbolication fix merged
  (privacy-safe stack frames, deterministic release, Vercel-build upload).
- Founder-authorized production activation: Vercel `VITE_SENTRY_DSN` +
  source-map upload vars; Supabase `SENTRY_DSN` for Edge Functions; six
  covered functions redeployed from
  `059624e178ac51e4ec218ff2ac0a750a564e185b`.
- Production verification on **2026-08-06** (see ADR 0003 verification
  record): browser issue `SETTLERATE-WEB-2` / event
  `440718be6636413593e3630592e4bb26` (project `settlerate-web` /
  `4511862124904448`); Edge issue `SETTLERATE-EDGE-FUNCTIONS-3` / event
  `ac07d9cd30004cc28f1f68789f6069f7` (project `settlerate-edge-functions` /
  `4511862129623040`). No further DSN changes are required.

### Accepted scope (binding)

- Vendor: Sentry, limited to errors and exceptions only. No session replay,
  product analytics, advertising tracking, user-behavior telemetry, request/
  response body capture, or performance tracing unless separately
  authorized.
- Covered surfaces: the React/Vite client and exactly six Edge Functions —
  `create-checkout`, `stripe-webhook`, `customer-portal`,
  `check-subscription`, `generate-pdf`, `export-share`.
- Optional, fail-soft env vars: `VITE_SENTRY_DSN` (client),
  `SENTRY_DSN` (Edge Functions). Repository implementation must remain
  inert (byte-identical current behavior) when DSNs are absent.
- Local development must never send events to the production Sentry
  project; production is the only initially monitored environment (staging
  deferred to Epic 7).
- Shared, unit-tested, fail-closed redaction policy via `beforeSend` /
  `beforeBreadcrumb`; unsafe automatic breadcrumbs disabled.
- Top-level React error boundary with a minimal, neutral fallback ("Something
  went wrong. Reload the page to continue." + Reload button); no technical
  error detail shown to users.
- Hidden production source maps uploaded from the authoritative Vercel
  production build (and optionally CI validation builds) with a scoped
  Sentry auth token never exposed to the client bundle.
- Full prohibited-data list, alert/retention/access decisions, production
  verification record, and operational baseline: see
  `docs/adr/0003-observability-policy.md`.

### Prohibited in Epic 3

- Logging raw Stripe payloads, account numbers, full mortgage inputs, income
  figures, asset/debt values, payment details, passwords, authentication
  tokens, Supabase JWTs, cookies, Authorization headers, Stripe secrets, or
  Supabase service-role credentials in any third-party tool
- Session replay, product analytics, advertising tracking, or performance
  tracing without separate authorization
- Database migrations, RLS changes, or an audit-trail schema as part of
  Epic 3
- Widening captured data beyond ADR 0003 §4 without a new ADR
- Changing production DSNs, Sentry project routing, or capture scope without
  separate founder authorization

### Epic 3 PR sequence

| PR | Scope | Status |
|----|--------|--------|
| **PR 0** | ADR 0003 + minimum governance status updates | Complete / merged |
| **PR 1** | Bundled repository implementation (client + Edge Function SDK wiring, error boundary, redaction, source maps), inert without DSNs | Complete / merged |
| Vendor/secret/production steps | Sentry account creation, DSN/token configuration, production activation and verification | **Complete** — activated and verified 2026-08-06 |

**Epic 3 is complete on `main` and fully effective in production.**
Non-blocking follow-ups (alert rules, IP-geography privacy review,
dedicated Edge probe, breadcrumb policy review) are recorded in ADR 0003
and do not reopen Epic 3. Do not begin Epic 4 automatically.

---

## Epic 4 — RLS Security Test Expansion

**Status:** **Complete on `main`.** ADR 0004 accepted (PR 0 merged). PR 1
complete and merged (inventory + core user-owned matrix). PR 2 complete
and merged (remaining relation classes + administrative paths). PR 3 is
**not required** — the full RLS suite is already gated in GitHub Actions
via `npm run test:entitlement-sql` (`.github/workflows/ci.yml`), and all
acceptance criteria below were satisfied by PRs 1–2. Authority:
`docs/adr/0004-rls-testing-standard.md`,
`docs/security/RLS_COVERAGE_INVENTORY.md`.

**Goal:** Expand automated RLS security tests so owner, non-owner, and
administrative isolation paths are proven in CI against the repository
migration chain — before Epic 6 schema reconciliation.

**Dependency:** complete before Epic 6 schema reconciliation (**met**).

### Acceptance criteria (binding)

Epic 4 is complete only when all of the following are true:

1. ADR 0004 is accepted and remains the binding RLS testing standard. **Met.**
2. An explicit coverage inventory exists for RLS-enabled in-scope relations
   derived from current migrations (per ADR 0004 §4). **Met** —
   `docs/security/RLS_COVERAGE_INVENTORY.md`.
3. Automated SQL tests assert, for each in-scope relation, the applicable
   owner / non-owner authenticated / anon / administrative matrix
   (ADR 0004 §5). **Met** — `epic4_pr1_core_rls.sql` +
   `epic4_pr2_remaining_rls.sql`.
4. Tests run against ephemeral Postgres applying the repository migration
   chain (same family as `npm run test:entitlement-sql`); they are not
   satisfied by production probing or client-only mocks. **Met.**
5. The RLS suite is gated in CI (via `test:entitlement-sql` and/or a
   dedicated companion script invoked by CI). **Met** —
   `.github/workflows/ci.yml` runs `npm run test:entitlement-sql`.
6. No RLS policy was weakened to obtain green CI; confirmed isolation
   defects were fixed only under separately authorized implementation PRs
   that preserve `docs/SECURITY_MODEL.md` isolation intent. **Met** —
   Epic 4 PRs were test/governance only (no policy/migration changes).
7. Phase 8.1 validation suite remains green:
   `npm run lint`, `npm run typecheck`, `npm run verify:benchmarks`,
   `npm run test:run`, `npm run build`, plus the SQL/RLS harness
   command(s). **Met.**

### Prohibited in Epic 4

- Writing or merging RLS tests in PR 0 (governance only)
- General RLS redesign unrelated to confirmed defects
- Schema reconciliation or consolidated schema baseline (Epic 6)
- Staging topology (Epic 7), billing recovery (Epic 8), shared core package
  (Epic 5)
- Production database probing as acceptance evidence
- Disabling RLS, skipping failing isolation assertions, or weakening CI /
  financial benchmarks for green builds
- Resuming Phase 7B live smoke / public checkout / disabling
  `CHECKOUT_MAINTENANCE`
- Beginning Epic 5 or later automatically

### Epic 4 PR sequence

| PR | Scope | Status |
|----|--------|--------|
| **PR 0** | ADR 0004 + minimum governance status updates | Complete / merged |
| **PR 1** | Coverage inventory + harness wiring; owner / non-owner / anon matrix for core user-owned tables | Complete / merged |
| **PR 2** | Remaining in-scope relations + administrative path assertions | Complete / merged |
| **PR 3** | CI gate completion / acceptance-criteria gap closure (if needed) | **Not required** — CI gate and acceptance criteria completed in PRs 1–2 |

**Epic 4 is complete on `main`.**

---

## Epic 5 — Shared Core Package

**Status:** **Complete on `main`**. ADR 0005 accepted; PR 0–6 merged.
Authority: `docs/adr/0005-shared-package-architecture.md`.

**Goal:** Create `packages/core` so deterministic, environment-neutral
business contracts have one canonical implementation across browser, Node
tests/scripts, and Deno Edge Functions — preventing dual-tree drift without
changing financial, entitlement, billing, or export semantics.

**Dependency:** ADR 0005 before any code move (this PR). Later steps follow
the ADR §11 sequence.

### Allowed in Epic 5 (when the matching PR is authorized)

- Create and wire `packages/core` per ADR 0005
- Migrate approved **Move** symbols per ADR 0005 (entitlement contract,
  checkout maintenance, subscription guards, pure billing-snapshot mappers,
  pure customer-resolve helpers, redaction, deterministic Edge observability
  helpers, and other justified export subsets) — not orchestration such as
  `resolveCheckoutCustomer` / `resolveSubscriptionBillingSnapshot`, and not
  nondeterministic `generateRequestId`
- Replace permanent mirrors with single-source imports (temporary re-export
  shims allowed with deletion conditions)
- Update Deno import maps / workspace configuration as required by
  authorized implementation PRs

### Prohibited in Epic 5

- Changing export field semantics (`docs/EXPORT_CONTRACT.md` fence)
- Changing mortgage formulas, benchmarks, entitlement outcomes, plan
  mappings, scenario limits, billing interpretation, or checkout
  maintenance behavior during relocation
- Next.js / AWS / Cloudflare / Supabase-replacement platform migration
- Publishing packages to the public npm registry
**Export fence (hard rule during Phase 8.1):** Authority
`docs/EXPORT_CONTRACT.md`. Protected surfaces:
`docs/EXPORT_CONTRACT.md`,
`supabase/functions/generate-pdf/mapDerivedForExport.ts`,
`src/lib/exports/`.

- Epic 5 **may** relocate export-related code and update imports.
- Epic 5 **may not** redefine export fields, meanings, omission rules,
  snapshot-selection behavior, or other contract behavior.
- Any export field semantics change requires **explicit architectural
  approval** (not implied by Epic 5 authorization alone).

### Epic 5 PR sequence

| PR | Scope | Status |
|----|--------|--------|
| **PR 0** | ADR 0005 + minimum governance status updates | Complete / merged |
| **PR 1** | `packages/core` workspace scaffold (no behavioral migration) | Complete / merged |
| **PR 2** | Entitlement contract extraction | Complete / merged |
| **PR 3** | Checkout maintenance, guards, redaction, pure billing-snapshot mappers (not resolve orchestration) | Complete / merged |
| **PR 4** | Pure customer-resolve helpers (not checkout orchestration), origin helpers, deterministic Edge observability (not `generateRequestId`) | Complete / merged |
| **PR 5** | Export-related relocation if justified and behavior-preserving | Complete / merged |
| **PR 6** | Remove pure shims; Edge package resolution; Epic 5 closure | Complete / merged |

**Epic 5 is complete on `main`.**

---

## Epic 6 — Schema Reconciliation

**Status:** **COMPLETE** — repository closure and production remediation
applied/verified (ADR 0006 + ADR 0007 **accepted**; PR 0–2J + closure;
tip package applied 2026-08-08). Founder FD-* decisions are **ACCEPTED**.
ADR 0011 remains required for destructive advisor disposition. Epic 7 is
separately authorized (in progress). Epic 8+ unauthorized. See
`docs/database/EPIC6_CLOSURE.md` and
`docs/database/EPIC6_PRODUCTION_APPLY_PLAN.md` (execution record).

Authority: `docs/adr/0006-database-schema-source-of-truth.md`,
`docs/adr/0007-legacy-schema-disposition.md`,
`docs/database/SCHEMA_RECONCILIATION_INVENTORY.md`,
`docs/database/SCHEMA_DRIFT_REPORT.md`,
`docs/database/GRANT_SECURITY_DECISIONS_PR2C.md`,
`docs/database/GRANT_REMEDIATION_PR2D.md`,
`docs/database/EPIC6_PRODUCTION_APPLY_PLAN.md`.

**Goal:** Make the database schema reproducible from git, capture
production reality read-only before mutation, classify drift (including
legacy objects), and reconcile without weakening security or changing
financial/export/entitlement semantics.

**Requires Epic 4** (complete). ADR 0006 and ADR 0007 are accepted.
Production capture preceded reconciliation/mutation. Baseline
implementation (history + documented consolidated baseline boundary) and
the consolidated tip apply are complete.

### Epic 6 train (complete)

- Sequential PR 2D–2J + closure slices completed on `main`
- Tip migrations applied to production 2026-08-08 (see execution record)
- Docs/governance updated to reflect production completion

### Prohibited without HARD STOP / founder gate

- Further production mutation (`db push`, GRANT/REVOKE/DDL/DML, migration repair)
  without a new founder-authorized package
- Product/formula/export/billing/entitlement semantic changes
- Destructive legacy drops without ADR 0007 evidence
- Inventing advisor intent (ADR 0011); Epic 8+

### Epic 6 PR sequence (complete)

| PR | Scope | Status |
|----|--------|--------|
| **PR 0** | ADR 0006 + ADR 0007 (accepted) + repository inventory + methodology | **Complete / merged** |
| **PR 1** | Read-only production schema capture + machine-readable drift report (no mutation) | **Complete / merged** |
| **PR 2A** | Schema provenance / reconstruction blocker (`subscriptions` + scoped `profiles` columns) | **Complete / merged** |
| **PR 2B** | Post-provenance drift refresh (evidence only) | **Complete / merged** |
| **PR 2C** | Grant/security classification + founder decision package (evidence only) | **Complete / merged** |
| **PR 2D** | First least-privilege grant remediation (repo + local proof; later production-applied) | **Complete / merged + applied** |
| **PR 2E** | Generated types reconciliation | **Complete / merged** |
| **PR 2F** | RPC / function EXECUTE reconciliation | **Complete / merged + applied** |
| **PR 2G** | Storage / platform drift normalization | **Complete / merged** |
| **PR 2H** | Dual comparison / export model disposition | **Complete / merged + applied** |
| **PR 2I** | Advisor / ADR 0011 check | **Complete / merged** (retain; ADR 0011 still required for drops) |
| **PR 2J** | Consolidated schema baseline | **Complete / merged** |
| **Closure** | Clean reconstruction proof; classified remaining drift; production apply package | **Complete / merged** |
| **Production apply** | Consolidated tip package (`20260808020000`–`40000`) | **Complete** (2026-08-08) |

---

## Epic 7 — Staging Environment

**Status:** **Repository/infrastructure complete** (founder-authorized).
ADR 0008 **accepted**. End-to-end SPA/Auth/Stripe-secret smoke remains
**operator-gated** — see `docs/staging/EPIC7_CLOSURE.md` and
`docs/staging/STAGING_SMOKE.md`. Phase 7B is **not** resumed.

Authority: `docs/adr/0008-environment-topology.md`,
`docs/environment/EPIC7_ENVIRONMENT_INVENTORY.md`,
`docs/staging/EPIC7_CLOSURE.md`.

Allowed when authorized: staging database/app, Stripe **test** configuration,
staging admin process, deployment workflow.  
Do not point staging at live Stripe secrets. Do not mutate production Auth /
Stripe / Supabase secrets. Do not resume Phase 7B.

| PR | Scope | Status |
|----|-------|--------|
| **PR 0** | ADR 0008 + environment inventory | **Complete / merged** |
| **PR 1** | Staging secrets contract / origin allowlist scaffold | **Complete / merged** |
| **PR 2** | Staging Supabase migrations + seed/isolation docs | **Complete / merged** |
| **PR 3** | Staging Edge / auth / export / observability wiring | **Complete / merged** |
| **PR 4** | Stripe test-mode staging integration | **Complete / merged** |
| **PR 5** | Smoke / parity / Phase 7B readiness (not resume) | **Complete / merged** (E2E operator-gated) |

---

## Epic 8 — Billing Recovery Capability

Allowed when authorized: preserve raw Stripe event payloads; reconstruction
process; recovery validation.  
Respect Phase 7B pause and maintenance gate; do not open public checkout.

---

## Epic 9 — Deployment Pipeline

Allowed when authorized: Development → Staging → Production automation,
production approval gate, migration controls.

---

## Epic 10 — Backup and Restore Validation

Allowed when authorized: confirm backups, restore test, document recovery.

---

## Global prohibitions (all Phase 8.1 epics unless separately authorized)

- Begin AWS / Cloudflare migration
- Begin Next.js migration as a platform rewrite
- Weaken CI, RLS, or financial benchmarks for green builds
- Commit secrets to git
- Resume Phase 7B live customer smoke / beta / public checkout without founder
  re-authorization after infrastructure deployment
- Cross epic boundaries to “finish related work”
- Change export field semantics (`docs/EXPORT_CONTRACT.md`,
  `mapDerivedForExport.ts`, `src/lib/exports/`) without explicit
  architectural approval — relocation/import updates under Epic 5 do not
  authorize semantic redefinition
