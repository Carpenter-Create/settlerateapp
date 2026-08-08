# Schema Drift Refresh — Epic 6 PR 2B

**Phase:** 8.1 / Epic 6 PR 2B  
**Date:** 2026-08-07  
**Status:** EVIDENCE ONLY — post-provenance drift baseline refresh  
**Authority:** ADR 0006, ADR 0007; prior evidence PR 1 + PR 2A

This slice recomputes production-vs-repository drift after PR 2A restored
orphan migration version `20260112193137` (`subscriptions` + scoped
`profiles` columns) so migration-only reconstruction succeeds without a
product-table stub.

**No mutation** of production, grants, RLS, policies, functions, types, or
app/Edge behavior is authorized by this document.

---

## Production evidence

| Item | Value |
|------|--------|
| Capture reused | **Yes** — PR 1 sanitized catalog retained |
| Canonical capture timestamp | `2026-08-07T21:23:22.944Z` |
| Project ref | `vpcxzbaxhpucvevnkalo` |
| Canonical content fingerprint | `fa5c3bbc0f22e521bc43140e64569d0b3364b061dccd9d303f55fa2996fdc38c` |
| Recapture committed | **No** (temporary verification capture deleted after identical compare) |

Production evidence reuse was verified by **both** an unchanged migration
ledger **and** an identical full normalized schema fingerprint from a
fresh read-only temporary capture. Migration-ledger equality alone does
**not** prove schema equality (Dashboard / out-of-band DDL could change
catalog state without a new `schema_migrations` row).

### 1) Migration ledger verification (read-only)

Linked Supabase CLI query against
`supabase_migrations.schema_migrations` (wrapped in `BEGIN READ ONLY` /
`COMMIT`, SELECT allowlist):

- Captured versions: **31**
- Live versions: **31**
- Symmetric difference: **empty**
- Result: **identical**

### 2) Full normalized schema fingerprint verification (read-only)

Temporary untracked capture via approved linked mechanism
(`npm run schema:capture -- --linked`, tooling
`epic6-pr1-schema-capture/1.1.1`):

- Protections: `BEGIN READ ONLY` / `COMMIT` (current transaction);
  client-side single-statement SELECT/SHOW allowlist; sanitizer fail-closed
- Temporary capture timestamp: `2026-08-07T23:16:14.542Z`
- Destination: `/tmp/settlerate-pr2b-verify/production-schema-catalog.TMP.json`
  (never committed)

Compared against the committed PR 1 catalog using
`normalizeCatalog` + `fingerprintCatalogContent` /
`fingerprintCatalogObjects`, plus separate normalized fingerprints for
grants, extensions, and migration metadata, and section compares
(tables/columns+RLS, views, enums, functions, triggers, constraints,
indexes, policies, grants):

| Check | Result |
|-------|--------|
| `catalogContentFingerprint` | **identical** (`fa5c3bbc…dc38c`) |
| Per-object fingerprint map | **identical** (0 only-in-A / only-in-B / changed) |
| Grants fingerprint | **identical** |
| Extensions fingerprint | **identical** |
| Migration versions fingerprint | **identical** |
| Section compare non-matches | **0** |

Outcome: retain original PR 1 production artifact and timestamp; delete
temporary capture; no production mutation occurred.

---

## Reconstruction (post-PR 2A)

### Migration-only (principal repository surface)

| Field | Result |
|-------|--------|
| Status | **SUCCEEDED** |
| Applied migrations | **30** (includes `20260112193137_restore_subscriptions_profiles_provenance.sql`) |
| Orphan-version proof | Version file applied from a clean database; chain continues through `20260112204012_*` and later product migrations |
| Product `subscriptions` stub | **Not used** |

### Object counts (migration-only reconstruction)

| Category | Count |
|----------|------:|
| Tables | 21 |
| Views | 1 |
| Enums | 3 |
| Functions | 76 |
| Triggers | 16 |
| Constraints | 65 |
| Indexes | 68 |
| Policies | 56 |
| Grants | 408 |
| Extensions | 2 |

Public product tables reconstructed include `subscriptions`,
`admin_bootstrap_tokens`, `stripe_webhook_events`,
`entitlement_bypass_log`, comparison/export dual models, and advisor
request leftovers. Storage reconstructs `buckets` / `objects` only
(platform tables beyond that remain production-only).

### Harness

Harness reconstruction also **SUCCEEDED**. Retained for comparison only.
Harness-only deltas are **not** canonical repository drift.

---

## Before / after (PR 1 vs PR 2B)

Frozen PR 1 snapshot: `docs/database/PR1_PRE_PROVENANCE_DRIFT_SNAPSHOT.json`.

### Totals (all compare surfaces)

| Metric | PR 1 (pre-provenance) | PR 2B (post-provenance) | Δ |
|--------|----------------------:|------------------------:|--:|
| Total records | 2287 | 2125 | −162 |
| Non-match | 1911 | 1593 | −318 |
| Match | 376 | 532 | +156 |
| High-priority non-match | 550 | 459 | −91 |

### Drift class table (all surfaces)

| Class | PR 1 | PR 2B | Δ |
|-------|-----:|------:|--:|
| `match` | 376 | 532 | +156 |
| `grant_mismatch` | 1559 | 1400 | −159 |
| `repo_missing_production_object` | 256 | 108 | −148 |
| `production_missing_repo_object` | 76 | 74 | −2 |
| `definition_mismatch` | 8 | 4 | −4 |
| `function_rpc_mismatch` | 5 | 2 | −3 |
| `policy_rls_mismatch` | 3 | 2 | −1 |
| `constraint_index_mismatch` | 1 | 0 | −1 |
| `generated_types_mismatch` | 3 | 3 | 0 |
| `intentional_legacy` | 0 | 0 | 0 |
| `unknown_founder_decision` | 0 | 0 | 0 |

### Migration-only surface (canonical)

| Metric | PR 1 | PR 2B | Δ |
|--------|-----:|------:|--:|
| Total records | 1214 | 1061 | −153 |
| Non-match | 1095 | 795 | −300 |
| Match | 119 | 266 | +147 |
| `grant_mismatch` | 852 | 700 | −152 |
| `repo_missing_production_object` | 195 | 54 | −141 |
| `function_rpc_mismatch` | 4 | 1 | −3 |
| `definition_mismatch` | 4 | 2 | −2 |
| `constraint_index_mismatch` | 1 | 0 | −1 |
| Public tables missing from repo reconstruction | 10 | **0** | −10 |

### What disappeared specifically because of PR 2A

PR 2A restored `subscriptions` + `profiles` columns mid-chain so later
migrations apply. That cleared the **false** migration-only “repo missing”
cascade for objects that only failed to reconstruct when the chain stopped
at `20260112204012_*`:

| Cleared presence mismatch (public tables) |
|-------------------------------------------|
| `subscriptions` |
| `admin_audit_log` |
| `admin_bootstrap_tokens` |
| `comparison_shares` |
| `entitlement_bypass_log` |
| `export_files` / `export_shares` / `pdf_exports` |
| `stripe_webhook_events` |
| `user_comparisons` |

Also cleared as false absences: **24** public functions that only exist
after mid/late migrations (entitlement, bootstrap, webhook claim/release,
admin list/promote, protect_admin_subscriptions, share helpers, etc.).

| Residual after PR 2A (structural) |
|-----------------------------------|
| `subscriptions` table definition / columns / RLS / policies | **match** |
| `profiles` columns (incl. stripe/plan fields) | **match** |
| `subscriptions` table grants (anon/authenticated/service_role/postgres × DML+TRUNCATE+…) | **match** (parity restored; security review deferred) |
| `protect_admin_subscriptions()` EXECUTE for `anon` / `authenticated` | still `grant_mismatch` (`privilege_only_in_a`) |

The old **partial** migration-only report (failed reconstruction) is no
longer the active drift baseline.

---

## Grant-security analysis (no mutation)

Migration-only `grant_mismatch` count: **700** (was 852).

| Category (evidence classification) | Approx. count | Notes |
|------------------------------------|--------------:|-------|
| Expected platform / environment | ~265 | Mostly `storage` (+ extension function noise) |
| Production broader than repository | ~435 | `privilege_only_in_a` |
| Repository missing explicit grant provenance | ~233 | Overlaps production-broader (defaults / omitted GRANTs) |
| Repository broader than production | 0 | On migration_only surface |
| Potentially dangerous (founder/security review) | **202** unique | Public table/view DML/TRUNCATE/REFERENCES/TRIGGER for `anon`/`authenticated`/`PUBLIC` present in production but not in migration-only reconstruction grants |
| Unknown | 0 | |

**Important:** GRANT presence ≠ exploitability. RLS, `security definer`
RPCs, and which roles the API uses still govern realistic exercise.

### `public.subscriptions` privilege matrix (post-PR 2A)

All of SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER for
`anon`, `authenticated`, `service_role`, and `postgres` **match** between
production and migration-only.

| Role | Object privilege | RLS | Realistic exercise | Security significance | Later category |
|------|------------------|-----|--------------------|----------------------|----------------|
| `anon` | full table DML + TRUNCATE + REFERENCES + TRIGGER | RLS enabled; SELECT-own policy only | Direct PostgREST writes likely blocked by RLS for non-SELECT; TRUNCATE/TRIGGER not via PostgREST | **High review** — privilege surface broader than least privilege | grant/security reconciliation |
| `authenticated` | same | same | Same pattern for own-row SELECT; writes still privilege-gated by RLS policies (none for INSERT/UPDATE/DELETE) | **High review** | grant/security reconciliation |
| `service_role` | same | bypasses RLS | Edge/service paths can exercise; expected for webhook/admin paths if used | Medium — confirm intentional | grant/security reconciliation |
| `postgres` | same (+ grantable) | owner | Superuser-equivalent in practice | Low for API threat model | expected platform / owner |

Residual on related function only:

- `protect_admin_subscriptions()` — production grants `EXECUTE` to
  `anon` and `authenticated`; migration-only does not →
  `grant_mismatch` / repo missing EXECUTE provenance.

---

## High-priority surfaces (post-PR 2A state)

| Surface | Structural drift | Residual |
|---------|------------------|----------|
| `subscriptions` | match | grant parity match; privilege breadth needs security slice; function EXECUTE drift on protect trigger fn |
| `profiles` | columns/RLS match | grant mismatches vs production defaults |
| `admin_bootstrap_tokens` | present in migration-only | `generated_types_mismatch`; grants |
| `stripe_webhook_events` | present | `generated_types_mismatch`; grants |
| `entitlement_bypass_log` | present | `generated_types_mismatch`; grants |
| Dual comparisons (`user_comparisons` / `saved_comparisons` + items/versions/shares) | both present; no non-grant definition mismatch | grants only; ADR 0007 disposition still open |
| Dual exports (`pdf_exports` / `export_files` / `export_shares`) | both present; no non-grant definition mismatch | grants only; disposition open |
| Advisor (`advisor_access_requests`, `approve_advisor_request`) | present; no non-grant structural mismatch | grants; **ADR 0011 blocks removal** |
| Storage | platform tables missing in repo; `buckets`/`objects` definition + RLS enabled mismatch; `storage.foldername` fingerprint mismatch | expected platform drift + policy/storage slice later |
| Bootstrap / price-plan RPCs | present in migration-only (no longer false absences) | grant EXECUTE drift remains in aggregate grant class |

---

## Generated types

**Not regenerated** in PR 2B.

Still absent from `src/integrations/supabase/types.ts` (unchanged trio):

1. `admin_bootstrap_tokens`
2. `stripe_webhook_events`
3. `entitlement_bypass_log`

No additional `generated_types_mismatch` records after clean reconstruction.

---

## ADR 0007

- `INTENTIONAL_LEGACY_MAP` remains **empty**
- No object marked removable
- Advisor objects remain blocked by ADR 0011
- Dual comparison/export models remain `unknown_founder_decision`

---

## Ranked remaining reconciliation domains

Ranked by security risk, active product dependency, behavior-change
likelihood, destructive risk, evidence confidence, and whether production
mutation is required:

1. **Grant / security reconciliation** (incl. subscriptions privilege breadth + public-table DML/TRUNCATE surface) — highest security significance; evidence strong; mutation later only after founder decisions  
2. **Generated-types parity** — product/DX dependency; low destructive risk; no prod mutation  
3. **Function/RPC grant + EXECUTE provenance** (public RPCs) — medium; overlaps grants  
4. **Storage policy / platform catalog hygiene** — mostly environment expected; lower product risk  
5. **Dual comparison/export disposition** (ADR 0007) — product semantics; founder decision; avoid destructive until decided  
6. **Advisor / ADR 0011-dependent cleanup** — blocked  
7. **Consolidated baseline / closure** — last  

### Recommended next ONE slice

**Grant / security reconciliation (evidence + founder decisions first).**  
Do not begin it in PR 2B. Prefer classifying least-privilege targets and
dangerous production-broader privileges before any GRANT mutation.

---

## Governance

Epic 6:

- PR 0 complete  
- PR 1 complete  
- PR 2A complete  
- **PR 2B in progress:** post-provenance drift refresh  
- Later PR 2 slices unauthorized  
- Epic 7+ unauthorized  
- Epic 6 **not** complete  
