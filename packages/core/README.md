# `@settlerate/core`

Shared deterministic business contracts for SettleRate.

**Authority:** `docs/adr/0005-shared-package-architecture.md`

## Purpose

Hold only **pure, deterministic, environment-neutral** contracts and
transformations that must stay identical across browser/Vite, Node
tests/scripts, and Deno Edge Functions.

## Status (Epic 5 PR 6 — closure)

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
| Export summary (derived JSON) | `@settlerate/core/export-summary` | PR 5 — portable derived → summary |
| Scaffold marker | `@settlerate/core` (`SETTLERATE_CORE_SCAFFOLD_MARKER`) | Harmless PR 1 marker |

### Final resolution (PR 6)

- **Browser / Node / Vitest:** npm workspace package exports
  (`@settlerate/core/<subpath>`).
- **Deno package proofs:** `packages/core/deno.json`.
- **Supabase Edge Functions:** per-function
  `supabase/functions/<name>/deno.json` maps each subpath to
  `packages/core` source (plus shared `supabase/functions/deno.json` for
  Edge adapter proof tests).

### Retained outside core

Runtime / application adapters (not deleted):

- `resolveSubscriptionBillingSnapshot` — `_shared` + `src/lib` billing adapters
- `resolveCheckoutCustomer` / `CheckoutCustomerResolutionDeps` — Edge adapter
- `resolveAppOrigin(Request)` — Edge adapter
- `generateRequestId` — Edge adapter
- `buildScenarioData` / `mapDerivedForExport` — generate-pdf adapter
- `buildCanonicalScenarioExport` / `generatedAt` — client exportContract
- Sentry SDK wiring — `src/lib/observability.ts`, `_shared/sentry.ts`

Pure one-line compatibility shims under `src/lib/*` and
`_shared/{entitlement,checkout,guard,redaction}` are **removed**.

Epic 6+ remain unauthorized.

## Public API

Prefer **explicit domain subpaths** (no `@settlerate/core/*` wildcard map):

```ts
import { mapDerivedExportSummary } from "@settlerate/core/export-summary";
```

The package root re-exports curated named symbols for convenience.

## Prohibited in core

- Network I/O, database queries, auth resolution, env reads
- Stripe SDK / Supabase client / React / DOM / Node-only / Deno-only APIs
- `@sentry/*` SDK dependencies
- Async retrieval / checkout orchestration
- Nondeterministic helpers (`generateRequestId`, export `generatedAt`)
- Application scenario export builders and PDF layout adapters
- Mortgage formula / entitlement / billing / export **semantic** changes

## Source of truth

Each migrated domain has exactly one business implementation under
`packages/core/src/`. Consumers import package subpaths directly.
Runtime adapters may re-export pure symbols alongside orchestration.
