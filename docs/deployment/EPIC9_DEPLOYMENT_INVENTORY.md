# Epic 9 — Deployment pipeline inventory (PR 0)

- Status: discovery record for ADR 0014
- Date: 2026-08-08
- Main SHA at inventory: `aca4ad27843c6f0523052f25f9f829ecd17a1eed`
- Authority after PR 0: `docs/adr/0014-deployment-pipeline.md`

This document is **evidence-only**. It does not authorize production
mutation, Epic 8 production activation, Phase 7B resume, ADR 0011, or
Epic 10+.

## 1. Canonical state at discovery

| Item | Status |
|------|--------|
| Epic 1–8 | Complete (Epic 8 staging recovery verified) |
| ADR 0008 / 0009 | Accepted |
| Epic 9 | Not begun before this authorization |
| Epic 10+ / ADR 0011 | Not authorized |
| Phase 7B | Paused |
| Production tip | `20260808040000` |
| Staging tip | includes `20260808143109` + `20260808200000` |
| Prod Supabase | `vpcxzbaxhpucvevnkalo` (protected) |
| Staging Supabase | `gkhbalfpxjtleypbabjo` |
| Staging SPA | `https://settlerate-app-staging.vercel.app` (`prj_GMmcFJmTAQnpXRtwux8VqUzM6wGo`) |

## 2. What deploys automatically today

| Surface | Mechanism | Trigger |
|---------|-----------|---------|
| CI validation | `.github/workflows/ci.yml` | PR + push to `main` |
| Production SPA | Vercel Git integration (authoritative) | merge to `main` |
| Staging SPA | Vercel Git → project `settlerate-app-staging` | merge to `main` (separate project) |
| Staging migrations | **Manual** `scripts/staging/apply-staging-migrations.sh` | operator |
| Staging Edge | **Manual** `scripts/staging/deploy-staging-functions.sh` | operator |
| Production migrations | Manual / founder packages | never automatic |
| Production Edge | Manual Supabase CLI/Dashboard | never automatic |

GitHub Actions **does not** deploy SPA, Edge, or schema today. CI only
validates (lint/typecheck/tests/build).

## 3. Manual surfaces

- Staging/production Supabase migrations (`db push` / founder apply packages)
- Staging/production Edge Function deploys
- Staging isolation script (`verify-staging-isolation.sh` — weak; list-only)
- Auth Dashboard / secrets / Stripe webhook configuration (ops)

## 4. Vercel Git integration

- Production SPA authority: Vercel Git → production project (do **not**
  disable/change under Epic 9 — live path).
- Staging SPA authority: Vercel Git → `settlerate-app-staging`.
- `vercel.json` is SPA rewrite only (no deploy hooks).
- **Double-deploy risk:** if Actions also ran `vercel deploy` on `main`,
  both would ship. Epic 9 must **not** Actions-deploy SPA; verify Vercel
  deployment for the SHA instead (or document Git as sole SPA path).

## 5. Supabase CLI assumptions

- Staging scripts historically `supabase link` to staging then restore
  production link (footgun if interrupted).
- Epic 9 must prefer explicit `--project-ref` and fail closed if target ≠
  expected fixed ref.
- Staging Edge uses `--use-api` for monorepo `packages/core` upload
  (proven Epic 7).
- Auth for CI requires `SUPABASE_ACCESS_TOKEN` (not present in GitHub
  secrets today — only Sentry build secrets exist at repo level).

## 6. Credentials inventory

| Credential | Exists today | Needed for Epic 9 |
|------------|--------------|-------------------|
| Repo secrets `SENTRY_*` | Yes (CI build upload) | Keep; CI only |
| GitHub Environment `staging` | Created empty (Epic 9) | `SUPABASE_ACCESS_TOKEN` for staging mutate |
| GitHub Environment `production-deploy` | Created with required reviewer `acarpcreate` | Prod token for **plan/read** only under Epic 9; mutation blocked |
| Vercel deploy token | Not in Actions | Optional: wait/verify SPA deployment by SHA |
| Local Supabase CLI keychain | Operator laptop | Not for CI |

**PR secrets:** must never receive deploy credentials (fork-safe).

## 7. Deployable release identity

A release candidate is an exact **git commit SHA** on `main` after CI
`validate` succeeds. Staging verification and any future production
promotion must target that same SHA — never “latest main” at job start
without pin.

## 8. Current ordering (manual)

Observed Epic 7/8 operator practice:

1. Apply staging migrations
2. Deploy staging Edge
3. Rely on Vercel for SPA
4. Smoke / isolation

Safe default for Epic 9 (backward-compatible additive migrations):

**schema → Edge → SPA verify**

Irreversible/breaking migrations must fail closed into a special rollout
plan (not auto-applied).

## 9. Rollback today

| Layer | Rollback |
|-------|----------|
| SPA | Redeploy prior SHA in Vercel |
| Edge | Redeploy functions from prior git SHA |
| Migrations | Forward-fix only (ADR 0006); no automatic down migrations |

## 10. Production actions safe to define but not execute

- Enumerate pending migrations vs tip `20260808040000` (includes
  `20260808143109`, `20260808200000` as pending — **must not apply**)
- Print production deploy plan for a staging-verified SHA
- Require `production-deploy` environment approval
- Refuse apply unless separate founder var/package enables mutation

## 11. Dependency graph (Epic 9)

```
PR0  ADR 0014 + this inventory + governance
  │
  ├─► A  Migration ledger control (pure + CLI adapters; fail closed)
  │
  ├─► B  Staging deploy scripts (fixed refs; no link footgun)
  │
  ├─► C  staging-deploy.yml (main → staging env; migrate+Edge+verify)
  │     depends on: A–B; staging SUPABASE_ACCESS_TOKEN
  │
  ├─► D  staging-verified commit status / provenance record
  │
  ├─► E  production-deploy.yml (workflow_dispatch; plan default;
  │     apply blocked unless founder enablement; env approval)
  │
  ├─► F  Failure-mode tests (wrong ref, divergence, untrusted PR)
  │
  ├─► G  Staging pipeline runtime proof on a SHA
  │
  └─► H  Runbook + EPIC9_CLOSURE.md
```

## 12. Founder/platform configuration required

| Item | Status |
|------|--------|
| GitHub Environment `staging` | Created (no required reviewers) |
| GitHub Environment `production-deploy` + required reviewer | Created (`acarpcreate`) |
| `SUPABASE_ACCESS_TOKEN` on `staging` | Set (Epic 9) for staging mutate |
| `SUPABASE_ACCESS_TOKEN` on `production-deploy` | Set (Epic 9) for **plan/read only** |
| Optional `VERCEL_TOKEN` on `staging` | For SPA SHA wait/verify (not required) |
| Production mutate enablement | Remains **off** for entire Epic 9 |
| Production Vercel Git settings | **Do not change** |

### Production ledger note (binding)

Production `schema_migrations` has historical version IDs that do not match
current git filenames (Epic 6 skew). Semantic tip at discovery:
`20260808040000`. Epic 9 uses **tip-anchored** comparison for production
and **strict** comparison for staging. Pending at discovery:
`20260808143109`, `20260808200000` (enumerate only; do not apply).

## 13. Explicit non-goals

- Production SPA/Edge/schema mutation
- Applying Epic 8 migration to production
- Phase 7B / checkout maintenance changes
- ADR 0011 / Epic 10+
- Next.js / AWS / Cloudflare migration
- Dual SPA deployers (Actions + Vercel Git)
