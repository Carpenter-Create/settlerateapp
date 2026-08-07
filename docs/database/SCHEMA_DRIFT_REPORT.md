# Schema Drift Report

Generated: 2026-08-07T19:22:54.391Z

Authority: `docs/adr/0006-database-schema-source-of-truth.md`, `docs/adr/0007-legacy-schema-disposition.md`. This report is evidence only — no mutation is authorized by its contents (`mutationRecommendation` is always `NONE`).

## Source availability

| Surface | Available | Notes |
|---|---|---|
| production (A) | yes | projectRef=vpcxzbaxhpucvevnkalo; captured 2026-08-07T19:11:42.048Z |
| migration_only (B, TRUE reconstruction) | yes | reconstruction FAILED at 20260112204012_f094f5d3-2c93-436a-96ac-809c5761f37f.sql (expected if public.subscriptions is required before its stub would exist) |
| harness (TEST-HARNESS reconstruction) | yes | reconstruction succeeded |
| types.ts (C, derived) | yes | never authoritative (ADR 0006 §1.5) |

## Reconstruction evidence (retain BOTH)

ADR 0006 requires both a TRUE migration-only reconstruction and a TEST-HARNESS reconstruction. Harness success does **not** prove migration-only reproducibility.

### A. Migration-only (TRUE reconstruction)

- Result: **FAILED** (this failure is retained evidence — do not patch around it)
- Failed at migration: `20260112204012_f094f5d3-2c93-436a-96ac-809c5761f37f.sql`
- Why: relation "public.subscriptions" does not exist
- Catalog successfully reconstructed before failure: 11 tables, 53 functions, 29 policies (partial catalog captured after the failing migration stopped apply)
- Applied migrations before failure: 10

### B. Harness (TEST-HARNESS reconstruction)

- Result: **SUCCEEDED**
- Why harness can succeed when migration-only fails: `supabase/tests/00_auth_stub.sql` supplies prerequisite state (notably `public.subscriptions`) that is **not** created by any migration.
- Tables reconstructed: 21
- This does **not** prove that git migrations alone can rebuild an equivalent catalog.

## Summary

Total classified drift records: **2287**. High-priority non-match records: **550**.

| Class | Count |
|---|---|
| `constraint_index_mismatch` | 1 |
| `definition_mismatch` | 8 |
| `function_rpc_mismatch` | 5 |
| `generated_types_mismatch` | 3 |
| `grant_mismatch` | 1559 |
| `match` | 376 |
| `policy_rls_mismatch` | 3 |
| `production_missing_repo_object` | 76 |
| `repo_missing_production_object` | 256 |

| Compare surface | Count |
|---|---|
| `harness` | 1070 |
| `migration_only` | 1214 |
| `types_vs_production` | 3 |

## Grant mismatches

Total `grant_mismatch` records: **1559**.

| Issue | Count |
|---|---|
| `privilege_only_in_a` | 1265 |
| `privilege_only_in_b` | 294 |

Privilege identity compared: schema + object type + object identity (function signature where applicable) + grantee + privilege type + is_grantable.

## High-priority candidate resolutions (evidence only)

Object disposition remains governed by ADR 0007. `INTENTIONAL_LEGACY_MAP` is empty unless a disposition has been accepted. Advisor objects are **not** classified removable while ADR 0011 is unresolved.

| Candidate | In production | Drift classes observed | ADR 0007 status |
|---|---|---|---|
| `subscriptions` | yes | `definition_mismatch`, `grant_mismatch`, `policy_rls_mismatch`, `production_missing_repo_object`, `repo_missing_production_object` | unknown_founder_decision (no accepted disposition) |
| `profiles` | yes | `definition_mismatch`, `grant_mismatch`, `repo_missing_production_object` | unknown_founder_decision (no accepted disposition) |
| `admin_bootstrap_tokens` | yes | `generated_types_mismatch`, `grant_mismatch`, `repo_missing_production_object` | unknown_founder_decision (no accepted disposition) |
| `stripe_webhook_events` | yes | `generated_types_mismatch`, `grant_mismatch`, `repo_missing_production_object` | unknown_founder_decision (no accepted disposition) |
| `entitlement_bypass_log` | yes | `generated_types_mismatch`, `grant_mismatch`, `repo_missing_production_object` | unknown_founder_decision (no accepted disposition) |
| `user_comparisons` | yes | `grant_mismatch`, `repo_missing_production_object` | unknown_founder_decision (no accepted disposition) |
| `saved_comparisons` | yes | `grant_mismatch`, `repo_missing_production_object` | unknown_founder_decision (no accepted disposition) |
| `pdf_exports` | yes | `grant_mismatch`, `repo_missing_production_object` | unknown_founder_decision (no accepted disposition) |
| `export_files` | yes | `grant_mismatch`, `repo_missing_production_object` | unknown_founder_decision (no accepted disposition) |
| `export_shares` | yes | `grant_mismatch`, `repo_missing_production_object` | unknown_founder_decision (no accepted disposition) |
| `advisor_access_requests` | yes | `grant_mismatch` | unknown_founder_decision (no accepted disposition) |
| `advisor_profiles` | no | (no non-match records) | unknown_founder_decision (no accepted disposition) |

Also review grant_mismatch / policy_rls_mismatch / function_rpc_mismatch class totals in the Summary for privilege, RLS/policy, and RPC surface drift.

## High-priority findings

| Object | Surface | Class | Consumers |
|---|---|---|---|
| `table:public.admin_bootstrap_tokens` | migration_only | `repo_missing_production_object` | Bootstrap RPCs, Epic 1 SQL tests |
| `table:public.comparison_shares` | migration_only | `repo_missing_production_object` | Share RPCs (no App/Edge rpc callers found) |
| `table:public.export_files` | migration_only | `repo_missing_production_object` | — |
| `table:public.export_shares` | migration_only | `repo_missing_production_object` | — |
| `table:public.pdf_exports` | migration_only | `repo_missing_production_object` | App useExportShare, Edge export-share |
| `table:public.profiles` | migration_only | `definition_mismatch` | App useProfile |
| `table:public.subscriptions` | migration_only | `repo_missing_production_object` | Edge stripe-webhook (best-effort), protect_admin_subscriptions trigger, supabase/tests/00_auth_stub.sql (TEST-HARNESS reconstruction only) |
| `table:public.user_comparisons` | migration_only | `repo_missing_production_object` | App useComparisons, Edge generate-pdf |
| `function:public.approve_advisor_request` | migration_only | `function_rpc_mismatch` | — |
| `function:public.claim_admin_bootstrap` | migration_only | `repo_missing_production_object` | Ops / Epic 1 tests |
| `function:public.issue_admin_bootstrap_token` | migration_only | `repo_missing_production_object` | Ops / Epic 1 tests |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | — |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | — |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | — |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | — |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | — |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | — |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | — |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | — |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | — |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | — |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | — |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | — |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | — |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | — |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | — |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | — |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | — |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | — |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | — |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | — |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | — |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | — |
| `table:public.profiles` | harness | `definition_mismatch` | App useProfile |
| `table:public.subscriptions` | harness | `policy_rls_mismatch` | Edge stripe-webhook (best-effort), protect_admin_subscriptions trigger, supabase/tests/00_auth_stub.sql (TEST-HARNESS reconstruction only) |
| `table:public.subscriptions` | harness | `definition_mismatch` | Edge stripe-webhook (best-effort), protect_admin_subscriptions trigger, supabase/tests/00_auth_stub.sql (TEST-HARNESS reconstruction only) |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | — |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | — |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | — |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | — |
| `grant:table:public.export_files` | harness | `grant_mismatch` | — |
| `grant:table:public.export_files` | harness | `grant_mismatch` | — |
| `grant:table:public.export_files` | harness | `grant_mismatch` | — |
| `grant:table:public.export_files` | harness | `grant_mismatch` | — |
| `grant:table:public.export_files` | harness | `grant_mismatch` | — |
| `grant:table:public.export_files` | harness | `grant_mismatch` | — |
| `grant:table:public.export_files` | harness | `grant_mismatch` | — |
| `grant:table:public.export_files` | harness | `grant_mismatch` | — |
| `grant:table:public.export_files` | harness | `grant_mismatch` | — |
| `grant:table:public.export_files` | harness | `grant_mismatch` | — |
| `grant:table:public.export_files` | harness | `grant_mismatch` | — |
| `grant:table:public.export_files` | harness | `grant_mismatch` | — |
| `grant:table:public.export_files` | harness | `grant_mismatch` | — |
| `grant:table:public.export_files` | harness | `grant_mismatch` | — |
| `grant:table:public.export_files` | harness | `grant_mismatch` | — |
| `grant:table:public.export_files` | harness | `grant_mismatch` | — |
| `grant:table:public.export_files` | harness | `grant_mismatch` | — |
| `grant:table:public.export_files` | harness | `grant_mismatch` | — |
| `grant:table:public.export_files` | harness | `grant_mismatch` | — |
| `grant:table:public.export_files` | harness | `grant_mismatch` | — |
| `grant:table:public.export_files` | harness | `grant_mismatch` | — |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | — |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | — |
| `grant:table:public.profiles` | harness | `grant_mismatch` | — |
| `grant:table:public.profiles` | harness | `grant_mismatch` | — |
| `grant:table:public.profiles` | harness | `grant_mismatch` | — |
| `grant:table:public.profiles` | harness | `grant_mismatch` | — |
| `grant:table:public.profiles` | harness | `grant_mismatch` | — |
| `grant:table:public.profiles` | harness | `grant_mismatch` | — |
| `grant:table:public.profiles` | harness | `grant_mismatch` | — |
| `grant:table:public.profiles` | harness | `grant_mismatch` | — |
| `grant:table:public.profiles` | harness | `grant_mismatch` | — |
| `grant:table:public.profiles` | harness | `grant_mismatch` | — |
| `grant:table:public.profiles` | harness | `grant_mismatch` | — |
| `grant:table:public.profiles` | harness | `grant_mismatch` | — |
| `grant:table:public.profiles` | harness | `grant_mismatch` | — |
| `grant:table:public.profiles` | harness | `grant_mismatch` | — |
| `grant:table:public.profiles` | harness | `grant_mismatch` | — |
| `grant:table:public.profiles` | harness | `grant_mismatch` | — |
| `grant:table:public.profiles` | harness | `grant_mismatch` | — |
| `grant:table:public.profiles` | harness | `grant_mismatch` | — |
| `grant:table:public.profiles` | harness | `grant_mismatch` | — |
| `grant:table:public.profiles` | harness | `grant_mismatch` | — |
| `grant:table:public.profiles` | harness | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | harness | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | harness | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | harness | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | harness | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | harness | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | harness | `grant_mismatch` | — |
| `grant:table:public.subscriptions` | harness | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | — |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | — |
| `table:public.admin_bootstrap_tokens` | types_vs_production | `generated_types_mismatch` | Bootstrap RPCs, Epic 1 SQL tests |

## All classified findings

| Object | Surface | Class | High priority |
|---|---|---|---|
| `table:public.admin_audit_log` | migration_only | `repo_missing_production_object` |  |
| `table:public.admin_bootstrap_tokens` | migration_only | `repo_missing_production_object` | yes |
| `table:public.billing` | migration_only | `definition_mismatch` |  |
| `table:public.comparison_shares` | migration_only | `repo_missing_production_object` | yes |
| `table:public.entitlement_bypass_log` | migration_only | `repo_missing_production_object` |  |
| `table:public.export_files` | migration_only | `repo_missing_production_object` | yes |
| `table:public.export_shares` | migration_only | `repo_missing_production_object` | yes |
| `table:public.pdf_exports` | migration_only | `repo_missing_production_object` | yes |
| `table:public.profiles` | migration_only | `definition_mismatch` | yes |
| `table:public.stripe_webhook_events` | migration_only | `repo_missing_production_object` |  |
| `table:public.subscriptions` | migration_only | `repo_missing_production_object` | yes |
| `table:public.user_comparisons` | migration_only | `repo_missing_production_object` | yes |
| `table:storage.buckets` | migration_only | `policy_rls_mismatch` |  |
| `table:storage.buckets` | migration_only | `definition_mismatch` |  |
| `table:storage.buckets_analytics` | migration_only | `repo_missing_production_object` |  |
| `table:storage.buckets_vectors` | migration_only | `repo_missing_production_object` |  |
| `table:storage.migrations` | migration_only | `repo_missing_production_object` |  |
| `table:storage.objects` | migration_only | `definition_mismatch` |  |
| `table:storage.s3_multipart_uploads` | migration_only | `repo_missing_production_object` |  |
| `table:storage.s3_multipart_uploads_parts` | migration_only | `repo_missing_production_object` |  |
| `table:storage.vector_indexes` | migration_only | `repo_missing_production_object` |  |
| `enum:public.export_kind` | migration_only | `repo_missing_production_object` |  |
| `enum:public.export_status` | migration_only | `repo_missing_production_object` |  |
| `enum:storage.buckettype` | migration_only | `repo_missing_production_object` |  |
| `function:public.approve_advisor_request` | migration_only | `function_rpc_mismatch` | yes |
| `function:public.assert_export_source_owned_by_user` | migration_only | `repo_missing_production_object` |  |
| `function:public.assert_feature_allowed` | migration_only | `repo_missing_production_object` |  |
| `function:public.claim_admin_bootstrap` | migration_only | `repo_missing_production_object` | yes |
| `function:public.claim_stripe_webhook_event` | migration_only | `repo_missing_production_object` |  |
| `function:public.duplicate_scenario` | migration_only | `function_rpc_mismatch` |  |
| `function:public.enforce_comparison_write_entitlement` | migration_only | `repo_missing_production_object` |  |
| `function:public.enforce_scenario_write_entitlement` | migration_only | `repo_missing_production_object` |  |
| `function:public.enforce_user_comparison_ownership` | migration_only | `repo_missing_production_object` |  |
| `function:public.evaluate_entitlement` | migration_only | `repo_missing_production_object` |  |
| `function:public.feature_allowed` | migration_only | `repo_missing_production_object` |  |
| `function:public.generate_share_token` | migration_only | `repo_missing_production_object` |  |
| `function:public.get_effective_tier` | migration_only | `function_rpc_mismatch` |  |
| `function:public.is_professional_price` | migration_only | `repo_missing_production_object` |  |
| `function:public.issue_admin_bootstrap_token` | migration_only | `repo_missing_production_object` | yes |
| `function:public.list_admins` | migration_only | `repo_missing_production_object` |  |
| `function:public.list_recent_admin_promotions` | migration_only | `repo_missing_production_object` |  |
| `function:public.log_admin_entitlement_bypass` | migration_only | `repo_missing_production_object` |  |
| `function:public.log_webhook_admin_ignored` | migration_only | `repo_missing_production_object` |  |
| `function:public.maybe_log_admin_entitlement_write` | migration_only | `repo_missing_production_object` |  |
| `function:public.promote_to_admin` | migration_only | `repo_missing_production_object` |  |
| `function:public.protect_admin_subscriptions` | migration_only | `repo_missing_production_object` |  |
| `function:public.release_stripe_webhook_event` | migration_only | `repo_missing_production_object` |  |
| `function:public.resolve_plan_code` | migration_only | `repo_missing_production_object` |  |
| `function:public.set_pdf_exports_updated_at` | migration_only | `repo_missing_production_object` |  |
| `function:public.touch_comparison_share` | migration_only | `repo_missing_production_object` |  |
| `function:public.validate_comparison_share` | migration_only | `repo_missing_production_object` |  |
| `function:storage.allow_any_operation` | migration_only | `repo_missing_production_object` |  |
| `function:storage.allow_only_operation` | migration_only | `repo_missing_production_object` |  |
| `function:storage.can_insert_object` | migration_only | `repo_missing_production_object` |  |
| `function:storage.enforce_bucket_name_length` | migration_only | `repo_missing_production_object` |  |
| `function:storage.extension` | migration_only | `repo_missing_production_object` |  |
| `function:storage.filename` | migration_only | `repo_missing_production_object` |  |
| `function:storage.foldername` | migration_only | `function_rpc_mismatch` |  |
| `function:storage.get_common_prefix` | migration_only | `repo_missing_production_object` |  |
| `function:storage.get_size_by_bucket` | migration_only | `repo_missing_production_object` |  |
| `function:storage.list_multipart_uploads_with_delimiter` | migration_only | `repo_missing_production_object` |  |
| `function:storage.list_objects_with_delimiter` | migration_only | `repo_missing_production_object` |  |
| `function:storage.operation` | migration_only | `repo_missing_production_object` |  |
| `function:storage.protect_delete` | migration_only | `repo_missing_production_object` |  |
| `function:storage.search` | migration_only | `repo_missing_production_object` |  |
| `function:storage.search_by_timestamp` | migration_only | `repo_missing_production_object` |  |
| `function:storage.search_v2` | migration_only | `repo_missing_production_object` |  |
| `function:storage.update_updated_at_column` | migration_only | `repo_missing_production_object` |  |
| `function:public.armor` | migration_only | `production_missing_repo_object` |  |
| `function:public.armor` | migration_only | `production_missing_repo_object` |  |
| `function:public.crypt` | migration_only | `production_missing_repo_object` |  |
| `function:public.dearmor` | migration_only | `production_missing_repo_object` |  |
| `function:public.decrypt` | migration_only | `production_missing_repo_object` |  |
| `function:public.decrypt_iv` | migration_only | `production_missing_repo_object` |  |
| `function:public.digest` | migration_only | `production_missing_repo_object` |  |
| `function:public.digest` | migration_only | `production_missing_repo_object` |  |
| `function:public.encrypt` | migration_only | `production_missing_repo_object` |  |
| `function:public.encrypt_iv` | migration_only | `production_missing_repo_object` |  |
| `function:public.gen_random_bytes` | migration_only | `production_missing_repo_object` |  |
| `function:public.gen_random_uuid` | migration_only | `production_missing_repo_object` |  |
| `function:public.gen_salt` | migration_only | `production_missing_repo_object` |  |
| `function:public.gen_salt` | migration_only | `production_missing_repo_object` |  |
| `function:public.grant_admin_on_signup` | migration_only | `production_missing_repo_object` |  |
| `function:public.hmac` | migration_only | `production_missing_repo_object` |  |
| `function:public.hmac` | migration_only | `production_missing_repo_object` |  |
| `function:public.pgp_armor_headers` | migration_only | `production_missing_repo_object` |  |
| `function:public.pgp_key_id` | migration_only | `production_missing_repo_object` |  |
| `function:public.pgp_pub_decrypt` | migration_only | `production_missing_repo_object` |  |
| `function:public.pgp_pub_decrypt` | migration_only | `production_missing_repo_object` |  |
| `function:public.pgp_pub_decrypt` | migration_only | `production_missing_repo_object` |  |
| `function:public.pgp_pub_decrypt_bytea` | migration_only | `production_missing_repo_object` |  |
| `function:public.pgp_pub_decrypt_bytea` | migration_only | `production_missing_repo_object` |  |
| `function:public.pgp_pub_decrypt_bytea` | migration_only | `production_missing_repo_object` |  |
| `function:public.pgp_pub_encrypt` | migration_only | `production_missing_repo_object` |  |
| `function:public.pgp_pub_encrypt` | migration_only | `production_missing_repo_object` |  |
| `function:public.pgp_pub_encrypt_bytea` | migration_only | `production_missing_repo_object` |  |
| `function:public.pgp_pub_encrypt_bytea` | migration_only | `production_missing_repo_object` |  |
| `function:public.pgp_sym_decrypt` | migration_only | `production_missing_repo_object` |  |
| `function:public.pgp_sym_decrypt` | migration_only | `production_missing_repo_object` |  |
| `function:public.pgp_sym_decrypt_bytea` | migration_only | `production_missing_repo_object` |  |
| `function:public.pgp_sym_decrypt_bytea` | migration_only | `production_missing_repo_object` |  |
| `function:public.pgp_sym_encrypt` | migration_only | `production_missing_repo_object` |  |
| `function:public.pgp_sym_encrypt` | migration_only | `production_missing_repo_object` |  |
| `function:public.pgp_sym_encrypt_bytea` | migration_only | `production_missing_repo_object` |  |
| `function:public.pgp_sym_encrypt_bytea` | migration_only | `production_missing_repo_object` |  |
| `trigger:public.comparison_shares.trg_comparison_shares_updated_at` | migration_only | `repo_missing_production_object` |  |
| `trigger:public.pdf_exports.trg_pdf_exports_updated_at` | migration_only | `repo_missing_production_object` |  |
| `trigger:public.saved_comparisons.trg_enforce_comparison_write_entitlement_saved` | migration_only | `repo_missing_production_object` |  |
| `trigger:public.scenarios.trg_enforce_scenario_write_entitlement` | migration_only | `repo_missing_production_object` |  |
| `trigger:public.subscriptions.trg_protect_admin_subscriptions_ins` | migration_only | `repo_missing_production_object` |  |
| `trigger:public.subscriptions.trg_protect_admin_subscriptions_upd` | migration_only | `repo_missing_production_object` |  |
| `trigger:public.subscriptions.update_subscriptions_updated_at` | migration_only | `repo_missing_production_object` |  |
| `trigger:public.user_comparisons.trg_enforce_comparison_write_entitlement` | migration_only | `repo_missing_production_object` |  |
| `trigger:public.user_comparisons.trg_enforce_user_comparison_ownership` | migration_only | `repo_missing_production_object` |  |
| `trigger:public.user_comparisons.update_user_comparisons_updated_at` | migration_only | `repo_missing_production_object` |  |
| `trigger:storage.buckets.enforce_bucket_name_length_trigger` | migration_only | `repo_missing_production_object` |  |
| `trigger:storage.buckets.protect_buckets_delete` | migration_only | `repo_missing_production_object` |  |
| `trigger:storage.objects.protect_objects_delete` | migration_only | `repo_missing_production_object` |  |
| `trigger:storage.objects.update_objects_updated_at` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.admin_audit_log.admin_audit_log_pkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.admin_bootstrap_tokens.admin_bootstrap_tokens_pkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.admin_bootstrap_tokens.admin_bootstrap_tokens_token_hash_key` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.admin_bootstrap_tokens.admin_bootstrap_tokens_used_by_fkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.comparison_shares.comparison_shares_comparison_id_fkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.comparison_shares.comparison_shares_created_by_fkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.comparison_shares.comparison_shares_permission_check` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.comparison_shares.comparison_shares_pkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.comparison_shares.comparison_shares_token_key` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.entitlement_bypass_log.entitlement_bypass_log_pkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.entitlement_bypass_log.entitlement_bypass_log_user_id_fkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.export_files.export_files_entity_type_check` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.export_files.export_files_pkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.export_shares.export_shares_export_file_id_fkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.export_shares.export_shares_permission_check` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.export_shares.export_shares_pkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.export_shares.export_shares_token_key` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.pdf_exports.pdf_exports_pkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.pdf_exports.pdf_exports_share_token_key` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.pdf_exports.pdf_exports_share_token_length` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.profiles.profiles_stripe_customer_id_key` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.scenarios.scenarios_scenario_type_check` | migration_only | `constraint_index_mismatch` |  |
| `constraint:public.stripe_webhook_events.stripe_webhook_events_app_user_id_fkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.stripe_webhook_events.stripe_webhook_events_pkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.subscriptions.subscriptions_pkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.subscriptions.subscriptions_stripe_subscription_id_key` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.subscriptions.subscriptions_user_id_fkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.user_comparisons.different_scenario_c` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.user_comparisons.different_scenarios` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.user_comparisons.user_comparisons_pkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.user_comparisons.user_comparisons_scenario_a_id_fkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.user_comparisons.user_comparisons_scenario_b_id_fkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.user_comparisons.user_comparisons_scenario_c_id_fkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:public.user_comparisons.user_comparisons_user_id_fkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:storage.buckets_analytics.buckets_analytics_pkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:storage.buckets_vectors.buckets_vectors_pkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:storage.migrations.migrations_name_key` | migration_only | `repo_missing_production_object` |  |
| `constraint:storage.migrations.migrations_pkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:storage.objects.objects_bucketId_fkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:storage.s3_multipart_uploads.s3_multipart_uploads_bucket_id_fkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:storage.s3_multipart_uploads.s3_multipart_uploads_pkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:storage.s3_multipart_uploads_parts.s3_multipart_uploads_parts_bucket_id_fkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:storage.s3_multipart_uploads_parts.s3_multipart_uploads_parts_pkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:storage.s3_multipart_uploads_parts.s3_multipart_uploads_parts_upload_id_fkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:storage.vector_indexes.vector_indexes_bucket_id_fkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:storage.vector_indexes.vector_indexes_pkey` | migration_only | `repo_missing_production_object` |  |
| `constraint:storage.objects.objects_bucket_id_fkey` | migration_only | `production_missing_repo_object` |  |
| `index:public.admin_audit_log.admin_audit_log_pkey` | migration_only | `repo_missing_production_object` |  |
| `index:public.admin_audit_log.idx_admin_audit_log_action` | migration_only | `repo_missing_production_object` |  |
| `index:public.admin_audit_log.idx_admin_audit_log_created_at` | migration_only | `repo_missing_production_object` |  |
| `index:public.admin_audit_log.idx_admin_audit_log_target` | migration_only | `repo_missing_production_object` |  |
| `index:public.admin_bootstrap_tokens.admin_bootstrap_tokens_pkey` | migration_only | `repo_missing_production_object` |  |
| `index:public.admin_bootstrap_tokens.admin_bootstrap_tokens_token_hash_key` | migration_only | `repo_missing_production_object` |  |
| `index:public.comparison_shares.comparison_shares_pkey` | migration_only | `repo_missing_production_object` |  |
| `index:public.comparison_shares.comparison_shares_token_key` | migration_only | `repo_missing_production_object` |  |
| `index:public.entitlement_bypass_log.entitlement_bypass_log_pkey` | migration_only | `repo_missing_production_object` |  |
| `index:public.entitlement_bypass_log.entitlement_bypass_log_user_id_idx` | migration_only | `repo_missing_production_object` |  |
| `index:public.export_files.export_files_pkey` | migration_only | `repo_missing_production_object` |  |
| `index:public.export_files.idx_export_files_entity` | migration_only | `repo_missing_production_object` |  |
| `index:public.export_files.idx_export_files_entity_version` | migration_only | `repo_missing_production_object` |  |
| `index:public.export_files.idx_export_files_owner` | migration_only | `repo_missing_production_object` |  |
| `index:public.export_shares.export_shares_pkey` | migration_only | `repo_missing_production_object` |  |
| `index:public.export_shares.export_shares_token_key` | migration_only | `repo_missing_production_object` |  |
| `index:public.export_shares.idx_export_shares_file` | migration_only | `repo_missing_production_object` |  |
| `index:public.export_shares.idx_export_shares_token` | migration_only | `repo_missing_production_object` |  |
| `index:public.pdf_exports.pdf_exports_pkey` | migration_only | `repo_missing_production_object` |  |
| `index:public.pdf_exports.pdf_exports_share_token_key` | migration_only | `repo_missing_production_object` |  |
| `index:public.pdf_exports.pdf_exports_source_idx` | migration_only | `repo_missing_production_object` |  |
| `index:public.pdf_exports.pdf_exports_unique_ready_per_source` | migration_only | `repo_missing_production_object` |  |
| `index:public.pdf_exports.pdf_exports_user_id_idx` | migration_only | `repo_missing_production_object` |  |
| `index:public.profiles.idx_profiles_stripe_customer_id` | migration_only | `repo_missing_production_object` |  |
| `index:public.profiles.profiles_stripe_customer_id_key` | migration_only | `repo_missing_production_object` |  |
| `index:public.stripe_webhook_events.stripe_webhook_events_pkey` | migration_only | `repo_missing_production_object` |  |
| `index:public.stripe_webhook_events.stripe_webhook_events_processed_at_idx` | migration_only | `repo_missing_production_object` |  |
| `index:public.subscriptions.idx_subscriptions_stripe_subscription_id` | migration_only | `repo_missing_production_object` |  |
| `index:public.subscriptions.idx_subscriptions_user_id` | migration_only | `repo_missing_production_object` |  |
| `index:public.subscriptions.subscriptions_pkey` | migration_only | `repo_missing_production_object` |  |
| `index:public.subscriptions.subscriptions_stripe_subscription_id_key` | migration_only | `repo_missing_production_object` |  |
| `index:public.user_comparisons.idx_user_comparisons_created_at` | migration_only | `repo_missing_production_object` |  |
| `index:public.user_comparisons.idx_user_comparisons_scenario_c_id` | migration_only | `repo_missing_production_object` |  |
| `index:public.user_comparisons.idx_user_comparisons_user_id` | migration_only | `repo_missing_production_object` |  |
| `index:public.user_comparisons.user_comparisons_pkey` | migration_only | `repo_missing_production_object` |  |
| `index:storage.buckets.bname` | migration_only | `repo_missing_production_object` |  |
| `index:storage.buckets_analytics.buckets_analytics_pkey` | migration_only | `repo_missing_production_object` |  |
| `index:storage.buckets_analytics.buckets_analytics_unique_name_idx` | migration_only | `repo_missing_production_object` |  |
| `index:storage.buckets_vectors.buckets_vectors_pkey` | migration_only | `repo_missing_production_object` |  |
| `index:storage.migrations.migrations_name_key` | migration_only | `repo_missing_production_object` |  |
| `index:storage.migrations.migrations_pkey` | migration_only | `repo_missing_production_object` |  |
| `index:storage.objects.bucketid_objname` | migration_only | `repo_missing_production_object` |  |
| `index:storage.objects.idx_objects_bucket_id_name` | migration_only | `repo_missing_production_object` |  |
| `index:storage.objects.idx_objects_bucket_id_name_lower` | migration_only | `repo_missing_production_object` |  |
| `index:storage.objects.name_prefix_search` | migration_only | `repo_missing_production_object` |  |
| `index:storage.s3_multipart_uploads.idx_multipart_uploads_list` | migration_only | `repo_missing_production_object` |  |
| `index:storage.s3_multipart_uploads.s3_multipart_uploads_pkey` | migration_only | `repo_missing_production_object` |  |
| `index:storage.s3_multipart_uploads_parts.s3_multipart_uploads_parts_pkey` | migration_only | `repo_missing_production_object` |  |
| `index:storage.vector_indexes.vector_indexes_name_bucket_id_idx` | migration_only | `repo_missing_production_object` |  |
| `index:storage.vector_indexes.vector_indexes_pkey` | migration_only | `repo_missing_production_object` |  |
| `policy:public.admin_audit_log.admin_audit_log_select_admin` | migration_only | `repo_missing_production_object` |  |
| `policy:public.comparison_shares.comparison_shares_delete_owner` | migration_only | `repo_missing_production_object` |  |
| `policy:public.comparison_shares.comparison_shares_insert_owner` | migration_only | `repo_missing_production_object` |  |
| `policy:public.comparison_shares.comparison_shares_select_owner` | migration_only | `repo_missing_production_object` |  |
| `policy:public.comparison_shares.comparison_shares_update_owner` | migration_only | `repo_missing_production_object` |  |
| `policy:public.export_files.export_files_delete_own` | migration_only | `repo_missing_production_object` |  |
| `policy:public.export_files.export_files_insert_own` | migration_only | `repo_missing_production_object` |  |
| `policy:public.export_files.export_files_select_own` | migration_only | `repo_missing_production_object` |  |
| `policy:public.export_shares.export_shares_delete_own` | migration_only | `repo_missing_production_object` |  |
| `policy:public.export_shares.export_shares_insert_own` | migration_only | `repo_missing_production_object` |  |
| `policy:public.export_shares.export_shares_select_own` | migration_only | `repo_missing_production_object` |  |
| `policy:public.export_shares.export_shares_update_own` | migration_only | `repo_missing_production_object` |  |
| `policy:public.pdf_exports.pdf_exports_delete_own` | migration_only | `repo_missing_production_object` |  |
| `policy:public.pdf_exports.pdf_exports_insert_own` | migration_only | `repo_missing_production_object` |  |
| `policy:public.pdf_exports.pdf_exports_select_own` | migration_only | `repo_missing_production_object` |  |
| `policy:public.pdf_exports.pdf_exports_update_own` | migration_only | `repo_missing_production_object` |  |
| `policy:public.subscriptions.subscriptions_select_own` | migration_only | `repo_missing_production_object` |  |
| `policy:public.user_comparisons.Users can create their own comparisons` | migration_only | `repo_missing_production_object` |  |
| `policy:public.user_comparisons.Users can delete their own comparisons` | migration_only | `repo_missing_production_object` |  |
| `policy:public.user_comparisons.Users can update their own comparisons` | migration_only | `repo_missing_production_object` |  |
| `policy:public.user_comparisons.Users can view their own comparisons` | migration_only | `repo_missing_production_object` |  |
| `policy:storage.objects.exports_bucket_insert_own_folder` | migration_only | `repo_missing_production_object` |  |
| `policy:storage.objects.exports_bucket_read_own_folder` | migration_only | `repo_missing_production_object` |  |
| `policy:storage.objects.exports_bucket_update_own_folder` | migration_only | `repo_missing_production_object` |  |
| `policy:storage.objects.exports_delete_own` | migration_only | `repo_missing_production_object` |  |
| `policy:storage.objects.exports_insert_own` | migration_only | `repo_missing_production_object` |  |
| `policy:storage.objects.exports_select_own` | migration_only | `repo_missing_production_object` |  |
| `grant:function:public.approve_advisor_request(request_id uuid, approve boolean)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.approve_advisor_request(request_id uuid, approve boolean)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.approve_advisor_request(request_id uuid, approve boolean)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.armor(bytea)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.armor(bytea)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.armor(bytea)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.armor(bytea)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.armor(bytea, text[], text[])` | migration_only | `grant_mismatch` |  |
| `grant:function:public.armor(bytea, text[], text[])` | migration_only | `grant_mismatch` |  |
| `grant:function:public.armor(bytea, text[], text[])` | migration_only | `grant_mismatch` |  |
| `grant:function:public.armor(bytea, text[], text[])` | migration_only | `grant_mismatch` |  |
| `grant:function:public.assert_export_source_owned_by_user(p_kind export_kind, p_source_id uuid, p_user_id uuid)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.assert_export_source_owned_by_user(p_kind export_kind, p_source_id uuid, p_user_id uuid)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.assert_export_source_owned_by_user(p_kind export_kind, p_source_id uuid, p_user_id uuid)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.assert_feature_allowed(p_feature text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.assert_feature_allowed(p_feature text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.assert_feature_allowed(p_feature text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.claim_admin_bootstrap(p_token text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.claim_admin_bootstrap(p_token text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.claim_admin_bootstrap(p_token text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.claim_stripe_webhook_event(p_event_id text, p_event_type text, p_stripe_customer_id text, p_app_user_id uuid, p_action_taken text, p_details jsonb)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.claim_stripe_webhook_event(p_event_id text, p_event_type text, p_stripe_customer_id text, p_app_user_id uuid, p_action_taken text, p_details jsonb)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.crypt(text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.crypt(text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.crypt(text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.crypt(text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.dearmor(text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.dearmor(text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.dearmor(text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.dearmor(text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.decrypt(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.decrypt(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.decrypt(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.decrypt(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.decrypt_iv(bytea, bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.decrypt_iv(bytea, bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.decrypt_iv(bytea, bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.decrypt_iv(bytea, bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.digest(bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.digest(bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.digest(bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.digest(bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.digest(text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.digest(text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.digest(text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.digest(text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.duplicate_scenario(source_scenario_id uuid, new_name text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.encrypt(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.encrypt(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.encrypt(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.encrypt(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.encrypt_iv(bytea, bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.encrypt_iv(bytea, bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.encrypt_iv(bytea, bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.encrypt_iv(bytea, bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.enforce_comparison_write_entitlement()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.enforce_comparison_write_entitlement()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.enforce_scenario_write_entitlement()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.enforce_scenario_write_entitlement()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.enforce_user_comparison_ownership()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.enforce_user_comparison_ownership()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.evaluate_entitlement(p_user_id uuid)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.evaluate_entitlement(p_user_id uuid)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.evaluate_entitlement(p_user_id uuid)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.feature_allowed(p_user_id uuid, p_feature text, p_scenario_count integer)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.feature_allowed(p_user_id uuid, p_feature text, p_scenario_count integer)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.feature_allowed(p_user_id uuid, p_feature text, p_scenario_count integer)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.gen_random_bytes(integer)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.gen_random_bytes(integer)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.gen_random_bytes(integer)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.gen_random_bytes(integer)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.gen_random_uuid()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.gen_random_uuid()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.gen_random_uuid()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.gen_random_uuid()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.gen_salt(text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.gen_salt(text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.gen_salt(text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.gen_salt(text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.gen_salt(text, integer)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.gen_salt(text, integer)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.gen_salt(text, integer)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.gen_salt(text, integer)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.generate_share_token()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.generate_share_token()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.generate_share_token()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.generate_share_token()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.generate_share_token()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.get_effective_tier(target_user_id uuid)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.get_effective_tier(target_user_id uuid)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.get_effective_tier(target_user_id uuid)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.grant_admin_on_signup()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.grant_admin_on_signup()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.handle_new_user()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.handle_new_user()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.handle_new_user()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.has_role(_user_id uuid, _role app_role)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.has_role(_user_id uuid, _role app_role)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.has_role(_user_id uuid, _role app_role)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.hmac(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.hmac(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.hmac(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.hmac(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.hmac(text, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.hmac(text, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.hmac(text, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.hmac(text, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.is_admin(uid uuid)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.is_admin(uid uuid)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.is_admin(uid uuid)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.is_advisor(uid uuid)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.is_advisor(uid uuid)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.is_advisor(uid uuid)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.is_professional_price(p_price_id text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.is_professional_price(p_price_id text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.is_professional_price(p_price_id text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.is_professional_price(p_price_id text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.is_professional_price(p_price_id text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.issue_admin_bootstrap_token(p_ttl_minutes integer)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.issue_admin_bootstrap_token(p_ttl_minutes integer)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.list_admins()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.list_admins()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.list_admins()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.list_admins()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.list_admins()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.list_pending_advisor_requests()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.list_pending_advisor_requests()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.list_pending_advisor_requests()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.list_recent_admin_promotions(p_limit integer)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.list_recent_admin_promotions(p_limit integer)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.list_recent_admin_promotions(p_limit integer)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.list_recent_admin_promotions(p_limit integer)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.list_recent_admin_promotions(p_limit integer)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.log_admin_entitlement_bypass(p_user_id uuid, p_source text, p_feature text, p_details jsonb)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.log_admin_entitlement_bypass(p_user_id uuid, p_source text, p_feature text, p_details jsonb)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.log_webhook_admin_ignored(p_user_id uuid, p_email text, p_event_type text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.log_webhook_admin_ignored(p_user_id uuid, p_email text, p_event_type text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.log_webhook_admin_ignored(p_user_id uuid, p_email text, p_event_type text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.log_webhook_admin_ignored(p_user_id uuid, p_email text, p_event_type text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.maybe_log_admin_entitlement_write(p_user_id uuid, p_source text, p_feature text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.maybe_log_admin_entitlement_write(p_user_id uuid, p_source text, p_feature text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.normalize_admin_billing_insert()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.normalize_admin_billing_insert()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.normalize_admin_billing_insert()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_armor_headers(text, OUT key text, OUT value text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_armor_headers(text, OUT key text, OUT value text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_armor_headers(text, OUT key text, OUT value text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_armor_headers(text, OUT key text, OUT value text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_key_id(bytea)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_key_id(bytea)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_key_id(bytea)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_key_id(bytea)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt(bytea, bytea)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt(bytea, bytea)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt(bytea, bytea)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt(bytea, bytea)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt(bytea, bytea, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt(bytea, bytea, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt(bytea, bytea, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt(bytea, bytea, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt_bytea(bytea, bytea)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt_bytea(bytea, bytea)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt_bytea(bytea, bytea)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt_bytea(bytea, bytea)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt_bytea(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt_bytea(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt_bytea(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt_bytea(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt_bytea(bytea, bytea, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt_bytea(bytea, bytea, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt_bytea(bytea, bytea, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt_bytea(bytea, bytea, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt(text, bytea)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt(text, bytea)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt(text, bytea)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt(text, bytea)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt(text, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt(text, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt(text, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt(text, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt_bytea(bytea, bytea)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt_bytea(bytea, bytea)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt_bytea(bytea, bytea)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt_bytea(bytea, bytea)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt_bytea(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt_bytea(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt_bytea(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt_bytea(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt(bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt(bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt(bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt(bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt(bytea, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt(bytea, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt(bytea, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt(bytea, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt_bytea(bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt_bytea(bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt_bytea(bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt_bytea(bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt_bytea(bytea, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt_bytea(bytea, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt_bytea(bytea, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt_bytea(bytea, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt(text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt(text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt(text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt(text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt(text, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt(text, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt(text, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt(text, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt_bytea(bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt_bytea(bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt_bytea(bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt_bytea(bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt_bytea(bytea, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt_bytea(bytea, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt_bytea(bytea, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt_bytea(bytea, text, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.promote_to_admin(p_email text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.promote_to_admin(p_email text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.promote_to_admin(p_email text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.promote_to_admin(p_email text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.promote_to_admin(p_email text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.protect_admin_billing()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.protect_admin_billing()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.protect_admin_billing()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.protect_admin_role_deletion()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.protect_admin_role_deletion()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.protect_admin_role_deletion()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.protect_admin_subscriptions()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.protect_admin_subscriptions()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.protect_admin_subscriptions()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.protect_admin_subscriptions()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.release_stripe_webhook_event(p_event_id text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.release_stripe_webhook_event(p_event_id text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.resolve_plan_code(p_price_id text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.resolve_plan_code(p_price_id text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.resolve_plan_code(p_price_id text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.resolve_plan_code(p_price_id text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.resolve_plan_code(p_price_id text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.set_pdf_exports_updated_at()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.set_pdf_exports_updated_at()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.set_pdf_exports_updated_at()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.set_pdf_exports_updated_at()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.set_pdf_exports_updated_at()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.tg_set_billing_updated_at()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.tg_set_billing_updated_at()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.tg_set_billing_updated_at()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.tg_set_comparison_version_number()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.tg_set_comparison_version_number()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.tg_set_comparison_version_number()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.tg_set_scenarios_updated_at()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.tg_set_scenarios_updated_at()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.tg_set_scenarios_updated_at()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.tg_set_updated_at()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.tg_set_updated_at()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.tg_set_updated_at()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.touch_comparison_share(p_token text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.touch_comparison_share(p_token text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.touch_comparison_share(p_token text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.touch_comparison_share(p_token text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.validate_comparison_share(p_token text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.validate_comparison_share(p_token text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.validate_comparison_share(p_token text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.validate_comparison_share(p_token text)` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.billing` | migration_only | `grant_mismatch` |  |
| `grant:table:public.billing` | migration_only | `grant_mismatch` |  |
| `grant:table:public.billing` | migration_only | `grant_mismatch` |  |
| `grant:table:public.billing` | migration_only | `grant_mismatch` |  |
| `grant:table:public.billing` | migration_only | `grant_mismatch` |  |
| `grant:table:public.billing` | migration_only | `grant_mismatch` |  |
| `grant:table:public.billing` | migration_only | `grant_mismatch` |  |
| `grant:table:public.billing` | migration_only | `grant_mismatch` |  |
| `grant:table:public.billing` | migration_only | `grant_mismatch` |  |
| `grant:table:public.billing` | migration_only | `grant_mismatch` |  |
| `grant:table:public.billing` | migration_only | `grant_mismatch` |  |
| `grant:table:public.billing` | migration_only | `grant_mismatch` |  |
| `grant:table:public.billing` | migration_only | `grant_mismatch` |  |
| `grant:table:public.billing` | migration_only | `grant_mismatch` |  |
| `grant:table:public.billing` | migration_only | `grant_mismatch` |  |
| `grant:table:public.billing` | migration_only | `grant_mismatch` |  |
| `grant:table:public.billing` | migration_only | `grant_mismatch` |  |
| `grant:table:public.billing` | migration_only | `grant_mismatch` |  |
| `grant:table:public.billing` | migration_only | `grant_mismatch` |  |
| `grant:table:public.billing` | migration_only | `grant_mismatch` |  |
| `grant:table:public.billing` | migration_only | `grant_mismatch` |  |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.contact_messages` | migration_only | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | migration_only | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | migration_only | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | migration_only | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | migration_only | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | migration_only | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | migration_only | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | migration_only | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | migration_only | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | migration_only | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | migration_only | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | migration_only | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | migration_only | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | migration_only | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | migration_only | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | migration_only | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | migration_only | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | migration_only | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | migration_only | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | migration_only | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | migration_only | `grant_mismatch` |  |
| `grant:table:public.entitlement_bypass_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.entitlement_bypass_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.entitlement_bypass_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.entitlement_bypass_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.entitlement_bypass_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.entitlement_bypass_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.entitlement_bypass_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.entitlement_bypass_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.entitlement_bypass_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.entitlement_bypass_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.entitlement_bypass_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.entitlement_bypass_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.entitlement_bypass_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.entitlement_bypass_log` | migration_only | `grant_mismatch` |  |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_files` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.profiles` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.scenarios` | migration_only | `grant_mismatch` |  |
| `grant:table:public.scenarios` | migration_only | `grant_mismatch` |  |
| `grant:table:public.scenarios` | migration_only | `grant_mismatch` |  |
| `grant:table:public.scenarios` | migration_only | `grant_mismatch` |  |
| `grant:table:public.scenarios` | migration_only | `grant_mismatch` |  |
| `grant:table:public.scenarios` | migration_only | `grant_mismatch` |  |
| `grant:table:public.scenarios` | migration_only | `grant_mismatch` |  |
| `grant:table:public.scenarios` | migration_only | `grant_mismatch` |  |
| `grant:table:public.scenarios` | migration_only | `grant_mismatch` |  |
| `grant:table:public.scenarios` | migration_only | `grant_mismatch` |  |
| `grant:table:public.scenarios` | migration_only | `grant_mismatch` |  |
| `grant:table:public.scenarios` | migration_only | `grant_mismatch` |  |
| `grant:table:public.scenarios` | migration_only | `grant_mismatch` |  |
| `grant:table:public.scenarios` | migration_only | `grant_mismatch` |  |
| `grant:table:public.scenarios` | migration_only | `grant_mismatch` |  |
| `grant:table:public.scenarios` | migration_only | `grant_mismatch` |  |
| `grant:table:public.scenarios` | migration_only | `grant_mismatch` |  |
| `grant:table:public.scenarios` | migration_only | `grant_mismatch` |  |
| `grant:table:public.scenarios` | migration_only | `grant_mismatch` |  |
| `grant:table:public.scenarios` | migration_only | `grant_mismatch` |  |
| `grant:table:public.scenarios` | migration_only | `grant_mismatch` |  |
| `grant:table:public.stripe_webhook_events` | migration_only | `grant_mismatch` |  |
| `grant:table:public.stripe_webhook_events` | migration_only | `grant_mismatch` |  |
| `grant:table:public.stripe_webhook_events` | migration_only | `grant_mismatch` |  |
| `grant:table:public.stripe_webhook_events` | migration_only | `grant_mismatch` |  |
| `grant:table:public.stripe_webhook_events` | migration_only | `grant_mismatch` |  |
| `grant:table:public.stripe_webhook_events` | migration_only | `grant_mismatch` |  |
| `grant:table:public.stripe_webhook_events` | migration_only | `grant_mismatch` |  |
| `grant:table:public.stripe_webhook_events` | migration_only | `grant_mismatch` |  |
| `grant:table:public.stripe_webhook_events` | migration_only | `grant_mismatch` |  |
| `grant:table:public.stripe_webhook_events` | migration_only | `grant_mismatch` |  |
| `grant:table:public.stripe_webhook_events` | migration_only | `grant_mismatch` |  |
| `grant:table:public.stripe_webhook_events` | migration_only | `grant_mismatch` |  |
| `grant:table:public.stripe_webhook_events` | migration_only | `grant_mismatch` |  |
| `grant:table:public.stripe_webhook_events` | migration_only | `grant_mismatch` |  |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | migration_only | `grant_mismatch` | yes |
| `grant:table:public.user_roles` | migration_only | `grant_mismatch` |  |
| `grant:table:public.user_roles` | migration_only | `grant_mismatch` |  |
| `grant:table:public.user_roles` | migration_only | `grant_mismatch` |  |
| `grant:table:public.user_roles` | migration_only | `grant_mismatch` |  |
| `grant:table:public.user_roles` | migration_only | `grant_mismatch` |  |
| `grant:table:public.user_roles` | migration_only | `grant_mismatch` |  |
| `grant:table:public.user_roles` | migration_only | `grant_mismatch` |  |
| `grant:table:public.user_roles` | migration_only | `grant_mismatch` |  |
| `grant:table:public.user_roles` | migration_only | `grant_mismatch` |  |
| `grant:table:public.user_roles` | migration_only | `grant_mismatch` |  |
| `grant:table:public.user_roles` | migration_only | `grant_mismatch` |  |
| `grant:table:public.user_roles` | migration_only | `grant_mismatch` |  |
| `grant:table:public.user_roles` | migration_only | `grant_mismatch` |  |
| `grant:table:public.user_roles` | migration_only | `grant_mismatch` |  |
| `grant:table:public.user_roles` | migration_only | `grant_mismatch` |  |
| `grant:table:public.user_roles` | migration_only | `grant_mismatch` |  |
| `grant:table:public.user_roles` | migration_only | `grant_mismatch` |  |
| `grant:table:public.user_roles` | migration_only | `grant_mismatch` |  |
| `grant:table:public.user_roles` | migration_only | `grant_mismatch` |  |
| `grant:table:public.user_roles` | migration_only | `grant_mismatch` |  |
| `grant:table:public.user_roles` | migration_only | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | migration_only | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | migration_only | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | migration_only | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | migration_only | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | migration_only | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | migration_only | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | migration_only | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | migration_only | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | migration_only | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | migration_only | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | migration_only | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | migration_only | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | migration_only | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | migration_only | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | migration_only | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | migration_only | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | migration_only | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | migration_only | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | migration_only | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | migration_only | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.allow_any_operation(expected_operations text[])` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.allow_any_operation(expected_operations text[])` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.allow_only_operation(expected_operation text)` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.allow_only_operation(expected_operation text)` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb)` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb)` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.enforce_bucket_name_length()` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.enforce_bucket_name_length()` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.extension(name text)` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.extension(name text)` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.filename(name text)` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.filename(name text)` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.foldername(name text)` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.foldername(name text)` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text)` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text)` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.get_size_by_bucket()` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.get_size_by_bucket()` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text)` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text)` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text, sort_order text)` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text, sort_order text)` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.operation()` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.operation()` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.protect_delete()` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.protect_delete()` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text)` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text)` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text)` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text)` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text)` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text)` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.update_updated_at_column()` | migration_only | `grant_mismatch` |  |
| `grant:function:storage.update_updated_at_column()` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets_vectors` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets_vectors` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.buckets_vectors` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.objects` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.objects` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.objects` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.objects` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.objects` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.objects` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.objects` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.objects` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.objects` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.objects` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.objects` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.objects` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.objects` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.objects` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.objects` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.objects` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.objects` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.objects` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.objects` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.objects` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.objects` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads_parts` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads_parts` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads_parts` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads_parts` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads_parts` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads_parts` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads_parts` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads_parts` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads_parts` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.vector_indexes` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.vector_indexes` | migration_only | `grant_mismatch` |  |
| `grant:table:storage.vector_indexes` | migration_only | `grant_mismatch` |  |
| `table:public.profiles` | harness | `definition_mismatch` | yes |
| `table:public.subscriptions` | harness | `policy_rls_mismatch` | yes |
| `table:public.subscriptions` | harness | `definition_mismatch` | yes |
| `table:storage.buckets` | harness | `policy_rls_mismatch` |  |
| `table:storage.buckets` | harness | `definition_mismatch` |  |
| `table:storage.buckets_analytics` | harness | `repo_missing_production_object` |  |
| `table:storage.buckets_vectors` | harness | `repo_missing_production_object` |  |
| `table:storage.migrations` | harness | `repo_missing_production_object` |  |
| `table:storage.objects` | harness | `definition_mismatch` |  |
| `table:storage.s3_multipart_uploads` | harness | `repo_missing_production_object` |  |
| `table:storage.s3_multipart_uploads_parts` | harness | `repo_missing_production_object` |  |
| `table:storage.vector_indexes` | harness | `repo_missing_production_object` |  |
| `enum:storage.buckettype` | harness | `repo_missing_production_object` |  |
| `function:storage.allow_any_operation` | harness | `repo_missing_production_object` |  |
| `function:storage.allow_only_operation` | harness | `repo_missing_production_object` |  |
| `function:storage.can_insert_object` | harness | `repo_missing_production_object` |  |
| `function:storage.enforce_bucket_name_length` | harness | `repo_missing_production_object` |  |
| `function:storage.extension` | harness | `repo_missing_production_object` |  |
| `function:storage.filename` | harness | `repo_missing_production_object` |  |
| `function:storage.foldername` | harness | `function_rpc_mismatch` |  |
| `function:storage.get_common_prefix` | harness | `repo_missing_production_object` |  |
| `function:storage.get_size_by_bucket` | harness | `repo_missing_production_object` |  |
| `function:storage.list_multipart_uploads_with_delimiter` | harness | `repo_missing_production_object` |  |
| `function:storage.list_objects_with_delimiter` | harness | `repo_missing_production_object` |  |
| `function:storage.operation` | harness | `repo_missing_production_object` |  |
| `function:storage.protect_delete` | harness | `repo_missing_production_object` |  |
| `function:storage.search` | harness | `repo_missing_production_object` |  |
| `function:storage.search_by_timestamp` | harness | `repo_missing_production_object` |  |
| `function:storage.search_v2` | harness | `repo_missing_production_object` |  |
| `function:storage.update_updated_at_column` | harness | `repo_missing_production_object` |  |
| `function:public.armor` | harness | `production_missing_repo_object` |  |
| `function:public.armor` | harness | `production_missing_repo_object` |  |
| `function:public.crypt` | harness | `production_missing_repo_object` |  |
| `function:public.dearmor` | harness | `production_missing_repo_object` |  |
| `function:public.decrypt` | harness | `production_missing_repo_object` |  |
| `function:public.decrypt_iv` | harness | `production_missing_repo_object` |  |
| `function:public.digest` | harness | `production_missing_repo_object` |  |
| `function:public.digest` | harness | `production_missing_repo_object` |  |
| `function:public.encrypt` | harness | `production_missing_repo_object` |  |
| `function:public.encrypt_iv` | harness | `production_missing_repo_object` |  |
| `function:public.gen_random_bytes` | harness | `production_missing_repo_object` |  |
| `function:public.gen_random_uuid` | harness | `production_missing_repo_object` |  |
| `function:public.gen_salt` | harness | `production_missing_repo_object` |  |
| `function:public.gen_salt` | harness | `production_missing_repo_object` |  |
| `function:public.hmac` | harness | `production_missing_repo_object` |  |
| `function:public.hmac` | harness | `production_missing_repo_object` |  |
| `function:public.pgp_armor_headers` | harness | `production_missing_repo_object` |  |
| `function:public.pgp_key_id` | harness | `production_missing_repo_object` |  |
| `function:public.pgp_pub_decrypt` | harness | `production_missing_repo_object` |  |
| `function:public.pgp_pub_decrypt` | harness | `production_missing_repo_object` |  |
| `function:public.pgp_pub_decrypt` | harness | `production_missing_repo_object` |  |
| `function:public.pgp_pub_decrypt_bytea` | harness | `production_missing_repo_object` |  |
| `function:public.pgp_pub_decrypt_bytea` | harness | `production_missing_repo_object` |  |
| `function:public.pgp_pub_decrypt_bytea` | harness | `production_missing_repo_object` |  |
| `function:public.pgp_pub_encrypt` | harness | `production_missing_repo_object` |  |
| `function:public.pgp_pub_encrypt` | harness | `production_missing_repo_object` |  |
| `function:public.pgp_pub_encrypt_bytea` | harness | `production_missing_repo_object` |  |
| `function:public.pgp_pub_encrypt_bytea` | harness | `production_missing_repo_object` |  |
| `function:public.pgp_sym_decrypt` | harness | `production_missing_repo_object` |  |
| `function:public.pgp_sym_decrypt` | harness | `production_missing_repo_object` |  |
| `function:public.pgp_sym_decrypt_bytea` | harness | `production_missing_repo_object` |  |
| `function:public.pgp_sym_decrypt_bytea` | harness | `production_missing_repo_object` |  |
| `function:public.pgp_sym_encrypt` | harness | `production_missing_repo_object` |  |
| `function:public.pgp_sym_encrypt` | harness | `production_missing_repo_object` |  |
| `function:public.pgp_sym_encrypt_bytea` | harness | `production_missing_repo_object` |  |
| `function:public.pgp_sym_encrypt_bytea` | harness | `production_missing_repo_object` |  |
| `trigger:public.subscriptions.update_subscriptions_updated_at` | harness | `repo_missing_production_object` |  |
| `trigger:storage.buckets.enforce_bucket_name_length_trigger` | harness | `repo_missing_production_object` |  |
| `trigger:storage.buckets.protect_buckets_delete` | harness | `repo_missing_production_object` |  |
| `trigger:storage.objects.protect_objects_delete` | harness | `repo_missing_production_object` |  |
| `trigger:storage.objects.update_objects_updated_at` | harness | `repo_missing_production_object` |  |
| `constraint:public.profiles.profiles_stripe_customer_id_key` | harness | `repo_missing_production_object` |  |
| `constraint:storage.buckets_analytics.buckets_analytics_pkey` | harness | `repo_missing_production_object` |  |
| `constraint:storage.buckets_vectors.buckets_vectors_pkey` | harness | `repo_missing_production_object` |  |
| `constraint:storage.migrations.migrations_name_key` | harness | `repo_missing_production_object` |  |
| `constraint:storage.migrations.migrations_pkey` | harness | `repo_missing_production_object` |  |
| `constraint:storage.objects.objects_bucketId_fkey` | harness | `repo_missing_production_object` |  |
| `constraint:storage.s3_multipart_uploads.s3_multipart_uploads_bucket_id_fkey` | harness | `repo_missing_production_object` |  |
| `constraint:storage.s3_multipart_uploads.s3_multipart_uploads_pkey` | harness | `repo_missing_production_object` |  |
| `constraint:storage.s3_multipart_uploads_parts.s3_multipart_uploads_parts_bucket_id_fkey` | harness | `repo_missing_production_object` |  |
| `constraint:storage.s3_multipart_uploads_parts.s3_multipart_uploads_parts_pkey` | harness | `repo_missing_production_object` |  |
| `constraint:storage.s3_multipart_uploads_parts.s3_multipart_uploads_parts_upload_id_fkey` | harness | `repo_missing_production_object` |  |
| `constraint:storage.vector_indexes.vector_indexes_bucket_id_fkey` | harness | `repo_missing_production_object` |  |
| `constraint:storage.vector_indexes.vector_indexes_pkey` | harness | `repo_missing_production_object` |  |
| `constraint:storage.objects.objects_bucket_id_fkey` | harness | `production_missing_repo_object` |  |
| `index:public.profiles.idx_profiles_stripe_customer_id` | harness | `repo_missing_production_object` |  |
| `index:public.profiles.profiles_stripe_customer_id_key` | harness | `repo_missing_production_object` |  |
| `index:public.subscriptions.idx_subscriptions_stripe_subscription_id` | harness | `repo_missing_production_object` |  |
| `index:public.subscriptions.idx_subscriptions_user_id` | harness | `repo_missing_production_object` |  |
| `index:storage.buckets.bname` | harness | `repo_missing_production_object` |  |
| `index:storage.buckets_analytics.buckets_analytics_pkey` | harness | `repo_missing_production_object` |  |
| `index:storage.buckets_analytics.buckets_analytics_unique_name_idx` | harness | `repo_missing_production_object` |  |
| `index:storage.buckets_vectors.buckets_vectors_pkey` | harness | `repo_missing_production_object` |  |
| `index:storage.migrations.migrations_name_key` | harness | `repo_missing_production_object` |  |
| `index:storage.migrations.migrations_pkey` | harness | `repo_missing_production_object` |  |
| `index:storage.objects.bucketid_objname` | harness | `repo_missing_production_object` |  |
| `index:storage.objects.idx_objects_bucket_id_name` | harness | `repo_missing_production_object` |  |
| `index:storage.objects.idx_objects_bucket_id_name_lower` | harness | `repo_missing_production_object` |  |
| `index:storage.objects.name_prefix_search` | harness | `repo_missing_production_object` |  |
| `index:storage.s3_multipart_uploads.idx_multipart_uploads_list` | harness | `repo_missing_production_object` |  |
| `index:storage.s3_multipart_uploads.s3_multipart_uploads_pkey` | harness | `repo_missing_production_object` |  |
| `index:storage.s3_multipart_uploads_parts.s3_multipart_uploads_parts_pkey` | harness | `repo_missing_production_object` |  |
| `index:storage.vector_indexes.vector_indexes_name_bucket_id_idx` | harness | `repo_missing_production_object` |  |
| `index:storage.vector_indexes.vector_indexes_pkey` | harness | `repo_missing_production_object` |  |
| `index:public.subscriptions.subscriptions_user_id_idx` | harness | `production_missing_repo_object` |  |
| `policy:public.subscriptions.subscriptions_select_own` | harness | `repo_missing_production_object` |  |
| `grant:function:public.approve_advisor_request(request_id uuid, approve boolean)` | harness | `grant_mismatch` |  |
| `grant:function:public.approve_advisor_request(request_id uuid, approve boolean)` | harness | `grant_mismatch` |  |
| `grant:function:public.approve_advisor_request(request_id uuid, approve boolean)` | harness | `grant_mismatch` |  |
| `grant:function:public.armor(bytea)` | harness | `grant_mismatch` |  |
| `grant:function:public.armor(bytea)` | harness | `grant_mismatch` |  |
| `grant:function:public.armor(bytea)` | harness | `grant_mismatch` |  |
| `grant:function:public.armor(bytea)` | harness | `grant_mismatch` |  |
| `grant:function:public.armor(bytea, text[], text[])` | harness | `grant_mismatch` |  |
| `grant:function:public.armor(bytea, text[], text[])` | harness | `grant_mismatch` |  |
| `grant:function:public.armor(bytea, text[], text[])` | harness | `grant_mismatch` |  |
| `grant:function:public.armor(bytea, text[], text[])` | harness | `grant_mismatch` |  |
| `grant:function:public.crypt(text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.crypt(text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.crypt(text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.crypt(text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.dearmor(text)` | harness | `grant_mismatch` |  |
| `grant:function:public.dearmor(text)` | harness | `grant_mismatch` |  |
| `grant:function:public.dearmor(text)` | harness | `grant_mismatch` |  |
| `grant:function:public.dearmor(text)` | harness | `grant_mismatch` |  |
| `grant:function:public.decrypt(bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.decrypt(bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.decrypt(bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.decrypt(bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.decrypt_iv(bytea, bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.decrypt_iv(bytea, bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.decrypt_iv(bytea, bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.decrypt_iv(bytea, bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.digest(bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.digest(bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.digest(bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.digest(bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.digest(text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.digest(text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.digest(text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.digest(text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.encrypt(bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.encrypt(bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.encrypt(bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.encrypt(bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.encrypt_iv(bytea, bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.encrypt_iv(bytea, bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.encrypt_iv(bytea, bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.encrypt_iv(bytea, bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.enforce_comparison_write_entitlement()` | harness | `grant_mismatch` |  |
| `grant:function:public.enforce_scenario_write_entitlement()` | harness | `grant_mismatch` |  |
| `grant:function:public.enforce_user_comparison_ownership()` | harness | `grant_mismatch` |  |
| `grant:function:public.gen_random_bytes(integer)` | harness | `grant_mismatch` |  |
| `grant:function:public.gen_random_bytes(integer)` | harness | `grant_mismatch` |  |
| `grant:function:public.gen_random_bytes(integer)` | harness | `grant_mismatch` |  |
| `grant:function:public.gen_random_bytes(integer)` | harness | `grant_mismatch` |  |
| `grant:function:public.gen_random_uuid()` | harness | `grant_mismatch` |  |
| `grant:function:public.gen_random_uuid()` | harness | `grant_mismatch` |  |
| `grant:function:public.gen_random_uuid()` | harness | `grant_mismatch` |  |
| `grant:function:public.gen_random_uuid()` | harness | `grant_mismatch` |  |
| `grant:function:public.gen_salt(text)` | harness | `grant_mismatch` |  |
| `grant:function:public.gen_salt(text)` | harness | `grant_mismatch` |  |
| `grant:function:public.gen_salt(text)` | harness | `grant_mismatch` |  |
| `grant:function:public.gen_salt(text)` | harness | `grant_mismatch` |  |
| `grant:function:public.gen_salt(text, integer)` | harness | `grant_mismatch` |  |
| `grant:function:public.gen_salt(text, integer)` | harness | `grant_mismatch` |  |
| `grant:function:public.gen_salt(text, integer)` | harness | `grant_mismatch` |  |
| `grant:function:public.gen_salt(text, integer)` | harness | `grant_mismatch` |  |
| `grant:function:public.generate_share_token()` | harness | `grant_mismatch` |  |
| `grant:function:public.generate_share_token()` | harness | `grant_mismatch` |  |
| `grant:function:public.generate_share_token()` | harness | `grant_mismatch` |  |
| `grant:function:public.handle_new_user()` | harness | `grant_mismatch` |  |
| `grant:function:public.handle_new_user()` | harness | `grant_mismatch` |  |
| `grant:function:public.handle_new_user()` | harness | `grant_mismatch` |  |
| `grant:function:public.has_role(_user_id uuid, _role app_role)` | harness | `grant_mismatch` |  |
| `grant:function:public.has_role(_user_id uuid, _role app_role)` | harness | `grant_mismatch` |  |
| `grant:function:public.has_role(_user_id uuid, _role app_role)` | harness | `grant_mismatch` |  |
| `grant:function:public.hmac(bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.hmac(bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.hmac(bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.hmac(bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.hmac(text, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.hmac(text, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.hmac(text, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.hmac(text, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.is_admin(uid uuid)` | harness | `grant_mismatch` |  |
| `grant:function:public.is_admin(uid uuid)` | harness | `grant_mismatch` |  |
| `grant:function:public.is_admin(uid uuid)` | harness | `grant_mismatch` |  |
| `grant:function:public.is_advisor(uid uuid)` | harness | `grant_mismatch` |  |
| `grant:function:public.is_advisor(uid uuid)` | harness | `grant_mismatch` |  |
| `grant:function:public.is_advisor(uid uuid)` | harness | `grant_mismatch` |  |
| `grant:function:public.is_professional_price(p_price_id text)` | harness | `grant_mismatch` |  |
| `grant:function:public.is_professional_price(p_price_id text)` | harness | `grant_mismatch` |  |
| `grant:function:public.is_professional_price(p_price_id text)` | harness | `grant_mismatch` |  |
| `grant:function:public.list_admins()` | harness | `grant_mismatch` |  |
| `grant:function:public.list_admins()` | harness | `grant_mismatch` |  |
| `grant:function:public.list_pending_advisor_requests()` | harness | `grant_mismatch` |  |
| `grant:function:public.list_pending_advisor_requests()` | harness | `grant_mismatch` |  |
| `grant:function:public.list_pending_advisor_requests()` | harness | `grant_mismatch` |  |
| `grant:function:public.list_recent_admin_promotions(p_limit integer)` | harness | `grant_mismatch` |  |
| `grant:function:public.list_recent_admin_promotions(p_limit integer)` | harness | `grant_mismatch` |  |
| `grant:function:public.log_webhook_admin_ignored(p_user_id uuid, p_email text, p_event_type text)` | harness | `grant_mismatch` |  |
| `grant:function:public.log_webhook_admin_ignored(p_user_id uuid, p_email text, p_event_type text)` | harness | `grant_mismatch` |  |
| `grant:function:public.normalize_admin_billing_insert()` | harness | `grant_mismatch` |  |
| `grant:function:public.normalize_admin_billing_insert()` | harness | `grant_mismatch` |  |
| `grant:function:public.normalize_admin_billing_insert()` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_armor_headers(text, OUT key text, OUT value text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_armor_headers(text, OUT key text, OUT value text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_armor_headers(text, OUT key text, OUT value text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_armor_headers(text, OUT key text, OUT value text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_key_id(bytea)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_key_id(bytea)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_key_id(bytea)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_key_id(bytea)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt(bytea, bytea)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt(bytea, bytea)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt(bytea, bytea)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt(bytea, bytea)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt(bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt(bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt(bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt(bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt(bytea, bytea, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt(bytea, bytea, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt(bytea, bytea, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt(bytea, bytea, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt_bytea(bytea, bytea)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt_bytea(bytea, bytea)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt_bytea(bytea, bytea)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt_bytea(bytea, bytea)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt_bytea(bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt_bytea(bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt_bytea(bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt_bytea(bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt_bytea(bytea, bytea, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt_bytea(bytea, bytea, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt_bytea(bytea, bytea, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_decrypt_bytea(bytea, bytea, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt(text, bytea)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt(text, bytea)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt(text, bytea)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt(text, bytea)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt(text, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt(text, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt(text, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt(text, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt_bytea(bytea, bytea)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt_bytea(bytea, bytea)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt_bytea(bytea, bytea)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt_bytea(bytea, bytea)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt_bytea(bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt_bytea(bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt_bytea(bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_pub_encrypt_bytea(bytea, bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt(bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt(bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt(bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt(bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt(bytea, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt(bytea, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt(bytea, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt(bytea, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt_bytea(bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt_bytea(bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt_bytea(bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt_bytea(bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt_bytea(bytea, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt_bytea(bytea, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt_bytea(bytea, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_decrypt_bytea(bytea, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt(text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt(text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt(text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt(text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt(text, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt(text, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt(text, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt(text, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt_bytea(bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt_bytea(bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt_bytea(bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt_bytea(bytea, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt_bytea(bytea, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt_bytea(bytea, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt_bytea(bytea, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.pgp_sym_encrypt_bytea(bytea, text, text)` | harness | `grant_mismatch` |  |
| `grant:function:public.promote_to_admin(p_email text)` | harness | `grant_mismatch` |  |
| `grant:function:public.promote_to_admin(p_email text)` | harness | `grant_mismatch` |  |
| `grant:function:public.protect_admin_billing()` | harness | `grant_mismatch` |  |
| `grant:function:public.protect_admin_billing()` | harness | `grant_mismatch` |  |
| `grant:function:public.protect_admin_billing()` | harness | `grant_mismatch` |  |
| `grant:function:public.protect_admin_role_deletion()` | harness | `grant_mismatch` |  |
| `grant:function:public.protect_admin_role_deletion()` | harness | `grant_mismatch` |  |
| `grant:function:public.protect_admin_role_deletion()` | harness | `grant_mismatch` |  |
| `grant:function:public.protect_admin_subscriptions()` | harness | `grant_mismatch` |  |
| `grant:function:public.protect_admin_subscriptions()` | harness | `grant_mismatch` |  |
| `grant:function:public.resolve_plan_code(p_price_id text)` | harness | `grant_mismatch` |  |
| `grant:function:public.resolve_plan_code(p_price_id text)` | harness | `grant_mismatch` |  |
| `grant:function:public.resolve_plan_code(p_price_id text)` | harness | `grant_mismatch` |  |
| `grant:function:public.set_pdf_exports_updated_at()` | harness | `grant_mismatch` |  |
| `grant:function:public.set_pdf_exports_updated_at()` | harness | `grant_mismatch` |  |
| `grant:function:public.set_pdf_exports_updated_at()` | harness | `grant_mismatch` |  |
| `grant:function:public.tg_set_billing_updated_at()` | harness | `grant_mismatch` |  |
| `grant:function:public.tg_set_billing_updated_at()` | harness | `grant_mismatch` |  |
| `grant:function:public.tg_set_billing_updated_at()` | harness | `grant_mismatch` |  |
| `grant:function:public.tg_set_comparison_version_number()` | harness | `grant_mismatch` |  |
| `grant:function:public.tg_set_comparison_version_number()` | harness | `grant_mismatch` |  |
| `grant:function:public.tg_set_comparison_version_number()` | harness | `grant_mismatch` |  |
| `grant:function:public.tg_set_scenarios_updated_at()` | harness | `grant_mismatch` |  |
| `grant:function:public.tg_set_scenarios_updated_at()` | harness | `grant_mismatch` |  |
| `grant:function:public.tg_set_scenarios_updated_at()` | harness | `grant_mismatch` |  |
| `grant:function:public.tg_set_updated_at()` | harness | `grant_mismatch` |  |
| `grant:function:public.tg_set_updated_at()` | harness | `grant_mismatch` |  |
| `grant:function:public.tg_set_updated_at()` | harness | `grant_mismatch` |  |
| `grant:function:public.touch_comparison_share(p_token text)` | harness | `grant_mismatch` |  |
| `grant:function:public.validate_comparison_share(p_token text)` | harness | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | harness | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | harness | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | harness | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | harness | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | harness | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | harness | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | harness | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | harness | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | harness | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | harness | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | harness | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | harness | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | harness | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | harness | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | harness | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | harness | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | harness | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | harness | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | harness | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | harness | `grant_mismatch` |  |
| `grant:table:public.admin_audit_log` | harness | `grant_mismatch` |  |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | yes |
| `grant:table:public.admin_bootstrap_tokens` | harness | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | yes |
| `grant:table:public.advisor_access_requests` | harness | `grant_mismatch` | yes |
| `grant:table:public.billing` | harness | `grant_mismatch` |  |
| `grant:table:public.billing` | harness | `grant_mismatch` |  |
| `grant:table:public.billing` | harness | `grant_mismatch` |  |
| `grant:table:public.billing` | harness | `grant_mismatch` |  |
| `grant:table:public.billing` | harness | `grant_mismatch` |  |
| `grant:table:public.billing` | harness | `grant_mismatch` |  |
| `grant:table:public.billing` | harness | `grant_mismatch` |  |
| `grant:table:public.billing` | harness | `grant_mismatch` |  |
| `grant:table:public.billing` | harness | `grant_mismatch` |  |
| `grant:table:public.billing` | harness | `grant_mismatch` |  |
| `grant:table:public.billing` | harness | `grant_mismatch` |  |
| `grant:table:public.billing` | harness | `grant_mismatch` |  |
| `grant:table:public.billing` | harness | `grant_mismatch` |  |
| `grant:table:public.billing` | harness | `grant_mismatch` |  |
| `grant:table:public.billing` | harness | `grant_mismatch` |  |
| `grant:table:public.billing` | harness | `grant_mismatch` |  |
| `grant:table:public.billing` | harness | `grant_mismatch` |  |
| `grant:table:public.billing` | harness | `grant_mismatch` |  |
| `grant:table:public.billing` | harness | `grant_mismatch` |  |
| `grant:table:public.billing` | harness | `grant_mismatch` |  |
| `grant:table:public.billing` | harness | `grant_mismatch` |  |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_items` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | yes |
| `grant:table:public.comparison_versions` | harness | `grant_mismatch` | yes |
| `grant:table:public.contact_messages` | harness | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | harness | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | harness | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | harness | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | harness | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | harness | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | harness | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | harness | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | harness | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | harness | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | harness | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | harness | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | harness | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | harness | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | harness | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | harness | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | harness | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | harness | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | harness | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | harness | `grant_mismatch` |  |
| `grant:table:public.contact_messages` | harness | `grant_mismatch` |  |
| `grant:table:public.entitlement_bypass_log` | harness | `grant_mismatch` |  |
| `grant:table:public.entitlement_bypass_log` | harness | `grant_mismatch` |  |
| `grant:table:public.entitlement_bypass_log` | harness | `grant_mismatch` |  |
| `grant:table:public.entitlement_bypass_log` | harness | `grant_mismatch` |  |
| `grant:table:public.entitlement_bypass_log` | harness | `grant_mismatch` |  |
| `grant:table:public.entitlement_bypass_log` | harness | `grant_mismatch` |  |
| `grant:table:public.entitlement_bypass_log` | harness | `grant_mismatch` |  |
| `grant:table:public.export_files` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_files` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_files` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_files` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_files` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_files` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_files` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_files` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_files` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_files` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_files` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_files` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_files` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_files` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_files` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_files` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_files` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_files` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_files` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_files` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_files` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.export_shares` | harness | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | yes |
| `grant:table:public.pdf_exports` | harness | `grant_mismatch` | yes |
| `grant:table:public.profiles` | harness | `grant_mismatch` | yes |
| `grant:table:public.profiles` | harness | `grant_mismatch` | yes |
| `grant:table:public.profiles` | harness | `grant_mismatch` | yes |
| `grant:table:public.profiles` | harness | `grant_mismatch` | yes |
| `grant:table:public.profiles` | harness | `grant_mismatch` | yes |
| `grant:table:public.profiles` | harness | `grant_mismatch` | yes |
| `grant:table:public.profiles` | harness | `grant_mismatch` | yes |
| `grant:table:public.profiles` | harness | `grant_mismatch` | yes |
| `grant:table:public.profiles` | harness | `grant_mismatch` | yes |
| `grant:table:public.profiles` | harness | `grant_mismatch` | yes |
| `grant:table:public.profiles` | harness | `grant_mismatch` | yes |
| `grant:table:public.profiles` | harness | `grant_mismatch` | yes |
| `grant:table:public.profiles` | harness | `grant_mismatch` | yes |
| `grant:table:public.profiles` | harness | `grant_mismatch` | yes |
| `grant:table:public.profiles` | harness | `grant_mismatch` | yes |
| `grant:table:public.profiles` | harness | `grant_mismatch` | yes |
| `grant:table:public.profiles` | harness | `grant_mismatch` | yes |
| `grant:table:public.profiles` | harness | `grant_mismatch` | yes |
| `grant:table:public.profiles` | harness | `grant_mismatch` | yes |
| `grant:table:public.profiles` | harness | `grant_mismatch` | yes |
| `grant:table:public.profiles` | harness | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.saved_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.scenarios` | harness | `grant_mismatch` |  |
| `grant:table:public.scenarios` | harness | `grant_mismatch` |  |
| `grant:table:public.scenarios` | harness | `grant_mismatch` |  |
| `grant:table:public.scenarios` | harness | `grant_mismatch` |  |
| `grant:table:public.scenarios` | harness | `grant_mismatch` |  |
| `grant:table:public.scenarios` | harness | `grant_mismatch` |  |
| `grant:table:public.scenarios` | harness | `grant_mismatch` |  |
| `grant:table:public.scenarios` | harness | `grant_mismatch` |  |
| `grant:table:public.scenarios` | harness | `grant_mismatch` |  |
| `grant:table:public.scenarios` | harness | `grant_mismatch` |  |
| `grant:table:public.scenarios` | harness | `grant_mismatch` |  |
| `grant:table:public.scenarios` | harness | `grant_mismatch` |  |
| `grant:table:public.scenarios` | harness | `grant_mismatch` |  |
| `grant:table:public.scenarios` | harness | `grant_mismatch` |  |
| `grant:table:public.scenarios` | harness | `grant_mismatch` |  |
| `grant:table:public.scenarios` | harness | `grant_mismatch` |  |
| `grant:table:public.scenarios` | harness | `grant_mismatch` |  |
| `grant:table:public.scenarios` | harness | `grant_mismatch` |  |
| `grant:table:public.scenarios` | harness | `grant_mismatch` |  |
| `grant:table:public.scenarios` | harness | `grant_mismatch` |  |
| `grant:table:public.scenarios` | harness | `grant_mismatch` |  |
| `grant:table:public.stripe_webhook_events` | harness | `grant_mismatch` |  |
| `grant:table:public.stripe_webhook_events` | harness | `grant_mismatch` |  |
| `grant:table:public.stripe_webhook_events` | harness | `grant_mismatch` |  |
| `grant:table:public.stripe_webhook_events` | harness | `grant_mismatch` |  |
| `grant:table:public.stripe_webhook_events` | harness | `grant_mismatch` |  |
| `grant:table:public.stripe_webhook_events` | harness | `grant_mismatch` |  |
| `grant:table:public.stripe_webhook_events` | harness | `grant_mismatch` |  |
| `grant:table:public.subscriptions` | harness | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | harness | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | harness | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | harness | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | harness | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | harness | `grant_mismatch` | yes |
| `grant:table:public.subscriptions` | harness | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.user_comparisons` | harness | `grant_mismatch` | yes |
| `grant:table:public.user_roles` | harness | `grant_mismatch` |  |
| `grant:table:public.user_roles` | harness | `grant_mismatch` |  |
| `grant:table:public.user_roles` | harness | `grant_mismatch` |  |
| `grant:table:public.user_roles` | harness | `grant_mismatch` |  |
| `grant:table:public.user_roles` | harness | `grant_mismatch` |  |
| `grant:table:public.user_roles` | harness | `grant_mismatch` |  |
| `grant:table:public.user_roles` | harness | `grant_mismatch` |  |
| `grant:table:public.user_roles` | harness | `grant_mismatch` |  |
| `grant:table:public.user_roles` | harness | `grant_mismatch` |  |
| `grant:table:public.user_roles` | harness | `grant_mismatch` |  |
| `grant:table:public.user_roles` | harness | `grant_mismatch` |  |
| `grant:table:public.user_roles` | harness | `grant_mismatch` |  |
| `grant:table:public.user_roles` | harness | `grant_mismatch` |  |
| `grant:table:public.user_roles` | harness | `grant_mismatch` |  |
| `grant:table:public.user_roles` | harness | `grant_mismatch` |  |
| `grant:table:public.user_roles` | harness | `grant_mismatch` |  |
| `grant:table:public.user_roles` | harness | `grant_mismatch` |  |
| `grant:table:public.user_roles` | harness | `grant_mismatch` |  |
| `grant:table:public.user_roles` | harness | `grant_mismatch` |  |
| `grant:table:public.user_roles` | harness | `grant_mismatch` |  |
| `grant:table:public.user_roles` | harness | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | harness | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | harness | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | harness | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | harness | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | harness | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | harness | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | harness | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | harness | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | harness | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | harness | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | harness | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | harness | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | harness | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | harness | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | harness | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | harness | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | harness | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | harness | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | harness | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | harness | `grant_mismatch` |  |
| `grant:table:public.v_comparison_latest_version` | harness | `grant_mismatch` |  |
| `grant:function:storage.allow_any_operation(expected_operations text[])` | harness | `grant_mismatch` |  |
| `grant:function:storage.allow_any_operation(expected_operations text[])` | harness | `grant_mismatch` |  |
| `grant:function:storage.allow_only_operation(expected_operation text)` | harness | `grant_mismatch` |  |
| `grant:function:storage.allow_only_operation(expected_operation text)` | harness | `grant_mismatch` |  |
| `grant:function:storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb)` | harness | `grant_mismatch` |  |
| `grant:function:storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb)` | harness | `grant_mismatch` |  |
| `grant:function:storage.enforce_bucket_name_length()` | harness | `grant_mismatch` |  |
| `grant:function:storage.enforce_bucket_name_length()` | harness | `grant_mismatch` |  |
| `grant:function:storage.extension(name text)` | harness | `grant_mismatch` |  |
| `grant:function:storage.extension(name text)` | harness | `grant_mismatch` |  |
| `grant:function:storage.filename(name text)` | harness | `grant_mismatch` |  |
| `grant:function:storage.filename(name text)` | harness | `grant_mismatch` |  |
| `grant:function:storage.foldername(name text)` | harness | `grant_mismatch` |  |
| `grant:function:storage.foldername(name text)` | harness | `grant_mismatch` |  |
| `grant:function:storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text)` | harness | `grant_mismatch` |  |
| `grant:function:storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text)` | harness | `grant_mismatch` |  |
| `grant:function:storage.get_size_by_bucket()` | harness | `grant_mismatch` |  |
| `grant:function:storage.get_size_by_bucket()` | harness | `grant_mismatch` |  |
| `grant:function:storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text)` | harness | `grant_mismatch` |  |
| `grant:function:storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text)` | harness | `grant_mismatch` |  |
| `grant:function:storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text, sort_order text)` | harness | `grant_mismatch` |  |
| `grant:function:storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text, sort_order text)` | harness | `grant_mismatch` |  |
| `grant:function:storage.operation()` | harness | `grant_mismatch` |  |
| `grant:function:storage.operation()` | harness | `grant_mismatch` |  |
| `grant:function:storage.protect_delete()` | harness | `grant_mismatch` |  |
| `grant:function:storage.protect_delete()` | harness | `grant_mismatch` |  |
| `grant:function:storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text)` | harness | `grant_mismatch` |  |
| `grant:function:storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text)` | harness | `grant_mismatch` |  |
| `grant:function:storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text)` | harness | `grant_mismatch` |  |
| `grant:function:storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text)` | harness | `grant_mismatch` |  |
| `grant:function:storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text)` | harness | `grant_mismatch` |  |
| `grant:function:storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text)` | harness | `grant_mismatch` |  |
| `grant:function:storage.update_updated_at_column()` | harness | `grant_mismatch` |  |
| `grant:function:storage.update_updated_at_column()` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets_analytics` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets_vectors` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets_vectors` | harness | `grant_mismatch` |  |
| `grant:table:storage.buckets_vectors` | harness | `grant_mismatch` |  |
| `grant:table:storage.objects` | harness | `grant_mismatch` |  |
| `grant:table:storage.objects` | harness | `grant_mismatch` |  |
| `grant:table:storage.objects` | harness | `grant_mismatch` |  |
| `grant:table:storage.objects` | harness | `grant_mismatch` |  |
| `grant:table:storage.objects` | harness | `grant_mismatch` |  |
| `grant:table:storage.objects` | harness | `grant_mismatch` |  |
| `grant:table:storage.objects` | harness | `grant_mismatch` |  |
| `grant:table:storage.objects` | harness | `grant_mismatch` |  |
| `grant:table:storage.objects` | harness | `grant_mismatch` |  |
| `grant:table:storage.objects` | harness | `grant_mismatch` |  |
| `grant:table:storage.objects` | harness | `grant_mismatch` |  |
| `grant:table:storage.objects` | harness | `grant_mismatch` |  |
| `grant:table:storage.objects` | harness | `grant_mismatch` |  |
| `grant:table:storage.objects` | harness | `grant_mismatch` |  |
| `grant:table:storage.objects` | harness | `grant_mismatch` |  |
| `grant:table:storage.objects` | harness | `grant_mismatch` |  |
| `grant:table:storage.objects` | harness | `grant_mismatch` |  |
| `grant:table:storage.objects` | harness | `grant_mismatch` |  |
| `grant:table:storage.objects` | harness | `grant_mismatch` |  |
| `grant:table:storage.objects` | harness | `grant_mismatch` |  |
| `grant:table:storage.objects` | harness | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads` | harness | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads` | harness | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads` | harness | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads` | harness | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads` | harness | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads` | harness | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads` | harness | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads` | harness | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads` | harness | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads_parts` | harness | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads_parts` | harness | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads_parts` | harness | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads_parts` | harness | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads_parts` | harness | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads_parts` | harness | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads_parts` | harness | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads_parts` | harness | `grant_mismatch` |  |
| `grant:table:storage.s3_multipart_uploads_parts` | harness | `grant_mismatch` |  |
| `grant:table:storage.vector_indexes` | harness | `grant_mismatch` |  |
| `grant:table:storage.vector_indexes` | harness | `grant_mismatch` |  |
| `grant:table:storage.vector_indexes` | harness | `grant_mismatch` |  |
| `table:public.admin_bootstrap_tokens` | types_vs_production | `generated_types_mismatch` | yes |
| `table:public.entitlement_bypass_log` | types_vs_production | `generated_types_mismatch` |  |
| `table:public.stripe_webhook_events` | types_vs_production | `generated_types_mismatch` |  |

## TEST-HARNESS-only delta (informational, not classified)

Objects/definitions present in the harness reconstruction but not in the TRUE migration-only reconstruction, or vice versa. This is expected and intentional (the harness stub exists so CI's ephemeral Postgres can run) — it is **not** production drift evidence on its own. Harness reconstruction succeeds only because the test harness supplies prerequisite state.

| Object | Class |
|---|---|
| `table:public.billing` | `definition_mismatch` |
| `table:public.admin_audit_log` | `production_missing_repo_object` |
| `table:public.admin_bootstrap_tokens` | `production_missing_repo_object` |
| `table:public.comparison_shares` | `production_missing_repo_object` |
| `table:public.entitlement_bypass_log` | `production_missing_repo_object` |
| `table:public.export_files` | `production_missing_repo_object` |
| `table:public.export_shares` | `production_missing_repo_object` |
| `table:public.pdf_exports` | `production_missing_repo_object` |
| `table:public.stripe_webhook_events` | `production_missing_repo_object` |
| `table:public.subscriptions` | `production_missing_repo_object` |
| `table:public.user_comparisons` | `production_missing_repo_object` |
| `enum:public.export_kind` | `production_missing_repo_object` |
| `enum:public.export_status` | `production_missing_repo_object` |
| `function:public.approve_advisor_request` | `function_rpc_mismatch` |
| `function:public.duplicate_scenario` | `function_rpc_mismatch` |
| `function:public.get_effective_tier` | `function_rpc_mismatch` |
| `function:public.grant_admin_on_signup` | `repo_missing_production_object` |
| `function:public.assert_export_source_owned_by_user` | `production_missing_repo_object` |
| `function:public.assert_feature_allowed` | `production_missing_repo_object` |
| `function:public.claim_admin_bootstrap` | `production_missing_repo_object` |
| `function:public.claim_stripe_webhook_event` | `production_missing_repo_object` |
| `function:public.enforce_comparison_write_entitlement` | `production_missing_repo_object` |
| `function:public.enforce_scenario_write_entitlement` | `production_missing_repo_object` |
| `function:public.enforce_user_comparison_ownership` | `production_missing_repo_object` |
| `function:public.evaluate_entitlement` | `production_missing_repo_object` |
| `function:public.feature_allowed` | `production_missing_repo_object` |
| `function:public.generate_share_token` | `production_missing_repo_object` |
| `function:public.is_professional_price` | `production_missing_repo_object` |
| `function:public.issue_admin_bootstrap_token` | `production_missing_repo_object` |
| `function:public.list_admins` | `production_missing_repo_object` |
| `function:public.list_recent_admin_promotions` | `production_missing_repo_object` |
| `function:public.log_admin_entitlement_bypass` | `production_missing_repo_object` |
| `function:public.log_webhook_admin_ignored` | `production_missing_repo_object` |
| `function:public.maybe_log_admin_entitlement_write` | `production_missing_repo_object` |
| `function:public.promote_to_admin` | `production_missing_repo_object` |
| `function:public.protect_admin_subscriptions` | `production_missing_repo_object` |
| `function:public.release_stripe_webhook_event` | `production_missing_repo_object` |
| `function:public.resolve_plan_code` | `production_missing_repo_object` |
| `function:public.set_pdf_exports_updated_at` | `production_missing_repo_object` |
| `function:public.touch_comparison_share` | `production_missing_repo_object` |
| `function:public.validate_comparison_share` | `production_missing_repo_object` |
| `trigger:public.comparison_shares.trg_comparison_shares_updated_at` | `production_missing_repo_object` |
| `trigger:public.pdf_exports.trg_pdf_exports_updated_at` | `production_missing_repo_object` |
| `trigger:public.saved_comparisons.trg_enforce_comparison_write_entitlement_saved` | `production_missing_repo_object` |
| `trigger:public.scenarios.trg_enforce_scenario_write_entitlement` | `production_missing_repo_object` |
| `trigger:public.subscriptions.trg_protect_admin_subscriptions_ins` | `production_missing_repo_object` |
| `trigger:public.subscriptions.trg_protect_admin_subscriptions_upd` | `production_missing_repo_object` |
| `trigger:public.user_comparisons.trg_enforce_comparison_write_entitlement` | `production_missing_repo_object` |
| `trigger:public.user_comparisons.trg_enforce_user_comparison_ownership` | `production_missing_repo_object` |
| `trigger:public.user_comparisons.update_user_comparisons_updated_at` | `production_missing_repo_object` |
| `constraint:public.scenarios.scenarios_scenario_type_check` | `constraint_index_mismatch` |
| `constraint:public.admin_audit_log.admin_audit_log_pkey` | `production_missing_repo_object` |
| `constraint:public.admin_bootstrap_tokens.admin_bootstrap_tokens_pkey` | `production_missing_repo_object` |
| `constraint:public.admin_bootstrap_tokens.admin_bootstrap_tokens_token_hash_key` | `production_missing_repo_object` |
| `constraint:public.admin_bootstrap_tokens.admin_bootstrap_tokens_used_by_fkey` | `production_missing_repo_object` |
| `constraint:public.comparison_shares.comparison_shares_comparison_id_fkey` | `production_missing_repo_object` |
| `constraint:public.comparison_shares.comparison_shares_created_by_fkey` | `production_missing_repo_object` |
| `constraint:public.comparison_shares.comparison_shares_permission_check` | `production_missing_repo_object` |
| `constraint:public.comparison_shares.comparison_shares_pkey` | `production_missing_repo_object` |
| `constraint:public.comparison_shares.comparison_shares_token_key` | `production_missing_repo_object` |
| `constraint:public.entitlement_bypass_log.entitlement_bypass_log_pkey` | `production_missing_repo_object` |
| `constraint:public.entitlement_bypass_log.entitlement_bypass_log_user_id_fkey` | `production_missing_repo_object` |
| `constraint:public.export_files.export_files_entity_type_check` | `production_missing_repo_object` |
| `constraint:public.export_files.export_files_pkey` | `production_missing_repo_object` |
| `constraint:public.export_shares.export_shares_export_file_id_fkey` | `production_missing_repo_object` |
| `constraint:public.export_shares.export_shares_permission_check` | `production_missing_repo_object` |
| `constraint:public.export_shares.export_shares_pkey` | `production_missing_repo_object` |
| `constraint:public.export_shares.export_shares_token_key` | `production_missing_repo_object` |
| `constraint:public.pdf_exports.pdf_exports_pkey` | `production_missing_repo_object` |
| `constraint:public.pdf_exports.pdf_exports_share_token_key` | `production_missing_repo_object` |
| `constraint:public.pdf_exports.pdf_exports_share_token_length` | `production_missing_repo_object` |
| `constraint:public.stripe_webhook_events.stripe_webhook_events_app_user_id_fkey` | `production_missing_repo_object` |
| `constraint:public.stripe_webhook_events.stripe_webhook_events_pkey` | `production_missing_repo_object` |
| `constraint:public.subscriptions.subscriptions_pkey` | `production_missing_repo_object` |
| `constraint:public.subscriptions.subscriptions_stripe_subscription_id_key` | `production_missing_repo_object` |
| `constraint:public.subscriptions.subscriptions_user_id_fkey` | `production_missing_repo_object` |
| `constraint:public.user_comparisons.different_scenario_c` | `production_missing_repo_object` |
| `constraint:public.user_comparisons.different_scenarios` | `production_missing_repo_object` |
| `constraint:public.user_comparisons.user_comparisons_pkey` | `production_missing_repo_object` |
| `constraint:public.user_comparisons.user_comparisons_scenario_a_id_fkey` | `production_missing_repo_object` |
| `constraint:public.user_comparisons.user_comparisons_scenario_b_id_fkey` | `production_missing_repo_object` |
| `constraint:public.user_comparisons.user_comparisons_scenario_c_id_fkey` | `production_missing_repo_object` |
| `constraint:public.user_comparisons.user_comparisons_user_id_fkey` | `production_missing_repo_object` |
| `index:public.admin_audit_log.admin_audit_log_pkey` | `production_missing_repo_object` |
| `index:public.admin_audit_log.idx_admin_audit_log_action` | `production_missing_repo_object` |
| `index:public.admin_audit_log.idx_admin_audit_log_created_at` | `production_missing_repo_object` |
| `index:public.admin_audit_log.idx_admin_audit_log_target` | `production_missing_repo_object` |
| `index:public.admin_bootstrap_tokens.admin_bootstrap_tokens_pkey` | `production_missing_repo_object` |
| `index:public.admin_bootstrap_tokens.admin_bootstrap_tokens_token_hash_key` | `production_missing_repo_object` |
| `index:public.comparison_shares.comparison_shares_pkey` | `production_missing_repo_object` |
| `index:public.comparison_shares.comparison_shares_token_key` | `production_missing_repo_object` |
| `index:public.entitlement_bypass_log.entitlement_bypass_log_pkey` | `production_missing_repo_object` |
| `index:public.entitlement_bypass_log.entitlement_bypass_log_user_id_idx` | `production_missing_repo_object` |
| `index:public.export_files.export_files_pkey` | `production_missing_repo_object` |
| `index:public.export_files.idx_export_files_entity` | `production_missing_repo_object` |
| `index:public.export_files.idx_export_files_entity_version` | `production_missing_repo_object` |
| `index:public.export_files.idx_export_files_owner` | `production_missing_repo_object` |
| `index:public.export_shares.export_shares_pkey` | `production_missing_repo_object` |
| `index:public.export_shares.export_shares_token_key` | `production_missing_repo_object` |
| `index:public.export_shares.idx_export_shares_file` | `production_missing_repo_object` |
| `index:public.export_shares.idx_export_shares_token` | `production_missing_repo_object` |
| `index:public.pdf_exports.pdf_exports_pkey` | `production_missing_repo_object` |
| `index:public.pdf_exports.pdf_exports_share_token_key` | `production_missing_repo_object` |
| `index:public.pdf_exports.pdf_exports_source_idx` | `production_missing_repo_object` |
| `index:public.pdf_exports.pdf_exports_unique_ready_per_source` | `production_missing_repo_object` |
| `index:public.pdf_exports.pdf_exports_user_id_idx` | `production_missing_repo_object` |
| `index:public.stripe_webhook_events.stripe_webhook_events_pkey` | `production_missing_repo_object` |
| `index:public.stripe_webhook_events.stripe_webhook_events_processed_at_idx` | `production_missing_repo_object` |
| `index:public.subscriptions.subscriptions_pkey` | `production_missing_repo_object` |
| `index:public.subscriptions.subscriptions_stripe_subscription_id_key` | `production_missing_repo_object` |
| `index:public.subscriptions.subscriptions_user_id_idx` | `production_missing_repo_object` |
| `index:public.user_comparisons.idx_user_comparisons_created_at` | `production_missing_repo_object` |
| `index:public.user_comparisons.idx_user_comparisons_scenario_c_id` | `production_missing_repo_object` |
| `index:public.user_comparisons.idx_user_comparisons_user_id` | `production_missing_repo_object` |
| `index:public.user_comparisons.user_comparisons_pkey` | `production_missing_repo_object` |
| `policy:public.admin_audit_log.admin_audit_log_select_admin` | `production_missing_repo_object` |
| `policy:public.comparison_shares.comparison_shares_delete_owner` | `production_missing_repo_object` |
| `policy:public.comparison_shares.comparison_shares_insert_owner` | `production_missing_repo_object` |
| `policy:public.comparison_shares.comparison_shares_select_owner` | `production_missing_repo_object` |
| `policy:public.comparison_shares.comparison_shares_update_owner` | `production_missing_repo_object` |
| `policy:public.export_files.export_files_delete_own` | `production_missing_repo_object` |
| `policy:public.export_files.export_files_insert_own` | `production_missing_repo_object` |
| `policy:public.export_files.export_files_select_own` | `production_missing_repo_object` |
| `policy:public.export_shares.export_shares_delete_own` | `production_missing_repo_object` |
| `policy:public.export_shares.export_shares_insert_own` | `production_missing_repo_object` |
| `policy:public.export_shares.export_shares_select_own` | `production_missing_repo_object` |
| `policy:public.export_shares.export_shares_update_own` | `production_missing_repo_object` |
| `policy:public.pdf_exports.pdf_exports_delete_own` | `production_missing_repo_object` |
| `policy:public.pdf_exports.pdf_exports_insert_own` | `production_missing_repo_object` |
| `policy:public.pdf_exports.pdf_exports_select_own` | `production_missing_repo_object` |
| `policy:public.pdf_exports.pdf_exports_update_own` | `production_missing_repo_object` |
| `policy:public.user_comparisons.Users can create their own comparisons` | `production_missing_repo_object` |
| `policy:public.user_comparisons.Users can delete their own comparisons` | `production_missing_repo_object` |
| `policy:public.user_comparisons.Users can update their own comparisons` | `production_missing_repo_object` |
| `policy:public.user_comparisons.Users can view their own comparisons` | `production_missing_repo_object` |
| `policy:storage.objects.exports_bucket_insert_own_folder` | `production_missing_repo_object` |
| `policy:storage.objects.exports_bucket_read_own_folder` | `production_missing_repo_object` |
| `policy:storage.objects.exports_bucket_update_own_folder` | `production_missing_repo_object` |
| `policy:storage.objects.exports_delete_own` | `production_missing_repo_object` |
| `policy:storage.objects.exports_insert_own` | `production_missing_repo_object` |
| `policy:storage.objects.exports_select_own` | `production_missing_repo_object` |
| `grant:function:public.assert_export_source_owned_by_user(p_kind export_kind, p_source_id uuid, p_user_id uuid)` | `grant_mismatch` |
| `grant:function:public.assert_export_source_owned_by_user(p_kind export_kind, p_source_id uuid, p_user_id uuid)` | `grant_mismatch` |
| `grant:function:public.assert_export_source_owned_by_user(p_kind export_kind, p_source_id uuid, p_user_id uuid)` | `grant_mismatch` |
| `grant:function:public.assert_feature_allowed(p_feature text)` | `grant_mismatch` |
| `grant:function:public.assert_feature_allowed(p_feature text)` | `grant_mismatch` |
| `grant:function:public.assert_feature_allowed(p_feature text)` | `grant_mismatch` |
| `grant:function:public.claim_admin_bootstrap(p_token text)` | `grant_mismatch` |
| `grant:function:public.claim_admin_bootstrap(p_token text)` | `grant_mismatch` |
| `grant:function:public.claim_admin_bootstrap(p_token text)` | `grant_mismatch` |
| `grant:function:public.claim_stripe_webhook_event(p_event_id text, p_event_type text, p_stripe_customer_id text, p_app_user_id uuid, p_action_taken text, p_details jsonb)` | `grant_mismatch` |
| `grant:function:public.claim_stripe_webhook_event(p_event_id text, p_event_type text, p_stripe_customer_id text, p_app_user_id uuid, p_action_taken text, p_details jsonb)` | `grant_mismatch` |
| `grant:function:public.duplicate_scenario(source_scenario_id uuid, new_name text)` | `grant_mismatch` |
| `grant:function:public.enforce_comparison_write_entitlement()` | `grant_mismatch` |
| `grant:function:public.enforce_scenario_write_entitlement()` | `grant_mismatch` |
| `grant:function:public.enforce_user_comparison_ownership()` | `grant_mismatch` |
| `grant:function:public.evaluate_entitlement(p_user_id uuid)` | `grant_mismatch` |
| `grant:function:public.evaluate_entitlement(p_user_id uuid)` | `grant_mismatch` |
| `grant:function:public.evaluate_entitlement(p_user_id uuid)` | `grant_mismatch` |
| `grant:function:public.feature_allowed(p_user_id uuid, p_feature text, p_scenario_count integer)` | `grant_mismatch` |
| `grant:function:public.feature_allowed(p_user_id uuid, p_feature text, p_scenario_count integer)` | `grant_mismatch` |
| `grant:function:public.feature_allowed(p_user_id uuid, p_feature text, p_scenario_count integer)` | `grant_mismatch` |
| `grant:function:public.generate_share_token()` | `grant_mismatch` |
| `grant:function:public.generate_share_token()` | `grant_mismatch` |
| `grant:function:public.get_effective_tier(target_user_id uuid)` | `grant_mismatch` |
| `grant:function:public.get_effective_tier(target_user_id uuid)` | `grant_mismatch` |
| `grant:function:public.get_effective_tier(target_user_id uuid)` | `grant_mismatch` |
| `grant:function:public.grant_admin_on_signup()` | `grant_mismatch` |
| `grant:function:public.grant_admin_on_signup()` | `grant_mismatch` |
| `grant:function:public.is_professional_price(p_price_id text)` | `grant_mismatch` |
| `grant:function:public.is_professional_price(p_price_id text)` | `grant_mismatch` |
| `grant:function:public.issue_admin_bootstrap_token(p_ttl_minutes integer)` | `grant_mismatch` |
| `grant:function:public.issue_admin_bootstrap_token(p_ttl_minutes integer)` | `grant_mismatch` |
| `grant:function:public.list_admins()` | `grant_mismatch` |
| `grant:function:public.list_admins()` | `grant_mismatch` |
| `grant:function:public.list_admins()` | `grant_mismatch` |
| `grant:function:public.list_recent_admin_promotions(p_limit integer)` | `grant_mismatch` |
| `grant:function:public.list_recent_admin_promotions(p_limit integer)` | `grant_mismatch` |
| `grant:function:public.list_recent_admin_promotions(p_limit integer)` | `grant_mismatch` |
| `grant:function:public.log_admin_entitlement_bypass(p_user_id uuid, p_source text, p_feature text, p_details jsonb)` | `grant_mismatch` |
| `grant:function:public.log_admin_entitlement_bypass(p_user_id uuid, p_source text, p_feature text, p_details jsonb)` | `grant_mismatch` |
| `grant:function:public.log_webhook_admin_ignored(p_user_id uuid, p_email text, p_event_type text)` | `grant_mismatch` |
| `grant:function:public.log_webhook_admin_ignored(p_user_id uuid, p_email text, p_event_type text)` | `grant_mismatch` |
| `grant:function:public.maybe_log_admin_entitlement_write(p_user_id uuid, p_source text, p_feature text)` | `grant_mismatch` |
| `grant:function:public.maybe_log_admin_entitlement_write(p_user_id uuid, p_source text, p_feature text)` | `grant_mismatch` |
| `grant:function:public.promote_to_admin(p_email text)` | `grant_mismatch` |
| `grant:function:public.promote_to_admin(p_email text)` | `grant_mismatch` |
| `grant:function:public.promote_to_admin(p_email text)` | `grant_mismatch` |
| `grant:function:public.protect_admin_subscriptions()` | `grant_mismatch` |
| `grant:function:public.protect_admin_subscriptions()` | `grant_mismatch` |
| `grant:function:public.release_stripe_webhook_event(p_event_id text)` | `grant_mismatch` |
| `grant:function:public.release_stripe_webhook_event(p_event_id text)` | `grant_mismatch` |
| `grant:function:public.resolve_plan_code(p_price_id text)` | `grant_mismatch` |
| `grant:function:public.resolve_plan_code(p_price_id text)` | `grant_mismatch` |
| `grant:function:public.set_pdf_exports_updated_at()` | `grant_mismatch` |
| `grant:function:public.set_pdf_exports_updated_at()` | `grant_mismatch` |
| `grant:function:public.touch_comparison_share(p_token text)` | `grant_mismatch` |
| `grant:function:public.touch_comparison_share(p_token text)` | `grant_mismatch` |
| `grant:function:public.touch_comparison_share(p_token text)` | `grant_mismatch` |
| `grant:function:public.validate_comparison_share(p_token text)` | `grant_mismatch` |
| `grant:function:public.validate_comparison_share(p_token text)` | `grant_mismatch` |
| `grant:function:public.validate_comparison_share(p_token text)` | `grant_mismatch` |
| `grant:table:public.admin_audit_log` | `grant_mismatch` |
| `grant:table:public.admin_audit_log` | `grant_mismatch` |
| `grant:table:public.admin_audit_log` | `grant_mismatch` |
| `grant:table:public.admin_audit_log` | `grant_mismatch` |
| `grant:table:public.admin_audit_log` | `grant_mismatch` |
| `grant:table:public.admin_audit_log` | `grant_mismatch` |
| `grant:table:public.admin_audit_log` | `grant_mismatch` |
| `grant:table:public.admin_bootstrap_tokens` | `grant_mismatch` |
| `grant:table:public.admin_bootstrap_tokens` | `grant_mismatch` |
| `grant:table:public.admin_bootstrap_tokens` | `grant_mismatch` |
| `grant:table:public.admin_bootstrap_tokens` | `grant_mismatch` |
| `grant:table:public.admin_bootstrap_tokens` | `grant_mismatch` |
| `grant:table:public.admin_bootstrap_tokens` | `grant_mismatch` |
| `grant:table:public.admin_bootstrap_tokens` | `grant_mismatch` |
| `grant:table:public.comparison_shares` | `grant_mismatch` |
| `grant:table:public.comparison_shares` | `grant_mismatch` |
| `grant:table:public.comparison_shares` | `grant_mismatch` |
| `grant:table:public.comparison_shares` | `grant_mismatch` |
| `grant:table:public.comparison_shares` | `grant_mismatch` |
| `grant:table:public.comparison_shares` | `grant_mismatch` |
| `grant:table:public.comparison_shares` | `grant_mismatch` |
| `grant:table:public.entitlement_bypass_log` | `grant_mismatch` |
| `grant:table:public.entitlement_bypass_log` | `grant_mismatch` |
| `grant:table:public.entitlement_bypass_log` | `grant_mismatch` |
| `grant:table:public.entitlement_bypass_log` | `grant_mismatch` |
| `grant:table:public.entitlement_bypass_log` | `grant_mismatch` |
| `grant:table:public.entitlement_bypass_log` | `grant_mismatch` |
| `grant:table:public.entitlement_bypass_log` | `grant_mismatch` |
| `grant:table:public.export_files` | `grant_mismatch` |
| `grant:table:public.export_files` | `grant_mismatch` |
| `grant:table:public.export_files` | `grant_mismatch` |
| `grant:table:public.export_files` | `grant_mismatch` |
| `grant:table:public.export_files` | `grant_mismatch` |
| `grant:table:public.export_files` | `grant_mismatch` |
| `grant:table:public.export_files` | `grant_mismatch` |
| `grant:table:public.export_shares` | `grant_mismatch` |
| `grant:table:public.export_shares` | `grant_mismatch` |
| `grant:table:public.export_shares` | `grant_mismatch` |
| `grant:table:public.export_shares` | `grant_mismatch` |
| `grant:table:public.export_shares` | `grant_mismatch` |
| `grant:table:public.export_shares` | `grant_mismatch` |
| `grant:table:public.export_shares` | `grant_mismatch` |
| `grant:table:public.pdf_exports` | `grant_mismatch` |
| `grant:table:public.pdf_exports` | `grant_mismatch` |
| `grant:table:public.pdf_exports` | `grant_mismatch` |
| `grant:table:public.pdf_exports` | `grant_mismatch` |
| `grant:table:public.pdf_exports` | `grant_mismatch` |
| `grant:table:public.pdf_exports` | `grant_mismatch` |
| `grant:table:public.pdf_exports` | `grant_mismatch` |
| `grant:table:public.stripe_webhook_events` | `grant_mismatch` |
| `grant:table:public.stripe_webhook_events` | `grant_mismatch` |
| `grant:table:public.stripe_webhook_events` | `grant_mismatch` |
| `grant:table:public.stripe_webhook_events` | `grant_mismatch` |
| `grant:table:public.stripe_webhook_events` | `grant_mismatch` |
| `grant:table:public.stripe_webhook_events` | `grant_mismatch` |
| `grant:table:public.stripe_webhook_events` | `grant_mismatch` |
| `grant:table:public.subscriptions` | `grant_mismatch` |
| `grant:table:public.subscriptions` | `grant_mismatch` |
| `grant:table:public.subscriptions` | `grant_mismatch` |
| `grant:table:public.subscriptions` | `grant_mismatch` |
| `grant:table:public.subscriptions` | `grant_mismatch` |
| `grant:table:public.subscriptions` | `grant_mismatch` |
| `grant:table:public.subscriptions` | `grant_mismatch` |
| `grant:table:public.subscriptions` | `grant_mismatch` |
| `grant:table:public.subscriptions` | `grant_mismatch` |
| `grant:table:public.subscriptions` | `grant_mismatch` |
| `grant:table:public.subscriptions` | `grant_mismatch` |
| `grant:table:public.subscriptions` | `grant_mismatch` |
| `grant:table:public.subscriptions` | `grant_mismatch` |
| `grant:table:public.subscriptions` | `grant_mismatch` |
| `grant:table:public.subscriptions` | `grant_mismatch` |
| `grant:table:public.subscriptions` | `grant_mismatch` |
| `grant:table:public.subscriptions` | `grant_mismatch` |
| `grant:table:public.subscriptions` | `grant_mismatch` |
| `grant:table:public.subscriptions` | `grant_mismatch` |
| `grant:table:public.subscriptions` | `grant_mismatch` |
| `grant:table:public.subscriptions` | `grant_mismatch` |
| `grant:table:public.user_comparisons` | `grant_mismatch` |
| `grant:table:public.user_comparisons` | `grant_mismatch` |
| `grant:table:public.user_comparisons` | `grant_mismatch` |
| `grant:table:public.user_comparisons` | `grant_mismatch` |
| `grant:table:public.user_comparisons` | `grant_mismatch` |
| `grant:table:public.user_comparisons` | `grant_mismatch` |
| `grant:table:public.user_comparisons` | `grant_mismatch` |

