# `@settlerate/core`

Shared deterministic business contracts for SettleRate.

**Authority:** `docs/adr/0005-shared-package-architecture.md`

## Purpose

Hold only **pure, deterministic, environment-neutral** contracts and
transformations that must stay identical across browser/Vite, Node
tests/scripts, and Deno Edge Functions.

## Status (Epic 5 PR 3)

| Module | Package surface | Notes |
|--------|-----------------|-------|
| Entitlement contract | `@settlerate/core/entitlement` | PR 2 |
| Checkout maintenance | `@settlerate/core/checkout-maintenance` | PR 3 |
| Professional subscription guard | `@settlerate/core/subscription-guard` | PR 3 |
| Observability redaction | `@settlerate/core/observability-redaction` | PR 3 |
| Billing snapshot (pure) | `@settlerate/core/billing-snapshot` | PR 3 — **no** `resolveSubscriptionBillingSnapshot` |
| Scaffold marker | `@settlerate/core` (`SETTLERATE_CORE_SCAFFOLD_MARKER`) | Harmless PR 1 marker |

Compatibility:

- App paths under `src/lib/*` re-export package subpaths (pure shims), except
  `stripeBillingSnapshot.ts` which is a **runtime adapter**: re-exports pure
  symbols from core and retains `resolveSubscriptionBillingSnapshot`.
- Edge `_shared/*` uses temporary relative bridges into `packages/core`
  (deletion conditions documented in each shim/adapter).

PR 4–6 remain unauthorized. Epic 6+ remain unauthorized.

## Public API

Prefer **explicit domain subpaths** (no `@settlerate/core/*` wildcard map):

```ts
import { isCheckoutMaintenanceEnabled } from "@settlerate/core/checkout-maintenance";
import { billingRowBlocksCheckout } from "@settlerate/core/subscription-guard";
import { redactEvent } from "@settlerate/core/observability-redaction";
import { mapSubscriptionToBillingSnapshot } from "@settlerate/core/billing-snapshot";
```

The package root re-exports curated named symbols for convenience.

### Deno

`packages/core/deno.json` maps each subpath to its TypeScript source file.

## Prohibited in core

- Network I/O, database queries, auth resolution, env reads
- Stripe SDK / Supabase client / React / DOM / Node-only / Deno-only APIs
- `@sentry/*` SDK dependencies
- Async retrieval orchestration (`resolveSubscriptionBillingSnapshot`,
  `resolveCheckoutCustomer`)
- Nondeterministic helpers (e.g. `crypto.randomUUID` request-ID generation)
- Mortgage formula / entitlement / billing / export **semantic** changes

## Source of truth

Each migrated domain has exactly one business implementation under
`packages/core/src/`. App/Edge paths are re-export shims or thin runtime
adapters — never a second copy of pure logic.
