# Entitlement Contract — Phase 6

Canonical product-policy contract for SettleRate plan codes, Stripe status mapping, and protected features.

**Authority:** This document + `src/lib/entitlementContract.ts` + DB `evaluate_entitlement` / `feature_allowed`.  
Server enforcement is authoritative. Client gates mirror only.

## Active plan codes

| Code | Display | Notes |
|------|---------|-------|
| `analytical` | Analytical (free) | Active free tier |
| `professional` | Professional (paid) | Active paid tier |

Advisor is **not** an active tier. Legacy advisor Stripe price IDs and `user_roles.advisor` must not grant Professional features.

## Entitlement statuses

| Status | Meaning |
|--------|---------|
| `entitled` | Full Professional |
| `trial_entitled` | Full Professional (Stripe `trialing`) |
| `read_only` | Read + delete + billing portal; deny paid writes |
| `free` | Analytical |
| `denied` | No product access (reserved) |

## Feature matrix

| Feature | entitled / trial_entitled | read_only | free (analytical) |
|---------|---------------------------|-----------|-------------------|
| Calculator / modeling modes | ✓ | ✓ (view) | ✓ |
| `scenario_create` | ✓ unlimited | — | ✓ max 3 |
| `scenario_update` | ✓ | — | ✓ |
| `scenario_duplicate` | ✓ | — | counts toward 3 |
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

Only these price IDs grant Professional:

- `price_1Sod4a3ppKk8xETz9TzPFn8P` (monthly)
- `price_1Sod513ppKk8xETzwcEPnT51` (annual)

Arbitrary client-supplied price IDs are rejected.

## Admin bypass

- Server-verified `user_roles` / `has_role(..., 'admin')` only
- Logged via `log_admin_entitlement_bypass` / `entitlement_bypass_log`
- Does not modify billing state
- No localStorage or client override

## Enforcement points

| Surface | Mechanism |
|---------|-----------|
| Scenario insert/update | Trigger `enforce_scenario_write_entitlement` + advisory lock |
| Scenario duplicate | `duplicate_scenario` RPC + advisory lock |
| Saved comparisons | Trigger `enforce_comparison_write_entitlement` |
| PDF export | `generate-pdf` → `assert_feature_allowed('pdf_export')` |
| Share create | `export-share` → `assert_feature_allowed('share_create')` |
| Entitlement read | `check-subscription` reads `billing` + evaluates |
| Webhook | Signature required; `stripe_webhook_events` idempotency |
| Checkout | Allowlisted prices; maps `stripe_customer_id` ↔ `user_id` |
| Portal | Prefers `billing.stripe_customer_id` |

Success URLs never grant entitlement. Verified webhook state is authoritative.
