# Phase 7B Readiness — from Epic 7 Staging

**Date:** 2026-08-08  
**Authority:** Epic 7 kickoff; `docs/PHASE7B_LIVE_STRIPE_CUTOVER_PLAN.md`  
**Verdict:** Phase 7B is **NOT ready to resume**. Staging topology and Auth/SPA
activation advanced; Stripe test checkout remains blocked on SettleRate
`sk_test_…`.

## Questions answered

### Is staging production-like enough?

**Mostly for non-billing paths.** Isolated Supabase + Vercel projects, migration
tip through Epic 7 test-price allowlist, seven Edge Functions deployed, SPA at
`https://settlerate-app-staging.vercel.app`, staging Auth Site URL/redirects
configured, Stripe **test** catalog + rotated webhook + webhook secret set,
observability environment tagging implemented.

**Gap:** staging Edge `STRIPE_SECRET_KEY` (`sk_test_…`) not set — agent tooling
cannot read Stripe Dashboard secret keys.

### Are auth, billing, entitlement, export, observability validated there?

| Surface | Repo / infra | E2E smoke |
|---------|--------------|-----------|
| Auth | Origin allowlist + staging Auth config + SPA | **Partial** (config done; full signup email smoke open) |
| Billing test mode | Catalog + webhook + fence + whsec | **Blocked** (needs `sk_test_`) |
| Entitlement | TS/SQL allowlist + unit tests | **Not yet** (needs checkout smoke) |
| Export/storage | Bucket + Edge deploy | **Not yet** |
| Observability | Environment tags + Edge `SENTRY_ENVIRONMENT` | **Partial** (optional DSN) |

### Are remaining risks known?

1. Operator mis-sets `sk_live_` on staging (mitigation: docs + falsification checklist).
2. Auth redirects configured on **production** by mistake (HARD STOP / Epic 2 gate).
3. SPA still pointed at production Supabase via wrong Vercel project env.
4. Staging SQL tip ahead of production (`20260808143109` vs `20260808040000`) —
   expected; do not apply Epic 7 migration to production without review.
5. Webhook signing secret was generated at endpoint creation — store only in
   staging secrets; rotate via Stripe if exposure is suspected.

### Is a live Phase 7B smoke safe?

**No.** Keep production `CHECKOUT_MAINTENANCE=true`. Resume only after founder
explicit authorization following completed staging E2E smoke.

## Recommended founder sequence

1. Complete operator activation table in `STAGING_SMOKE.md`.
2. Run end-to-end staging smoke; record results.
3. Review Epic 7 closure criteria.
4. Separately authorize Phase 7B using existing cutover plan/checklist.
