# Phase 7B Readiness — from Epic 7 Staging

**Date:** 2026-08-08  
**Authority:** Epic 7 kickoff; `docs/PHASE7B_LIVE_STRIPE_CUTOVER_PLAN.md`  
**Verdict:** Phase 7B is **NOT ready to resume**. Staging foundation is in place;
operator activation + end-to-end staging smoke remain.

## Questions answered

### Is staging production-like enough?

**Partially.** Isolated Supabase project, migration tip through Epic 7 test-price
allowlist, seven Edge Functions deployed, separate Vercel project with staging
client env, Stripe **test** catalog + webhook endpoint created, observability
environment tagging implemented.

**Gaps:** SPA not yet Git-deployed; Auth Site URL not configured; staging Edge
Stripe secrets not set via Dashboard (CLI token limitation); custom domain DNS
optional but preferred origin is already allowlisted.

### Are auth, billing, entitlement, export, observability validated there?

| Surface | Repo / infra | E2E smoke |
|---------|--------------|-----------|
| Auth | Origin allowlist + docs | **Not yet** (Auth Dashboard + SPA) |
| Billing test mode | Catalog + webhook + fence | **Not yet** (needs `sk_test_` secrets) |
| Entitlement | TS/SQL allowlist + unit tests | **Not yet** (needs checkout smoke) |
| Export/storage | Bucket + Edge deploy | **Not yet** |
| Observability | Environment tags | **Not yet** (optional DSN) |

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
