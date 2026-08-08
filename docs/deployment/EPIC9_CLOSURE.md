# Epic 9 — Deployment Pipeline — CLOSURE

- Status: **COMPLETE**
- Date: 2026-08-08
- Authority: `docs/adr/0014-deployment-pipeline.md`
- Runbook: `docs/deployment/DEPLOYMENT_RUNBOOK.md`
- Inventory: `docs/deployment/EPIC9_DEPLOYMENT_INVENTORY.md`

## Final main SHA

| Milestone | SHA | PR |
|-----------|-----|----|
| Implementation | `01ff92c0beb646f46c9b8b8225322bb1d63b4b9a` | #87 |
| Content closure | `b49529177ea6012e18dbcc404869764684453b34` | #88 |
| Tip after hygiene | `2d3f949f0ae69c12a50b089e2fed30b3984cc418` | #91 |

Subsequent tip-pin commits are non-blocking; use `git rev-parse origin/main`
for the absolute tip.

## PR train

| PR | Scope | Result |
|----|-------|--------|
| [#87](https://github.com/Carpenter-Create/settlerateapp/pull/87) | ADR 0014 + inventory/runbook + staging/production workflows + migration ledger + tests | Merged |
| Closure | This document + governance COMPLETE | This PR |

## Pipeline architecture

```
PR → CI validate only (no deploy credentials)
merge to main → CI validate
→ Staging Deploy (workflow_run on CI success)
   migrate (strict ledger) → Edge (--project-ref staging) → verify
   → staging-verified success|failure status on pinned SHA
→ Production Deploy (workflow_dispatch only)
   → GitHub Environment production-deploy (required reviewer + main branch)
   → plan: tip-anchored pending enumeration (mutation: none)
   → apply: blocked unless founder unlock (Epic 9 tooling still refuses mutation)
```

SPA authority remains **Vercel Git** per environment (Actions does not deploy SPA).

## Staging workflow (runtime-proven)

| Item | Evidence |
|------|----------|
| Workflow | `.github/workflows/staging-deploy.yml` |
| Trigger | CI `workflow_run` success on `main` |
| Run | [31278937225](https://github.com/Carpenter-Create/settlerateapp/actions/runs/31278937225) success |
| SHA | `01ff92c0beb646f46c9b8b8225322bb1d63b4b9a` |
| Status | `staging-verified` **success** for `01ff92c` |
| Target | `gkhbalfpxjtleypbabjo` only |
| Migrations | Ledger inspect + apply-if-pending (aligned; pending=0) |
| Edge | Deployed via `--project-ref` + `--use-api` |
| Verify | migration aligned, 7 functions, SPA origin, production isolation |

## Production approval model (proven without mutation)

| Control | Proof |
|---------|-------|
| Not on push/PR | Workflow `on: workflow_dispatch` only |
| Environment approval | Run [31278980261](https://github.com/Carpenter-Create/settlerateapp/actions/runs/31278980261) entered `waiting` until reviewer approved |
| Required reviewer | `acarpcreate` on `production-deploy` |
| Branch policy | `main` only (staging + production-deploy) |
| Plan mode | Run 31278980261 **success**, `mutation: none` |
| Apply mode | Run [31279419945](https://github.com/Carpenter-Create/settlerateapp/actions/runs/31279419945) **failure** (`production_apply_blocked`) |
| Unverified SHA | Run [31279445487](https://github.com/Carpenter-Create/settlerateapp/actions/runs/31279445487) **failure** (no `staging-verified`) |
| Latest status rule | Promotion uses newest `staging-verified` only |

## Credential ownership

| Secret | Scope |
|--------|--------|
| `SUPABASE_ACCESS_TOKEN` | GitHub Environment `staging` (mutate staging) |
| `SUPABASE_ACCESS_TOKEN` | GitHub Environment `production-deploy` (plan/read under Epic 9) |
| Repo `SENTRY_*` | CI build only |
| PR / fork jobs | No deploy credentials |

## Migration-control model

| Env | Mode | Behavior |
|-----|------|----------|
| Staging | **strict** | Target must be ordered prefix of git; fail closed on divergence |
| Production | **tip-anchored** | Anchor on remote tip ∈ git; audit `historicalTargetOnly`; pending = git versions `>` tip |

Naive production `supabase db push` is **forbidden** (would replay Epic 6 filename skew).

## Production pending migration inventory (enumerate only)

At closure, production tip remains `20260808040000`.

Pending (not applied):

1. `20260808143109` (Epic 7 staging price allowlist)
2. `20260808200000` (Epic 8 Stripe event evidence)

`public.stripe_event_evidence` remains absent on production (`to_regclass` → null).

## Production non-mutation proof

| Check | Result |
|-------|--------|
| Production tip after Epic 9 | `20260808040000` |
| Epic 8 tables on production | absent |
| `CHECKOUT_MAINTENANCE` digest | `b5bea41b…` = sha256(`true`) |
| Production Edge / SPA Actions deploy | not executed |
| Apply workflow | failed closed |

## SHA provenance proof

Staging deploy + production plan both pinned to:

`01ff92c0beb646f46c9b8b8225322bb1d63b4b9a`

Artifacts: staging verify/ledger upload; production plan JSON with `gitSha` + pending list.

## Failure-mode tests

| Case | Result |
|------|--------|
| Staging tool + production ref | refuse (`staging_tool_targeted_production`) |
| Production tool + staging ref | refuse |
| Ledger divergence (strict) | fail closed |
| Unknown production tip | fail closed |
| Unverified SHA promotion | workflow failure |
| Apply without founder unlock | `production_apply_blocked` |
| Unit suite | `npm run test:deploy` (20 tests) |

## Rollback model

| Layer | Strategy |
|-------|----------|
| SPA | Redeploy prior SHA in Vercel |
| Edge | Redeploy from prior git SHA to fixed project ref |
| DB | Forward-fix only; irreversible risk surfaces in production plan |

## Known non-blocking follow-ups

- Optional `VERCEL_TOKEN` for SPA SHA wait/verify (Vercel Git remains authoritative;
  Actions does not claim SPA SHA identity on `workflow_dispatch` of older SHAs)
- Node 20 action deprecation warnings on runners (platform)
- Future founder package for production apply of post-tip migrations (Epic 8 activation separate)
- Prefer **staging-only** Supabase access tokens (project-scoped) if org tooling allows —
  Management API PATs remain powerful if exfiltrated from mutate steps
- Post-closure security hardening PR addresses secret step-scoping, trusted
  `staging-verified` creator checks, and dispatch SHA∈main+CI gates

## Fence status

| Item | Status |
|------|--------|
| Phase 7B | **PAUSED** |
| Production `CHECKOUT_MAINTENANCE` | **true** (digest verified) |
| Epic 8 production activation | **NOT** done |
| ADR 0011 | **NOT** started |
| Epic 10+ | **NOT** started |
| Export / calculator / billing semantics | unchanged |
