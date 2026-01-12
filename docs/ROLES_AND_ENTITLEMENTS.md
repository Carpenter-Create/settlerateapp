# ROLES_AND_ENTITLEMENTS.md — SettleRate Application

## Purpose

This document defines the role and entitlement system for the SettleRate application.

---

## Role Hierarchy

| Role | Description | Access Level |
|------|-------------|--------------|
| `user` | Default authenticated user | Standard app access |
| `moderator` | Content/support oversight | User access + moderation tools |
| `admin` | Full administrative access | All features + admin dashboard |

Roles are stored in the `user_roles` table, not on the profile or users table. This prevents privilege escalation attacks.

---

## Subscription Tiers

| Tier | Display Name | Capabilities |
|------|--------------|--------------|
| Analytical | Free tier | Core mortgage modeling, limited scenarios |
| Professional | Paid tier | Unlimited scenarios, exports, income-context views, saved comparisons |

### Entitlement Mapping

| Feature | Analytical | Professional |
|---------|------------|--------------|
| Scenario modeling | ✓ | ✓ |
| Scenario saving | Limited | Unlimited |
| PDF exports | — | ✓ |
| Income-context framing | — | ✓ |
| Saved comparisons | — | ✓ |
| Advisor-ready outputs | — | ✓ |

---

## Enforcement

### Server-Side Only

Entitlement enforcement is **server-side** and derived from:

1. Stripe subscription status
2. Supabase `billing` table
3. `check-subscription` edge function

**Never** check entitlements client-side for gating features. Client-side checks are for UI hints only.

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

This function uses `SECURITY DEFINER` to bypass RLS and prevent recursive policy checks.

---

## Advisor Role (Future)

The `advisor` role is planned but not yet implemented. When implemented:

- Advisors will have permissioned access to client scenarios
- Multi-client management will require explicit client consent
- Advisor access will be auditable

Do not implement advisor multi-client features without explicit design approval.

---

## Implementation Notes

1. Roles are assigned via the `user_roles` table
2. Subscription status is synced via Stripe webhooks
3. The `billing` table tracks current subscription state
4. Edge functions validate subscription status on protected operations
