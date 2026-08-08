# Staging Smoke Checklist (Epic 7)

**Authority:** `docs/adr/0008-environment-topology.md`  
**Status:** **COMPLETE** (runtime E2E 2026-08-08) — see `EPIC7_CLOSURE.md`

## Automated / evidence probes

| Probe | Expected | Status |
|-------|----------|--------|
| Staging migration tip | `20260808143109` | Done |
| Production migration tip | `20260808040000` | Done |
| Staging vs production Supabase refs | distinct | Done |
| Staging Edge functions ACTIVE | 7 | Done |
| SPA host | `https://settlerate-app-staging.vercel.app` | Done |
| SPA Supabase host | `gkhbalfpxjtleypbabjo` only | Done |
| Exact origin allowlist includes Vercel host | app + core | Done |
| Staging Auth Site URL | staging Vercel origin | Done |
| Production Auth Site URL | `https://app.settlerate.com` | Done |
| Staging Auth login (synthetic) | password grant OK | Done |
| Staging admin bootstrap | issue + claim; re-issue fail-closed | Done |
| `create-checkout` → `cs_test_…` | staging price + staging return URLs | Done |
| Live price under staging | 400 `PRICE_NOT_ALLOWED` | Done |
| Lookalike Origin checkout URLs | production origin (fail-closed) | Done |
| Staging webhook endpoint | staging host only; prior endpoint disabled | Done |
| Webhook → staging `billing` entitled | Professional / active | Done |
| `check-subscription` | `subscribed=true` | Done |
| Customer Portal | test-mode portal session URL | Done |
| RLS owner / non-owner | owner sees; other empty | Done |
| `generate-pdf` | PDF bytes | Done |
| `export-share` + resolve | signed URL on staging storage | Done |
| Production `CHECKOUT_MAINTENANCE` | digest `sha256("true")` | Done |
| Staging `CHECKOUT_MAINTENANCE` | digest `sha256("false")` | Done |
| Staging `SENTRY_ENVIRONMENT` | digest `sha256("staging")` | Done |

## Optional operator follow-ups

| Step | Status |
|------|--------|
| DNS for `staging.settlerate.com` | Optional |
| Vercel Deployment Protection | Optional |
| Dedicated staging Sentry DSN | Optional (tagging already set) |
| Magic-link email UX with staging inbox | Optional |

## Fail closed

Stop and escalate if staging SPA shows production Supabase URL, live Stripe, or production Auth redirects.
