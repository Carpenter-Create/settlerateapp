# Schema Drift Report

Generated: 2026-08-08T03:46:03.823Z

Authority: `docs/adr/0006-database-schema-source-of-truth.md`, `docs/adr/0007-legacy-schema-disposition.md`. This report is evidence only — no mutation is authorized by its contents (`mutationRecommendation` is always `NONE`).

## Source availability

| Surface | Available | Notes |
|---|---|---|
| production (A) | yes | projectRef=vpcxzbaxhpucvevnkalo; captured 2026-08-07T21:23:22.944Z |
| migration_only (B, TRUE reconstruction) | yes | reconstruction succeeded |
| harness (TEST-HARNESS reconstruction) | yes | reconstruction succeeded |
| types.ts (C, derived) | yes | never authoritative (ADR 0006 §1.5) |

## Reconstruction evidence (retain BOTH)

ADR 0006 requires both a TRUE migration-only reconstruction and a TEST-HARNESS reconstruction. Harness success does **not** prove migration-only reproducibility.

### A. Migration-only (TRUE reconstruction)

- Result: **SUCCEEDED**
- Applied migrations: 33
- Tables reconstructed: 21

### B. Harness (TEST-HARNESS reconstruction)

- Result: **SUCCEEDED**
- Post–PR 2A: migration-only also succeeds; harness is retained for comparison only and is **not** the canonical repository surface.
- `supabase/tests/00_auth_stub.sql` no longer creates a product-table `public.subscriptions` stub (removed in PR 2A).
- Tables reconstructed: 21

## Summary

Total classified drift records: **2146**. High-priority non-match records: **472**.

| Class | Count |
|---|---|
| `definition_mismatch` | 4 |
| `function_rpc_mismatch` | 2 |
| `grant_mismatch` | 1424 |
| `match` | 532 |
| `policy_rls_mismatch` | 2 |
| `production_missing_repo_object` | 74 |
| `repo_missing_production_object` | 108 |

| Compare surface | Count |
|---|---|
| `harness` | 1061 |
| `migration_only` | 1085 |

## Grant mismatches

Total `grant_mismatch` records: **1424**.

| Issue | Count |
|---|---|
| `privilege_only_in_a` | 1134 |
| `privilege_only_in_b` | 290 |

Privilege identity compared: schema + object type + object identity (function signature where applicable) + grantee + privilege type + is_grantable.

After Epic 6 PR 2D tip migration (`20260808020000_*`), new `privilege_only_in_a` grant rows for revoked client privileges are **approved remediation pending production application** — not a regression. See `docs/database/GRANT_REMEDIATION_PR2D.md`. Production capture is unchanged until a founder-authorized apply.

## High-priority candidate resolutions (evidence only)

Object disposition remains governed by ADR 0007. `INTENTIONAL_LEGACY_MAP` is empty unless a disposition has been accepted. Advisor objects are **not** classified removable while ADR 0011 is unresolved.

| Candidate | In production | Drift classes observed | ADR 0007 status |
|---|---|---|---|
| `subscriptions` | yes | `grant_mismatch` | unknown_founder_decision (no accepted disposition) |
| `profiles` | yes | `grant_mismatch` | unknown_founder_decision (no accepted disposition) |
| `admin_bootstrap_tokens` | yes | `grant_mismatch` | unknown_founder_decision (no accepted disposition) |
| `stripe_webhook_events` | yes | `grant_mismatch` | unknown_founder_decision (no accepted disposition) |
| `entitlement_bypass_log` | yes | `grant_mismatch` | unknown_founder_decision (no accepted disposition) |
| `user_comparisons` | yes | `grant_mismatch` | unknown_founder_decision (no accepted disposition) |
| `saved_comparisons` | yes | `grant_mismatch` | unknown_founder_decision (no accepted disposition) |
| `pdf_exports` | yes | `grant_mismatch` | unknown_founder_decision (no accepted disposition) |
| `export_files` | yes | `grant_mismatch` | unknown_founder_decision (no accepted disposition) |
| `export_shares` | yes | `grant_mismatch` | unknown_founder_decision (no accepted disposition) |
| `advisor_access_requests` | yes | `grant_mismatch` | unknown_founder_decision (no accepted disposition) |
| `advisor_profiles` | no | (no non-match records) | unknown_founder_decision (no accepted disposition) |

Also review grant_mismatch / policy_rls_mismatch / function_rpc_mismatch class totals in the Summary for privilege, RLS/policy, and RPC surface drift.

## High-priority findings

| Object | Surface | Class | Consumers |
|---|---|---|---|
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

## All classified findings

| Object | Surface | Class | High priority |
|---|---|---|---|
| `table:storage.buckets` | migration_only | `policy_rls_mismatch` |  |
| `table:storage.buckets` | migration_only | `definition_mismatch` |  |
| `table:storage.buckets_analytics` | migration_only | `repo_missing_production_object` |  |
| `table:storage.buckets_vectors` | migration_only | `repo_missing_production_object` |  |
| `table:storage.migrations` | migration_only | `repo_missing_production_object` |  |
| `table:storage.objects` | migration_only | `definition_mismatch` |  |
| `table:storage.s3_multipart_uploads` | migration_only | `repo_missing_production_object` |  |
| `table:storage.s3_multipart_uploads_parts` | migration_only | `repo_missing_production_object` |  |
| `table:storage.vector_indexes` | migration_only | `repo_missing_production_object` |  |
| `enum:storage.buckettype` | migration_only | `repo_missing_production_object` |  |
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
| `trigger:storage.buckets.enforce_bucket_name_length_trigger` | migration_only | `repo_missing_production_object` |  |
| `trigger:storage.buckets.protect_buckets_delete` | migration_only | `repo_missing_production_object` |  |
| `trigger:storage.objects.protect_objects_delete` | migration_only | `repo_missing_production_object` |  |
| `trigger:storage.objects.update_objects_updated_at` | migration_only | `repo_missing_production_object` |  |
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
| `grant:function:public.encrypt(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.encrypt(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.encrypt(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.encrypt(bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.encrypt_iv(bytea, bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.encrypt_iv(bytea, bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.encrypt_iv(bytea, bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.encrypt_iv(bytea, bytea, bytea, text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.enforce_comparison_write_entitlement()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.enforce_scenario_write_entitlement()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.enforce_user_comparison_ownership()` | migration_only | `grant_mismatch` |  |
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
| `grant:function:public.list_admins()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.list_admins()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.list_admins()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.list_pending_advisor_requests()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.list_pending_advisor_requests()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.list_pending_advisor_requests()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.list_recent_admin_promotions(p_limit integer)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.list_recent_admin_promotions(p_limit integer)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.list_recent_admin_promotions(p_limit integer)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.log_webhook_admin_ignored(p_user_id uuid, p_email text, p_event_type text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.log_webhook_admin_ignored(p_user_id uuid, p_email text, p_event_type text)` | migration_only | `grant_mismatch` |  |
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
| `grant:function:public.protect_admin_billing()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.protect_admin_billing()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.protect_admin_billing()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.protect_admin_role_deletion()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.protect_admin_role_deletion()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.protect_admin_role_deletion()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.protect_admin_subscriptions()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.protect_admin_subscriptions()` | migration_only | `grant_mismatch` |  |
| `grant:function:public.resolve_plan_code(p_price_id text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.resolve_plan_code(p_price_id text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.resolve_plan_code(p_price_id text)` | migration_only | `grant_mismatch` |  |
| `grant:function:public.resolve_plan_code(p_price_id text)` | migration_only | `grant_mismatch` |  |
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
| `trigger:storage.buckets.enforce_bucket_name_length_trigger` | harness | `repo_missing_production_object` |  |
| `trigger:storage.buckets.protect_buckets_delete` | harness | `repo_missing_production_object` |  |
| `trigger:storage.objects.protect_objects_delete` | harness | `repo_missing_production_object` |  |
| `trigger:storage.objects.update_objects_updated_at` | harness | `repo_missing_production_object` |  |
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

## TEST-HARNESS-only delta (informational, not classified)

Informational delta between harness and migration-only reconstructions. After PR 2A, migration-only is the principal repository surface; harness-only differences are **not** canonical production drift. Empty delta means the two reconstructions agree structurally for compared categories.

| Object | Class |
|---|---|
| `grant:function:public.generate_share_token()` | `grant_mismatch` |
| `grant:function:public.handle_new_user()` | `grant_mismatch` |
| `grant:function:public.handle_new_user()` | `grant_mismatch` |
| `grant:function:public.is_professional_price(p_price_id text)` | `grant_mismatch` |
| `grant:function:public.list_admins()` | `grant_mismatch` |
| `grant:function:public.list_recent_admin_promotions(p_limit integer)` | `grant_mismatch` |
| `grant:function:public.normalize_admin_billing_insert()` | `grant_mismatch` |
| `grant:function:public.normalize_admin_billing_insert()` | `grant_mismatch` |
| `grant:function:public.promote_to_admin(p_email text)` | `grant_mismatch` |
| `grant:function:public.protect_admin_billing()` | `grant_mismatch` |
| `grant:function:public.protect_admin_billing()` | `grant_mismatch` |
| `grant:function:public.protect_admin_role_deletion()` | `grant_mismatch` |
| `grant:function:public.protect_admin_role_deletion()` | `grant_mismatch` |
| `grant:function:public.resolve_plan_code(p_price_id text)` | `grant_mismatch` |
| `grant:function:public.set_pdf_exports_updated_at()` | `grant_mismatch` |
| `grant:function:public.set_pdf_exports_updated_at()` | `grant_mismatch` |
| `grant:function:public.tg_set_billing_updated_at()` | `grant_mismatch` |
| `grant:function:public.tg_set_billing_updated_at()` | `grant_mismatch` |
| `grant:function:public.tg_set_comparison_version_number()` | `grant_mismatch` |
| `grant:function:public.tg_set_comparison_version_number()` | `grant_mismatch` |
| `grant:function:public.tg_set_scenarios_updated_at()` | `grant_mismatch` |
| `grant:function:public.tg_set_scenarios_updated_at()` | `grant_mismatch` |
| `grant:function:public.tg_set_updated_at()` | `grant_mismatch` |
| `grant:function:public.tg_set_updated_at()` | `grant_mismatch` |
| `grant:function:public.touch_comparison_share(p_token text)` | `grant_mismatch` |
| `grant:function:public.touch_comparison_share(p_token text)` | `grant_mismatch` |
| `grant:function:public.validate_comparison_share(p_token text)` | `grant_mismatch` |
| `grant:function:public.validate_comparison_share(p_token text)` | `grant_mismatch` |
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

