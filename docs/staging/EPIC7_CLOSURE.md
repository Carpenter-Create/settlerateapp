# Epic 7 Closure — Staging Environment

**Phase:** 8.1 / Epic 7  
**Date:** 2026-08-08  
**ADR:** `docs/adr/0008-environment-topology.md` (**accepted**)  
**Status:** **COMPLETE**

## Verdict

Epic 7 is **complete**. Staging is an isolated, production-like proving ground
with verified Auth, Stripe **test-mode** billing/entitlement, export/storage,
origin fail-closed behavior, and observability environment separation.

- Phase 7B remains **paused** (not resumed).
- Production `CHECKOUT_MAINTENANCE` remains **`true`** (digest-verified).
- Epic 8 and ADR 0011 have **not** begun.
- Production Supabase `vpcxzbaxhpucvevnkalo` was **not** mutated by Epic 7 ops.

**Closure content SHA:** `0da650bb75ea3652c66e80329d3b37d5662a9acc` (#78). **Document tip at #79:** `b92dda54930f203888c09b424644a178f02afba0`. Later tip SHAs may only polish this table.

## Closure criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | ADR 0008 accepted | **Met** |
| 2 | Staging topology documented | **Met** |
| 3 | Production isolation proven | **Met** |
| 4 | Staging environment reproducible | **Met** |
| 5 | DB reconstruction from git migrations | **Met** (tip `20260808143109`) |
| 6 | Auth works in staging | **Met** |
| 7 | Edge Functions ACTIVE on staging | **Met** (7 functions) |
| 8 | Export/storage E2E | **Met** (PDF + share + staging `exports` object) |
| 9 | Observability environment-separated | **Met** (Edge `SENTRY_ENVIRONMENT=staging` digest; client `staging` literal; DSN optional/inert) |
| 10 | Stripe test-mode path | **Met** (`cs_test_…`, staging prices, webhook → billing) |
| 10b | Staging admin bootstrap | **Met** |
| 11 | Synthetic data / reset policy | **Met** |
| 12 | No production secrets/data in staging | **Met** |
| 13 | Deployment / rollback docs | **Met** (`STAGING_DEPLOYMENT.md`) |
| 14 | Smoke + adversarial validation | **Met** (`STAGING_SMOKE.md`) |
| 15 | Phase 7B readiness report | **Met** (not ready to resume) |
| 16 | Governance synchronized | **Met** |

## Identifiers (non-secret)

| Resource | Value |
|----------|-------|
| Staging Supabase | `gkhbalfpxjtleypbabjo` (`us-east-1`) |
| Production Supabase | `vpcxzbaxhpucvevnkalo` (**protected**) |
| Staging migration tip | `20260808143109` |
| Production migration tip | `20260808040000` (unchanged by Epic 7) |
| Staging Vercel | `settlerate-app-staging` (`prj_GMmcFJmTAQnpXRtwux8VqUzM6wGo`) |
| Staging origin (active) | `https://settlerate-app-staging.vercel.app` |
| Staging origin (planned DNS) | `https://staging.settlerate.com` (allowlisted; DNS optional) |
| Stripe test account | `acct_1U0irnC56u2NxRIt` |
| Stripe test product | `prod_V2FlK0MVh9ZmBh` |
| Stripe test prices | `price_1U2BGAC56u2NxRItx3etGK2q` / `price_1U2BGBC56u2NxRIt8cw5cx2m` |
| Stripe test webhook (active) | `we_1U2DA3C56u2NxRItrLZk7FMx` → staging `stripe-webhook` only |

## Merged PR train

| PR | Scope | Merge |
|----|-------|-------|
| #68 | PR0 ADR 0008 | `f143324` |
| #69 | PR1 scaffold | `1e0cc41` |
| #70 | PR2 database | `e63f533` |
| #71 | PR3 Edge/Vercel/observability | `ef86fb3` |
| #72 | PR4 Stripe test catalog | `d7c6cf1` |
| #73 | PR5 smoke/closure scaffold | `c4f92be` |
| #74 | Closure SHA polish | `e43e4dd` |
| #75 | Staging Vercel origin allowlist | `5eae5ae` |
| #76 | Auth/admin evidence | `b6c32a2` |
| #77 | Invalid-key hard-stop record | `6d4e3c6` |
| #78 | E2E completion / COMPLETE | `0da650bb75ea3652c66e80329d3b37d5662a9acc` |
| #79 | Closure SHA polish | `b92dda54930f203888c09b424644a178f02afba0` |

## Runtime verification evidence (2026-08-08)

### Stripe / checkout

| Probe | Result |
|-------|--------|
| `create-checkout` monthly | **200** → `cs_test_a1V1Wp10…` |
| Session `livemode` | `false` |
| Line item price | `price_1U2BGAC56u2NxRItx3etGK2q` (staging test monthly) |
| `success_url` / `cancel_url` | `https://settlerate-app-staging.vercel.app/app/account…` |
| Live price ID request | **400** `PRICE_NOT_ALLOWED` |
| Lookalike Origin checkout | `success_url` / `cancel_url` → `https://app.settlerate.com/...` (fail-closed) |

### Webhook / entitlement / portal

| Probe | Result |
|-------|--------|
| Active staging webhook endpoint | `we_1U2DA3C…` → `gkhbalfpxjtleypbabjo` only (`livemode=false`) |
| Prior webhook | `we_1U2BGEC…` **disabled** |
| Test subscription created | `sub_1U2ETnC…` `active` `livemode=false` staging price |
| Staging `billing` row | `plan_code=professional`, `entitlement_status=entitled` |
| `stripe_webhook_events` | `customer.subscription.created/updated`, `invoice.paid` → `action_taken=updated` for staging user |
| `check-subscription` | `subscribed=true`, Professional features unlocked |
| `customer-portal` | **200** → `https://billing.stripe.com/p/session/test_…` |

### Export / storage / RLS

| Probe | Result |
|-------|--------|
| `generate-pdf` | **200** `application/pdf` (`%PDF-`) |
| `export-share` create + resolve | **200**; signed URL host `gkhbalfpxjtleypbabjo` only |
| Storage object | `exports/{user_id}/scenario_….pdf` on staging |
| RLS non-owner | 0 rows; owner 1 row |

### Isolation / production gates

| Probe | Result |
|-------|--------|
| SPA Supabase host | staging only (no `vpcxzbaxhpucvevnkalo`) |
| Staging Auth `site_url` | `https://settlerate-app-staging.vercel.app` |
| Production Auth `site_url` | `https://app.settlerate.com` (unchanged) |
| Production migration tip | `20260808040000` |
| Production `CHECKOUT_MAINTENANCE` digest | `sha256("true")` = `b5bea41b…` |
| Staging `CHECKOUT_MAINTENANCE` digest | `sha256("false")` = `fcbcf165…` |
| Staging `SENTRY_ENVIRONMENT` digest | `sha256("staging")` = `e919a753…` |
| CLI link after staging ops | restored / remained `vpcxzbaxhpucvevnkalo` |

### Why this could still have been wrong (falsified)

| Risk | Falsification |
|------|----------------|
| Secret present but invalid | Prior hard stop; cleared only after `cs_test_…` succeeded |
| Test key + live prices | Rejected `PRICE_NOT_ALLOWED` |
| Wrong webhook project | Endpoint URL host is staging ref; events landed in staging `billing` / `stripe_webhook_events` |
| Origin misconfig masked | Lookalike Origin → production return URLs (fail-closed, not open redirect) |
| Billing written to production | Staging user/customer IDs; production tip/Auth unchanged |
| Export → production storage | Signed URL + `storage_path` on staging project only |
| Observability as production | Edge secret digest `staging`; client build contains staging env literal; DSN optional |
| Smoke helper left deployed | Ephemeral `epic7-smoke-subscribe` deleted from staging after use |

## Rollback / reset

See `docs/staging/STAGING_DEPLOYMENT.md` and `STAGING_SEED_POLICY.md`:

1. Redeploy prior known-good SPA SHA to `settlerate-app-staging`.
2. Re-apply git migrations to staging tip (or rebuild project from migrations).
3. Redeploy Edge via `scripts/staging/deploy-staging-functions.sh`.
4. Wipe synthetic Auth/users/scenarios/billing as needed; reseed synthetically.
5. Never copy production data; never point staging at `sk_live_…`.

## Non-blocking follow-ups

- Optional DNS/TLS for `staging.settlerate.com` (already allowlisted).
- Optional Vercel Deployment Protection.
- Optional dedicated staging Sentry DSN/project (tagging already proven; DSN inert when unset).
- Operator email-link Auth UX smoke with a real staging inbox (Admin API + password grant already proven).

## Explicit non-starts

- Epic 8 — **not begun**
- ADR 0011 — **not begun**
- Phase 7B live cutover / public checkout — **not resumed**
