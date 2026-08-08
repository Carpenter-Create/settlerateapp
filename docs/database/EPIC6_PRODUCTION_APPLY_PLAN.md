# Epic 6 — Production Apply Plan / Execution Record

**Status:** **EXECUTED SUCCESSFULLY** — consolidated package applied and
verified on production (`vpcxzbaxhpucvevnkalo`) on **2026-08-08**  
**Policy (historical):** Do not apply Epic 6 migrations one-by-one
automatically. Present one consolidated founder-gated package after
repository Epic 6 closure.

This file is retained as the **audit artifact** for the Epic 6 production
remediation package: intended order, preconditions, rollback, validation,
blast radius, and actual execution outcome.

---

## Execution summary (AFTER)

| Field | Value |
|-------|--------|
| Founder authorization | Option 1 — full package (conditional on pre-apply gates) |
| Execution date | `2026-08-08` |
| Project | `vpcxzbaxhpucvevnkalo` |
| Result | **SUCCESS** |
| Rollback | **None** |
| Package-targeted privilege removals | **154 / 154** verified |
| Final migration ledger size | 34 versions |
| Final ledger tip | `20260808040000` / `epic6_pr2h_legacy_share_rpc_execute` |
| Pre-apply structural fingerprint | `fa5c3bbc0f22e521bc43140e64569d0b3364b061dccd9d303f55fa2996fdc38c` |
| Final structural fingerprint | `fa5c3bbc0f22e521bc43140e64569d0b3364b061dccd9d303f55fa2996fdc38c` |
| Pre-apply grants fingerprint | `747f7ab55a655e16f21760ecede8a6baad5536d1870f502bd5e0e1727fd5e485` (818) |
| Final grants fingerprint | `3b535add39bc57db4a089dcc5fdbd87fb285117aa3cfb8dbbf0ccc8dffba48ff` (664) |
| Post-apply capture | `2026-08-08T04:26:04.217Z` |
| Apply method | Exact tip SQL files via linked `supabase db query --file` + ledger insert of exact git versions; **not** broad `db push` / **not** `migration repair` |
| Repository closure SHA | `67a49801cdcd6cd25f3204a81c6cc872991fb365` |
| Post-closure main SHA | `ae1ab5e3dfdddd04e18f9e7d550e4cd00227c13a` |

### Applied versions (exact order)

1. `20260808020000` — `epic6_pr2d_grant_least_privilege`
2. `20260808030000` — `epic6_pr2f_rpc_execute_least_privilege`
3. `20260808040000` — `epic6_pr2h_legacy_share_rpc_execute`

---

## Gate (BEFORE — satisfied)

Before any production apply:

1. Repository Epic 6 slice merged to `main` — **met**
2. Production schema fingerprint / migration ledger re-verified read-only — **met**
3. Exact pending migration version confirmed — **met** (tips absent; tip was `fix_admin_rpc_return_types`)
4. Founder explicit apply authorization for the consolidated package — **met**
5. Backup / rollback posture confirmed — **met** (Pro plan; WALG physical backups present; PITR add-on off; SQL rollback docs reviewed)
6. Post-apply read-only verification planned — **met** and executed

---

## Package migrations (intended apply order — EXECUTED)

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
| Rollback | Exact GRANT statements in `GRANT_REMEDIATION_PR2D.md` |
| Dependencies | None beyond merged PR 2D |
| Blast radius | Privilege-only; latent client `.from("subscriptions")` would fail closed |
| **Execution status** | **APPLIED** `2026-08-08` — verified; no rollback |

---

### 2. `20260808030000_epic6_pr2f_rpc_execute_least_privilege.sql`

| Field | Value |
|-------|--------|
| Purpose | High-confidence RPC EXECUTE least-privilege (admin/webhook helper/plan helpers/trigger-only) |
| Expected production change | Revoke PUBLIC/anon (and client where listed) EXECUTE; preserve authenticated admin RPCs and service_role trigger/webhook helpers |
| Precondition | PR 2F merged; PR 2D tip preferably applied first (independent but ordered) |
| Validation | `docs/database/RPC_EXECUTE_REMEDIATION_PR2F.md` + `epic6_pr2f_rpc_execute.sql` |
| Rollback | GRANT statements in `RPC_EXECUTE_REMEDIATION_PR2F.md` |
| Blast radius | Privilege-only; deferred advisor/share/`has_role`/`is_admin` unchanged |
| **Execution status** | **APPLIED** `2026-08-08` — verified; no rollback |

### 3. `20260808040000_epic6_pr2h_legacy_share_rpc_execute.sql`

| Field | Value |
|-------|--------|
| Purpose | Revoke client EXECUTE on unused legacy comparison-share RPCs |
| Expected production change | No EXECUTE for anon/authenticated/PUBLIC on `generate_share_token`, `validate_comparison_share`, `touch_comparison_share` |
| Precondition | PR 2H merged; tables remain retained |
| Validation | `docs/database/DUAL_COMPARISON_EXPORT_DISPOSITION_PR2H.md` |
| Rollback | `GRANT EXECUTE ... TO anon, authenticated` on the three functions |
| Blast radius | Privilege-only; no App/Edge `.rpc` consumers found |
| **Execution status** | **APPLIED** `2026-08-08` — verified; no rollback |

## Docs-only slices (no production SQL)

- PR 2E: `TYPES_RECONCILIATION_PR2E.md`
- PR 2G: `STORAGE_PLATFORM_DRIFT_PR2G.md`
- PR 2I: `ADVISOR_ADR0011_CHECK_PR2I.md` (HARD STOP for destructive advisor work)

## Not included in this package

Destructive legacy DROPs and advisor disposition remain unauthorized
(ADR 0011 / future founder-gated work). No further Epic 6 tip migrations
are pending for this package.
