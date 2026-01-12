# APP_SCOPE.md — SettleRate Application Repository

## Purpose

This repository contains the **authenticated application surface** of SettleRate. It is the core product experience for users who have signed in.

---

## Scope Definition

### This repository includes:

- Authentication flows (`/` is the auth entry point)
- Protected application pages (`/app/*`)
- Admin-only pages (`/admin/*`)
- Mortgage calculator and scenario modeling
- Comparison and export functionality
- Billing and subscription management (Stripe integration)
- Supabase-backed data persistence

### This repository does NOT include:

- Marketing landing pages
- Public informational pages
- SEO/content marketing surfaces

---

## Routing Boundaries

| Route | Purpose | Access |
|-------|---------|--------|
| `/` | Authentication (sign in) | Public |
| `/app/*` | Protected application | Authenticated users |
| `/admin/*` | Admin dashboard | Admin role only |

---

## Prohibited Routes

The following routes must **never** be reintroduced in this repository:

- `/pricing`
- `/how-it-works`
- `/terms`
- `/privacy`
- `/contact`
- `/approach`
- `/advisors`
- `/investors`
- `/documentation`
- `/regulatory`

These routes belong in the marketing repository, not the app repository.

---

## Enforcement

Any PR that introduces marketing pages, public landing content, or the prohibited routes listed above must be rejected. The app repository is for authenticated product experiences only.
