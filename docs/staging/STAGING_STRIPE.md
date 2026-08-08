# Staging Stripe Test-Mode (Epic 7 PR 4)

**Authority:** `docs/adr/0008-environment-topology.md`  
**Secrets:** `docs/staging/SECRETS_CONTRACT.md`  
**Entitlement:** `docs/ENTITLEMENT_CONTRACT.md` + `@settlerate/core/entitlement`

## Rules

- Staging Edge uses **Stripe test mode only** (`sk_test_…`, test webhook secret).
- Never set `sk_live_…` on staging Supabase secrets.
- Never change production Stripe / production Edge secrets for staging convenience.
- Phase 7B remains **paused**; production `CHECKOUT_MAINTENANCE` stays `true`.

## Staging test catalog (created 2026-08-08, livemode=false)

| Item | ID |
|------|-----|
| Product | `prod_V2FlK0MVh9ZmBh` |
| Monthly price | `price_1U2BGAC56u2NxRItx3etGK2q` (`settlerate_professional_monthly_staging_test`) |
| Annual price | `price_1U2BGBC56u2NxRIt8cw5cx2m` (`settlerate_professional_annual_staging_test`) |
| Webhook endpoint (active) | `we_1U2DA3C56u2NxRItrLZk7FMx` → `https://gkhbalfpxjtleypbabjo.supabase.co/functions/v1/stripe-webhook` |
| Webhook endpoint (retired) | `we_1U2BGEC56u2NxRIt4U7MBnqg` (disabled after secret rotation) |

Retired Phase 6 sandbox prices remain **non-granting**.

## Cross-mode fence

| Stripe secret | Default checkout prices | Allowlisted chargeable prices |
|---------------|-------------------------|--------------------------------|
| `sk_test_…` | Staging test monthly/annual | Staging test IDs only |
| `sk_live_…` | Live monthly/annual | Live IDs only |

SQL `is_professional_price` includes both live and staging-test IDs so staging
webhooks can grant. Live Stripe will not emit staging-test price IDs.

## Staging Edge secrets status

| Secret | Status |
|--------|--------|
| `STRIPE_WEBHOOK_SECRET` | **Set** (rotated endpoint `we_1U2DA3C56u2NxRItrLZk7FMx`) |
| `CHECKOUT_MAINTENANCE` | **Set** `false` (staging only) |
| `SENTRY_ENVIRONMENT` | **Set** `staging` |
| `STRIPE_SECRET_KEY` | **Set** — runtime-verified (`create-checkout` → `cs_test_…`) |

If the key is rotated, re-set on **staging only** and redeploy:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_… --project-ref gkhbalfpxjtleypbabjo
bash scripts/staging/deploy-staging-functions.sh
```

**Falsification note:** secret **presence** alone is insufficient. Require a
Checkout Session id prefixed `cs_test_` and staging test price IDs.

## Isolation falsification

- [x] Staging webhook URL host is `gkhbalfpxjtleypbabjo`
- [x] Staging `CHECKOUT_MAINTENANCE=false` / `SENTRY_ENVIRONMENT=staging` set (digest-verified)
- [x] `create-checkout` returns `cs_test_…` with staging test price IDs
- [x] Live price IDs rejected under staging (`PRICE_NOT_ALLOWED`)
- [x] Production `CHECKOUT_MAINTENANCE` digest remains `sha256("true")`
- [x] Webhook events update staging `billing` only

## Phase 7B

This document does **not** authorize Phase 7B resume or live secret changes.
