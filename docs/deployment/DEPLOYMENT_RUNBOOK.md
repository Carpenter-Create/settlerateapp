# Deployment runbook (Epic 9 / ADR 0014)

Authority: `docs/adr/0014-deployment-pipeline.md`,
`docs/deployment/EPIC9_DEPLOYMENT_INVENTORY.md`.

## Promotion path

```
PR → CI validate only
merge to main → release candidate SHA
→ Staging Deploy workflow (migrate → Edge → verify)
→ commit status staging-verified
→ Production Deploy workflow_dispatch (plan default; apply blocked)
→ separate founder package for actual production mutation
```

## Fixed targets

| Env | Supabase ref | SPA authority |
|-----|--------------|---------------|
| Staging | `gkhbalfpxjtleypbabjo` | Vercel Git → `settlerate-app-staging` |
| Production | `vpcxzbaxhpucvevnkalo` | Vercel Git → production project |

GitHub Actions must **not** deploy the SPA (double-deploy risk).

## Staging (automated)

Workflow: `.github/workflows/staging-deploy.yml`

- Trigger: CI `workflow_run` success on `main`, or `workflow_dispatch`
- Environment: `staging` (secret: `SUPABASE_ACCESS_TOKEN`; branch policy: `main`)
- Concurrency: `staging-deploy` (no cancel-in-progress)
- Order: migration ledger → apply pending → Edge `--project-ref` + `--use-api` → verify → `staging-verified` success/failure status
- Deploy secret is step-scoped (not present during `npm ci`)
- `workflow_dispatch` requires SHA ⊆ `origin/main` and a successful CI `validate` check
- Production promotion uses the **latest** `staging-verified` status only, and
  only if created by `github-actions[bot]` with an Actions run `target_url`

Local equivalents:

```bash
export SUPABASE_ACCESS_TOKEN=...   # never commit
npm run test:deploy
bash scripts/deploy/applyStagingMigrations.sh
bash scripts/deploy/deployStagingFunctions.sh
node scripts/deploy/verifyStagingDeploy.mjs
```

## Production (gated; plan only under Epic 9)

Workflow: `.github/workflows/production-deploy.yml`

- Trigger: **`workflow_dispatch` only** (not push/PR)
- Environment: `production-deploy` (required reviewer)
- Default mode: `plan` — enumerates pending migrations; **no mutation**
- Mode `apply`: refused by script + workflow unless founder unlock vars exist;
  Epic 9 tooling still does not execute mutation

```bash
# Plan only (read ledger)
export SUPABASE_ACCESS_TOKEN=...
export STAGING_VERIFIED_SHA=<same-sha>
node scripts/deploy/productionDeployGate.mjs \
  --mode plan \
  --project-ref vpcxzbaxhpucvevnkalo \
  --git-sha <sha>
```

## Migration control

- Fail closed on target-only versions or ordering divergence
- No `migration repair`, Dashboard DDL, or workflow-input SQL
- Production pending migrations may be listed; applying
  `20260808200000` requires a separate Epic 8 production activation package

## Rollback

| Layer | Action |
|-------|--------|
| SPA | Redeploy prior SHA in Vercel |
| Edge | Redeploy functions from prior git SHA to the same project ref |
| DB | Forward-fix only — irreversible risk must appear in production plan |

Partial failure after DB success: re-run Edge/verify from the **same SHA**; do not invent compensating DDL.

## Credentials

| Secret | Scope |
|--------|--------|
| `SUPABASE_ACCESS_TOKEN` | GitHub Environment `staging` (mutate staging) |
| `SUPABASE_ACCESS_TOKEN` | GitHub Environment `production-deploy` (read/plan only under Epic 9) |
| Repo `SENTRY_*` | CI build only |

Never expose deploy credentials to `pull_request` jobs from forks.

## Fences

- Phase 7B paused; production `CHECKOUT_MAINTENANCE=true`
- No Epic 8 production activation from this pipeline alone
- No ADR 0011 / Epic 10+
