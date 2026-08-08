# Epic 7 Closure — Staging Environment

**Phase:** 8.1 / Epic 7  
**Date:** 2026-08-08  
**ADR:** `docs/adr/0008-environment-topology.md` (**accepted**)

## Status

**Repository / infrastructure foundation: COMPLETE**  
**Staging Auth + SPA origin + admin bootstrap: PROVEN**  
**Stripe test checkout E2E: BLOCKED** — staging `STRIPE_SECRET_KEY` is present but **rejected by Stripe at runtime** (`Invalid API Key provided: sk_test_...`)  
**Phase 7B resume: NOT authorized**  
**Main tip at this record:** see git `main` HEAD when reading

## Closure criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | ADR 0008 accepted | **Met** |
| 2 | Staging topology documented | **Met** |
| 3 | Production isolation proven (project refs, empty data, tip divergence) | **Met** |
| 4 | Staging environment reproducible (scripts + docs) | **Met** |
| 5 | Database reconstruction/migrations work on staging | **Met** (tip `20260808143109`) |
| 6 | Auth works in staging | **Met** |
| 7 | Edge Functions work in staging | **Met** (7 ACTIVE; redeployed after secret set) |
| 8 | Export/storage paths work | **Partial** — blocked behind billing E2E / remaining smoke |
| 9 | Observability environment-separated | **Met** in code; Edge `SENTRY_ENVIRONMENT=staging`; DSN optional |
| 10 | Stripe test-mode path works if included | **Blocked** — secret **presence** cleared; **runtime validity** failed |
| 10b | Staging admin bootstrap | **Met** |
| 11 | Synthetic data strategy documented | **Met** (`STAGING_SEED_POLICY.md`) |
| 12 | No production secrets/data in staging | **Met** (no prod clone; secrets contract) |
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
| #75 staging Vercel origin activation | `5eae5ae87d56fc9399a20ffc05201fe155d067cd` |
| #76 Auth/admin evidence + prior hard stop | `b6c32a2` |

## Identifiers

| Resource | Value |
|----------|-------|
| Staging Supabase | `gkhbalfpxjtleypbabjo` |
| Production Supabase | `vpcxzbaxhpucvevnkalo` |
| Staging Vercel | `settlerate-app-staging` (`prj_GMmcFJmTAQnpXRtwux8VqUzM6wGo`) |
| Staging origin (active) | `https://settlerate-app-staging.vercel.app` |
| Staging origin (planned DNS) | `https://staging.settlerate.com` |
| Stripe test webhook (active) | `we_1U2DA3C56u2NxRItrLZk7FMx` |
| Stripe account (test) | `acct_1U0irnC56u2NxRIt` |

## Hard stop (exact) — runtime falsification

**Claim cleared:** `STRIPE_SECRET_KEY` **name** exists in staging Edge secrets (updated `2026-08-08T17:29:31Z`).  
**Claim not cleared:** key is accepted by Stripe.

Runtime evidence against staging `create-checkout` (after founder set + deploy, and after a second staging-only redeploy):

| Probe | Result |
|-------|--------|
| Secret list includes `STRIPE_SECRET_KEY` | Yes |
| Live price ID under staging request | **400** `PRICE_NOT_ALLOWED` (cross-mode fence; runs before Stripe network call; implies stored value has `sk_test_` prefix) |
| Default monthly `create-checkout` | **500** `Invalid API Key provided: sk_test_...` |
| Production project targeted | **No** — CLI link remained `vpcxzbaxhpucvevnkalo`; deploys used `--project-ref gkhbalfpxjtleypbabjo` |

Likely causes (founder ops, staging only):

- Truncated / whitespace / quoted value when setting the secret
- Placeholder or non-SettleRate test key
- Revoked/rotated key still pasted
- Restricted key / wrong key type mistaken for secret key

**Founder action (staging only):**

1. Open SettleRate **test mode** API keys: https://dashboard.stripe.com/acct_1U0irnC56u2NxRIt/test/apikeys  
2. Copy a fresh **Secret key** (`sk_test_…`) — not publishable, not live.  
3. Re-set on **staging** only (no surrounding quotes/newlines):

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_… --project-ref gkhbalfpxjtleypbabjo
bash scripts/staging/deploy-staging-functions.sh
```

4. Re-authorize Epic 7 resume. Agent will re-prove with a successful Checkout Session (`cs_test_…`) before closing.

Do **not** set `sk_live_…`. Do **not** change production secrets.

## Production boundary confirmation

- Production Auth Site URL remains `https://app.settlerate.com` (previously verified; not mutated this train).
- Production migration tip remains `20260808040000` (must re-confirm at final closure).
- Phase 7B remains paused; production checkout maintenance must stay enabled.
- Epic 8 has **not** begun.
- ADR 0011 has **not** begun.
