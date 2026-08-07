# `@settlerate/core`

Shared deterministic business contracts for SettleRate.

**Authority:** `docs/adr/0005-shared-package-architecture.md`

## Purpose

Hold only **pure, deterministic, environment-neutral** contracts and
transformations that must stay identical across browser/Vite, Node
tests/scripts, and Deno Edge Functions.

## Status (Epic 5 PR 4)

| Module | Package surface | Notes |
|--------|-----------------|-------|
| Entitlement contract | `@settlerate/core/entitlement` | PR 2 |
| Checkout maintenance | `@settlerate/core/checkout-maintenance` | PR 3 |
| Professional subscription guard | `@settlerate/core/subscription-guard` | PR 3 |
| Observability redaction | `@settlerate/core/observability-redaction` | PR 3 |
| Billing snapshot (pure) | `@settlerate/core/billing-snapshot` | PR 3 — **no** `resolveSubscriptionBillingSnapshot` |
| Customer resolution (pure) | `@settlerate/core/customer-resolution` | PR 4 — **no** `resolveCheckoutCustomer` |
| App origin policy | `@settlerate/core/app-origin` | PR 4 — string Origin header policy; **no** `Request` |
| Edge observability (deterministic) | `@settlerate/core/edge-observability` | PR 4 — **no** `generateRequestId` |
| Scaffold marker | `@settlerate/core` (`SETTLERATE_CORE_SCAFFOLD_MARKER`) | Harmless PR 1 marker |

Compatibility:

- Pure shims under `src/lib/*` and Edge `_shared/*` re-export package subpaths
  (temporary relative bridges on Edge; PR 6 deletion conditions).
- Runtime adapters retain orchestration / nondeterminism:
  - `resolveSubscriptionBillingSnapshot`
  - `resolveCheckoutCustomer` (+ deps)
  - `resolveAppOrigin(Request)`
  - `generateRequestId`

PR 5–6 remain unauthorized. Epic 6+ remain unauthorized.

## Public API

Prefer **explicit domain subpaths** (no `@settlerate/core/*` wildcard map):

```ts
import { resolveStripeCustomerByUserId } from "@settlerate/core/customer-resolution";
import { resolveAppOriginFromOriginHeader } from "@settlerate/core/app-origin";
import { isEdgeObservabilityEnabled, buildEdgeExtra } from "@settlerate/core/edge-observability";
```

The package root re-exports curated named symbols for convenience.

### Deno

`packages/core/deno.json` maps each subpath to its TypeScript source file.

## Prohibited in core

- Network I/O, database queries, auth resolution, env reads
- Stripe SDK / Supabase client / React / DOM / Node-only / Deno-only APIs
- `@sentry/*` SDK dependencies
- Async retrieval / checkout orchestration (`resolveSubscriptionBillingSnapshot`,
  `resolveCheckoutCustomer`)
- Nondeterministic helpers (`generateRequestId` / UUID generation)
- `Request` / Fetch ambient types (adapters read headers and pass strings)
- Mortgage formula / entitlement / billing / export **semantic** changes

## Source of truth

Each migrated domain has exactly one business implementation under
`packages/core/src/`. App/Edge paths are re-export shims or thin runtime
adapters — never a second copy of pure logic.
