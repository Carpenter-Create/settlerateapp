# Storage / Platform Drift — Epic 6 PR 2G

**Phase:** 8.1 / Epic 6 PR 2G  
**Status:** Documentation classification — **no tip migration; no production mutation**

## SettleRate-owned storage contract

| Contract | Source | Production parity |
|----------|--------|-------------------|
| Private bucket `exports` (PDF, 10MB) | `20260113202811_*` | Present |
| Path convention `<user_id>/…` | `20260113205728_*` + Edge `export-share` | Aligns |
| Policies `exports_bucket_{read,insert,update}_own_folder` | `20260113205728_*` | Match |
| Legacy policies `exports_{select,insert,delete}_own` | `20260113202811_*` | Still present (accepted dual generation) |
| Active upload path | Edge `export-share` via **service_role** | Bypasses storage RLS |

## Accepted platform variance (not SettleRate SoT)

Do **not** recreate Supabase Storage internals in git to chase zero drift:

- Platform-only tables (`buckets_analytics`, `migrations`, multipart/vector tables, …)
- Stub vs platform column/`foldername`/FK-name/`buckets` RLS differences
- `storage.*` grant_mismatch noise (~242 rows) classified PLATFORM_EXPECTED in PR 2C

Reconstruction stubs remain intentionally minimal (ADR 0006).

## Deferred optional hardening (not PR 2G)

Supersede dual policy generations / add authenticated delete policy — separate
least-privilege hardening with production apply gate. Not required to close
storage drift classification.
