# Epic 7 Closure — Staging Environment

**Phase:** 8.1 / Epic 7  
**Date:** 2026-08-08  
**ADR:** `docs/adr/0008-environment-topology.md` (**accepted**)

## Status

**Repository / infrastructure foundation: COMPLETE**  
**Staging Auth + SPA origin activation: IN PROGRESS (this train)**  
**Stripe test checkout E2E: BLOCKED** — SettleRate `sk_test_…` not available to agent tooling  
**Phase 7B resume: NOT authorized**

## Closure criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | ADR 0008 accepted | **Met** |
| 2 | Staging topology documented | **Met** |
| 3 | Production isolation proven (project refs, empty data, tip divergence) | **Met** |
| 4 | Staging environment reproducible (scripts + docs) | **Met** |
| 5 | Database reconstruction/migrations work on staging | **Met** (tip `20260808143109`) |
| 6 | Auth works in staging | **Partial** — Site URL + redirects configured on staging; SPA origin allowlisted; signup E2E pending redeploy + email |
| 7 | Edge Functions work in staging | **Met** (deployed ACTIVE); billing invoke needs `sk_test_` |
| 8 | Export/storage paths work | **Partial** — bucket + functions present; E2E open |
| 9 | Observability environment-separated | **Met** in code; Edge `SENTRY_ENVIRONMENT=staging`; DSN optional |
| 10 | Stripe test-mode path works if included | **Partial** — catalog/webhook/fence + webhook secret; **`STRIPE_SECRET_KEY` HARD STOP** |
| 11 | Synthetic data strategy documented | **Met** (`STAGING_SEED_POLICY.md`) |
| 12 | No production secrets/data in staging | **Met** (empty tables; secrets contract) |
| 13 | CI/deployment path documented | **Met** |
| 14 | Smoke validation passes | **Partial** — see `STAGING_SMOKE.md` |
| 15 | Phase 7B readiness report produced | **Met** (`PHASE7B_READINESS_FROM_EPIC7.md`) |
| 16 | Governance updated | **Met** |

## Merged PR train

| PR | Merge |
|----|-------|
| #68 PR0 ADR 0008 | `f143324` |
| #69 PR1 scaffold | `1e0cc41` |
| #70 PR2 database | `e63f533` |
| #71 PR3 Edge/observability/Vercel | `ef86fb3` |
| #72 PR4 Stripe test catalog | `d7c6cf1` |
| #73 PR5 smoke/closure | `c4f92be140298f8fca5f53bb67f95f26c031b335` |
| #74 closure SHA polish | `e43e4dd` |
| Staging Vercel origin activation | this PR (pending merge) |

## Identifiers

| Resource | Value |
|----------|-------|
| Staging Supabase | `gkhbalfpxjtleypbabjo` |
| Production Supabase | `vpcxzbaxhpucvevnkalo` |
| Staging Vercel | `settlerate-app-staging` (`prj_GMmcFJmTAQnpXRtwux8VqUzM6wGo`) |
| Staging origin (active) | `https://settlerate-app-staging.vercel.app` |
| Staging origin (planned DNS) | `https://staging.settlerate.com` |
| Stripe test webhook (active) | `we_1U2DA3C56u2NxRItrLZk7FMx` |

## Hard stop (exact)

**Missing credential:** SettleRate Stripe **test-mode** secret key (`sk_test_…` for `acct_1U0irnC56u2NxRIt`).

- Local Stripe CLI profiles are other businesses (not SettleRate).
- Stripe MCP can manage test catalog/webhooks but does not expose Dashboard secret keys.
- No `sk_test_` for SettleRate is present in repo env files.

**Founder action (staging only):**

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_… --project-ref gkhbalfpxjtleypbabjo
bash scripts/staging/deploy-staging-functions.sh
```

Do **not** set `sk_live_…`. Do **not** change production secrets.

## Production boundary confirmation

- Production Auth Site URL remains `https://app.settlerate.com` (read-only verified).
- Production migration tip remains `20260808040000`.
- Phase 7B remains paused; production checkout maintenance must stay enabled.
- Epic 8 has **not** begun.
- ADR 0011 has **not** begun.
