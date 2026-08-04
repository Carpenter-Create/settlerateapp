# Phase 7A Beta Billing Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Do not start implementation until Phase 7A is explicitly authorized.**

**Goal:** Make SettleRate safe for the first real paying customers by eliminating incorrect charges, incorrect Professional access, and broken subscription-management paths.

**Architecture:** Keep `public.billing` as the single entitlement source of truth. Harden Checkout (no overlapping Professional subscriptions), customer binding (no unsafe email adoption), webhook convergence (always apply Stripe’s current subscription snapshot), and map-repair (restore portal access without opening a second Checkout). Live catalog cutover is a coordinated code + Stripe + DB allowlist change.

**Tech Stack:** Supabase Edge Functions (Deno), Stripe Billing (Checkout + Customer Portal + webhooks), Postgres entitlement RPCs (`evaluate_entitlement`, `is_professional_price`), Vitest + `npm run test:entitlement-sql`, existing Phase 6 contracts in `docs/ENTITLEMENT_CONTRACT.md`.

## Global Constraints

- Phase 7A is **billing hardening + live cutover readiness only** — not AWS/Next migration, not visual redesign, not calculator/formula changes.
- Do not grant access from success URLs, client plan flags, or localStorage.
- Portal must continue to use authoritative `billing.stripe_customer_id` (or a verified metadata-bound repair into that column) — never bind by email alone.
- Price allowlists in TS (`src/lib/entitlementContract.ts`, `supabase/functions/_shared/entitlementContract.ts`) and SQL (`is_professional_price`) must stay in lockstep.
- Autofix remains disabled for financial/billing engine work.
- Full validation before every commit/push: `npm run lint && npm run typecheck && npm run verify:benchmarks && npm run test:run && npm run build` (+ `npm run test:entitlement-sql` when SQL/entitlement changes).
- Work on a dedicated `feat/` or `fix/` branch; draft PRs only; no merge without authorization.

## Explicitly out of scope (defer)

These came from the adversarial review but do **not** incorrectly charge, incorrectly grant access, or block legitimate management:

- Cancellation UI under-reporting when Stripe sets `cancel_at` but `cancel_at_period_end=false` (access remains correct; portal still works).
- Hardcoded Supabase project function URLs in the SPA (ops fragility; separate cleanup).
- Trial abuse via brand-new email accounts.
- Security advisor noise unrelated to the subscribe/manage path.
- Brief post-Checkout “still free” window until webhook + refetch (already messaged; success URL does not grant).

---

## Priority work items

### P0-1 — Block overlapping Professional Checkout / duplicate subscriptions

| | |
|---|---|
| **Risk** | Every `create-checkout` call creates a new Checkout Session with no active-subscription guard and no Stripe idempotency key. Completing two sessions can create two Professional subscriptions on one customer. Webhook upserts `billing` on `user_id`, so one subscription’s cancel/fail can overwrite the other’s snapshot → customer charged twice and/or access wrong. |
| **Smallest correct fix** | Before `stripe.checkout.sessions.create`: (1) If `billing` has `stripe_subscription_id` and status in `active` \| `trialing` \| `past_due` \| `unpaid`, return `409` with `code: "ALREADY_SUBSCRIBED"` (client should open portal). (2) Also `subscriptions.list` on the Stripe customer for those statuses; if any item uses an allowlisted Professional price, same `409` (and optionally repair `billing` from that sub). (3) Pass a Stripe idempotency key on session create, e.g. `checkout_${userId}_${priceId}` (stable per user+price; regenerating after a completed sub is fine because step 1/2 blocks). Do **not** redesign `billing` to multi-subscription in 7A. |
| **Files affected** | `supabase/functions/create-checkout/index.ts`; `src/components/billing/UpgradeModal.tsx` (surface `ALREADY_SUBSCRIBED` → portal / toast); optional shared helper under `supabase/functions/_shared/`; Vitest covering trial/already-subscribed helpers if extracted to a testable module mirrored under `src/lib/`. |
| **Validation** | Unit: already-subscribed statuses → no session create. Sandbox: entitled user calling checkout → 409, no second sub; double-click / replay with idempotency → one session. Full CI suite + edge redeploy smoke. **Est.:** ~0.5–1 day including sandbox. |

### P0-2 — Live Professional catalog + allowlist lockstep (cutover prerequisite)

| | |
|---|---|
| **Risk** | Code and SQL allowlist only sandbox prices (`price_1U0k…` on `acct_1U0isCC2Fmi7ZUCb`). Live key + sandbox prices → Checkout fails. Wrong/partial allowlist swap → customer pays but DB `is_professional_price` denies Professional writes, or free price IDs accidentally grant. |
| **Smallest correct fix** | Founder creates live Product/Prices (monthly + annual) in the live Stripe account. Replace allowlisted IDs in **both** TS entitlement contracts, `src/lib/stripe.ts`, SQL via a new migration updating `is_professional_price` / `resolve_plan_code`, and `docs/ENTITLEMENT_CONTRACT.md`. Keep legacy sandbox IDs in an explicit “never grant in live” / deleted list only if needed for history — do not leave sandbox IDs as active grantors after cutover. Document the cutover order in a Phase 7A runbook (migrate DB → deploy edge → deploy app → point live webhook). |
| **Files affected** | `src/lib/entitlementContract.ts`; `supabase/functions/_shared/entitlementContract.ts`; `src/lib/stripe.ts`; `supabase/migrations/YYYYMMDDHHMMSS_phase7a_live_catalog.sql`; `supabase/tests/phase6_entitlement.sql` (or successor); `docs/ENTITLEMENT_CONTRACT.md`; new `docs/PHASE7A_DEPLOYMENT.md` (or extend Phase 6 runbook with a clearly dated 7A section); fixtures/tests that hardcode sandbox price strings. |
| **Validation** | `npm run test:entitlement-sql`; entitlement contract unit tests; sandbox still testable only if a separate non-prod allowlist path exists — **preferred 7A approach:** cut over once for closed beta on live prices; keep sandbox verification on a branch/env that still has sandbox IDs until cutover commit. Live smoke: Checkout with live test card in live mode (or Stripe live test) → webhook → `entitled`. **Est.:** ~0.5 day code + founder Stripe setup time. |

### P1-1 — Safe billing-map repair so paid users can open Portal

| | |
|---|---|
| **Risk** | Portal returns `NO_STRIPE_CUSTOMER` when `billing.stripe_customer_id` is missing. Account CTA pushes Subscribe → `create-checkout`, which can create a **second** subscription for someone already paying in Stripe. Legitimate customer cannot manage the existing sub. |
| **Smallest correct fix** | Add a **metadata-only** repair path (no email search): in `customer-portal` (or a tiny shared helper used by portal + checkout), if billing map missing, `stripe.customers.search` / list filtered by `metadata['user_id']:'<auth user id>'` (Stripe Customer Search `metadata['user_id']:'uuid'`). If **exactly one** customer: upsert `billing.stripe_customer_id` and continue portal session. If zero: keep `NO_STRIPE_CUSTOMER`. If more than one: `409 CUSTOMER_AMBIGUOUS` (fail closed; ops). Combine with P0-1 so Checkout cannot create a second Professional sub when Stripe already has one for that metadata-bound customer. |
| **Files affected** | `supabase/functions/customer-portal/handler.ts`; `supabase/functions/customer-portal/index.ts`; possibly `supabase/functions/_shared/` repair helper; `src/pages/app/Account.tsx` (handle `CUSTOMER_AMBIGUOUS`); tests for portal handler (existing patterns under `src/lib/__tests__` or function-local tests). |
| **Validation** | Unit: 0 / 1 / N metadata matches. Sandbox: delete `billing` row for mapped entitled user → portal repairs map and opens; no second Checkout. **Est.:** ~0.5–1 day. |

### P1-2 — Stop nondeterministic email-based Stripe customer adoption

| | |
|---|---|
| **Risk** | `create-checkout` uses `customers.list({ email, limit: 1 })` and may adopt the first unbound customer. Shared/reused emails or duplicate Stripe customers can attach the wrong payment history / portal / subscription to an app user → wrong billing management and possible wrong charge attribution. |
| **Smallest correct fix** | Remove email adoption. Resolution order only: (1) `billing.stripe_customer_id` for auth user; (2) unique Stripe customer with `metadata.user_id === auth user.id` (same helper as P1-1); (3) else `customers.create` with metadata. Never bind by email. |
| **Files affected** | `supabase/functions/create-checkout/index.ts`; shared customer-resolve helper with P1-1; checkout-focused tests. |
| **Validation** | Unit: email collision does not adopt stranger customer. Sandbox: two Stripe customers same email, different metadata → new user gets new customer. **Est.:** ~0.25–0.5 day once P1-1 helper exists. |

### P1-3 — Webhook same-second / out-of-order convergence

| | |
|---|---|
| **Risk** | Stale guard is `event.created < last_event_unix` only. Two subscription events in the same second can apply out of order; a stale `active` can overwrite a newer cancel (or the reverse) → incorrect access. |
| **Smallest correct fix** | For `customer.subscription.*` (and keep existing retrieve on invoice/session): always `stripe.subscriptions.retrieve(subscriptionId)` and map entitlement fields from the **retrieved** object (including Basil period helpers), not solely from the event payload. Keep the stale guard as a best-effort skip, but retrieved-current-state makes reordering converge. Optionally store `last_stripe_event_id` for forensics only — not required if retrieve-on-write is done. |
| **Files affected** | `supabase/functions/stripe-webhook/index.ts`; `supabase/functions/_shared/stripeBillingSnapshot.ts` (if retrieve typing needs wrapping); `src/lib/__tests__/stripeBillingSnapshot.test.ts` / webhook mapping tests if present. |
| **Validation** | Unit/integration-style: fixture where event payload is stale but retrieve returns canceled → billing ends `free`/`canceled`. Sandbox: rapid cancel then replay older `customer.subscription.updated` → final state matches Stripe Dashboard. **Est.:** ~0.5 day. |

### P1-4 — Deployment runbook: catalog migration + cutover order

| | |
|---|---|
| **Risk** | `docs/PHASE6_DEPLOYMENT.md` omits `20260804170000_phase6_stripe_sandbox_catalog.sql` and has no live cutover sequence. Following the runbook can leave SQL allowlist ≠ edge allowlist → paid user denied Professional features (or the inverse during a partial deploy). |
| **Smallest correct fix** | Add `docs/PHASE7A_DEPLOYMENT.md` with ordered steps: backup → apply entitlement/catalog migrations → deploy `stripe-webhook` → `create-checkout` → `customer-portal` → `check-subscription` → frontend → configure live webhook signing secret + portal return URL → smoke checklist (new sub, portal, past_due, already-subscribed, map repair). Explicitly list every migration file including catalog/live allowlist. |
| **Files affected** | `docs/PHASE7A_DEPLOYMENT.md`; short pointer from `docs/PHASE6_DEPLOYMENT.md` / `docs/ENTITLEMENT_CONTRACT.md`. |
| **Validation** | Doc review against actual migration filenames + edge function list; dry-run checklist on sandbox before live. **Est.:** ~0.25 day. |

---

## File map (expected touch set)

| Area | Paths |
|------|--------|
| Checkout guard | `supabase/functions/create-checkout/index.ts` |
| Portal + repair | `supabase/functions/customer-portal/handler.ts`, `index.ts` |
| Shared billing helpers | `supabase/functions/_shared/` (new small resolve/repair + optional already-subscribed helper); mirror under `src/lib/` only if Vitest needs it |
| Webhook | `supabase/functions/stripe-webhook/index.ts`, `_shared/stripeBillingSnapshot.ts` |
| Allowlist | `src/lib/entitlementContract.ts`, `supabase/functions/_shared/entitlementContract.ts`, `src/lib/stripe.ts`, new SQL migration |
| UI handling | `src/components/billing/UpgradeModal.tsx`, `src/pages/app/Account.tsx` |
| Docs / tests | `docs/ENTITLEMENT_CONTRACT.md`, `docs/PHASE7A_DEPLOYMENT.md`, entitlement + checkout/portal tests, `supabase/tests/phase6_entitlement.sql` |

---

## Suggested implementation order

```text
P1-4 runbook skeleton (can start in parallel)
    ↓
P0-1 already-subscribed + idempotency     ← highest code risk for money
    ↓
P1-3 webhook retrieve-on-write            ← access correctness
    ↓
P1-1 metadata map repair                  ← manage-subscription
    ↓
P1-2 remove email adoption                ← uses P1-1 helper
    ↓
P0-2 live catalog migration (founder prices ready)
    ↓
Sandbox full smoke → draft PR → authorized live cutover
```

---

## Task checklist (for authorized implementation)

### Task 1: Already-subscribed Checkout guard + idempotency

**Files:**
- Modify: `supabase/functions/create-checkout/index.ts`
- Modify: `src/components/billing/UpgradeModal.tsx`
- Create (optional): `supabase/functions/_shared/professionalSubscriptionGuard.ts` + `src/lib/professionalSubscriptionGuard.ts` + Vitest

- [ ] **Step 1:** Add failing tests for “active/trialing/past_due/unpaid + allowlisted price ⇒ blocked”.
- [ ] **Step 2:** Implement billing-row + Stripe list guards; return `409 ALREADY_SUBSCRIBED`.
- [ ] **Step 3:** Add Stripe idempotency key on `checkout.sessions.create`.
- [ ] **Step 4:** UI: on `ALREADY_SUBSCRIBED`, toast + open portal (or instruct Manage billing).
- [ ] **Step 5:** Run focused tests + full validation suite; commit on `fix/phase7a-checkout-already-subscribed`.

### Task 2: Webhook retrieve-on-write for subscription events

**Files:**
- Modify: `supabase/functions/stripe-webhook/index.ts`

- [ ] **Step 1:** Add/extend test or sandbox script proving stale event payload does not win over retrieved subscription.
- [ ] **Step 2:** For `customer.subscription.*`, retrieve subscription before mapping period/status/price/cancel flags (reuse `extractSubscriptionPeriodEnd`).
- [ ] **Step 3:** Redeploy webhook to sandbox; replay out-of-order pair; commit.

### Task 3: Metadata-only customer resolve + portal repair

**Files:**
- Create: `supabase/functions/_shared/stripeCustomerResolve.ts` (name flexible)
- Modify: `customer-portal/handler.ts`, `create-checkout/index.ts`
- Modify: `Account.tsx` for `CUSTOMER_AMBIGUOUS`

- [ ] **Step 1:** Failing tests for 0 / 1 / N metadata matches.
- [ ] **Step 2:** Implement resolve+upsert; wire portal before `NO_STRIPE_CUSTOMER`.
- [ ] **Step 3:** Remove email `customers.list` adoption from checkout (P1-2 in same PR if small).
- [ ] **Step 4:** Sandbox: wipe billing map → portal repairs → manage works; checkout still blocked if sub active (Task 1).
- [ ] **Step 5:** Validate + commit.

### Task 4: Live catalog lockstep + Phase 7A runbook

**Files:**
- Migration + entitlement allowlists + `docs/PHASE7A_DEPLOYMENT.md` + contract docs

- [ ] **Step 1:** Founder provides live `product` / `price` IDs (blocked until then).
- [ ] **Step 2:** Single migration + TS allowlist PR; update SQL harness prices.
- [ ] **Step 3:** Write cutover runbook including webhook secret, portal return URL `https://app.settlerate.com/app/account`, edge deploy order, smoke checklist covering Tasks 1–3.
- [ ] **Step 4:** `test:entitlement-sql` + full CI; draft PR; **stop for authorization** before live secret/price cutover.

### Task 5: Closed-beta smoke (human + sandbox/live)

- [ ] New subscriber: one Checkout → one sub → `entitled`.
- [ ] Double Upgrade click / replay: no second sub.
- [ ] Portal cancel-at-period-end: access until period end.
- [ ] Billing row deleted (sandbox only): portal repairs; Manage works; Upgrade does not create second sub.
- [ ] `past_due`: `read_only` + portal can update payment method.
- [ ] Unmapped metadata-less stranger customer with same email: not adopted.

---

## Definition of done (Phase 7A)

1. No authenticated path can open a second Professional Checkout while an allowlisted sub is `active`/`trialing`/`past_due`/`unpaid`.
2. Customer binding never uses email-only adoption.
3. Paid users with a missing `billing` map can recover Portal via unique `metadata.user_id` repair (or get a clear fail-closed error if ambiguous).
4. Subscription webhooks converge to Stripe’s current subscription object.
5. Live (or closed-beta) price IDs are consistent across TS, SQL, Stripe Dashboard, and the deployment runbook.
6. Full validation green; draft PR reviewed; live cutover only after explicit authorization.

## Estimated total

| Band | Effort |
|------|--------|
| Code hardening (P0-1, P1-1–P1-3) | ~2–3 engineering days |
| Docs/runbook (P1-4) | ~0.25 day |
| Live catalog + cutover (P0-2) | ~0.5 day engineering + founder Stripe/ops |
| Smoke / soak | ~0.5 day |

---

## Authorization gate

This plan is documentation only until a founder/owner explicitly authorizes **Phase 7A implementation**. Do not create live products, rotate webhook secrets, or merge to `main` without that authorization.
