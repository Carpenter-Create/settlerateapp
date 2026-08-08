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
| Webhook endpoint | `we_1U2BGEC56u2NxRIt4U7MBnqg` → `https://gkhbalfpxjtleypbabjo.supabase.co/functions/v1/stripe-webhook` |

Retired Phase 6 sandbox prices remain **non-granting**.

## Cross-mode fence

| Stripe secret | Default checkout prices | Allowlisted chargeable prices |
|---------------|-------------------------|--------------------------------|
| `sk_test_…` | Staging test monthly/annual | Staging test IDs only |
| `sk_live_…` | Live monthly/annual | Live IDs only |

SQL `is_professional_price` includes both live and staging-test IDs so staging
webhooks can grant. Live Stripe will not emit staging-test price IDs.

## Operator: set staging Edge secrets (Dashboard)

CLI `supabase secrets set` may fail if the local access token is not an `sbp_…`
personal token. Use **Staging** project → Edge Functions → Secrets:

| Secret | Value |
|--------|--------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → test mode → Secret key (`sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook `we_1U2BGEC56u2NxRIt4U7MBnqg` signing secret (`whsec_…`) |
| `CHECKOUT_MAINTENANCE` | `false` (staging only) |
| `SENTRY_ENVIRONMENT` | `staging` (when using a staging DSN) |

Then redeploy billing functions:

```bash
bash scripts/staging/deploy-staging-functions.sh
```

## Isolation falsification

- [ ] Staging secrets list has `sk_test_` prefix only (no `sk_live_`)
- [ ] Staging webhook URL host is `gkhbalfpxjtleypbabjo`
- [ ] Production Edge Stripe secrets unchanged
- [ ] Production `CHECKOUT_MAINTENANCE` still `true`
- [ ] create-checkout with staging SPA selects staging test price IDs

## Phase 7B

This document does **not** authorize Phase 7B resume or live secret changes.
