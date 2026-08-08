# Consolidated Schema Baseline Boundary — Epic 6 PR 2J

**Phase:** 8.1 / Epic 6 PR 2J  
**Authority:** ADR 0006 (accepted: history + documented baseline boundary)  
**Status:** Boundary documented — **historical migrations preserved; no squash; no production mutation**

## Accepted model

| Layer | Role |
|-------|------|
| Historical migrations in `supabase/migrations/` | Audit trail and TRUE reconstruction SoT |
| Documented baseline boundary (this file) | Named tip for “current reconciled repository target” |
| Incremental migrations after the boundary | Future schema/grant changes |
| Generated types | Derived via `npm run schema:gen-types` (never SoT) |

**Not accepted:** squash-only baseline that deletes history; types.ts as SoT;
production-only authority.

## Current baseline boundary (repository tip)

After Epic 6 tip migrations, the reproducible repository privilege/schema target
is the full ordered chain ending at:

| Version | File | Purpose |
|---------|------|---------|
| `20260808040000` | `*_epic6_pr2h_legacy_share_rpc_execute.sql` | Latest Epic 6 tip |

Prior Epic 6 tips in the same train:

- `20260808020000` — PR 2D grant least privilege  
- `20260808030000` — PR 2F RPC EXECUTE least privilege  
- `20260808040000` — PR 2H legacy share RPC EXECUTE  

Reconstruction command (canonical):

```bash
npm run schema:reconstruct -- --mode migration_only
```

Types regeneration (derived):

```bash
npm run schema:gen-types
```

Drift assembly (evidence only):

```bash
npm run schema:drift
```

## Future migration workflow

1. Create a new timestamped file under `supabase/migrations/` **after** the
   current tip (never edit historical files).
2. Prove with `schema:reconstruct -- --mode migration_only` and focused SQL tests.
3. Regenerate types only when the client contract changes (`schema:gen-types`).
4. Refresh drift artifacts when comparing to production evidence.
5. Append production-facing SQL to `EPIC6_PRODUCTION_APPLY_PLAN.md` (or successor
   apply plan) — **do not** apply to production without founder authorization.
6. Prefer GRANT/REVOKE tip migrations over rewriting objects when possible.

## Dual sources of truth — forbidden

| Forbidden | Correct |
|-----------|---------|
| Hand-editing `types.ts` as schema SoT | Regenerate from migration-only DB |
| Dashboard DDL without a migration | Migration first, then apply under gate |
| Stubbing product tables in harness as SoT | Migration-owned product tables (PR 2A) |

## Production

This PR does **not** rewrite production migration history or apply any
migration. Production remains on the pre-remediation grant state until the
consolidated apply package is founder-authorized.
