# ROLES_AND_ENTITLEMENTS.md — SettleRate Application

## Purpose

This document defines the role and entitlement system for the SettleRate application.

For the Phase 6 canonical entitlement matrix, Stripe mapping, and enforcement points, see [`docs/ENTITLEMENT_CONTRACT.md`](./ENTITLEMENT_CONTRACT.md) and `@settlerate/core/entitlement`.

For creating the first admin in an environment with no admins yet, see [`docs/ADMIN_BOOTSTRAP.md`](./ADMIN_BOOTSTRAP.md) and [`docs/adr/0001-admin-provisioning-model.md`](./adr/0001-admin-provisioning-model.md) (Phase 8.1 Epic 1).

---

## Role Hierarchy

| Role | Description | Access Level |
|------|-------------|--------------|
| `user` | Default authenticated user | Standard app access |
| `moderator` | Content/support oversight | User access + moderation tools |
| `admin` | Full administrative access | All features + admin dashboard (server-verified bypass) |

SettleRate supports **two customer plans**: **SettleRate Free** and **SettleRate Professional**. Administrative permissions are **role-based** and are **not** a billing tier.

The legacy `advisor` enum value and `user_roles.advisor` rows may exist for historical audit only. They **must not** grant Professional features, admin authority, or locked-rate editing.

Roles are stored in the `user_roles` table, not on the profile or users table. This prevents privilege escalation attacks.

---

## Subscription Tiers (active)

| Plan code | Display Name | Capabilities |
|-----------|--------------|--------------|
| `analytical` | SettleRate Free | All modeling modes; max 2 saved scenarios; view/edit/delete owned scenarios |
| `professional` | SettleRate Professional (paid) | Unlimited scenarios, saved comparisons, PDF, share/export, income-context |

Advisor is **not** an active paid tier.

### Entitlement Mapping

| Feature | SettleRate Free | SettleRate Professional |
|---------|------------|--------------|
| Scenario modeling | ✓ | ✓ |
| Scenario saving | Max 2 (create + duplicate) | Unlimited |
| Scenario edit / delete | ✓ | ✓ |
| PDF exports | — | ✓ |
| Income-context framing | — | ✓ |
| Saved comparisons | — | ✓ |
| Share creation | — | ✓ |

---

## Stripe status (summary)

| Stripe | Access |
|--------|--------|
| `active` / `trialing` (allowlisted Professional price) | Full Professional |
| `past_due` / `unpaid` | Read-only + delete + billing portal |
| `incomplete*` / `canceled` / `paused` / none | SettleRate Free |
| `cancel_at_period_end` while still active/trialing | Keep Professional until period end |

Trial: 7 days. No custom grace period.

---

## Enforcement

### Server-Side Only

Entitlement enforcement is **server-side** and derived from:

1. Verified Stripe webhook writes to `billing`
2. DB `evaluate_entitlement` / `feature_allowed` / triggers
3. Edge functions: `check-subscription`, `generate-pdf`, `export-share`, `create-checkout`, `customer-portal`, `stripe-webhook`

**Never** trust client-supplied plan, Stripe status, success URLs, or localStorage for grants. Client-side checks are UI mirrors only.

### Role Verification

Admin access is verified via the `has_role()` database function:

```sql
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;
```

Admin bypass is logged (`entitlement_bypass_log`) and does not modify billing state.

---

## Advisor Role (removed from active product model)

The legacy `advisor` app_role enum value may exist for historical audit. It **must not** grant Professional features, admin authority, or locked-rate editing. Use server-verified `admin` role for administrative permissions.

---

## Implementation Notes

1. Roles are assigned via the `user_roles` table
2. Subscription status is synced via signed, idempotent Stripe webhooks
3. The `billing` table is the authoritative entitlement source for edge reads
4. Atomic free-tier scenario limits use advisory locks on create/duplicate
5. Protected features: `scenario_create`, `scenario_update`, `scenario_duplicate`, `comparison_create`, `pdf_export`, `share_create`, `income_context`, `billing_manage`
