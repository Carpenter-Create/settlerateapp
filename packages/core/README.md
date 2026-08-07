# `@settlerate/core`

Shared deterministic business contracts for SettleRate.

**Authority:** `docs/adr/0005-shared-package-architecture.md`

## Purpose

Hold only **pure, deterministic, environment-neutral** contracts and
transformations that must stay identical across browser/Vite, Node
tests/scripts, and Deno Edge Functions.

## May belong here

- Entitlement evaluation contracts and plan/price allowlist helpers
- Checkout-maintenance parsing (env string injected by callers)
- Professional subscription guard predicates
- Pure Stripe billing-snapshot mappers and structural types
- Pure customer-resolve helpers (not checkout orchestration)
- Observability redaction and other deterministic shared helpers
- Justified export pure mappers (export fence still applies)

## Prohibited

- Network I/O, database queries, auth resolution, env reads
- Stripe SDK / Supabase client / React / DOM / Node-only / Deno-only APIs
- Nondeterministic helpers (e.g. `crypto.randomUUID` request-ID generation)
- Orchestrators that call injected async I/O (`resolveCheckoutCustomer`,
  `resolveSubscriptionBillingSnapshot`)
- Mortgage formula changes, entitlement/billing semantic changes, export
  field semantic changes
- Application imports from `src/` or `supabase/functions/`

## API policy

- Explicit named exports from the package root only
- No wildcard / internal path exports
- No miscellaneous utilities dump

## Status (Epic 5 PR 1)

**Scaffold only.** Workspace package exists; **no business modules migrated.**

Implementation PRs (PR 2–6) require separate founder authorization.
Epic 6+ remain unauthorized.
