# Phase 8.1 — Execution Charter

**Status:** Approved for governed execution  
**Authority:** `docs/roadmap/PHASE8.1_PRODUCTION_HARDENING_AND_DECOUPLING_ROADMAP.md`  
**Operator checklist / epic bounds:** `docs/PHASE8_1_EPIC_BOUNDARIES.md`  
**ADR index:** `docs/adr/README.md`

## Purpose

Phase 8.1 moves SettleRate from a strong pre-launch application toward a
production-ready SaaS platform by removing unnecessary coupling, eliminating
known risks, improving operational maturity, and preserving future
infrastructure flexibility.

AWS / Cloudflare migration remains **deferred** until a forcing reason exists
(see roadmap “AWS Position”).

## Relationship to prior phases

| Phase | State |
|-------|--------|
| 1–5 | Complete on `main` (financial engine, persistence, export, comparison) |
| 6 | Complete on `main` (entitlements + Stripe sandbox catalog) |
| 7A | Complete on `main` (sandbox billing hardening) |
| 7B | **PAUSED** — live Stripe activation pending final application infrastructure deployment (`docs/PHASE7B_LIVE_STRIPE_CUTOVER_PLAN.md`) |
| 8.1 | **Current authorized phase** for hardening and decoupling work |

Phase 7B safety must remain: `CHECKOUT_MAINTENANCE=true` and
`create-checkout` → HTTP 503 / `CHECKOUT_MAINTENANCE` until founder
re-authorizes live smoke / beta opening.

## Source of truth

- This repository (`settlerate-app`) is the source of truth for application
  behavior, migrations, edge functions, and Phase 8.1 execution docs.
- Documentation defines approved **target** behavior.
- Source code and **active tests** define **current implemented** behavior.
- When they conflict, **report the conflict** — do not silently reconcile.

## Execution order

Follow the roadmap epic sequence. Do not skip dependency gates:

1. Epic 1 — Admin Provisioning Security (**complete on `main` and fully effective in production**)  
2. Epic 2 — Environment and Origin Hygiene (**complete on `main`**; see ADR 0002)  
3. Epic 3 — Observability (**complete on `main` and production-activated/verified 2026-08-06** — see ADR 0003)  
4. Epic 4 — RLS Security Test Expansion (**complete on `main`**; see ADR 0004)  
5. Epic 5 — Shared Core Package (**complete on `main`**; ADR 0005 accepted; PR 0–6 merged)  
6. Epic 6 — Schema Reconciliation (**In progress — autonomous repository completion train**; ADR 0006/0007 accepted; PR 0–2C complete/merged; PR 2D–2J + closure authorized for repository-only work; production apply NOT authorized until consolidated apply package; requires Epic 4)  
7. Epic 7 — Staging Environment  
8. Epic 8 — Billing Recovery Capability  
9. Epic 9 — Deployment Pipeline  
10. Epic 10 — Backup and Restore Validation  

## PR discipline for Epic 1

| PR | Intent | Status |
|----|--------|--------|
| **PR 0** | Governance alignment (agent rules, Phase 8.1 docs, ADR index) | Complete / merged |
| **PR 1** | Explicit admin bootstrap mechanism | Complete / merged and deployed |
| **PR 2** | Legacy admin auto-grant trigger removal | Complete / merged and deployed |

Epic 1 is complete on `main` and fully effective in production (explicit
bootstrap live; legacy hardcoded-email auto-grant removed; existing admin
and promotion unchanged).

## PR discipline for Epic 2

| PR | Intent | Status |
|----|--------|--------|
| **PR 0** | Secrets/environment policy ADR + minimum governance status | Complete / merged |
| **PR 1** | `.env.example`, `.gitignore`, stop tracking `.env`, README setup | Complete / merged |
| **PR 2** | Remove obsolete Lovable origin from Stripe return-origin allowlist | Complete / merged |
| **PR 3** | Edge Function base URL helper (`VITE_SUPABASE_URL`) | Complete / merged |
| **PR 4** | Client env validation, npm standardization, Lovable cleanup, doc reconciliation | Complete / merged |
| **PR 5** | Auth-redirect hygiene (`src/lib/authRedirect.ts`, optional `VITE_APP_ORIGIN`, ADR 0002 §3) | Complete / merged |

Epic 2 repository work is **complete on `main`** (PR 0–5 merged). No
Supabase Auth Dashboard redirect-allowlist change was required; default
production redirect behavior remains unchanged. Any future
local-development redirect additions remain a separate founder-authorized
operational action. Authority:
`docs/adr/0002-secrets-and-environment-policy.md`. See
`docs/PHASE8_1_EPIC_BOUNDARIES.md` for full detail.

## PR discipline for Epic 3

| PR | Intent | Status |
|----|--------|--------|
| **PR 0** | Observability policy ADR (0003) + minimum governance status | Complete / merged |
| **PR 1** | Bundled repository implementation (Sentry client + Edge Function SDK wiring, error boundary, redaction, source maps), inert without DSNs | Complete / merged |
| Vendor/secret/production steps | Sentry account creation, DSN/token configuration, production activation and verification | **Complete** — activated and verified 2026-08-06 |

Epic 3 is **complete on `main` and fully effective in production**: Sentry
(errors/exceptions only) for the React/Vite client and six named Edge
Functions (`create-checkout`, `stripe-webhook`, `customer-portal`,
`check-subscription`, `generate-pdf`, `export-share`), shared fail-closed
redaction, top-level React error boundary, browser symbolication via
Vercel-build source-map upload, and verified production ingestion on
2026-08-06. Repository code remains fail-soft when DSNs are absent;
production DSNs live only in Vercel / Supabase platform configuration.
Authority: `docs/adr/0003-observability-policy.md` (verification record and
operational baseline). See `docs/PHASE8_1_EPIC_BOUNDARIES.md`. Non-blocking
follow-ups (alerts, IP-geography privacy review, dedicated Edge probe,
breadcrumb policy) do not reopen Epic 3.

## PR discipline for Epic 4

| PR | Intent | Status |
|----|--------|--------|
| **PR 0** | RLS testing standard ADR (0004) + minimum governance status | Complete / merged |
| **PR 1** | Coverage inventory + harness; core user-owned owner/non-owner/anon matrix | Complete / merged |
| **PR 2** | Remaining relations + administrative path assertions | Complete / merged |
| **PR 3** | CI gate / acceptance-criteria gap closure (if needed) | **Not required** — completed in PRs 1–2 |

Epic 4 is **complete on `main`**. Inventory + core matrix
(`epic4_pr1_core_rls.sql`) and remaining relations / admin paths
(`epic4_pr2_remaining_rls.sql`) run under `npm run test:entitlement-sql`,
which GitHub Actions already invokes (`.github/workflows/ci.yml`). PR 3
is not required. Authority: `docs/adr/0004-rls-testing-standard.md`. See
`docs/PHASE8_1_EPIC_BOUNDARIES.md`.

## PR discipline for Epic 5

| PR | Intent | Status |
|----|--------|--------|
| **PR 0** | Shared package architecture ADR (0005) + minimum governance status | Complete / merged |
| **PR 1** | `packages/core` workspace scaffold (no behavioral migration) | Complete / merged |
| **PR 2** | Entitlement contract extraction | Complete / merged |
| **PR 3** | Checkout maintenance, guards, redaction, pure billing-snapshot mappers (not resolve orchestration) | Complete / merged |
| **PR 4** | Pure customer-resolve helpers (not checkout orchestration), origin helpers, deterministic Edge observability (not `generateRequestId`) | Complete / merged |
| **PR 5** | Export-related relocation if justified and behavior-preserving | Complete / merged |
| **PR 6** | Remove pure shims; Edge package resolution; Epic 5 closure | Complete / merged |

Epic 5 is **complete on `main`**. Pure contracts live in
`@settlerate/core/*`; runtime adapters remain under `_shared` /
application surfaces; Edge resolves package subpaths via per-function
`deno.json`. Export field semantics remain frozen. Authority:
`docs/adr/0005-shared-package-architecture.md` and
`docs/EXPORT_CONTRACT.md`.

## PR discipline for Epic 6

| PR | Intent | Status |
|----|--------|--------|
| **PR 0** | ADR 0006 + ADR 0007 (accepted) + repository schema inventory + methodology | **Complete / merged** |
| **PR 1** | Read-only production schema capture + machine-readable drift report (no mutation) | **Complete / merged** |
| **PR 2A** | Schema provenance / reconstruction blocker (`subscriptions` + scoped `profiles` columns) | **Complete / merged** |
| **PR 2B** | Post-provenance drift refresh (evidence only) | **Complete / merged** |
| **PR 2C** | Grant/security classification + founder decision package (evidence only) | **Complete / merged** |
| **PR 2D** | First least-privilege grant remediation (repo + local proof; prod apply gated) | **In progress** |
| **PR 2E** | Generated types reconciliation | Authorized (autonomous train) |
| **PR 2F** | RPC / function EXECUTE reconciliation | Authorized (autonomous train) |
| **PR 2G** | Storage / platform drift normalization | Authorized (autonomous train) |
| **PR 2H** | Dual comparison / export model disposition | Authorized (autonomous train) |
| **PR 2I** | Advisor / ADR 0011 check | Authorized (HARD STOP if unresolved) |
| **PR 2J** | Consolidated schema baseline | Authorized (autonomous train) |
| **Closure** | Reconstruction proof; classified drift; production apply package | Authorized (autonomous train) |

Epic 6 proceeds under the Autonomous Completion Master Prompt for
**repository-only** work. **Production apply is NOT authorized** until
founder approval of `docs/database/EPIC6_PRODUCTION_APPLY_PLAN.md`.
Authority (accepted): `docs/adr/0006-database-schema-source-of-truth.md`,
`docs/adr/0007-legacy-schema-disposition.md`,
`docs/database/GRANT_SECURITY_DECISIONS_PR2C.md`,
`docs/database/GRANT_REMEDIATION_PR2D.md`. See
`docs/PHASE8_1_EPIC_BOUNDARIES.md`.

## Required ADRs

Phase 8.1 requires architecture decision records listed in
`docs/adr/README.md`. Prefer recording decisions **before** or **with** the
implementation PR that first depends on them. Do not invent ADR outcomes in
code without an ADR (or explicit founder decision).

## Export fence (Phase 8.1)

Export field semantics are frozen without explicit architectural approval.

Protected: `docs/EXPORT_CONTRACT.md`,
`supabase/functions/generate-pdf/mapDerivedForExport.ts`, `src/lib/exports/`.

Epic 5 may relocate export code and update imports; it may **not** redefine
export fields, meanings, or contract behavior.

## Pre-beta bar (roadmap)

Before beta: security issues resolved; RLS coverage expanded; schema
reproducible; staging operational; billing recovery tested; deployment process
documented; backups verified; monitoring available. Phase 7B live smoke /
public checkout remain blocked until infrastructure migration and founder
re-authorization.
