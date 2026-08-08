# RPC EXECUTE Remediation — Epic 6 PR 2F

**Phase:** 8.1 / Epic 6 PR 2F  
**Status:** Repository implementation + local proof — **production applied
2026-08-08** (consolidated Epic 6 package; see
`docs/database/EPIC6_PRODUCTION_APPLY_PLAN.md`)  
**Migration:** `supabase/migrations/20260808030000_epic6_pr2f_rpc_execute_least_privilege.sql`

## Authority

`FD-RPC-EXECUTE-PUBLIC` **ACCEPTED** in `docs/database/GRANT_SECURITY_DECISIONS_PR2C.md`.

## Included changes

| Bucket | Functions | Revoke | Preserve |
|--------|-----------|--------|----------|
| B1 Admin | `promote_to_admin`, `list_admins`, `list_recent_admin_promotions` | PUBLIC, anon | authenticated |
| B2 Webhook helper | `log_webhook_admin_ignored` | PUBLIC, anon, authenticated | service_role |
| B3 Plan helpers | `is_professional_price`, `resolve_plan_code` | PUBLIC, anon, authenticated | (DEFINER caller path) |
| B4 Trigger-only | `protect_admin_billing`, `protect_admin_role_deletion`, `handle_new_user`, `normalize_admin_billing_insert`, `set_pdf_exports_updated_at`, `tg_set_*` (4) | PUBLIC, anon, authenticated | service_role |

## Deferred

- Advisor RPCs (`approve_advisor_request`, `list_pending_advisor_requests`, `is_advisor`) → ADR 0011 / PR 2I
- Share helpers (`generate_share_token`, `validate_comparison_share`, `touch_comparison_share`) → PR 2H
- `has_role` / `is_admin` authenticated EXECUTE (active RLS dependency)
- `protect_admin_subscriptions` (PR 2D)
- Phase 6 already-locked webhook/entitlement RPCs

## Runtime impact

None expected for admin UI (authenticated EXECUTE preserved), entitlement evaluation
(DEFINER internals), or Edge service_role paths. Triggers do not require client EXECUTE.

## Rollback (docs only — do not execute)

```sql
-- ROLLBACK DOC ONLY
GRANT EXECUTE ON FUNCTION public.promote_to_admin(p_email text) TO anon;
GRANT EXECUTE ON FUNCTION public.list_admins() TO anon;
GRANT EXECUTE ON FUNCTION public.list_recent_admin_promotions(p_limit integer) TO anon;
GRANT EXECUTE ON FUNCTION public.log_webhook_admin_ignored(p_user_id uuid, p_email text, p_event_type text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_professional_price(p_price_id text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_plan_code(p_price_id text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_admin_billing() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_admin_role_deletion() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_admin_billing_insert() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_pdf_exports_updated_at() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_set_billing_updated_at() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_set_updated_at() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_set_scenarios_updated_at() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_set_comparison_version_number() TO anon, authenticated;
```

## Production apply

Appended to `docs/database/EPIC6_PRODUCTION_APPLY_PLAN.md` during the
repository train; **applied to production 2026-08-08** as version
`20260808030000` (execution record in that file). No rollback.
