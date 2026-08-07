# Schema Provenance Repair — Epic 6 PR 2A

**Phase:** 8.1 / Epic 6 PR 2A  
**Date:** 2026-08-07  
**Status:** Repository-side provenance restoration (no production mutation)

Authority: `docs/adr/0006-database-schema-source-of-truth.md`,
`docs/adr/0007-legacy-schema-disposition.md`, PR 1 capture artifacts under
`docs/database/production-schema/`.

## Provenance conclusions

### `public.subscriptions`

| Hypothesis | Verdict |
|------------|---------|
| A. Created by a migration missing from git | **Best-supported.** Production `schema_migrations` contains orphan version `20260112193137` (empty name) with no git file, chronologically between `20260112073630` and `20260112203732`, immediately before admin-lock migrations that require the table. |
| B. Manual / Dashboard only | Possible contributor, but does not alone explain the orphan ledger row. |
| C. Platform/template outside repo | Possible era (UUID-named early migrations), still “not in current git.” |
| D. Unknowable | Original SQL text is unknown; **git’s inability to create the table is proven** by migration-only reconstruction failure. |

### `public.profiles` columns

`stripe_customer_id`, `plan_key`, `plan_status`, `current_period_end` exist in
production (and `types.ts`) with defaults `plan_key='core'`,
`plan_status='active'`, UNIQUE/index on `stripe_customer_id`. They are absent
from the profiles CREATE migration and from both PR 1 reconstructions. No
git `ALTER TABLE public.profiles` adds them. Same orphan window is the leading
candidate; exact co-migration with subscriptions is not proven from SQL text.

Disposition for this slice (ADR 0007): treat as **`active_canonical` /
compatibility structural parity** for reconstructability — capture into git
without changing entitlement SoT (`billing` remains authoritative per Edge
comments). No backfill, no data migration, no drops.

## Sequencing alternatives evaluated

| Approach | Fresh reconstruction | Current production | Pending on prod? | Ledger safe? | Needs `migration repair`? | Changes prod objects? | Rollback / audit | ADR 0006 |
|----------|----------------------|--------------------|------------------|--------------|---------------------------|-----------------------|------------------|----------|
| **1. New latest reconciliation migration** | **Fails** — replay still dies at `20260112204012_*` before the new file | Would be pending; `IF NOT EXISTS` mostly no-op | Yes | Ordering OK at tip | No | Should be no-op if idempotent | Easy tip revert; does not restore history | Does not achieve reconstructability |
| **2. Restore orphan version `20260112193137` in git** (selected) | **Succeeds** — table/columns exist before dependent migration | Version already applied → CLI skips | **No** | Matches production ledger position | **No** | **No** (not re-executed) | History restored; SQL reconstructed from capture | Aligns with “capture missing history into git” |
| **3. Establish consolidated baseline now** | Would succeed after cutover | Separate apply strategy | N/A until cutover | Requires authorized baseline slice | Possibly during cutover | Depends on cutover plan | Accepted long-term model; deferred by ADR 0006 §5 | Correct later; not required to unblock this gap first |
| **4. Documented prehistory/bootstrap artifact (non-migration)** | Succeeds if CI applies it before migrations | Unaffected | No | Avoids ledger | No | No | Parallel to harness stub risk if treated as SoT | Acceptable interim; weaker than restoring the orphan version that production already recorded |
| **5. `supabase migration repair` / force-insert** | Local-only trick | Dangerous ledger rewrite | N/A | **Unsafe** | **Yes — prohibited** | Risk of drift | Breaks audit | Rejected |

Hard rules honored: no out-of-order tip migration “merely to green local”; no
`migration repair`; no production DDL in this PR.

## Selected mechanism

Add repository file:

`supabase/migrations/20260112193137_restore_subscriptions_profiles_provenance.sql`

- Version equals the production orphan ledger entry.
- Body reconstructed from PR 1 production catalog (documented in-file).
- Omits `protect_admin_subscriptions` triggers (owned by `20260112204012_*`).
- Includes subscriptions structure/RLS/policy/`updated_at` trigger/grants and
  the four profiles columns + uniqueness/index.

## Out of scope (later slices)

Dual comparison/export models, advisor leftovers / ADR 0011, broad grant
drift beyond scoped objects, storage platform drift, types regeneration,
unrelated RPC diffs, Epic 7+.
