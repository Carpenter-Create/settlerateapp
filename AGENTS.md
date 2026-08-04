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
| Benchmark and defect status | `TEST_BASELINE.md` |
| Product scope | `docs/APP_SCOPE.md` |
| Security | `docs/SECURITY_MODEL.md` |
| Roles and entitlements | `docs/ROLES_AND_ENTITLEMENTS.md` |
| Copy | `docs/COPY_STANDARD.md` |
| UI | `docs/UI_STANDARD.md`, `docs/PORTAL_UI_STANDARD.md` |

Documentation defines **approved target behavior**. Source code and **active tests** define **current implemented behavior**. When they conflict, report the conflict — do not silently reconcile.

Detailed agent rules: `.cursor/rules/`.

## Current phase

**Phase 1–3 are complete on main.** Confirm the current branch and repository state before assuming later-phase work has begun. **Phase 4** (when authorized) is export and report alignment to the canonical scenario contract — see `docs/EXPORT_CONTRACT.md`.

Do not begin Phase 5+ work (comparison winner normalization, entitlements, Next.js migration, AWS migration) unless explicitly authorized.

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

**Allowed by default:** inspect the repo, create a dedicated branch, edit within authorized scope, run validation, create bounded commits, push the branch, open or update a **draft** PR.

**Requires explicit authorization:** commit to `main`, mark a draft PR ready, approve, merge, delete branches after merge, begin the next phase.

## Phase boundaries

Do not cross phase boundaries to "finish related work." If a task touches a later-phase concern, stop and report.
