# ADR 0007: Legacy schema disposition

- Status: accepted
- Date: 2026-08-07
- Epic: Phase 8.1 / Epic 6 (Schema Reconciliation)
- Deciders: Founder / Adam Carpenter

## Context

SettleRate’s migration history and product evolution have left parallel or
apparently obsolete database objects alongside active paths. Repository
evidence (see `docs/database/SCHEMA_RECONCILIATION_INVENTORY.md`) includes
candidates such as:

- `public.subscriptions` (Edge/types/triggers; no migration `CREATE TABLE`);
- legacy comparison stack (`saved_comparisons` / items / versions / shares);
- earlier export metadata (`export_files` / `export_shares`) vs active
  `pdf_exports`;
- advisor leftovers (`advisor_access_requests`, advisor RPCs, `app_role`
  value `advisor`) after product-model removal;
- functions without attached triggers (e.g. `normalize_admin_billing_insert`).

Absence of application `.from()` / `.rpc()` references is **not** sufficient
proof that an object is safe to delete. Objects may be required by FKs,
triggers, views, RLS, grants, operational SQL, Stripe webhook best-effort
paths, or future/admin processes.

**Epic 6 PR 0 defines the disposition process only.** No destructive SQL.
Object-level disposition (including `subscriptions`, dual
comparison/export stacks, and advisor leftovers) remains deferred pending
production capture and, where applicable, ADR 0011.

Related: ADR 0006 (schema source of truth), ADR 0011 (advisor model —
still required / not written).

## Decision

### 1. Disposition classes

Every unexpected, duplicate, or apparently obsolete production/repository
object must be assigned exactly one class before mutation:

| Class | Meaning | Default action |
|-------|---------|----------------|
| `active_canonical` | Required by current product / security / billing | Keep; document as canonical |
| `compatibility_required` | Needed for safe coexistence, migration, or external systems | Keep; document consumers |
| `legacy_temporarily_retained` | Obsolete intent but not yet safe to remove | Keep; expiry/review note |
| `safe_to_deprecate` | May stop new writes; reads/retention still required | Deprecate via authorized PR |
| `safe_to_remove` | Evidence complete; removal authorized | Drop via authorized migration PR |
| `unknown_blocked` | Insufficient evidence | **No mutation** |

### 2. Required evidence before `safe_to_remove`

All applicable items must be checked and recorded (inventory or PR body):

1. Repository code search (app, Edge, scripts, SQL tests, docs).
2. Edge Function / RPC / trigger / view dependencies.
3. Foreign-key and constraint dependencies (inbound/outbound).
4. RLS policies and grants referencing the object.
5. Data presence / row count (read-only production query; **counts only**,
   not payloads in git).
6. Recent read/write activity if available (without committing PII).
7. Operational / admin / runbook processes.
8. Stripe / billing / entitlement / security dependencies.
9. Historical migration purpose (why it was created).
10. Founder / product intent (especially advisor, dual comparison/export).

**Do not** classify `safe_to_remove` solely because application TypeScript
does not reference the object.

### 3. Destructive change safeguards

- Destructive disposition (`DROP`, irreversible rename that orphans data,
  policy wipe that opens access) requires a **separately authorized**
  migration PR (or explicit founder waiver).
- That PR must include: classification evidence, rollback/backup notes,
  impact on RLS/entitlement/billing/admin, and validation plan
  (`test:entitlement-sql` / RLS suite as applicable).
- Prefer deprecate → observe → remove over immediate drop when uncertainty
  remains.
- No destructive SQL in Epic 6 PR 0 or in undocumented Dashboard clicks.
- Production capture (ADR 0006) must precede reconciliation/mutation that
  depends on live reality.

### 4. Interaction with advisor / product decisions

Advisor-related objects may additionally depend on **ADR 0011** (Advisor
model decision — not yet written). Until ADR 0011 is accepted, advisor
tables/RPCs/enum values default to `legacy_temporarily_retained` or
`unknown_blocked`, not `safe_to_remove`.

### 5. Dual-model stacks

When two models exist for the same product concern (e.g. comparisons,
exports):

1. Identify the **active** path from code + docs + tests.
2. Classify the parallel stack under this ADR.
3. Do not remove the parallel stack until entitlement triggers, export
   ownership asserts, and any share RPCs are shown safe under ADR 0006
   comparison.

## Consequences

- This ADR is **accepted** and binding for Epic 6 legacy disposition.
- Epic 6 reconciliation PRs must cite disposition classes for legacy
  candidates.
- CI green on ephemeral Postgres does not alone authorize production drops.
- Object-level classifications for high-signal candidates remain open until
  production evidence (and ADR 0011 where applicable).

## Alternatives considered

- **Delete anything unused by app code.** Rejected — false negatives for
  triggers, webhooks, ops SQL, and FK graphs.
- **Always keep everything forever.** Rejected — accumulates security and
  cognitive debt; allowed only as explicit `legacy_temporarily_retained`
  with review.
- **Dashboard cleanup without migrations.** Rejected — violates ADR 0006
  future-change rule.
