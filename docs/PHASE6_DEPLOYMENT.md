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

Apply via Supabase SQL migration workflow or `supabase db push` against the target project **after** review. Do not apply out of order.

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

Deploy **after** all three migrations are verified:

| Function | Stage 2 change | Required |
|----------|----------------|----------|
| `stripe-webhook` | C3/C8 mapping hardening | Yes |
| `create-checkout` | C4 repeat-trial prevention | Yes |
| `admin-assign-advisor` | C9 legacy advisor price allowlist | Yes (if ops uses it) |
| `check-subscription` | unchanged in Stage 2 | Redeploy only if prior Phase 6 not yet live |
| `customer-portal` | unchanged in Stage 2 | Redeploy only if prior Phase 6 not yet live |
| `generate-pdf` | unchanged in Stage 2 | Redeploy only if prior Phase 6 not yet live |
| `export-share` | unchanged in Stage 2 | Redeploy only if prior Phase 6 not yet live |

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
