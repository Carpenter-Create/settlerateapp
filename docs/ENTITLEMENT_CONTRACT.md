# Entitlement Contract — Phase 6

Canonical product-policy contract for SettleRate plan codes, Stripe status mapping, and protected features.

**Authority:** This document + `@settlerate/core/entitlement` (`packages/core/src/entitlement/entitlementContract.ts`) + DB `evaluate_entitlement` / `feature_allowed`.  
Server enforcement is authoritative. Client gates mirror only.

## Active plan codes

| Code | Display | Notes |
|------|---------|-------|
| `analytical` | SettleRate Free | Active free tier |
| `professional` | SettleRate Professional (paid) | Active paid tier |

Advisor is **not** an active tier. Legacy advisor Stripe price IDs and `user_roles.advisor` must not grant Professional features or admin authority.

SettleRate supports two customer plans: **SettleRate Free** and **SettleRate Professional**. Administrative permissions are role-based and are not a billing tier.

## Entitlement statuses

| Status | Meaning |
|--------|---------|
| `entitled` | Full Professional |
| `trial_entitled` | Full Professional (Stripe `trialing`) |
| `read_only` | Read + delete + billing portal; deny paid writes |
| `free` | SettleRate Free |
| `denied` | No product access (reserved) |

## Feature matrix

| Feature | entitled / trial_entitled | read_only | free (analytical) |
|---------|---------------------------|-----------|-------------------|
| Calculator / modeling modes | ✓ | ✓ (view) | ✓ |
| `scenario_create` | ✓ unlimited | — | ✓ max 2 |
| `scenario_update` | ✓ | — | ✓ |
| `scenario_duplicate` | ✓ | — | counts toward 2 |
| Scenario delete | ✓ | ✓ | ✓ |
| `comparison_create` | ✓ | — | — |
| `pdf_export` | ✓ | — | — |
| `share_create` | ✓ | — | — |
| `income_context` | ✓ | — | — |
| `billing_manage` | ✓ | ✓ | ✓ (checkout/portal as applicable) |

Over-limit analytical users retain read access and may delete; existing scenarios are never auto-deleted or hidden when access changes.

## Stripe status → entitlement

| Stripe status | Entitlement |
|---------------|-------------|
| `active` + allowlisted Professional price + period valid | `entitled` |
| `trialing` + allowlisted Professional price + period valid | `trial_entitled` |
| `past_due` / `unpaid` | `read_only` |
| `incomplete` / `incomplete_expired` / `canceled` / `paused` / none | `free` |

`cancel_at_period_end` while status remains `active` or `trialing` keeps Professional access through `currentPeriodEndsAt`. Do not revoke merely because cancellation is scheduled.

No custom grace period.

## Trial

- 7 days (`PROFESSIONAL_TRIAL_DAYS`)
- Full Professional while verified Stripe status is `trialing`
- No client-trusted trial timer

## Price allowlist

Only these **live** price IDs grant Professional (Phase 7B catalog):

- `price_1U0t2QC56u2NxRItya8dElyg` (monthly — lookup `settlerate_professional_monthly` · $19/mo)
- `price_1U0t2jC56u2NxRItM185AYK9` (annual — lookup `settlerate_professional_annual` · $190/yr)

Product: `prod_V0usthAF9WnoGJ` (SettleRate Professional, live Stripe account).

### Never grant (retired / legacy)

| Category | IDs |
|----------|-----|
| Retired sandbox Professional prices | `price_1U0k4DC2Fmi7ZUCbSniiEewZ`, `price_1U0kFVC2Fmi7ZUCb6g0mXIRC` |
| Retired sandbox Professional product | `prod_V0lUMpnsvxSxP1` (account `acct_1U0isCC2Fmi7ZUCb`) |
| Deleted-account Professional prices | see `LEGACY_DELETED_PROFESSIONAL_PRICE_IDS` |
| Legacy Advisor prices | see `LEGACY_ADVISOR_PRICE_IDS` |

Arbitrary client-supplied price IDs are rejected.

## Admin bypass

- Server-verified `user_roles` / `has_role(..., 'admin')` only
- Logged via `log_admin_entitlement_bypass` / `entitlement_bypass_log` (**service_role-only** RPC; clients cannot forge bypass rows)
- Does not modify billing state
- No localStorage or client override

## Function grants

PostgreSQL retains direct role grants when `REVOKE FROM PUBLIC` is used alone. Phase 6 migration `20260804160000_phase6_privileged_function_grants.sql` explicitly revokes `EXECUTE` from `PUBLIC`, `anon`, and `authenticated` on privileged RPCs, then grants only to approved roles. See `docs/PHASE6_DEPLOYMENT.md` for the grant matrix.

Client-callable entitlement RPCs: `evaluate_entitlement`, `feature_allowed`, `assert_feature_allowed` (`authenticated` + `service_role` only).

## Enforcement points

| Surface | Mechanism |
|---------|-----------|
| Scenario insert/update | Trigger `enforce_scenario_write_entitlement` + advisory lock |
| Scenario duplicate | `duplicate_scenario` RPC + advisory lock |
| Saved comparisons | Trigger `enforce_comparison_write_entitlement` |
| PDF export | `generate-pdf` → `assert_feature_allowed('pdf_export')` |
| Share create | `export-share` → `assert_feature_allowed('share_create')` |
| Entitlement read | `check-subscription` reads `billing` + evaluates |
| Webhook | Signature required; `stripe_webhook_events` idempotency (`claim_stripe_webhook_event` / `release_stripe_webhook_event` are **service_role-only**) |
| Checkout | Allowlisted prices; maps `stripe_customer_id` ↔ `user_id` |
| Portal | Requires authoritative `billing.stripe_customer_id` for authenticated user; no email discovery |

Success URLs never grant entitlement. Verified webhook state is authoritative.

## Client print vs server PDF

Authoritative `pdf_export` enforcement is the `generate-pdf` edge function (`assert_feature_allowed`). Browser `window.print()` paths are UI-mirrored only: data already rendered in the client cannot be server-revoked. Prefer routing professional PDF export through `generate-pdf` / `ExportModal`.

## Orchestration follow-ups (applied)

- Cross-user RPC caller binding on `evaluate_entitlement` / `feature_allowed` / `get_effective_tier`
- Webhook claim release on retryable failure; stale `event.created` guard; no null subscription snapshot clobber
- Checkout/portal customer binding fail-closed; allowlisted return origins
- Free-tier scenario count includes archived rows (closes stash-then-unarchive)
- Legacy `saved_comparisons` write trigger; comparison scenario ownership check

## Deployment

See `docs/PHASE6_DEPLOYMENT.md` for migration order, function deploy sequence, and smoke checks.
See `docs/PHASE7A_DEPLOYMENT.md` for Phase 7A billing-hardening deployment, sandbox smoke checks, and the **NOT YET AUTHORIZED** live catalog cutover procedure.
