# Phase 6 deployment runbook

**Branch:** `feat/phase6-entitlement-hardening`  
**Scope:** Entitlement hardening migrations and dependent edge functions  
**Do not** assume success URLs or client checkout callbacks grant access.

## Preconditions

- Full validation green locally, including `npm run test:entitlement-sql`
- Database backup taken
- Stripe webhook endpoint can be briefly unavailable during ordered deploy
- Dedicated smoke-test account (non-admin) available

## Legacy `public.subscriptions` dependency

The three Phase 6 entitlement-authority migrations (`20260804120000`, `20260804130000`, `20260804140000`) do **not** require `public.subscriptions`. Entitlement evaluation, RLS enforcement, webhook idempotency, and export ownership all use `public.billing` and related Phase 6 objects.

`public.subscriptions` is a **legacy, best-effort** table used by older sync paths. The local SQL harness stubs it in `supabase/tests/00_auth_stub.sql` because an earlier migration in the repository chain references it without creating the table on a greenfield database.

Before production migration apply:

1. Confirm whether `public.subscriptions` already exists in the target project.
2. If applying the **complete** repository migration chain to a greenfield database, resolve the pre-existing subscriptions-table gap (stub, backfill, or skip the legacy migration) before relying on legacy sync.
3. Do not assume legacy subscription sync is authoritative; `public.billing` remains the entitlement source of truth after Phase 6.

## Migration order (apply in sequence)

1. `20260804120000_phase6_entitlement_hardening.sql`
2. `20260804130000_phase6_entitlement_followup.sql`
3. `20260804140000_phase6_stage2_hardening.sql`
4. `20260804150000_phase6_remove_advisor_product_model.sql`
5. `20260804160000_phase6_privileged_function_grants.sql`

Apply via Supabase SQL migration workflow or `supabase db push` against the target project **after** review. Do not apply out of order.

### Privileged function grants (Step 5)

Phase 6 migrations 1–4 use `REVOKE ... FROM PUBLIC` for webhook and audit RPCs. On Supabase/Postgres, **direct `EXECUTE` grants on `anon` and `authenticated` can remain** after a public revoke because those roles are granted explicitly elsewhere in the platform bootstrap.

Migration 5 (`phase6_privileged_function_grants`) **explicitly revokes** from `PUBLIC`, `anon`, and `authenticated`, then re-grants only to approved roles:

| Function | Approved roles |
|----------|----------------|
| `claim_stripe_webhook_event`, `release_stripe_webhook_event`, `log_admin_entitlement_bypass`, `maybe_log_admin_entitlement_write` | `service_role` only |
| `evaluate_entitlement`, `feature_allowed`, `assert_feature_allowed` | `authenticated`, `service_role` |
| `duplicate_scenario`, `assert_export_source_owned_by_user`, `get_effective_tier` | `authenticated`, `service_role` (plus `postgres` for `get_effective_tier`) |

Apply Step 5 in production before deploying Phase 6 edge functions if manual grant correction was performed ad hoc.

### Duplicate migration history note

Production may show two `supabase_migrations.schema_migrations` rows with the same name `phase6_entitlement_hardening` (different apply timestamps). This occurs when the same migration SQL is registered twice via separate apply calls; the SQL is idempotent and schema state is unaffected. **Do not delete production history rows without explicit approval.** Repository file versions (`20260804120000`, etc.) remain the source of truth for content; production timestamps are apply-time registry entries only.

## Post-migration SQL smoke checks

Run as `service_role` or superuser:

```sql
SELECT proname FROM pg_proc
WHERE proname IN (
  'evaluate_entitlement',
  'feature_allowed',
  'claim_stripe_webhook_event',
  'release_stripe_webhook_event',
  'assert_export_source_owned_by_user',
  'duplicate_scenario'
);

SELECT tgname FROM pg_trigger
WHERE tgname IN (
  'trg_enforce_scenario_write_entitlement',
  'trg_enforce_comparison_write_entitlement',
  'trg_enforce_user_comparison_ownership'
);
```

Optional: run repo harness locally before prod apply:

```bash
npm run test:entitlement-sql
```

## Edge function deploy order

Deploy **after** all five migrations are verified:

| Function | Stage 2 change | Required |
|----------|----------------|----------|
| `stripe-webhook` | C3/C8 mapping hardening | Yes |
| `create-checkout` | C4 repeat-trial prevention | Yes |
| `check-subscription` | unchanged in Stage 2 | Redeploy only if prior Phase 6 not yet live |
| `customer-portal` | unchanged in Stage 2 | Redeploy only if prior Phase 6 not yet live |
| `generate-pdf` | unchanged in Stage 2 | Redeploy only if prior Phase 6 not yet live |
| `export-share` | unchanged in Stage 2 | Redeploy only if prior Phase 6 not yet live |

## Advisor product model (removed)

The legacy `admin-assign-advisor` edge function is **deprecated** and returns HTTP 410 with no billing or role mutation. Do not deploy for new operations.

SettleRate supports two customer plans: **Analytical** and **Professional**. Administrative permissions are role-based and are not a billing tier.

## Frontend

Deploy app bundle after edge functions when webhook/checkout changes are live (same PR branch).

## Smoke test checklist (human)

1. **Free account:** create 3 scenarios OK; 4th blocked server-side; UI disables create/duplicate at limit.
2. **Returning subscriber:** checkout session omits `trial_period_days` (verify in Stripe Dashboard).
3. **New subscriber:** checkout includes 7-day trial.
4. **read_only (past_due):** can list/delete scenarios; update denied; comparisons list/delete only.
5. **Professional:** save comparison, PDF export, share succeed.
6. **Webhook idempotency:** replay event → no double billing write.
7. **Admin:** scenario create succeeds; row appears in `entitlement_bypass_log`.

## Rollback notes

- Migrations are additive/replace-function only; rollback requires targeted function restores from prior migration files.
- Do not deploy new edge functions before migrations (RPC/trigger mismatch).
- Billing rows remain authoritative; do not grant access from client success URLs during rollback.

## Related docs

- `docs/ENTITLEMENT_CONTRACT.md` — canonical entitlement contract
- `docs/ROLES_AND_ENTITLEMENTS.md` — product policy
