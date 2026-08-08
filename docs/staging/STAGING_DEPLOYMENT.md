# Staging Deployment (Epic 7)

**Authority:** `docs/adr/0008-environment-topology.md`  
**Secrets map:** `docs/staging/SECRETS_CONTRACT.md`  
**Database:** `docs/staging/STAGING_DATABASE.md`  
**Seed:** `docs/staging/STAGING_SEED_POLICY.md`  
**Status:** Database migrations applied to staging Supabase; SPA/Edge/Stripe
wiring continues in Epic 7 PR 3–5

## Topology (binding)

| Layer | Staging | Production |
|-------|---------|------------|
| SPA host | Separate Vercel project `settlerate-app-staging` (pending PR 3) | Existing production Vercel project |
| Backend | Supabase `gkhbalfpxjtleypbabjo` | Supabase `vpcxzbaxhpucvevnkalo` |
| Schema tip | `20260808040000` (git migrations applied) | `20260808040000` |
| Stripe | Test mode only (PR 4) | Phase 7B paused / ops-controlled |
| App origin | `https://staging.settlerate.com` (and/or staging Vercel hostname once allowlisted) | `https://app.settlerate.com` |

## Operator checklist

1. Confirm staging SPA env vars point **only** at `gkhbalfpxjtleypbabjo`.
2. Apply git migrations to staging: `bash scripts/staging/apply-staging-migrations.sh`
   (PR 2 — **done** on current staging project).
3. Configure staging Auth redirect URLs for the staging origin(s) on the
   **staging** project (never production Auth Dashboard).
4. Set staging Edge secrets per secrets contract (Stripe **test** only) — PR 4.
5. Deploy Edge Functions with `--project-ref gkhbalfpxjtleypbabjo` — PR 3.
6. Deploy SPA to staging Vercel project with `VITE_APP_ORIGIN` set to an
   approved staging origin — PR 3.
7. Run smoke checklist (Epic 7 PR 5 / closure).

## Isolation falsification (must pass)

- [x] Staging DB project ref is `gkhbalfpxjtleypbabjo` (not production)
- [x] Staging migrations tip matches git tip package; production tip unchanged
- [x] Staging app tables empty (no production customer clone)
- [ ] Staging SPA Network tab shows Supabase host `gkhbalfpxjtleypbabjo`
- [ ] Staging Edge deploy target is not `vpcxzbaxhpucvevnkalo`
- [ ] No production service-role in staging secrets
- [ ] No `sk_live_` in staging
- [ ] Auth email links resolve to staging origin, not `app.settlerate.com`
- [ ] Production `CHECKOUT_MAINTENANCE` unchanged

## Phase 7B

This document does **not** authorize Phase 7B resume.
