# Generated Types Reconciliation — Epic 6 PR 2E

**Phase:** 8.1 / Epic 6 PR 2E  
**Status:** Repository regeneration from migration-only reconstruction  
**Production:** No migration; no production mutation

## Authority

- ADR 0006: generated types are **derived** (never schema SoT)
- Canonical generation source: fresh **migration-only** reconstruction
- Command: `npm run schema:gen-types`

## Gap closed

| Table | Pre-PR2E | Post-PR2E |
|-------|----------|-----------|
| `admin_bootstrap_tokens` | absent from `types.ts` | present |
| `stripe_webhook_events` | absent | present |
| `entitlement_bypass_log` | absent | present |

Drift class `generated_types_mismatch` → **0** after regeneration + `npm run schema:drift`.

## Behavior

No application behavior change. Types only. Client contract now includes the
three previously omitted public tables for typed PostgREST access.

## Tooling

- `scripts/schema/generateTypesFromMigrationOnly.mjs`
- `reconstructLocal.mjs --keep-db` support for disposable typegen
- Does **not** use production `--linked` / `--project-id`
- Post-processes generated `Functions` to strip disposable **pgcrypto**
  entries installed into `public` by the reconstruction stub (not part of
  the production PostgREST SettleRate RPC contract)
