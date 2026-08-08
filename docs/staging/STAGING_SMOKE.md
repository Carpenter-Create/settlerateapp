# Staging Smoke Checklist (Epic 7 PR 5)

**Authority:** `docs/adr/0008-environment-topology.md`  
**Prerequisites:** `STAGING_DATABASE.md`, `STAGING_EDGE.md`, `STAGING_STRIPE.md`, `STAGING_DEPLOYMENT.md`

## Automated / evidence probes (repo session)

| Probe | Expected | Status |
|-------|----------|--------|
| Staging migration tip | `20260808143109` | Done |
| Production migration tip unchanged by Epic 7 | `20260808040000` | Done |
| Staging app tables empty (no prod clone) | 0 users/scenarios/profiles | Done |
| Staging `exports` bucket | present | Done |
| Staging Edge functions ACTIVE | 7 functions | Done |
| Staging Supabase ref ≠ production | `gkhbalfpxjtleypbabjo` vs `vpcxzbaxhpucvevnkalo` | Done |
| Cross-mode Stripe fence unit tests | green in CI | Done |

## Operator activation (required before end-to-end smoke)

| Step | Owner | Status |
|------|-------|--------|
| Set staging Edge `STRIPE_SECRET_KEY` (`sk_test_…`) | Founder / ops Dashboard | **Open** |
| Set staging Edge `STRIPE_WEBHOOK_SECRET` (`whsec_…` for `we_1U2BGEC56u2NxRIt4U7MBnqg`) | Founder / ops | **Open** |
| Set staging `CHECKOUT_MAINTENANCE=false` | Founder / ops | **Open** |
| Set staging `SENTRY_ENVIRONMENT=staging` (+ optional staging DSN) | Founder / ops | **Open** |
| Connect GitHub → Vercel `settlerate-app-staging` and deploy | Founder / ops | **Open** |
| Configure staging Auth Site URL + redirects (staging project only) | Founder / ops | **Open** |
| DNS / TLS for `staging.settlerate.com` (or allowlist exact Vercel host) | Founder / ops | **Open** |
| Enable Vercel Deployment Protection if available | Founder / ops | **Open** |

## End-to-end smoke (after operator activation)

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
