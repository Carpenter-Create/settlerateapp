# Schema Reconciliation Inventory

**Phase:** 8.1 / Epic 6 PR 0  
**Date:** 2026-08-07  
**Status:** REPOSITORY EVIDENCE ONLY  

This document inventories schema objects and consumers discoverable from
the SettleRate **git repository**. It does **not** claim live production
catalog state.

Authority proposals: `docs/adr/0006-database-schema-source-of-truth.md`,
`docs/adr/0007-legacy-schema-disposition.md` (both **proposed**).

---

## Evidence classes

| Label | Meaning |
|-------|---------|
| **REPOSITORY EVIDENCE** | Derived from migrations, types, code, docs, CI SQL tests in this repo |
| **PRODUCTION EVIDENCE NOT YET CAPTURED** | Requires authorized read-only production capture (Epic 6 PR 1+) |

Everything below is **REPOSITORY EVIDENCE** unless explicitly marked otherwise.

---

## Known authority surfaces (repository)

| Surface | Path | Role |
|---------|------|------|
| Migration history | `supabase/migrations/*.sql` (29 files) | Chronological DDL evolution |
| Generated types (**derived**) | `src/integrations/supabase/types.ts` | Past PostgREST introspection snapshot — **not** schema SoT |
| RLS coverage inventory | `docs/security/RLS_COVERAGE_INVENTORY.md` | Catalog after full migration replay + harness |
| RLS testing standard | `docs/adr/0004-rls-testing-standard.md` | Ephemeral Postgres / CI rules |
| Entitlement / roles / security docs | `docs/ENTITLEMENT_CONTRACT.md`, `docs/ROLES_AND_ENTITLEMENTS.md`, `docs/SECURITY_MODEL.md`, `docs/ADMIN_BOOTSTRAP.md` | Target behavior |
| CI SQL harness | `npm run test:entitlement-sql` → `scripts/test-entitlement-sql.mjs` | Applies all migrations to disposable Postgres |
| SQL assertion suite | `supabase/tests/*.sql`, `fixtures/epic4_pr1_rls_catalog.*` | RLS, admin, entitlement, grants |
| App / Edge consumers | `src/`, `supabase/functions/` | Runtime dependency evidence |

---

## PRODUCTION EVIDENCE NOT YET CAPTURED

The following cannot be asserted from the repository alone:

- Live `pg_catalog` / `information_schema` for production
- Production `supabase_migrations.schema_migrations` apply history
- Whether `public.subscriptions` exists / has RLS / which columns in production
- Whether `profiles` has `plan_key` / `plan_status` / Stripe columns in production
- Live grants, extensions, storage bucket drift
- Row counts / recent activity (for legacy disposition)
- Which environment `types.ts` was generated from
- Auth Dashboard / secrets / Edge deploy versions

**Proposed capture method (PR 1, not this PR):** read-only schema-only
introspection via Supabase CLI / Postgres using operator credentials
outside git; machine-readable drift report; no customer data dumps.

---

## Migration chain (summary)

| File | Theme |
|------|--------|
| `20260111225012_*` … `20260119195118_*` | Early product: comparisons, scenarios, profiles, billing, roles, exports, shares, scenario_type |
| `20260804120000_*` … `20260804160000_*` | Phase 6 entitlement/billing hardening, advisor fail-closed, grants |
| `20260804170000_*` / `20260805010000_*` | Stripe sandbox → live price allowlists |
| `20260805020000_*` | Free scenario limit → 2 |
| `20260806010000_*` … `20260808010000_*` | Epic 1 admin bootstrap; remove legacy admin trigger; admin RPC return types |

---

## Public tables

### Active product / security tables

| Object | Provenance (repo) | In `types.ts`? | RLS (repo/inventory) | Primary consumers | Reconciliation notes |
|--------|-------------------|----------------|----------------------|-------------------|----------------------|
| `scenarios` | create `20260111225221_*`; type extend `20260119195118_*`; entitlement triggers Phase 6 | yes | enabled; owner CRUD | App scenario store; Edge `check-subscription`, `generate-pdf` | Canonical scenarios |
| `user_comparisons` | `20260112213534_*` + `scenario_c_id` | yes | enabled; owner CRUD | App `useComparisons`; Edge `generate-pdf` | **Active** comparison model |
| `profiles` | create `20260111231451_*` (`id`, `full_name`, `created_at`) | **partial / drifted** — types also list `plan_key`, `plan_status`, `stripe_customer_id`, … | enabled; own select/insert/update | App `useProfile` | **High-priority types↔migrations mismatch** |
| `billing` | create `20260111231451_*`; Phase 6 columns | yes | enabled; select-own only | Edge checkout/portal/webhook/check-subscription | Entitlement SoT store (docs) |
| `user_roles` | `20260112050830_*` | yes | admin-gated | App admin/authz; Edge roles checks | Admin via `has_role` |
| `pdf_exports` | `20260113205728_*` | yes | owner + ownership assert | App `useExportShare`; Edge `export-share` | Active PDF export model |
| `admin_audit_log` | `20260112204316_*` | yes | admin select | Via admin RPCs | |
| `admin_bootstrap_tokens` | `20260806010000_*` | **no** | RLS on; deny-all policies | Bootstrap RPCs / Epic 1 tests | Epic 1 first-admin |
| `stripe_webhook_events` | Phase 6 | **no** | RLS on; deny-all | Edge `stripe-webhook` | |
| `entitlement_bypass_log` | Phase 6 | **no** | RLS on; deny-all | Via `log_admin_entitlement_bypass` | |
| `contact_messages` | `20260111231451_*` + admin columns | yes | public insert; admin select/update | **No app `.from` in this repo** | Possibly marketing-site / unused here |

### Legacy / parallel / uncertain tables

| Object | Provenance (repo) | In `types.ts`? | Consumers (repo) | Disposition hint (not decided) |
|--------|-------------------|----------------|------------------|--------------------------------|
| `subscriptions` | **No `CREATE TABLE` in migrations**; harness stub `supabase/tests/00_auth_stub.sql`; triggers in early admin migrations | yes | Edge `stripe-webhook` best-effort; protect triggers | ADR 0007 candidate — **unknown until production capture** |
| `saved_comparisons`, `comparison_items`, `comparison_versions` | `20260111225012_*` | yes | No active App/Edge `.from`; still entitlement-triggered | Dual comparison model |
| `comparison_shares` | `20260119150338_*` | yes | Share RPCs; no App/Edge rpc callers found | Dual comparison model |
| `export_files`, `export_shares` | `20260113202811_*` | yes | No App/Edge `.from`; active path uses `pdf_exports` | Dual export model |
| `advisor_access_requests` | `20260112073631_*` | yes | Deprecated advisor RPCs; Edge assign is 410 | Pending ADR 0011 |

---

## Views

| Object | Notes |
|--------|-------|
| `v_comparison_latest_version` | `security_invoker` view over legacy comparison versions; in types; no App/Edge consumers found |

---

## Enums

| Name | Repo values | Notes |
|------|-------------|-------|
| `app_role` | `admin`, `moderator`, `user`, `advisor` | `advisor` leftover after product-model removal |
| `export_kind` | `scenario`, `comparison` | |
| `export_status` | `queued`, `rendering`, `ready`, `failed` | |

---

## Storage (repo)

| Object | Notes |
|--------|-------|
| bucket `exports` | Created in migrations; Edge `export-share` uses storage |
| `storage.objects` policies | Older `exports_*` and newer `exports_bucket_*` policy generations appear in RLS inventory — confirm supersession |

---

## Security-sensitive RPCs / functions

| Name | In types? | Consumers (repo) | Notes |
|------|-----------|------------------|-------|
| `evaluate_entitlement` | yes | SQL/TS parity harness | Entitlement core |
| `feature_allowed` | yes | Triggers; SQL tests | Free limit 2 |
| `assert_feature_allowed` | yes | Edge `generate-pdf`, `export-share` | |
| `get_effective_tier` | yes | App `entitlementResolver` | |
| `is_professional_price` / `resolve_plan_code` | **no** | SQL entitlement path | Live allowlist migration |
| `claim_stripe_webhook_event` / `release_stripe_webhook_event` | yes | Edge webhook | service_role |
| `log_admin_entitlement_bypass` | yes | Edge webhook/portal | service_role |
| `duplicate_scenario` | yes | App scenario store | |
| `assert_export_source_owned_by_user` | yes | `pdf_exports` RLS | Includes `user_comparisons` after stage2 |
| `has_role` / `is_admin` / `is_advisor` | yes | Policies / RPCs | `is_advisor` deprecated meaning |
| `promote_to_admin`, `list_admins`, `list_recent_admin_promotions` | yes | Admin UI | Return types fixed Epic 1 |
| `issue_admin_bootstrap_token`, `claim_admin_bootstrap` | **no** | Ops / Epic 1 tests | |
| `validate_comparison_share`, `touch_comparison_share`, `generate_share_token` | yes | No App/Edge callers found | Legacy share path? |
| `approve_advisor_request`, `list_pending_advisor_requests` | yes | Fail-closed / unused | Advisor leftover |

Trigger helpers of note: `handle_new_user`, entitlement/ownership enforcers, `protect_admin_*`, `protect_admin_subscriptions` (depends on `subscriptions`). `grant_admin_on_signup` **dropped** (`20260807010000_*`). `normalize_admin_billing_insert` function exists without a found `CREATE TRIGGER` (uncertain).

---

## Types.ts coverage (derived)

| Category | Coverage |
|----------|----------|
| Core product tables | generally present |
| Legacy comparison/export/advisor tables | present |
| `subscriptions` | present (**no migration CREATE**) |
| `admin_bootstrap_tokens`, webhook/bypass tables | **absent** |
| Bootstrap RPCs / price helpers | **absent** |
| `profiles` extra billing-like columns | present in types; **absent from profile CREATE migration** |

---

## App / Edge consumer map (concise)

| Consumer | Tables | RPCs |
|----------|--------|------|
| Scenario / auth client paths | `scenarios` | `duplicate_scenario` |
| Comparisons UI | `user_comparisons` | — |
| Profile | `profiles` | — |
| Admin / authz | `user_roles` | `get_effective_tier`, admin list/promote |
| Export share client | `pdf_exports` | — |
| Edge `check-subscription` | `user_roles`, `scenarios`, `billing` | — |
| Edge checkout / portal | `billing` (+ bypass log) | bypass log RPC |
| Edge `stripe-webhook` | `billing`, `user_roles`, webhook events, **`subscriptions`** | claim/release, bypass |
| Edge `generate-pdf` | `scenarios`, `user_comparisons` | `assert_feature_allowed` |
| Edge `export-share` | `pdf_exports`, storage `exports` | `assert_feature_allowed` |
| Edge `admin-assign-advisor` | none | none (HTTP 410) |

---

## High-signal reconciliation candidates

1. **`subscriptions`** — types + Edge + triggers vs no migration CREATE vs harness stub.  
2. **`profiles` columns** — migrations vs generated types.  
3. **Missing from types** — bootstrap/webhook/bypass tables and RPCs.  
4. **Dual comparison models** and **dual export models**.  
5. **Advisor leftovers** — blocked on ADR 0011 for removal decisions.  
6. **Storage policy duplication** — confirm intentional supersession.  

---

## Proposed read-only production capture (PR 1+)

Not executed in PR 0.

1. Operator credentials outside git.  
2. Schema-only dump / catalog listing (tables, columns, functions, policies, grants).  
3. Machine-readable diff vs repository reconstruction (ADR 0006 surfaces A vs B).  
4. Classify each diff (ADR 0006 §3); disposition for legacy (ADR 0007).  
5. No customer row data in the repository.

---

## Reconciliation status legend (for later fills)

| Status | Meaning |
|--------|---------|
| `inventory_only` | Listed from repo; no production compare yet |
| `awaiting_production_capture` | Needs PR 1 evidence |
| `classified` | Drift class assigned; mutation not yet authorized |
| `reconciled` | Migration/types/docs aligned under authorized PR |

All rows in this PR 0 inventory are `inventory_only` /
`awaiting_production_capture`.
