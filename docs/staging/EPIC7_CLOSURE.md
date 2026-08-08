# Epic 7 Closure — Staging Environment

**Phase:** 8.1 / Epic 7  
**Date:** 2026-08-08  
**ADR:** `docs/adr/0008-environment-topology.md` (**accepted**)

## Status

**Repository / infrastructure foundation: COMPLETE**  
**End-to-end staging activation smoke: OPEN (operator-gated)**  
**Phase 7B resume: NOT authorized**

## Closure criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | ADR 0008 accepted | **Met** |
| 2 | Staging topology documented | **Met** |
| 3 | Production isolation proven (project refs, empty data, tip divergence) | **Met** |
| 4 | Staging environment reproducible (scripts + docs) | **Met** |
| 5 | Database reconstruction/migrations work on staging | **Met** (tip `20260808143109`) |
| 6 | Auth works in staging | **Open** — Auth Site URL + SPA deploy |
| 7 | Edge Functions work in staging | **Met** (deployed ACTIVE); full invoke smoke open |
| 8 | Export/storage paths work | **Partial** — bucket + functions present; E2E open |
| 9 | Observability environment-separated | **Met** in code; DSN optional |
| 10 | Stripe test-mode path works if included | **Partial** — catalog/webhook/fence done; secrets Dashboard open |
| 11 | Synthetic data strategy documented | **Met** (`STAGING_SEED_POLICY.md`) |
| 12 | No production secrets/data in staging | **Met** (empty tables; secrets contract) |
| 13 | CI/deployment path documented | **Met** |
| 14 | Smoke validation passes | **Open** — see `STAGING_SMOKE.md` |
| 15 | Phase 7B readiness report produced | **Met** (`PHASE7B_READINESS_FROM_EPIC7.md`) |
| 16 | Governance updated | **Met** (this PR) |

## Merged PR train

| PR | Merge |
|----|-------|
| #68 PR0 ADR 0008 | `f143324` |
| #69 PR1 scaffold | `1e0cc41` |
| #70 PR2 database | `e63f533` |
| #71 PR3 Edge/observability/Vercel | `ef86fb3` |
| #72 PR4 Stripe test catalog | `d7c6cf1` |
| #73 PR5 smoke/closure (this PR) | merge SHA recorded after merge |

## Identifiers

| Resource | Value |
|----------|-------|
| Staging Supabase | `gkhbalfpxjtleypbabjo` |
| Production Supabase | `vpcxzbaxhpucvevnkalo` |
| Staging Vercel | `settlerate-app-staging` (`prj_GMmcFJmTAQnpXRtwux8VqUzM6wGo`) |
| Staging origin (planned) | `https://staging.settlerate.com` |
| Stripe test webhook | `we_1U2BGEC56u2NxRIt4U7MBnqg` |

## Explicit non-completions (founder ops)

1. Staging Edge Stripe secrets via Dashboard  
2. Vercel GitHub connect + first SPA production deploy on staging project  
3. Staging Auth redirect configuration  
4. Optional DNS for `staging.settlerate.com`  
5. Full E2E smoke checklist execution  

Epic 8+ remains unauthorized until separately approved.
