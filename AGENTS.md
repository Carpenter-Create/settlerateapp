# SettleRate — Agent Guide

Cross-agent index for Cursor, Codex, and other automation working in **this repository** (`settlerate-app`).

## Product identity

SettleRate is a mortgage analysis and comparison tool designed to help users understand the financial implications of different loan scenarios.

This repository is the **authenticated SettleRate application** — auth, `/app/*`, calculator, scenarios, comparisons, billing, and Supabase persistence. It is not the marketing site (`settlerate-web`).

## Authoritative documents

| Domain | Document |
|--------|----------|
| Financial methodology | `docs/FINANCIAL_METHODOLOGY.md` |
| Scenario persistence | `docs/SCENARIO_PERSISTENCE.md` |
| Export contract | `docs/EXPORT_CONTRACT.md` |
| Comparison contract | `docs/COMPARISON_CONTRACT.md` |
| Benchmark and defect status | `TEST_BASELINE.md` |
| Product scope | `docs/APP_SCOPE.md` |
| Security | `docs/SECURITY_MODEL.md` |
| Roles and entitlements | `docs/ROLES_AND_ENTITLEMENTS.md`, `docs/ENTITLEMENT_CONTRACT.md` |
| Copy | `docs/COPY_STANDARD.md` |
| UI | `docs/UI_STANDARD.md`, `docs/PORTAL_UI_STANDARD.md` |
| Phase 8.1 execution | `docs/PHASE8_1_EXECUTION_CHARTER.md`, `docs/PHASE8_1_EPIC_BOUNDARIES.md` |
| Phase 8.1 roadmap | `docs/roadmap/PHASE8.1_PRODUCTION_HARDENING_AND_DECOUPLING_ROADMAP.md` |
| ADRs | `docs/adr/README.md` |
| Phase 7B (paused) | `docs/PHASE7B_LIVE_STRIPE_CUTOVER_PLAN.md`, `docs/PHASE7B_LIVE_STRIPE_CUTOVER_CHECKLIST.md` |

Documentation defines **approved target behavior**. Source code and **active tests** define **current implemented behavior**. When they conflict, report the conflict — do not silently reconcile.

Detailed agent rules: `.cursor/rules/`.

## Current phase

**Phase 1–7A are complete on main.** **Phase 7B is PAUSED** (live Stripe activation pending final application infrastructure deployment; keep `CHECKOUT_MAINTENANCE=true`).

**Phase 8.1** is the current authorized phase — production hardening and decoupling. See `docs/PHASE8_1_EXECUTION_CHARTER.md`.

**Epic 1 (Admin Provisioning Security)** is **complete on `main` and fully effective in production**.

**Epic 2 (Environment and Origin Hygiene)** is **complete on `main`**.
PR 0–5 merged (ADR 0002; env-file hygiene; Lovable return-origin removal;
environment-derived Edge Function URLs; client env validation / npm /
Lovable cleanup; environment-aware auth redirects). No Supabase Auth
Dashboard redirect-allowlist change was required. Any future
local-development redirect additions remain a separate founder-authorized
operational action. See `docs/adr/0002-secrets-and-environment-policy.md`
and `docs/PHASE8_1_EPIC_BOUNDARIES.md`.

**Epic 3 (Observability)** is **complete on `main` and fully effective in
production** (activated and verified 2026-08-06). See
`docs/adr/0003-observability-policy.md`.

**Epic 4 (RLS Security Test Expansion)** is **complete on `main`**.
ADR 0004 is accepted. PR 0–2 merged; PR 3 not required. Authority:
`docs/adr/0004-rls-testing-standard.md`.

**Epic 5 (Shared Core Package)** is **In progress — PR 1** (ADR 0005
accepted; PR 0 complete/merged). PR 1 scaffolds npm workspaces and
`packages/core` (`@settlerate/core`) with **no business logic migrated**
and **no app/Edge runtime consumers**. PR 2–6 remain unauthorized.
Authority: `docs/adr/0005-shared-package-architecture.md` and
`docs/PHASE8_1_EPIC_BOUNDARIES.md`.
**Epic 6 and later have not begun and still require separate explicit
authorization.**

Do not begin AWS / Cloudflare / Next.js platform migration unless explicitly authorized.

## Required validation

Before every commit or push, all must pass:

```bash
npm run lint
npm run typecheck
npm run verify:benchmarks
npm run test:run
npm run build
```

## Branch and PR safety

**Allowed by default:** inspect the repo, create a dedicated branch, edit within authorized phase/epic/PR scope, run validation, create bounded commits, push the branch, open or update a **draft** PR.

**Requires explicit authorization:** commit to `main`, mark a draft PR ready, approve, merge, delete branches after merge, begin the next epic or PR, resume Phase 7B live smoke / beta / public checkout.

## Phase boundaries

Do not cross epic or phase boundaries to "finish related work." If a task touches a later-epic concern, stop and report. Follow `docs/PHASE8_1_EPIC_BOUNDARIES.md`.

**Export fence:** During Phase 8.1, do not change export field semantics in `docs/EXPORT_CONTRACT.md`, `supabase/functions/generate-pdf/mapDerivedForExport.ts`, or `src/lib/exports/` without explicit architectural approval. Epic 5 may relocate code and update imports only — not redefine fields, meanings, or contract behavior.
