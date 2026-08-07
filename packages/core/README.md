# `@settlerate/core`

Shared deterministic business contracts for SettleRate.

**Authority:** `docs/adr/0005-shared-package-architecture.md`

## Purpose

Hold only **pure, deterministic, environment-neutral** contracts and
transformations that must stay identical across browser/Vite, Node
tests/scripts, and Deno Edge Functions.

## Status (Epic 5 PR 2)

| Module | Package surface | Notes |
|--------|-----------------|-------|
| Entitlement contract | `@settlerate/core/entitlement` | First migrated business contract. SQL RPCs remain authoritative for grants. |
| Scaffold marker | `@settlerate/core` (`SETTLERATE_CORE_SCAFFOLD_MARKER`) | Harmless resolution marker from PR 1. |

Compatibility shims (pure re-exports):

- `src/lib/entitlementContract.ts` → `@settlerate/core/entitlement`
- `supabase/functions/_shared/entitlementContract.ts` → relative bridge into
  `packages/core/src/entitlement/entitlementContract.ts` (temporary; deletion
  condition documented in the shim)

PR 3–6 remain unauthorized. Epic 6+ remain unauthorized.

## Public API

Prefer **domain subpaths** (stable, explicit):

```ts
import { evaluateEntitlement, FREE_SCENARIO_LIMIT } from "@settlerate/core/entitlement";
```

The package root re-exports the entitlement surface for convenience. Do not
add wildcard package exports (e.g. `@settlerate/core/*`).

### Deno

`packages/core/deno.json` maps:

- `@settlerate/core` → `./src/index.ts`
- `@settlerate/core/entitlement` → `./src/entitlement/entitlementContract.ts`

Edge Functions currently consume the `_shared` re-export shim (relative bridge)
so deploy bundling can follow the graph without a permanent copy-mirror.

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

## Inherited non-determinism (entitlement)

`evaluateEntitlement` uses `new Date()` when `input.now` is omitted. This is
**inherited production behavior** preserved in PR 2 — not a redesign. Callers
that need determinism must inject `now`. Broader core determinism guidance in
ADR 0005 still applies to new modules.

## Source of truth

Exactly one entitlement business implementation:

`packages/core/src/entitlement/entitlementContract.ts`

App and Edge paths are re-export shims only. Hash gates that compared two
copied trees are replaced by shim-purity + canonical-path checks.
