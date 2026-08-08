# Epic 6 — Cumulative Production Apply Plan

**Status:** Documentation only — **NO production apply authorized**  
**Policy:** Do not apply Epic 6 migrations one-by-one automatically. Present one
consolidated founder-gated package after repository Epic 6 closure.

This file accumulates pending production mutations in intended apply order.

---

## Gate (applies to every entry)

Before any production apply:

1. Repository Epic 6 slice merged to `main`
2. Production schema fingerprint / migration ledger re-verified read-only
3. Exact pending migration version confirmed
4. Founder explicit apply authorization for the consolidated package (or named subset)
5. Backup / rollback posture confirmed
6. Post-apply read-only verification planned

---

## Pending migrations (intended apply order)

### 1. `20260808020000_epic6_pr2d_grant_least_privilege.sql`

| Field | Value |
|-------|--------|
| Purpose | First least-privilege grant remediation |
| Expected production change | Revoke anon/authenticated privileges on `subscriptions`; revoke TRUNCATE/REFERENCES/TRIGGER on listed public tables; revoke client EXECUTE on `protect_admin_subscriptions()` |
| Precondition | PR 2D merged; FD-* accepted; Edge sync uses `service_role` for subscriptions |
| Pre-apply fingerprint | Re-capture production grants/schema read-only; confirm ledger tip before apply |
| Migration ledger expectation | Version `20260808020000` becomes applied tip (or next after any prior pending) |
| Backup/recovery | Snapshot / PITR posture confirmed before apply |
| Validation steps | See `docs/database/GRANT_REMEDIATION_PR2D.md` |
| Post-apply verification | Read-only grant capture vs repository target; smoke Edge webhook + app CRUD |
| Expected grant/schema delta | Client privileges removed as in PR 2D; no DDL/RLS/policy/function-body change |
| Rollback | Exact GRANT statements in `GRANT_REMEDIATION_PR2D.md` (docs only until authorized) |
| Dependencies | None beyond merged PR 2D |
| Blast radius | Privilege-only; latent client `.from("subscriptions")` would fail closed |

---

## Not included yet

Later Epic 6 tip migrations that introduce production-facing SQL will be
appended here when merged.

### PR 2E note

`TYPES_RECONCILIATION_PR2E.md` — generated types only; **no production
migration**.
