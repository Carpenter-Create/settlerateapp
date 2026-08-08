# Grant Remediation — Epic 6 PR 2D

**Phase:** 8.1 / Epic 6 PR 2D  
**Status:** Repository implementation + local proof — **production apply NOT AUTHORIZED**  
**Migration:** `supabase/migrations/20260808020000_epic6_pr2d_grant_least_privilege.sql`

## Accepted authority

Binding founder decisions in `docs/database/GRANT_SECURITY_DECISIONS_PR2C.md`:

| Decision ID | Status | Binding target used in PR 2D |
|-------------|--------|------------------------------|
| `FD-SUB-CLIENT-WRITES` | **ACCEPTED** | No anon/authenticated table privileges on `public.subscriptions` |
| `FD-DEFAULT-BROAD-GRANTS` | **ACCEPTED** | Structural only in this slice: revoke TRUNCATE/REFERENCES/TRIGGER from anon/authenticated on active public tables |
| `FD-LEGACY-DUAL-MODEL-GRANTS` | **ACCEPTED** | Structural only: revoke TRUNCATE/REFERENCES/TRIGGER; DML/SELECT deferred |
| `FD-RPC-EXECUTE-PUBLIC` | **ACCEPTED** | **Deferred** except `protect_admin_subscriptions()` client EXECUTE revoke |

## Exact changes

### A) `public.subscriptions` — revoked from `anon` and `authenticated`

| Privilege | anon | authenticated |
|-----------|:----:|:-------------:|
| SELECT | revoked | revoked |
| INSERT | revoked | revoked |
| UPDATE | revoked | revoked |
| DELETE | revoked | revoked |
| TRUNCATE | revoked | revoked |
| REFERENCES | revoked | revoked |
| TRIGGER | revoked | revoked |

### B) Structural revokes — `anon` + `authenticated` on listed public tables

Privileges: **TRUNCATE**, **REFERENCES**, **TRIGGER**

Tables:

- `profiles`, `scenarios`, `billing`, `subscriptions`, `user_roles`
- `user_comparisons`, `pdf_exports`
- `admin_audit_log`, `admin_bootstrap_tokens`, `entitlement_bypass_log`, `stripe_webhook_events`
- `saved_comparisons`, `comparison_items`, `comparison_versions`, `comparison_shares`
- `export_files`, `export_shares`, `advisor_access_requests`

### C) `public.protect_admin_subscriptions()`

| Grantee | EXECUTE |
|---------|---------|
| PUBLIC | revoked |
| anon | revoked |
| authenticated | revoked |
| postgres | preserved (re-GRANTed) |
| service_role | preserved (re-GRANTed) |

### Explicitly preserved

- `service_role` SELECT/INSERT/UPDATE/DELETE on `subscriptions`
- `postgres` owner/admin table privileges
- All SELECT/INSERT/UPDATE/DELETE on non-subscription public tables for roles other than the subscriptions client revoke
- RLS enabled state and `subscriptions_select_own` policy text (unchanged)
- Function bodies, triggers, ownership, data

### Intentionally deferred

- Broader RPC EXECUTE remediation (`has_role`, `is_admin`, admin/bootstrap/webhook/entitlement/export RPCs, etc.)
- Legacy dual-model SELECT/DML grant decisions
- Removing `subscriptions_select_own` after it becomes unreachable for clients
- Production apply of this migration

## Rationale

- No browser `.from("subscriptions")`; billing is entitlement SoT; Edge sync uses `service_role`.
- TRUNCATE is not protected by RLS; REFERENCES/TRIGGER are unused by PostgREST app paths.
- `protect_admin_subscriptions()` is trigger-only SECURITY DEFINER; client EXECUTE is unnecessary.

## Expected runtime impact

None for current app/Edge paths if consumers match PR 2C evidence. If a regression appears, stop and report — do not silently restore broad grants.

## Local proof

- `npm run schema:reconstruct -- --mode migration_only` succeeds with tip migration applied.
- `supabase/tests/epic6_pr2d_grant_privileges.sql` asserts privilege contract (migration-only via `pr2dGrantRemediation.test.mjs`, and after re-apply in `test:entitlement-sql`).
- Existing entitlement/RLS/app suites remain green.

## Grant drift interpretation after PR 2D

| Surface | Meaning |
|---------|---------|
| **PRODUCTION CURRENT** | Pre-remediation broad privileges (PR 1 capture unchanged) |
| **REPOSITORY TARGET** | Least-privilege after tip migration on clean reconstruction |
| New `privilege_only_in_a` rows for revoked privileges | **Approved remediation pending production application** — not a regression |

Observed after refreshing drift against tip migration (migration_only = 31 migrations):

| Metric | Pre-PR2D (PR 2B/2C baseline) | Post-PR2D tip (repo target) |
|--------|------------------------------|-----------------------------|
| Total drift records | 2125 | 2139 |
| `grant_mismatch` | 1400 | 1414 |
| `privilege_only_in_a` | 1110 | 1124 |

Delta (+14 grant mismatches / production-only privileges) matches the
subscriptions client privilege revokes now present only in production.
`docs/database/grant-security-inventory-pr2c.json` remains the **frozen**
PR 2C decision package (700 public-facing inventory mismatches at accept
time) and is not rewritten.

Do not claim production is reconciled until this migration is applied under a separate founder gate.

## Production preconditions (NOT AUTHORIZED YET)

Before production apply:

1. PR 2D merged to `main`
2. Production schema fingerprint / migration ledger re-verified read-only
3. Exact pending migration version confirmed (`20260808020000`)
4. Founder explicit apply authorization for this migration only
5. Backup / rollback posture confirmed
6. Post-apply read-only grant capture planned

### Production apply procedure (NOT AUTHORIZED)

```text
# NOT AUTHORIZED in PR 2D. Document only.
# After founder apply authorization:
# 1) Confirm linked project + backup
# 2) Apply only 20260808020000_epic6_pr2d_grant_least_privilege.sql via approved process
# 3) Do NOT migration repair / db push unrelated changes
# 4) Capture sanitized grants read-only; compare to repository target
```

### Post-apply verification (after future authorization)

- Confirm anon/authenticated lack subscriptions table privileges
- Confirm structural privileges absent for listed tables
- Confirm `protect_admin_subscriptions()` EXECUTE only for postgres/service_role
- Confirm RLS + `subscriptions_select_own` still present
- Smoke Edge `stripe-webhook` sync path and app CRUD

## Rollback GRANT statements (documentation only — DO NOT EXECUTE)

Derived from PR 1 production catalog privilege matrix. Re-GRANT only if emergency rollback is authorized.

```sql
-- ROLLBACK DOC ONLY — NOT AUTHORIZED / NOT EXECUTED IN PR 2D

-- subscriptions client matrix (pre-PR2D production)
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.subscriptions TO anon, authenticated;

-- structural privileges on public tables (pre-PR2D production had these for anon/authenticated)
GRANT TRUNCATE, REFERENCES, TRIGGER ON TABLE public.profiles TO anon, authenticated;
GRANT TRUNCATE, REFERENCES, TRIGGER ON TABLE public.scenarios TO anon, authenticated;
GRANT TRUNCATE, REFERENCES, TRIGGER ON TABLE public.billing TO anon, authenticated;
GRANT TRUNCATE, REFERENCES, TRIGGER ON TABLE public.subscriptions TO anon, authenticated;
GRANT TRUNCATE, REFERENCES, TRIGGER ON TABLE public.user_roles TO anon, authenticated;
GRANT TRUNCATE, REFERENCES, TRIGGER ON TABLE public.user_comparisons TO anon, authenticated;
GRANT TRUNCATE, REFERENCES, TRIGGER ON TABLE public.pdf_exports TO anon, authenticated;
GRANT TRUNCATE, REFERENCES, TRIGGER ON TABLE public.admin_audit_log TO anon, authenticated;
GRANT TRUNCATE, REFERENCES, TRIGGER ON TABLE public.admin_bootstrap_tokens TO anon, authenticated;
GRANT TRUNCATE, REFERENCES, TRIGGER ON TABLE public.saved_comparisons TO anon, authenticated;
GRANT TRUNCATE, REFERENCES, TRIGGER ON TABLE public.comparison_items TO anon, authenticated;
GRANT TRUNCATE, REFERENCES, TRIGGER ON TABLE public.comparison_versions TO anon, authenticated;
GRANT TRUNCATE, REFERENCES, TRIGGER ON TABLE public.comparison_shares TO anon, authenticated;
GRANT TRUNCATE, REFERENCES, TRIGGER ON TABLE public.export_files TO anon, authenticated;
GRANT TRUNCATE, REFERENCES, TRIGGER ON TABLE public.export_shares TO anon, authenticated;
GRANT TRUNCATE, REFERENCES, TRIGGER ON TABLE public.advisor_access_requests TO anon, authenticated;
-- entitlement_bypass_log / stripe_webhook_events: no anon/authenticated structural grants in PR 1 capture

-- protect_admin_subscriptions client EXECUTE (pre-PR2D production)
GRANT EXECUTE ON FUNCTION public.protect_admin_subscriptions() TO anon, authenticated;
```
