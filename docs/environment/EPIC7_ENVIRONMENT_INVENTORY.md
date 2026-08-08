# Epic 7 — Environment Inventory (Discovery)

**Phase:** 8.1 / Epic 7  
**Status:** Evidence only (PR 0) — no staging resources provisioned by this document  
**Authority:** `docs/adr/0008-environment-topology.md`  
**Date:** 2026-08-08  
**Base main SHA:** `ce10a548c00ae4522a42ec5646bb27a2a225d5f1`

## Current topology (as implemented)

| Tier | Present? | Evidence |
|------|----------|----------|
| Local development | Yes | Vite + `.env` / `.env.example`; localhost origin allowlist |
| Staging | **Provisioning** | Supabase project `gkhbalfpxjtleypbabjo` created; SPA/Vercel + migrations continue in Epic 7 PRs |
| Production | Yes | Vercel SPA → `https://app.settlerate.com`; Supabase `vpcxzbaxhpucvevnkalo` |
| Vercel Preview as staging substitute | **No** (and unsafe as default) | ADR 0002 deferred staging; auth/Stripe allowlists reject non-local non-prod origins |

## Production identifiers

| Surface | Value |
|---------|--------|
| GitHub repo | `Carpenter-Create/settlerateapp` |
| Vercel default hostname (GitHub `homepage` field) | `https://settlerate-app.vercel.app` (unverified in Vercel MCP this session; treat as metadata hint only) |
| Canonical app origin | `https://app.settlerate.com` |
| Supabase project ref | `vpcxzbaxhpucvevnkalo` |
| Supabase API host | `https://vpcxzbaxhpucvevnkalo.supabase.co` |
| Region (prod DB) | `us-east-1` |
| Org (Supabase) | `mlmubhdtovnvmtaiufjc` (E8 Holdings LLC, Pro) |

## Hosting / deployment

- App is a **Vite React SPA** (`npm run build` → static `dist/`).
- Deployed by **Vercel** (not GitHub Actions).
- `vercel.json` only provides SPA rewrites to `/index.html`.
- `.github/workflows/ci.yml` validates only (lint/typecheck/benchmarks/tests/build); **no deploy**.
- Edge Functions deploy is **manual** via Supabase CLI/Dashboard to the production project ref.

## Auth / origin controls

- Auth email redirects: `src/lib/authRedirect.ts` — production default + exact
  allowlist of localhost **and** `https://staging.settlerate.com` (Epic 7 PR 1).
- Stripe Checkout/Portal return Origin: `packages/core/src/origin/appOrigin.ts` —
  same allowlist pattern.
- Arbitrary `*.vercel.app` hosts remain rejected until added as exact entries.
- Production Supabase Auth Dashboard redirect allowlist changes remain separately gated (must not be used to “fix” staging by pointing at production Auth).

## Stripe / Phase 7B

- Phase 7B **PAUSED**; production must keep `CHECKOUT_MAINTENANCE=true`.
- Entitlement contract documents **live** Professional price IDs as current product catalog.
- Retired sandbox price IDs remain in historical migrations/docs.
- Epic 7 boundary: staging may use Stripe **test** configuration; must not use live Stripe secrets.

## Observability

- ADR 0003: production-only Sentry activation initially; staging deferred to ADR 0008.
- Client Sentry gates on Vite `MODE === "production"` + DSN; a staging `vite build` would send events if given a production DSN — isolation required.

## Storage / export

- Active path: `pdf_exports` + storage bucket `exports` via Edge `generate-pdf` / `export-share`.
- Sharing production Supabase for staging would share customer export objects — **prohibited**.

## Secrets sources today

| Class | Where |
|-------|--------|
| Public client (`VITE_SUPABASE_*`, optional `VITE_APP_ORIGIN`, `VITE_SENTRY_DSN`) | Local `.env`; Vercel Production env |
| Edge secrets (`STRIPE_*`, `CHECKOUT_MAINTENANCE`, `SENTRY_DSN`, service role) | Supabase project secrets (production project) |
| CI placeholders | Non-functional example Supabase URL/key in workflow env |

## Topology options evaluated (summary)

| Option | Verdict for Epic 7 |
|--------|--------------------|
| A. Separate Vercel project | **Selected** for staging SPA secret isolation |
| B. Same Vercel project Staging env only | Rejected as sole model — higher secret-bleed risk |
| C. Separate Supabase project | **Selected** for DB/Auth/Storage/Edge isolation |
| D. Supabase Branching | Deferred — no current repo branching workflow; weaker operational familiarity |
| E. Isolated Stripe test-mode | **Selected** for staging Edge secrets |
| F. Combination A+C+E | **Selected stack** |

Full decisions: `docs/adr/0008-environment-topology.md`.

## HARD STOP risks if staging shares production

1. Staging `VITE_SUPABASE_*` → production project writes real user/billing/export data.
2. Staging Edge using production service-role or live Stripe keys.
3. Auth redirects falling back to `app.settlerate.com` while using staging tokens.
4. Shared `exports` storage / `pdf_exports` rows.
5. Shared production Sentry DSN without environment separation.
6. Disabling production `CHECKOUT_MAINTENANCE` or mutating production Stripe.

## Gaps closed by ADR 0008 (this PR)

Environment definitions, isolation model, secret ownership, data policy,
domain strategy, promotion path, Phase 7B validation role — see ADR 0008.
