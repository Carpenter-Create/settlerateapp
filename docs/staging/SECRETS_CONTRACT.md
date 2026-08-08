# Staging Secrets Contract

**Phase:** 8.1 / Epic 7  
**Authority:** `docs/adr/0008-environment-topology.md`  
**Rule:** Never commit real secrets. This file documents **where** secrets live.

## Staging identifiers (non-secret)

| Item | Value |
|------|--------|
| Supabase project name | SettleRate Staging |
| Supabase project ref | `gkhbalfpxjtleypbabjo` |
| Supabase region | `us-east-1` |
| Planned custom app origin | `https://staging.settlerate.com` |
| Vercel project | `settlerate-app-staging` (id `prj_GMmcFJmTAQnpXRtwux8VqUzM6wGo`; separate from production) |
| Production Supabase ref (do not use) | `vpcxzbaxhpucvevnkalo` |

## Client (Vercel staging project / `.env.staging`)

| Variable | Secret? | Notes |
|----------|---------|--------|
| `VITE_SUPABASE_URL` | No (public) | Must be `https://gkhbalfpxjtleypbabjo.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | No (public anon) | Staging project anon key only |
| `VITE_APP_ORIGIN` | No | Must be an approved staging origin (exact match) |
| `VITE_SENTRY_DSN` | No (public DSN) | Staging DSN only; never production DSN |
| `VITE_SENTRY_ENVIRONMENT` | No | Must be `staging` when client DSN is set |

## Edge (staging Supabase project secrets)

| Variable | Secret? | Notes |
|----------|---------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Staging project only — never production |
| `STRIPE_SECRET_KEY` | **Yes** | `sk_test_…` only (PR 4) |
| `STRIPE_WEBHOOK_SECRET` | **Yes** | Test-mode endpoint secret only (PR 4) |
| `CHECKOUT_MAINTENANCE` | No | May be `false` on staging for test checkout (PR 4) |
| `SENTRY_DSN` | No (public DSN) | Staging Edge project/DSN |
| `SENTRY_ENVIRONMENT` | No | Must be `staging` when Edge DSN is set |

## Forbidden in staging

- Production service-role key
- Production DB password / connection string
- Live Stripe secrets (`sk_live_…`, live webhook secrets)
- Production `VITE_SUPABASE_*`
- Production Auth JWT secret
- Cloning production customer data

## Production must remain

- `CHECKOUT_MAINTENANCE=true` while Phase 7B is paused
- Untouched Auth Dashboard redirects
- Untouched live Stripe configuration (unless separately authorized)
