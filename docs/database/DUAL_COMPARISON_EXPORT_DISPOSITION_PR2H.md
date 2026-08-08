# Dual Comparison / Export Disposition — Epic 6 PR 2H

**Phase:** 8.1 / Epic 6 PR 2H  
**Authority:** ADR 0007  
**Status:** Disposition recorded — **no DROP**; tip privilege remediation
**production-applied 2026-08-08**; destructive DROP still NOT authorized

## Active (canonical)

| Object | Prod rows (2026-08-07 capture) | Consumers |
|--------|--------------------------------|-----------|
| `user_comparisons` | 2 | App `useComparisons`; Edge `generate-pdf` / `export-share` |
| `pdf_exports` | 0 | App `useExportShare`; Edge `export-share` + storage `exports` |

## Legacy — `legacy_temporarily_retained`

| Object | Prod rows | Why not drop-safe |
|--------|-----------|-------------------|
| `saved_comparisons` | 0 | Entitlement trigger; `assert_export_source_owned_by_user` fallback; FK parent; RLS/entitlement tests |
| `comparison_items` | 0 | FK child; Epic 4 RLS coverage |
| `comparison_versions` | 0 | Backs `v_comparison_latest_version`; version trigger |
| `comparison_shares` | 0 | Share RPCs still granted; FK parent |
| `export_files` | 0 | Dual export vs `pdf_exports`; RLS tests |
| `export_shares` | 0 | FK child of `export_files`; RLS tests |

Zero rows ≠ drop-safe under ADR 0007 while dependencies remain.

## Tip migration in this slice (non-destructive)

`20260808040000_epic6_pr2h_legacy_share_rpc_execute.sql` revokes client EXECUTE on
legacy share helpers with no App/Edge `.rpc` consumers:

- `generate_share_token()`
- `validate_comparison_share(text)`
- `touch_comparison_share(text)`

Tables/views/triggers unchanged. Tip EXECUTE remediation applied to
production 2026-08-08 as `20260808040000` (see
`docs/database/EPIC6_PRODUCTION_APPLY_PLAN.md`). Destructive table DROP
remains unauthorized.

## Exit criteria for a future destructive PR (not this PR)

Reconfirm zero rows; remove assert fallback + entitlement trigger with tests;
drop view/RPCs/tables under separate founder-authorized migration; retarget RLS fixtures.
