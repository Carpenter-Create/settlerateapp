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

**Epic 2 repository work is complete.** Epic 3 has not begun and still
requires explicit founder authorization.

---

## Epic 3 — Observability

**Status:** PR 0 (ADR 0003 + minimum governance status updates) complete.
Repository implementation (PR 1), vendor-account creation, secret
configuration, and production activation each require separate explicit
founder authorization. Authority: `docs/adr/0003-observability-policy.md`.

### Completed work

- ADR 0003 accepted; governance updated (PR 0, this PR)

### Accepted scope (binding for PR 1 when authorized)

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
- Hidden production source maps uploaded via CI with a scoped Sentry auth
  token never exposed to the client bundle.
- Full prohibited-data list and alert/retention/access decisions: see
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
- Beginning Epic 3 PR 1, creating a Sentry account, adding secrets, or
  activating production monitoring without separate founder authorization

### Epic 3 PR sequence

| PR | Scope | Status |
|----|--------|--------|
| **PR 0** | ADR 0003 + minimum governance status updates | Complete (this PR) |
| **PR 1** | Bundled repository implementation (client + Edge Function SDK wiring, error boundary, redaction, source maps), inert without DSNs | Requires separate founder authorization |
| Vendor/secret/production steps | Sentry account creation, DSN/token configuration, production activation and verification | Each requires separate founder authorization; not code PRs |

**Epic 3 PR 0 authorizes policy only. Never begin Epic 3 PR 1 automatically.**

---

## Epic 4 — RLS Security Test Expansion

Allowed when authorized: validate RLS policies; owner / non-owner /
administrative path tests.  
**Dependency:** complete before Epic 6 schema reconciliation.

---

## Epic 5 — Shared Core Package

Allowed when authorized: create `packages/core` shared by frontend and backend
for entitlement contracts, checkout maintenance, subscription guards, Stripe
billing snapshots.  
Goal: prevent business-logic drift. Do not change formula semantics while
moving code unless a DEF-* is authorized.

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

---

## Epic 6 — Schema Reconciliation

Allowed when authorized: compare production schema vs migrations; resolve
drift; consolidated schema baseline.  
**Requires Epic 4.** Prefer ADR “Database schema source of truth” first.

---

## Epic 7 — Staging Environment

Allowed when authorized: staging database/app, Stripe **test** configuration,
staging admin process, deployment workflow.  
Do not point staging at live Stripe secrets.

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
