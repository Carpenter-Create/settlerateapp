# Staging Smoke Checklist (Epic 7)

**Authority:** `docs/adr/0008-environment-topology.md`  
**Prerequisites:** `STAGING_DATABASE.md`, `STAGING_EDGE.md`, `STAGING_STRIPE.md`, `STAGING_DEPLOYMENT.md`

## Automated / evidence probes

| Probe | Expected | Status |
|-------|----------|--------|
| Staging migration tip | `20260808143109` | Done |
| Production migration tip unchanged by Epic 7 | `20260808040000` | Done |
| Staging app tables empty (no prod clone) | 0 users/scenarios/profiles | Done |
| Staging `exports` bucket | present | Done |
| Staging Edge functions ACTIVE | 7 functions | Done |
| Staging Supabase ref ≠ production | `gkhbalfpxjtleypbabjo` vs `vpcxzbaxhpucvevnkalo` | Done |
| Cross-mode Stripe fence unit tests | green in CI | Done |
| SPA host | `https://settlerate-app-staging.vercel.app` | Done |
| SPA Supabase host baked in | `gkhbalfpxjtleypbabjo` (not production) | Done |
| Exact origin allowlist includes Vercel host | app + core allowlists | Done (this PR) |
| Staging Auth Site URL | staging Vercel origin | Done |
| Staging Auth redirects | staging (+ optional custom/local) | Done |
| Production Auth Site URL unchanged | `https://app.settlerate.com` | Done (read-only verified) |
| Staging Auth login (synthetic user) | password grant OK | Done |
| Staging admin bootstrap | issue + claim; re-issue fail-closed | Done |
| `create-checkout` without `sk_test_` | HTTP 500 `STRIPE_SECRET_KEY is not set` | Done (fail-closed) |
| Staging Edge `CHECKOUT_MAINTENANCE` | `false` | Done |
| Staging Edge `SENTRY_ENVIRONMENT` | `staging` | Done |
| Staging Edge `STRIPE_WEBHOOK_SECRET` | set (rotated webhook) | Done |
| Staging Edge `STRIPE_SECRET_KEY` present | name in secrets list | Done (updated 2026-08-08T17:29Z) |
| Staging Edge `STRIPE_SECRET_KEY` **valid at Stripe** | `create-checkout` → `cs_test_…` | **FAIL — HARD STOP** (`Invalid API Key`) |
| Live price rejected under staging | 400 `PRICE_NOT_ALLOWED` | Done |

## Remaining operator activation

| Step | Owner | Status |
|------|-------|--------|
| Re-set a **valid** SettleRate test-mode secret key on staging (`sk_test_…`, no quotes/whitespace) | Founder | **Open / HARD STOP** |
| Optional DNS / TLS for `staging.settlerate.com` | Founder / ops | Optional |
| Enable Vercel Deployment Protection if available | Founder / ops | Optional |
| Full billing/export E2E after valid `sk_test_` | Founder / ops | Blocked on key validity |

## End-to-end smoke (after `sk_test_` secret)

Use **synthetic** emails only (`*@example.invalid` or dedicated staging inbox).

1. **Auth** — sign up / login / logout on staging origin; email links stay on staging.
2. **Calculator** — run a basic scenario calculation (no formula changes).
3. **Save/load** — create/update a scenario under free limit.
4. **Export** — generate PDF into staging `exports` bucket; resolve share if exercised.
5. **Entitlement** — free limit enforced; after test checkout, Professional features unlock.
6. **Billing test mode** — Checkout with Stripe test card; webhook updates staging `billing`.
7. **Observability** — if DSN set, forced error tags `environment: staging` (not production).
8. **Isolation** — Network tab Supabase host is `gkhbalfpxjtleypbabjo`; no production host.

## Fail closed

Stop and escalate if staging SPA shows production Supabase URL, live Stripe, or production Auth redirects.
