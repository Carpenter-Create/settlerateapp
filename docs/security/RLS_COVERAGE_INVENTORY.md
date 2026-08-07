# RLS Coverage Inventory

**Authority:** `docs/adr/0004-rls-testing-standard.md`  
**Generated from:** ephemeral Postgres after full repository migration chain + harness FORCE on `public.scenarios`  
**Epic 4 status:** Complete (PR 0–2 merged; PR 3 not required)  
**Date:** 2026-08-06  
**Catalog fingerprint (SHA-256):** `89b3814561919ca98f6f3a8674d74d26ce545be694a61074a38f184f20b73412`  
**Fingerprint fixture:** `supabase/tests/fixtures/epic4_pr1_rls_catalog.sha256`

## Summary

- RLS-enabled relations: **19**
- Policies: **55**
- PR 1 behavioral coverage: core user-owned class (`supabase/tests/epic4_pr1_core_rls.sql`) — complete / merged
- PR 2 behavioral coverage: export/share, billing/entitlement support, roles/admin, public-ish, storage (+ admin path matrix) — `supabase/tests/epic4_pr2_remaining_rls.sql` — complete / merged
- PR 3: **not required** (CI already gates `npm run test:entitlement-sql`; acceptance criteria met in PRs 1–2)
- Drift gate: `supabase/tests/epic4_pr1_core_rls.sql` compares live catalog fingerprint to the committed fixture (not self-derived).
- CI: `.github/workflows/ci.yml` runs the full suite via `npm run test:entitlement-sql`.

## Classification

| Schema | Relation | RLS enabled | RLS forced | Class | PR coverage | Deferral reason |
|--------|----------|-------------|------------|-------|-------------|-----------------|
| `public` | `admin_audit_log` | true | false | roles/admin | PR 2 executable | — |
| `public` | `admin_bootstrap_tokens` | true | false | roles/admin | PR 2 executable | — |
| `public` | `advisor_access_requests` | true | false | roles/admin | PR 2 executable | — |
| `public` | `billing` | true | false | billing/entitlement support | PR 2 executable | — |
| `public` | `comparison_items` | true | false | core user-owned | PR 1 executable | — |
| `public` | `comparison_shares` | true | false | export/share | PR 2 executable | — |
| `public` | `comparison_versions` | true | false | core user-owned | PR 1 executable | — |
| `public` | `contact_messages` | true | false | public-ish | PR 2 executable | — |
| `public` | `entitlement_bypass_log` | true | false | billing/entitlement support | PR 2 executable | — |
| `public` | `export_files` | true | false | export/share | PR 2 executable | — |
| `public` | `export_shares` | true | false | export/share | PR 2 executable | — |
| `public` | `pdf_exports` | true | false | export/share | PR 2 executable | — |
| `public` | `profiles` | true | false | core user-owned | PR 1 executable | — |
| `public` | `saved_comparisons` | true | false | core user-owned | PR 1 executable | — |
| `public` | `scenarios` | true | true (harness FORCE) | core user-owned | PR 1 executable | — |
| `public` | `stripe_webhook_events` | true | false | billing/entitlement support | PR 2 executable | — |
| `public` | `user_comparisons` | true | false | core user-owned | PR 1 executable | — |
| `public` | `user_roles` | true | false | roles/admin | PR 2 executable | — |
| `storage` | `objects` | true | false | storage | PR 2 executable | — |

## Policies (effective)

### `public.admin_audit_log`

| Policy | Command | Roles | USING | WITH CHECK |
|--------|---------|-------|-------|------------|
| `admin_audit_log_select_admin` | SELECT | authenticated | `has_role(auth.uid(), 'admin'::app_role)` | `—` |

### `public.admin_bootstrap_tokens`

No effective policies

### `public.advisor_access_requests`

| Policy | Command | Roles | USING | WITH CHECK |
|--------|---------|-------|-------|------------|
| `advisor_requests_delete_admin` | DELETE | PUBLIC | `is_admin(auth.uid())` | `—` |
| `advisor_requests_insert_own` | INSERT | PUBLIC | `—` | `(auth.uid() = user_id)` |
| `advisor_requests_select` | SELECT | PUBLIC | `((auth.uid() = user_id) OR is_admin(auth.uid()))` | `—` |
| `advisor_requests_update_admin` | UPDATE | PUBLIC | `is_admin(auth.uid())` | `is_admin(auth.uid())` |

### `public.billing`

| Policy | Command | Roles | USING | WITH CHECK |
|--------|---------|-------|-------|------------|
| `billing_select_own` | SELECT | authenticated | `(auth.uid() = user_id)` | `—` |

### `public.comparison_items`

| Policy | Command | Roles | USING | WITH CHECK |
|--------|---------|-------|-------|------------|
| `comparison_items_delete_parent_owner` | DELETE | PUBLIC | `(EXISTS ( SELECT 1    FROM saved_comparisons sc   WHERE ((sc.id = comparison_items.comparison_id) AND (sc.user_id = auth.uid()))))` | `—` |
| `comparison_items_insert_parent_owner` | INSERT | PUBLIC | `—` | `(EXISTS ( SELECT 1    FROM saved_comparisons sc   WHERE ((sc.id = comparison_items.comparison_id) AND (sc.user_id = auth.uid()))))` |
| `comparison_items_select_parent_owner` | SELECT | PUBLIC | `(EXISTS ( SELECT 1    FROM saved_comparisons sc   WHERE ((sc.id = comparison_items.comparison_id) AND (sc.user_id = auth.uid()))))` | `—` |
| `comparison_items_update_parent_owner` | UPDATE | PUBLIC | `(EXISTS ( SELECT 1    FROM saved_comparisons sc   WHERE ((sc.id = comparison_items.comparison_id) AND (sc.user_id = auth.uid()))))` | `(EXISTS ( SELECT 1    FROM saved_comparisons sc   WHERE ((sc.id = comparison_items.comparison_id) AND (sc.user_id = auth.uid()))))` |

### `public.comparison_shares`

| Policy | Command | Roles | USING | WITH CHECK |
|--------|---------|-------|-------|------------|
| `comparison_shares_delete_owner` | DELETE | authenticated | `(EXISTS ( SELECT 1    FROM saved_comparisons c   WHERE ((c.id = comparison_shares.comparison_id) AND (c.user_id = auth.uid()))))` | `—` |
| `comparison_shares_insert_owner` | INSERT | authenticated | `—` | `((created_by = auth.uid()) AND (EXISTS ( SELECT 1    FROM saved_comparisons c   WHERE ((c.id = comparison_shares.comparison_id) AND (c.user_id = auth.uid())))))` |
| `comparison_shares_select_owner` | SELECT | authenticated | `(EXISTS ( SELECT 1    FROM saved_comparisons c   WHERE ((c.id = comparison_shares.comparison_id) AND (c.user_id = auth.uid()))))` | `—` |
| `comparison_shares_update_owner` | UPDATE | authenticated | `(EXISTS ( SELECT 1    FROM saved_comparisons c   WHERE ((c.id = comparison_shares.comparison_id) AND (c.user_id = auth.uid()))))` | `(EXISTS ( SELECT 1    FROM saved_comparisons c   WHERE ((c.id = comparison_shares.comparison_id) AND (c.user_id = auth.uid()))))` |

### `public.comparison_versions`

| Policy | Command | Roles | USING | WITH CHECK |
|--------|---------|-------|-------|------------|
| `comparison_versions_delete_parent_owner` | DELETE | PUBLIC | `(EXISTS ( SELECT 1    FROM saved_comparisons sc   WHERE ((sc.id = comparison_versions.comparison_id) AND (sc.user_id = auth.uid()))))` | `—` |
| `comparison_versions_insert_parent_owner` | INSERT | PUBLIC | `—` | `((auth.uid() = created_by) AND (EXISTS ( SELECT 1    FROM saved_comparisons sc   WHERE ((sc.id = comparison_versions.comparison_id) AND (sc.user_id = auth.uid())))))` |
| `comparison_versions_select_parent_owner` | SELECT | PUBLIC | `(EXISTS ( SELECT 1    FROM saved_comparisons sc   WHERE ((sc.id = comparison_versions.comparison_id) AND (sc.user_id = auth.uid()))))` | `—` |

### `public.contact_messages`

| Policy | Command | Roles | USING | WITH CHECK |
|--------|---------|-------|-------|------------|
| `contact_messages_insert_public` | INSERT | anon,authenticated | `—` | `true` |
| `contact_messages_select_admin` | SELECT | authenticated | `has_role(auth.uid(), 'admin'::app_role)` | `—` |
| `contact_messages_update_admin` | UPDATE | authenticated | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |

### `public.entitlement_bypass_log`

No effective policies

### `public.export_files`

| Policy | Command | Roles | USING | WITH CHECK |
|--------|---------|-------|-------|------------|
| `export_files_delete_own` | DELETE | PUBLIC | `(auth.uid() = owner_user_id)` | `—` |
| `export_files_insert_own` | INSERT | PUBLIC | `—` | `(auth.uid() = owner_user_id)` |
| `export_files_select_own` | SELECT | PUBLIC | `(auth.uid() = owner_user_id)` | `—` |

### `public.export_shares`

| Policy | Command | Roles | USING | WITH CHECK |
|--------|---------|-------|-------|------------|
| `export_shares_delete_own` | DELETE | PUBLIC | `(EXISTS ( SELECT 1    FROM export_files ef   WHERE ((ef.id = export_shares.export_file_id) AND (ef.owner_user_id = auth.uid()))))` | `—` |
| `export_shares_insert_own` | INSERT | PUBLIC | `—` | `((auth.uid() = created_by_user_id) AND (EXISTS ( SELECT 1    FROM export_files ef   WHERE ((ef.id = export_shares.export_file_id) AND (ef.owner_user_id = auth.uid())))))` |
| `export_shares_select_own` | SELECT | PUBLIC | `(EXISTS ( SELECT 1    FROM export_files ef   WHERE ((ef.id = export_shares.export_file_id) AND (ef.owner_user_id = auth.uid()))))` | `—` |
| `export_shares_update_own` | UPDATE | PUBLIC | `(EXISTS ( SELECT 1    FROM export_files ef   WHERE ((ef.id = export_shares.export_file_id) AND (ef.owner_user_id = auth.uid()))))` | `—` |

### `public.pdf_exports`

| Policy | Command | Roles | USING | WITH CHECK |
|--------|---------|-------|-------|------------|
| `pdf_exports_delete_own` | DELETE | authenticated | `(auth.uid() = user_id)` | `—` |
| `pdf_exports_insert_own` | INSERT | authenticated | `—` | `((auth.uid() = user_id) AND assert_export_source_owned_by_user(kind, source_id, user_id))` |
| `pdf_exports_select_own` | SELECT | authenticated | `(auth.uid() = user_id)` | `—` |
| `pdf_exports_update_own` | UPDATE | authenticated | `(auth.uid() = user_id)` | `((auth.uid() = user_id) AND assert_export_source_owned_by_user(kind, source_id, user_id))` |

### `public.profiles`

| Policy | Command | Roles | USING | WITH CHECK |
|--------|---------|-------|-------|------------|
| `profiles_insert_own` | INSERT | authenticated | `—` | `(auth.uid() = id)` |
| `profiles_select_own` | SELECT | authenticated | `(auth.uid() = id)` | `—` |
| `profiles_update_own` | UPDATE | authenticated | `(auth.uid() = id)` | `(auth.uid() = id)` |

### `public.saved_comparisons`

| Policy | Command | Roles | USING | WITH CHECK |
|--------|---------|-------|-------|------------|
| `saved_comparisons_delete_own` | DELETE | PUBLIC | `(auth.uid() = user_id)` | `—` |
| `saved_comparisons_insert_own` | INSERT | PUBLIC | `—` | `(auth.uid() = user_id)` |
| `saved_comparisons_select_own` | SELECT | PUBLIC | `(auth.uid() = user_id)` | `—` |
| `saved_comparisons_update_own` | UPDATE | PUBLIC | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `public.scenarios`

| Policy | Command | Roles | USING | WITH CHECK |
|--------|---------|-------|-------|------------|
| `scenarios_delete_own` | DELETE | PUBLIC | `(auth.uid() = user_id)` | `—` |
| `scenarios_insert_own` | INSERT | PUBLIC | `—` | `(auth.uid() = user_id)` |
| `scenarios_select_own` | SELECT | PUBLIC | `(auth.uid() = user_id)` | `—` |
| `scenarios_update_own` | UPDATE | PUBLIC | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `public.stripe_webhook_events`

No effective policies

### `public.user_comparisons`

| Policy | Command | Roles | USING | WITH CHECK |
|--------|---------|-------|-------|------------|
| `Users can create their own comparisons` | INSERT | PUBLIC | `—` | `(auth.uid() = user_id)` |
| `Users can delete their own comparisons` | DELETE | PUBLIC | `(auth.uid() = user_id)` | `—` |
| `Users can update their own comparisons` | UPDATE | PUBLIC | `(auth.uid() = user_id)` | `—` |
| `Users can view their own comparisons` | SELECT | PUBLIC | `(auth.uid() = user_id)` | `—` |

### `public.user_roles`

| Policy | Command | Roles | USING | WITH CHECK |
|--------|---------|-------|-------|------------|
| `Admins can delete roles` | DELETE | authenticated | `has_role(auth.uid(), 'admin'::app_role)` | `—` |
| `Admins can insert roles` | INSERT | authenticated | `—` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can view all roles` | SELECT | authenticated | `has_role(auth.uid(), 'admin'::app_role)` | `—` |

### `storage.objects`

| Policy | Command | Roles | USING | WITH CHECK |
|--------|---------|-------|-------|------------|
| `exports_bucket_insert_own_folder` | INSERT | authenticated | `—` | `((bucket_id = 'exports'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text))` |
| `exports_bucket_read_own_folder` | SELECT | authenticated | `((bucket_id = 'exports'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text))` | `—` |
| `exports_bucket_update_own_folder` | UPDATE | authenticated | `((bucket_id = 'exports'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text))` | `((bucket_id = 'exports'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text))` |
| `exports_delete_own` | DELETE | PUBLIC | `((bucket_id = 'exports'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))` | `—` |
| `exports_insert_own` | INSERT | PUBLIC | `—` | `((bucket_id = 'exports'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))` |
| `exports_select_own` | SELECT | PUBLIC | `((bucket_id = 'exports'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))` | `—` |

## PR 1 operation notes (core class)

| Relation | SELECT | INSERT | UPDATE | DELETE | Notes |
|----------|--------|--------|--------|--------|-------|
| `scenarios` | owner yes / non-owner no / anon no | own `user_id` only | own; transfer denied (RLS WITH CHECK) | own yes | Entitlement trigger skipped only for privileged fixture seed + ownership-transfer isolation assert |
| `profiles` | owner yes / non-owner no / anon no | own `id` only | own yes | **no DELETE policy** (0 rows) | Policies `TO authenticated` |
| `saved_comparisons` | owner yes / non-owner no / anon no | own `user_id` only | own; transfer denied | own yes | Comparison entitlement applies on write; Professional billing used in fixtures |
| `user_comparisons` | owner yes / non-owner no / anon no | own `user_id` only | own; transfer denied | own yes | Additional ownership trigger on referenced scenarios (not used as RLS evidence) |
| `comparison_items` | via parent `saved_comparisons` | parent owner only | parent owner; cross-parent re-parent denied | parent owner | Indirect ownership |
| `comparison_versions` | via parent | parent owner **and** `created_by = auth.uid()` | **UPDATE revoked** from `anon`/`authenticated` | parent owner | Immutable versions |

## PR 2 operation notes (remaining classes)

| Relation | SELECT | INSERT | UPDATE | DELETE | Notes |
|----------|--------|--------|--------|--------|-------|
| `pdf_exports` | owner yes / others no | own + `assert_export_source_owned_by_user` | own + source assert | own yes | Policies `TO authenticated`; admin not implicit bypass |
| `export_files` | owner yes | own `owner_user_id` | **no UPDATE policy** (0 rows) | own yes | Entity ownership not checked by RLS |
| `export_shares` | via parent `export_files` | parent owner + `created_by_user_id` | parent owner | parent owner | Indirect ownership |
| `comparison_shares` | via parent `saved_comparisons` | parent owner + `created_by` | parent owner | parent owner | Policies `TO authenticated` |
| `billing` | own yes | **no INSERT policy** | **no UPDATE policy** | **no DELETE policy** | Client read-only by design |
| `stripe_webhook_events` | deny-all client | deny-all client | deny-all client | deny-all client | RLS on, **no effective policies** |
| `entitlement_bypass_log` | deny-all client | deny-all client | deny-all client | deny-all client | RLS on, **no effective policies** |
| `user_roles` | admin only | admin only | **no UPDATE policy** | admin (not last admin) | Non-admin cannot self-read |
| `admin_audit_log` | admin only | **no INSERT policy** | **no UPDATE policy** | **no DELETE policy** | Writes via SECURITY DEFINER RPCs |
| `admin_bootstrap_tokens` | deny-all client | deny-all client | deny-all client | deny-all client | RLS on, **no effective policies**; bootstrap RPCs only |
| `advisor_access_requests` | owner or admin | own `user_id` | admin only | admin only | |
| `contact_messages` | admin only | **anon + authenticated** (`WITH CHECK true`) | admin only | **no DELETE policy** | Intentional public insert |
| `storage.objects` | own folder under `exports` | own folder | own folder | own folder | Path first segment = `auth.uid()`; admin not bypass |

## Notes

- Inventory is catalog-derived (`pg_class` / `pg_policy`); not from production.
- Harness grants test-only `SELECT/INSERT/UPDATE/DELETE` to `anon` on `public` tables so anonymous denials are RLS-attributable.
- Harness also grants test-only DML on `storage.objects` (and USAGE on `storage`) — storage is outside the public GRANT overlay.
- `public.scenarios` is `FORCE ROW LEVEL SECURITY` in the harness (existing Phase 6 practice); fingerprint includes that harness state.
- Anonymous insert assertions require prior `has_table_privilege('anon', …)` checks and accept only RLS-policy errors (not generic permission denied).
- PR 2 admin identity is the Epic 1 approved bootstrap admin (`a1000000-0000-0000-0000-00000000a001`), created before PR 2 runs.
