# Epic 6 Repository Closure

**Phase:** 8.1 / Epic 6  
**Status:** Repository work complete — **production apply NOT authorized**  
**Closure SHA:** (set at merge)

## Closure checklist

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Fresh migration-only reconstruction from git succeeds | Proven by `npm run schema:reconstruct -- --mode migration_only` |
| 2 | No product-table harness stubs required | PR 2A removed `subscriptions` stub |
| 3 | Canonical SettleRate-owned schema reproducible | 33 migrations through `20260808040000` |
| 4 | Production schema reverified read-only | PR 1 capture + PR 2B fingerprint reuse (`vpcxzbaxhpucvevnkalo`) |
| 5 | Remaining differences fully classified | See below |
| 6 | No unexplained SettleRate-owned schema drift | Classified: pending apply / platform / retained legacy / ADR 0011 |
| 7 | Generated types match client-facing tables | PR 2E; `generated_types_mismatch` = 0 |
| 8 | RLS / entitlement / Deno / export / benchmarks / lint / typecheck / build | Green in closure validation |
| 9 | Accepted grant-security targets in repo migrations | PR 2D / 2F / 2H tips |
| 10 | Pending production mutations enumerated | `EPIC6_PRODUCTION_APPLY_PLAN.md` |
| 11 | ADR 0006 / 0007 Epic 6 obligations satisfied | Baseline boundary + legacy disposition recorded |
| 12 | Governance reflects repository completion | Updated in this PR |

## Remaining difference classes

| Class | Meaning |
|-------|---------|
| **production-apply pending** | PR 2D/2F/2H tip privileges not yet on production |
| **accepted platform variance** | Supabase `storage` / extension catalog vs stub (PR 2G) |
| **legacy_temporarily_retained** | Dual comparison/export stack (PR 2H); advisor leftovers (PR 2I) |
| **ADR 0011 blocked** | Destructive advisor disposition requires founder ADR |
| **expected reconstruction stub variance** | Minimal auth/storage stub for migration apply |

## Unresolved founder decisions

1. **Production apply** of the consolidated package in `EPIC6_PRODUCTION_APPLY_PLAN.md`
2. **ADR 0011** — advisor leftover disposition (retain vs remove)

## Explicitly not done in Epic 6

- Production GRANT/REVOKE/DDL apply
- Dropping legacy comparison/export/advisor objects
- Phase 7B resume / Epic 7+
