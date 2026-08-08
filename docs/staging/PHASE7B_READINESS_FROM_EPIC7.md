# Phase 7B Readiness — from Epic 7 Staging

**Date:** 2026-08-08  
**Authority:** Epic 7 closure; `docs/PHASE7B_LIVE_STRIPE_CUTOVER_PLAN.md`  
**Verdict:** Phase 7B is **NOT ready to resume** and was **not** resumed by Epic 7.

Staging is production-like enough for isolated proving (Auth, Stripe **test**
billing/entitlement, export/storage, origin fences, observability tags). That
does **not** authorize live Stripe cutover, public checkout, or disabling
production `CHECKOUT_MAINTENANCE`.

## Questions answered

### Is staging production-like enough?

**Yes for isolated proving.** Separate Supabase + Vercel + Stripe test catalog,
canonical migrations, Edge deploy, SPA, Auth, webhook→entitlement, PDF/share,
and adversarial origin/price fences are verified. See `EPIC7_CLOSURE.md`.

### Are auth, billing, entitlement, export, observability validated there?

| Surface | E2E smoke |
|---------|-----------|
| Auth | **Met** (staging Auth + synthetic login; production Auth unchanged) |
| Billing test mode | **Met** (`cs_test_…`, staging prices, webhook) |
| Entitlement | **Met** (`check-subscription` Professional) |
| Export/storage | **Met** (PDF + share on staging `exports`) |
| Observability | **Met** for environment tagging; DSN optional/inert |

### Are remaining risks known?

1. Operator mis-sets `sk_live_` on staging (docs + digest/process discipline).
2. Auth redirects configured on **production** by mistake (HARD STOP).
3. Staging SQL tip ahead of production (`20260808143109` vs `20260808040000`) —
   expected; do not apply Epic 7-only migrations to production without review.
4. Hosted Checkout browser automation may be bot-blocked; subscription smoke used
   Stripe test API via a deleted ephemeral staging Edge helper — do not leave
   such helpers deployed.

### Is a live Phase 7B smoke safe?

**No.** Keep production `CHECKOUT_MAINTENANCE=true` (digest-verified at Epic 7
closure). Resume only after separate founder authorization using the Phase 7B
cutover plan/checklist.

## Recommended founder sequence (when ready for Phase 7B)

1. Treat Epic 7 as complete staging evidence only.
2. Follow `docs/PHASE7B_LIVE_STRIPE_CUTOVER_PLAN.md` under explicit authorization.
3. Do not reuse this document as cutover approval.
