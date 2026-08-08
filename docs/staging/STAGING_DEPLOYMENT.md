# Staging Deployment (Epic 7 scaffold)

**Authority:** `docs/adr/0008-environment-topology.md`  
**Secrets map:** `docs/staging/SECRETS_CONTRACT.md`  
**Status:** Scaffold — provisioning and smoke continue in later Epic 7 PRs

## Topology (binding)

| Layer | Staging | Production |
|-------|---------|------------|
| SPA host | Separate Vercel project `settlerate-app-staging` | Existing production Vercel project |
| Backend | Supabase `gkhbalfpxjtleypbabjo` | Supabase `vpcxzbaxhpucvevnkalo` |
| Stripe | Test mode only | Phase 7B paused / ops-controlled |
| App origin | `https://staging.settlerate.com` (and/or staging Vercel hostname once allowlisted) | `https://app.settlerate.com` |

## Operator checklist (high level)

1. Confirm staging SPA env vars point **only** at `gkhbalfpxjtleypbabjo`.
2. Apply git migrations to staging (Epic 7 PR 2+).
3. Configure staging Auth redirect URLs for the staging origin(s) on the
   **staging** project (never production Auth Dashboard).
4. Set staging Edge secrets per secrets contract (Stripe **test** only).
5. Deploy Edge Functions with `--project-ref gkhbalfpxjtleypbabjo`.
6. Deploy SPA to staging Vercel project with `VITE_APP_ORIGIN` set to an
   approved staging origin.
7. Run smoke checklist (Epic 7 PR 5 / closure).

## Isolation falsification (must pass)

- [ ] Staging SPA Network tab shows Supabase host `gkhbalfpxjtleypbabjo`
- [ ] Staging Edge deploy target is not `vpcxzbaxhpucvevnkalo`
- [ ] No production service-role in staging secrets
- [ ] No `sk_live_` in staging
- [ ] Auth email links resolve to staging origin, not `app.settlerate.com`
- [ ] Production `CHECKOUT_MAINTENANCE` unchanged

## Phase 7B

This document does **not** authorize Phase 7B resume.
