# ADR 0014: Deployment pipeline

- Status: accepted
- Date: 2026-08-08
- Epic: Phase 8.1 / Epic 9 (Deployment Pipeline)
- Deciders: Founder / Adam Carpenter (authorized via Epic 9 kickoff;
  decisions bound by stated founder intent + repository discovery)

## Context

Epics 7–8 established an isolated staging stack and billing recovery, but
promotion remains operator-manual: GitHub Actions only validates; Vercel Git
deploys SPAs; Supabase migrations/Edge are script-driven by hand. Accidental
production mutation (wrong project ref, broad `db push`, SHA drift) is a
real risk as the migration tip diverges (`20260808040000` production vs
later Epic 7/8 migrations on staging/git).

Discovery: `docs/deployment/EPIC9_DEPLOYMENT_INVENTORY.md`.

**Epic 9 PR 0 is ADR + inventory + governance only** for the first merge
slice; subsequent PRs implement workflows without executing production
mutation.

## Decision

### 1. Promotion model

```
PR → CI validate only
merge to main → release-candidate SHA
→ automated staging deploy (migrations + Edge) + SPA via Vercel Git
→ staging verification → commit status staging-verified
→ production requires explicit workflow_dispatch + environment approval
→ production apply remains founder-gated beyond Epic 9
```

Never substitute a different SHA between staging verification and
production planning.

### 2. SPA authority (avoid double-deploy)

| Environment | Authoritative SPA deployer |
|-------------|----------------------------|
| Staging | Vercel Git → `settlerate-app-staging` |
| Production | Vercel Git → production project |

GitHub Actions **must not** deploy the SPA. Actions may wait/verify that
Vercel built the pinned SHA when a token is available.

**Do not** disable or change production Vercel Git integration under Epic 9.

### 3. Supabase targeting

Fixed refs only:

- Staging: `gkhbalfpxjtleypbabjo`
- Production: `vpcxzbaxhpucvevnkalo`

Prefer `--project-ref` over ambient CLI link. Fail closed if the effective
target ≠ expected. Staging workflows must not receive production secrets.

### 4. Migration control (ADR 0006 binding)

Before any apply:

1. Read repository migration versions (git).
2. Read target ledger (`supabase_migrations.schema_migrations`).
3. Compute ordered pending versions.
4. Detect divergence per environment mode.

**Staging — strict prefix:** target versions must be an ordered prefix of
git. Fail closed on target-only versions or ordering breaks.

**Production — tip-anchored:** Epic 6 left historical `schema_migrations`
rows whose version IDs do not match current git filenames (off-by-one /
reconciled intermediates), while the semantic production tip
`20260808040000` is present in both. Production comparison therefore:

- Anchors on `max(target versions)` and requires that tip ∈ git
- Treats pre-tip target-only rows as `historicalTargetOnly` (audit)
- Enumerates pending as git versions **strictly after** the tip
- Fails closed if tip is unknown, target is ahead of git, or post-tip
  target-only versions appear

**Never** use naive production `supabase db push` (would attempt to replay
pre-tip filename mismatches). Future founder apply packages must apply
**only** explicit post-tip pending files.

No `migration repair`, Dashboard DDL, or workflow-input SQL.

| Target | Apply under Epic 9 |
|--------|---------------------|
| Staging | Allowed for pending git migrations |
| Production | **Enumerate only** — never apply under this Epic |

Pending production migrations (at discovery) include at least
`20260808143109` and `20260808200000` — Epic 8 production activation remains
a separate founder package.

### 5. Deployment ordering

Default for additive, backward-compatible migrations:

1. Schema (migrations)
2. Edge Functions
3. SPA verification (Vercel)

If a migration is not backward-compatible with currently deployed Edge/SPA,
automation must refuse and require a documented special rollout (hard stop).

### 6. Staging automation

Triggered by CI `workflow_run` success on `main` (not in parallel with
validate) and by `workflow_dispatch` (environment restricted to `main`):

- Pin checkout to the release SHA (`workflow_run.head_sha` or input)
- Migration ledger check + apply pending to staging
- Deploy Edge with `--project-ref gkhbalfpxjtleypbabjo --use-api`
- Isolation / smoke checks (deterministic; no production data)
- Publish `staging-verified` success **or failure** commit status for that SHA
- Production promotion requires the **latest** `staging-verified` status to
  be success **and** authored by `github-actions[bot]` with an Actions run URL
  (stale or forged statuses must not promote)
- `workflow_dispatch` may only target SHAs on `main` that already passed CI
- Deploy credentials are step-scoped; checkout-controlled unit tests are not
  re-run in the secret-bearing job (CI already covers `test:deploy`)
- Concurrency group prevents overlapping staging deploys

### 7. Production approval gate

- Workflow: `workflow_dispatch` only (not `push`, not `pull_request`)
- GitHub Environment: `production-deploy` with required reviewers
- Default mode: `plan` (enumerate pending migrations; print plan; no mutate)
- Mode `apply`: refused unless repository/environment variable
  `ALLOW_PRODUCTION_DEPLOY=true` **and** separate founder authorization
  (must remain unset for Epic 9)
- Unverified SHA (missing `staging-verified` success) cannot be planned as
  releasable without explicit override that still cannot mutate under Epic 9

### 8. Secrets / permissions

- Least privilege; environment-scoped secrets
- No production secrets on `pull_request` or staging jobs
- No deploy credentials for fork PRs
- Do not echo secrets
- Prefer existing long-lived Supabase access token scoped to environments
  over broad redesign; OIDC not required for Epic 9 closure

### 9. Rollback

| Layer | Strategy |
|-------|----------|
| SPA | Redeploy prior SHA in Vercel |
| Edge | Redeploy from prior git SHA |
| DB | Forward-fix only; irreversible risk must appear in production plan |

Partial failure (DB ok, Edge fail): re-run Edge from same SHA; do not
invent compensating DDL.

### 10. Observability / audit

Each staging/production workflow run records: git SHA, environment,
migration tip before/after (staging) or pending list (production plan),
Edge result, verification result, workflow run URL.

### 11. Semantic fences

Deployment tooling deploys accepted behavior only — no calculator, export,
billing, entitlement, checkout, or Auth model changes.

### 12. Phase 7B / Epic 8 production

- Phase 7B remains paused; production `CHECKOUT_MAINTENANCE=true` preserved
- Epic 8 production migration/Edge must not be applied by Epic 9

## Consequences

- New scripts under `scripts/deploy/` and workflows under `.github/workflows/`
- Staging requires `SUPABASE_ACCESS_TOKEN` in GitHub Environment `staging`
- Production mutation remains impossible without deliberate enablement +
  approval + future founder package
- Operators stop using ambient `supabase link` as the deploy authority

## Alternatives considered

1. **Actions deploys SPA with Vercel CLI** — Rejected for Epic 9; doubles
   deploy with Git integration and risks production Git changes.
2. **Auto-promote main → production after staging** — Rejected; violates
   founder gate.
3. **Uncontrolled `supabase db push` to production** — Rejected; ADR 0006
   and Epic 8 activation boundaries forbid it.
4. **Reuse Vercel environment name `Production` for Actions** — Rejected;
   collides with Vercel Git deployment environments; use `production-deploy`.
