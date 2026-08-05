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

1. Epic 1 — Admin Provisioning Security  
2. Epic 2 — Environment and Origin Hygiene  
3. Epic 3 — Observability  
4. Epic 4 — RLS Security Test Expansion (**before** schema reconciliation)  
5. Epic 5 — Shared Core Package  
6. Epic 6 — Schema Reconciliation (requires Epic 4)  
7. Epic 7 — Staging Environment  
8. Epic 8 — Billing Recovery Capability  
9. Epic 9 — Deployment Pipeline  
10. Epic 10 — Backup and Restore Validation  

## PR discipline for Epic 1

| PR | Intent | Status |
|----|--------|--------|
| **PR 0** | Governance alignment (agent rules, Phase 8.1 docs, ADR index) | This charter’s enabling PR |
| **PR 1+** | Admin bootstrap implementation and follow-ons | **Not authorized by PR 0 alone** |

**Never begin the next epic or the next PR automatically.**

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
