# Epic 6 Closure

**Phase:** 8.1 / Epic 6  
**Status:** **COMPLETE** — repository closure and production remediation
applied/verified  
**Repository closure SHA:** `67a49801cdcd6cd25f3204a81c6cc872991fb365`  
**Post-closure main SHA (stamp):** `ae1ab5e3dfdddd04e18f9e7d550e4cd00227c13a`  
**Production apply completed:** `2026-08-08`  
**Project:** `vpcxzbaxhpucvevnkalo`

## Closure checklist

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Fresh migration-only reconstruction from git succeeds | Proven by `npm run schema:reconstruct -- --mode migration_only` |
| 2 | No product-table harness stubs required | PR 2A removed `subscriptions` stub |
| 3 | Canonical SettleRate-owned schema reproducible | 33 migrations through `20260808040000` |
| 4 | Production schema reverified read-only | PR 1 capture + PR 2B fingerprint reuse; post-apply capture `2026-08-08T04:26:04.217Z` |
| 5 | Remaining differences fully classified | See below |
| 6 | No unexplained SettleRate-owned schema drift | Classified: platform / retained legacy / ADR 0011 / accepted variance |
| 7 | Generated types match client-facing tables | PR 2E; `generated_types_mismatch` = 0 |
| 8 | RLS / entitlement / Deno / export / benchmarks / lint / typecheck / build | Green in closure validation |
| 9 | Accepted grant-security targets in repo migrations | PR 2D / 2F / 2H tips |
| 10 | Consolidated production apply package executed and verified | See `EPIC6_PRODUCTION_APPLY_PLAN.md` (execution record) |
| 11 | ADR 0006 / 0007 Epic 6 obligations satisfied | Baseline boundary + legacy disposition recorded |
| 12 | Governance reflects repository + production completion | Updated in post-production closure sync |

## Production apply result (2026-08-08)

| Field | Value |
|-------|--------|
| Result | **SUCCESS** — no rollback |
| Applied versions (order) | `20260808020000` → `20260808030000` → `20260808040000` |
| Final ledger tip | `20260808040000` / `epic6_pr2h_legacy_share_rpc_execute` |
| Final ledger size | 34 versions |
| Pre-apply structural fingerprint | `fa5c3bbc0f22e521bc43140e64569d0b3364b061dccd9d303f55fa2996fdc38c` |
| Final structural fingerprint | `fa5c3bbc0f22e521bc43140e64569d0b3364b061dccd9d303f55fa2996fdc38c` (unchanged; privilege-only) |
| Pre-apply grants fingerprint | `747f7ab55a655e16f21760ecede8a6baad5536d1870f502bd5e0e1727fd5e485` (818 grants) |
| Final grants fingerprint | `3b535add39bc57db4a089dcc5fdbd87fb285117aa3cfb8dbbf0ccc8dffba48ff` (664 grants) |
| Package-targeted privilege removals | **154 / 154** verified |

## Remaining intentional difference classes

| Class | Meaning |
|-------|---------|
| **accepted platform variance** | Supabase `storage` / extension catalog vs stub (PR 2G) |
| **legacy_temporarily_retained** | Dual comparison/export stack (PR 2H) |
| **ADR 0011 blocked** | Advisor leftovers require founder ADR before destructive disposition |
| **accepted service_role / default grant variance** | Residual reconstruction-vs-production grant differences outside the tip package |
| **expected reconstruction stub variance** | Minimal auth/storage stub for migration apply |

## Unresolved founder decisions

1. **ADR 0011** — advisor leftover disposition (retain vs remove)

Production apply of the Epic 6 tip package is **no longer** an unresolved
founder decision.

## Explicitly not done in Epic 6

- Dropping legacy comparison/export/advisor objects
- Phase 7B resume / Epic 7+
- Destructive advisor cleanup (blocked on ADR 0011)
