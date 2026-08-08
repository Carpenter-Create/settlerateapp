# Staging Deployment (Epic 7)

**Authority:** `docs/adr/0008-environment-topology.md`  
**Secrets map:** `docs/staging/SECRETS_CONTRACT.md`  
**Database:** `docs/staging/STAGING_DATABASE.md`  
**Seed:** `docs/staging/STAGING_SEED_POLICY.md`  
**Status:** Epic 7 repository/infrastructure path documented through PR 5.
Operator E2E activation remains open (`STAGING_SMOKE.md`).

## Topology (binding)

| Layer | Staging | Production |
|-------|---------|------------|
| SPA host | Separate Vercel project `settlerate-app-staging` (provision/link) | Existing production Vercel project |
| Backend | Supabase `gkhbalfpxjtleypbabjo` | Supabase `vpcxzbaxhpucvevnkalo` |
| Schema tip | `20260808143109` (includes staging test price allowlist) | `20260808040000` (Epic 7 migration not production-applied) |
| Stripe | Test mode only (PR 4) | Phase 7B paused / ops-controlled |
| App origin | `https://staging.settlerate.com` (and/or staging Vercel hostname once allowlisted) | `https://app.settlerate.com` |

## Operator checklist

1. Confirm staging SPA env vars point **only** at `gkhbalfpxjtleypbabjo`.
2. Apply git migrations to staging: `bash scripts/staging/apply-staging-migrations.sh`
   (PR 2 — **done** on current staging project).
3. Configure staging Auth redirect URLs for the staging origin(s) on the
   **staging** project (never production Auth Dashboard).
4. Deploy Edge Functions: `bash scripts/staging/deploy-staging-functions.sh` (PR 3).
5. Configure staging Auth Site URL / redirects on **staging** project only (PR 3).
6. Set staging Edge secrets per secrets contract; Stripe **test** only — PR 4.
7. Deploy SPA to staging Vercel project with `VITE_APP_ORIGIN` +
   `VITE_SENTRY_ENVIRONMENT=staging` when DSN set.
8. Run smoke checklist (Epic 7 PR 5 / closure).

See also: `docs/staging/STAGING_EDGE.md`.

## Isolation falsification (must pass)

- [x] Staging DB project ref is `gkhbalfpxjtleypbabjo` (not production)
- [x] Staging migrations tip matches git tip package; production tip unchanged
- [x] Staging app tables empty (no production customer clone)
- [ ] Staging SPA Network tab shows Supabase host `gkhbalfpxjtleypbabjo`
- [x] Staging Edge deploy target is `gkhbalfpxjtleypbabjo` (seven ACTIVE functions)
- [ ] No production service-role in staging secrets
- [ ] No `sk_live_` in staging
- [ ] Auth email links resolve to staging origin, not `app.settlerate.com`
- [ ] Production `CHECKOUT_MAINTENANCE` unchanged

## Phase 7B

This document does **not** authorize Phase 7B resume.
