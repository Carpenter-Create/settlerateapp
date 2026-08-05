# Phase 7B — Live Stripe Cutover Plan

**Status:** Phase 7B.1 live catalog **created in Stripe**; cutover code on `main`. Checklist Section 0 complete.  
**Cutover authorization:** **AUTHORIZED TO BEGIN CUTOVER** — Operator: Founder / Adam Carpenter. Scope: **live Stripe activation only**.  
**Production cutover (secrets, deploy, SQL apply):** **not executed** — proceed G0→I sequentially per checklist; verify after each gate.  
**Scope:** Move SettleRate production billing from Stripe **sandbox/test** to Stripe **live**.  
**Operator checklist (maintenance window):** `docs/PHASE7B_LIVE_STRIPE_CUTOVER_CHECKLIST.md`

## Authority model (unchanged)

| Layer | Authority |
|-------|-----------|
| Stripe | Payment authority (customers, subscriptions, invoices) |
| `public.billing` | Application projection of verified webhook state |
| Entitlement evaluator (`evaluate_entitlement` / `feature_allowed`) | Access authority |

Success URLs, client plan flags, and localStorage never grant access.

## Catalog IDs (Phase 7B.1)

| Item | Live (grant after cutover) | Retired sandbox (never grant) |
|------|----------------------------|-------------------------------|
| Stripe account | `acct_1U0irnC56u2NxRIt` | `acct_1U0isCC2Fmi7ZUCb` |
| Professional product | `prod_V0usthAF9WnoGJ` | `prod_V0lUMpnsvxSxP1` |
| Monthly price | `price_1U0t2QC56u2NxRItya8dElyg` · `settlerate_professional_monthly` · **$19/mo** | `price_1U0k4DC2Fmi7ZUCbSniiEewZ` |
| Annual price | `price_1U0t2jC56u2NxRItM185AYK9` · `settlerate_professional_annual` · **$190/yr** | `price_1U0kFVC2Fmi7ZUCb6g0mXIRC` |

## Current production-relevant state (pre-cutover)

| Item | Current value |
|------|----------------|
| Supabase project | `vpcxzbaxhpucvevnkalo` |
| Stripe mode in production secrets (until window) | **Sandbox / test** until secret swap |
| Trial | **7 days** via `PROFESSIONAL_TRIAL_DAYS` in `create-checkout` (subscription_data), not a Price-level trial |
| Edge secrets required | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (+ platform `SUPABASE_*`) |
| Sandbox webhook (reference) | `we_1U0mIkC2Fmi7ZUCbhSBtVdwX` → `…/functions/v1/stripe-webhook` |
| Portal return URL (canonical) | `https://app.settlerate.com/app/account` |
| App origin allowlist | `https://app.settlerate.com` (+ local / Lovable origins in `appOrigin.ts`) |

### Allowlist / catalog touchpoints (must stay in lockstep)

| Location | Role |
|----------|------|
| `src/lib/entitlementContract.ts` | Client mirror + Vitest; `PROFESSIONAL_PRICE_IDS` / `PRODUCT_IDS` |
| `supabase/functions/_shared/entitlementContract.ts` | Edge Checkout / webhook / entitlement evaluation |
| `src/lib/stripe.ts` | UI pricing constants / legacy product helpers |
| `public.is_professional_price` / `resolve_plan_code` | DB access enforcement (via migration `20260804170000_phase6_stripe_sandbox_catalog.sql` today) |
| `supabase/tests/phase6_entitlement.sql` | SQL harness price constant |
| `docs/ENTITLEMENT_CONTRACT.md` | Documented allowlist |

### Phase 7A hardening assumed already in production before live cutover

Do **not** cut over live until these are deployed and sandbox-verified (PR #17 / Phase 7A):

- `409 ALREADY_SUBSCRIBED` + Checkout idempotency keys
- Webhook retrieve-before-map for `customer.subscription.*`
- Metadata-only customer resolve / portal map repair (no email adoption)

See `docs/PHASE7A_DEPLOYMENT.md`.

### Important production risk before cutover

Any `public.billing` rows whose `stripe_customer_id` / `stripe_subscription_id` / `price_id` were created under **sandbox** become invalid or entitlement-hostile once the SQL allowlist and/or `STRIPE_SECRET_KEY` flip to live:

- After the live SQL allowlist migration, sandbox `price_id` values no longer pass `is_professional_price` → immediate Professional **denial** in DB enforcement.
- After the live secret swap, sandbox `cus_` / `sub_` IDs are not usable with `sk_live_`.

**Mandatory gate (see §4.1):** inventory and **clear** all sandbox billing projections **before** any SQL allowlist migration. Do not proceed on a soft checklist alone.

### Beta trial policy (founder decision — documented)

**Decision for closed beta cutover:** New live customers receive the standard **7-day Professional trial** (application-controlled via `create-checkout` / `PROFESSIONAL_TRIAL_DAYS`).

Users who previously held sandbox trials or sandbox Professional subscriptions are **eligible for that same first live trial** when they first subscribe in live mode (sandbox history is not used to deny it).

Rationale: sandbox history is discarded with billing cleanup; live Stripe customers are new objects; `create-checkout` trial eligibility will not see sandbox Stripe subscription history under `sk_live_`.

**Not in scope for cutover:** denying live trial based on sandbox history. If product later needs “one trial per human forever,” that requires a separate durable store and is a later phase.

**Accepted:** Founder / Adam Carpenter (recorded in Phase 7B checklist §0.1, 2026-08-04).

---

## 1. Live Stripe account preparation

Perform in the **live** Stripe Dashboard (or API) for the SettleRate live account. Record every ID in a founder-controlled cutover worksheet (not invented in code).

### 1.1 Product

Create **one** live product:

| Field | Value |
|-------|--------|
| Name | SettleRate Professional |
| Description | Paid access to SettleRate’s full mortgage decision-support capabilities |
| Active | true |
| Metadata | `app=settlerate`, `plan_code=professional`, `environment=live` |

Do **not** create Free, Advisor, or unused products.

### 1.2 Prices

Create **two** recurring prices on that product (match sandbox commercial terms unless founder changes pricing):

| Lookup key | Amount | Interval |
|------------|--------|----------|
| `settlerate_professional_monthly` | 1900 ($19.00 USD) | month |
| `settlerate_professional_annual` | 19000 ($190.00 USD) | year |

Both active. Record live `price_…` and `prod_…` IDs.

### 1.3 Trial settings

- Keep trial as **application-controlled**: `create-checkout` sets `subscription_data.trial_period_days = PROFESSIONAL_TRIAL_DAYS` (7) for eligible first-time Professional checkout.
- Do **not** attach a conflicting Price-level trial unless product intentionally changes.
- Confirm live Checkout still omits trial for returning customers (prior **live** allowlisted sub / billing history) per Phase 7A trial-eligibility logic.
- Apply the **beta trial policy** above: sandbox-era users may receive a fresh live trial after cutover.

### 1.4 Customer Portal

Configure the **live** Customer Portal (default configuration or dedicated config linked to Checkout):

| Setting | Required |
|---------|----------|
| Cancel | Cancel at period end (or Flexible Billing equivalent that preserves access through period end) |
| Payment method update | Enabled |
| Invoice history | Enabled |
| Customer update (name/email/address) | Per product preference; email changes must not break `metadata.user_id` binding |
| Subscription plan switch (monthly ↔ annual) | **Off** unless separately authorized (Phase 7A portal was plan-switch off) |
| `default_return_url` | `https://app.settlerate.com/app/account` |

### 1.5 Webhook endpoint

Create a **live** webhook endpoint:

| Field | Value |
|-------|--------|
| URL | `https://vpcxzbaxhpucvevnkalo.supabase.co/functions/v1/stripe-webhook` |
| API version | Prefer the version already used by edge Stripe SDK / known-good Basil/Dahlia handling (align with deployed `stripe` package API version in edge functions) |
| Events | `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed` |
| Metadata | `app=settlerate`, `environment=live`, `project=vpcxzbaxhpucvevnkalo` |

Record endpoint id (`we_…`) and **signing secret** (`whsec_…`). Never commit the secret.

### 1.6 Signing secret & API keys

| Secret | Live value |
|--------|------------|
| Stripe secret key | `sk_live_…` (restricted key preferred: Checkout, Customers, Subscriptions, Billing Portal, Prices read) |
| Webhook signing secret | `whsec_…` for the live endpoint above |
| Publishable key | `pk_live_…` only if/when client-side Stripe.js is introduced (currently Checkout is server-created; no pk required in SPA) |

Verify Dashboard shows **Live mode** (not Test) when creating all of the above.

### 1.7 Founder worksheet (fill before any deploy)

```text
Live account id:           acct_1U0irnC56u2NxRIt
Live product id:           prod_V0usthAF9WnoGJ
Live monthly price id:     price_1U0t2QC56u2NxRItya8dElyg
Live annual price id:      price_1U0t2jC56u2NxRItM185AYK9
Live webhook endpoint id:  we_1U0tp5C56u2NxRItISK9qakr
Live portal config id:     bpc_1U0trlC56u2NxRIt8ypZMHAR
Cutover window (UTC):      ____________________
Operator / rollback:       Founder / Adam Carpenter
```

---

## 2. Application configuration changes

### 2.1 Supabase Edge Function secrets (project `vpcxzbaxhpucvevnkalo`)

| Secret | Action at cutover |
|--------|-------------------|
| `STRIPE_SECRET_KEY` | Replace sandbox `sk_test_…` with live `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | Replace sandbox `whsec_…` with **live** endpoint `whsec_…` |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Unchanged (platform-managed) |

Secrets are read by:

- `stripe-webhook` — `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`
- `create-checkout` — `STRIPE_SECRET_KEY`
- `customer-portal` — `STRIPE_SECRET_KEY`

Set secrets via Supabase Dashboard or `supabase secrets set` — **never** in git.

### 2.2 Environment variables (frontend)

Current SPA uses Vite env for Supabase URL/anon key (`.env`: `VITE_SUPABASE_*`). No Stripe secret belongs in the frontend.

Hardcoded production function hosts (today):

- `src/components/billing/UpgradeModal.tsx` → `create-checkout`
- `src/pages/app/Account.tsx` → `customer-portal`
- `src/hooks/useSubscription.ts` → `check-subscription`

These already point at `vpcxzbaxhpucvevnkalo`. Cutover does **not** require host changes unless the project moves. Optional follow-up (not blocking cutover): derive function base URL from `VITE_SUPABASE_URL`.

### 2.3 Function configuration

| Item | Cutover action |
|------|----------------|
| `supabase/config.toml` `verify_jwt = false` for billing functions | Unchanged (auth enforced inside handlers / webhook signature) |
| Stripe API version in edge `Stripe` constructors | Keep aligned across `create-checkout`, `customer-portal`, `stripe-webhook` when redeploying |
| Sandbox webhook endpoint | Leave enabled for a short soak **or** disable after live endpoint is healthy (avoid dual-delivery confusion if both point at the same URL with different secrets — **only one signing secret can be active per secret slot**) |

**Critical:** A single `STRIPE_WEBHOOK_SECRET` secret means the function can verify **one** endpoint secret at a time. During cutover, switch the secret when the live endpoint becomes authoritative. Do not expect sandbox and live webhooks to verify simultaneously against one secret.

### 2.4 Documentation to update in the implementation PR (when authorized)

- `docs/ENTITLEMENT_CONTRACT.md` — live price/product IDs; move sandbox IDs to “never grant / legacy”
- `docs/PHASE7A_DEPLOYMENT.md` — mark live cutover section executed / superseded by this plan’s completion record
- This file — add “Cutover executed” appendix with timestamps and IDs

---

## 3. Allowlist migration

### 3.1 Rule

**Only live Professional price IDs grant Professional after cutover.**  
Sandbox IDs (`price_1U0k…`, `prod_V0lU…`) must **not** remain in `PROFESSIONAL_PRICE_IDS` / `is_professional_price`.

Place retired sandbox IDs in an explicit never-grant list (same pattern as `LEGACY_DELETED_PROFESSIONAL_PRICE_IDS`) for documentation and regression tests.

### 3.2 Code changes (single PR when authorized)

1. Update `PROFESSIONAL_PRICE_IDS` + `PROFESSIONAL_PRODUCT_IDS` in:
   - `src/lib/entitlementContract.ts`
   - `supabase/functions/_shared/entitlementContract.ts`
2. Update `STRIPE_PRO_*` in `src/lib/stripe.ts`
3. Keep lookup key **names** stable (`settlerate_professional_monthly` / `_annual`) if live prices use the same lookup keys
4. Update fixtures/tests that hardcode sandbox price strings (`supabase/tests/phase6_entitlement.sql`, entitlement tests as needed)
5. Update `docs/ENTITLEMENT_CONTRACT.md`

### 3.3 SQL migration (required)

Add a new migration, e.g. `YYYYMMDDHHMMSS_phase7b_live_stripe_catalog.sql`, that replaces:

```sql
CREATE OR REPLACE FUNCTION public.is_professional_price(p_price_id text) ...
CREATE OR REPLACE FUNCTION public.resolve_plan_code(p_price_id text) ...
```

with the **live** price IDs only (mirror `20260804170000_phase6_stripe_sandbox_catalog.sql` structure).

Do **not** edit historical migrations in place.

### 3.4 Deploy / secret ordering (explicit)

Live prices do not exist under a test key; sandbox prices do not exist under a live key. **Never** leave production in a mixed state outside the mandatory maintenance window.

**Required order inside maintenance (C→E):**

1. **Mandatory maintenance ON** (§4.2) — Checkout disabled.
2. **Sandbox billing cleanup gate PASS** (§4.1) — before any SQL allowlist change.
3. **Sandbox Checkout drain PASS** (§4.3) — no completable open sandbox sessions.
4. **Disable sandbox webhook** pointing at production URL (§4.4 step W).
5. **Apply SQL migration** (live `is_professional_price` only).
6. **Deploy edge code** with live allowlist (first deploy in the window).
7. **Set secrets** to live `sk_live_…` + live `whsec_…`.
8. **Redeploy the same billing edge functions again** so every isolate loads the new secrets (deploy-before-secrets alone is insufficient).
9. **Checkpoint after secret update/redeploy PASS** (§4.5).
10. Deploy frontend → smoke → maintenance OFF only after **before beta opening** checkpoint PASS.

Never: live key + sandbox allowlist, or sandbox key + live allowlist, outside this window.

---

## 4. Production deployment sequence

### 4.0 Preconditions (before maintenance window)

- [x] Phase 7A merged and deployed; sandbox smoke green
- [x] Founder worksheet (§1.7) complete with live IDs; window opens at G0 (authorized; cutover not started)
- [x] Founder accepts **beta trial policy** — new live customers get standard 7-day Professional trial
- [x] Database backup / PITR confirmed (founder pre-window)
- [x] Cutover code on `main` (live allowlist TS + SQL migration + docs + Checkout maintenance switch; PRs #18–#22)
- [x] Full CI green on cutover commits
- [x] Maintenance messaging ready (G0 procedure in checklist)
- [x] Rollback operator available — Founder / Adam Carpenter (§6)
- [x] **AUTHORIZED TO BEGIN CUTOVER** — live Stripe activation only; proceed G0→I with verification after each gate

### 4.1 Gate — sandbox billing cleanup (MANDATORY before SQL)

**Must pass before step M (SQL migration). No exceptions without written founder waiver.**

1. Inventory `public.billing` for any of:
   - sandbox `price_id` values (`price_1U0k4D…`, `price_1U0kFV…`, or any non-live Professional id)
   - sandbox-shaped `stripe_customer_id` / `stripe_subscription_id` created under test mode
   - `entitlement_status` in (`entitled`, `trial_entitled`, `read_only`) backed only by sandbox projection
2. Cancel/delete corresponding **sandbox** Stripe subscriptions/customers if still open (sandbox Dashboard / test mode).
3. **Delete or null-clear** those `public.billing` rows so no sandbox price/customer/subscription remains as the app projection.
4. Confirm admins (if any) rely on `user_roles`, not sandbox billing.

#### Checkpoint — before SQL migration

| Check | Pass |
|-------|------|
| Count of billing rows with sandbox Professional `price_id` | **0** |
| Count of billing rows with non-null `stripe_customer_id` that are known sandbox cus_ from test account | **0** (or founder-signed waiver listing each row) |
| `is_professional_price` still sandbox (pre-migration) | expected; do not migrate yet |
| Maintenance ON (§4.2) | **yes** |

**STOP** if any check fails.

### 4.2 Gate — maintenance mode (MANDATORY for entire C→E window)

Maintenance **must** remain on from before sandbox cleanup completion through secret redeploy checkpoint, and should stay on until the “before beta opening” checkpoint passes.

Required controls:

1. **Server env** `CHECKOUT_MAINTENANCE` (`true` / `1` / `on` / `yes`) on Supabase Edge secrets. When enabled, `create-checkout` returns **HTTP 503** with `code: "CHECKOUT_MAINTENANCE"` before auth/Stripe work. Unset/off by default. Request body/headers must not control this gate (`src/lib/checkoutMaintenance.ts` + edge `_shared` mirror).
2. Upgrade / Subscribe CTAs hidden or disabled in the deployed frontend used during the window (banner acceptable; UI is complementary — server gate is authoritative).
3. Operators do not manually create live Checkout Sessions for real users until maintenance ends.
4. After enabling/disabling the secret, **redeploy `create-checkout`** so isolates load the new value.

### 4.3 Gate — sandbox Checkout drain (MANDATORY before secret swap)

Before disabling the sandbox webhook and before setting live secrets:

1. With maintenance ON, list open Checkout Sessions in **sandbox** for SettleRate Professional prices (Stripe Dashboard or API `checkout.sessions.list` with status `open`).
2. **Expire** every open session (`checkout.sessions.expire`) so none can complete after the secret flip.
3. Confirm no in-flight browser Checkout tabs are expected to complete (communicate freeze).

#### Checkpoint — before secret swap (includes drain + webhook disable)

| Check | Pass |
|-------|------|
| Open sandbox Checkout Sessions for Professional prices | **0** |
| Sandbox webhook endpoint to prod URL | **disabled** |
| Maintenance ON | **yes** |
| Sandbox billing cleanup gate | already **PASS** |

**STOP** if any check fails.

### 4.4 Ordered steps (execute once)

| Step | Action | Notes |
|------|--------|-------|
| A | Create live Stripe catalog, portal, webhook (§1) | No app deploy yet; live webhook may exist but will not verify until live `whsec` is set |
| B | Merge cutover PR (code + SQL file + maintenance switch) when ready to enter the window | Do not apply SQL until gates pass |
| **G0** | **Maintenance ON** | §4.2 — start of C→E window |
| **G1** | **Sandbox billing cleanup** | §4.1 — **Checkpoint: before SQL** must PASS |
| **G2** | **Sandbox Checkout drain** | Expire all open sandbox Professional sessions — §4.3 |
| **W** | **Disable sandbox webhook** endpoint that posts to production `stripe-webhook` | **Before** secret swap; prevents sandbox 400 noise and accidental dual-mode confusion |
| **C** | Apply SQL migration to production | Live `is_professional_price` only |
| | | **Checkpoint: after SQL** must PASS |
| **D1** | Deploy edge functions with **live allowlist code** (still sandbox secrets) | Order: `stripe-webhook` → `create-checkout` → `customer-portal` → `check-subscription`. Checkout remains 503. |
| **E** | Set Supabase secrets: live `sk_live_…` + live `whsec_…` | |
| **D2** | **Redeploy** the same four billing functions | **Required** so isolates load new secrets |
| | | **Checkpoint: after secret update/redeploy** must PASS |
| F | Confirm live webhook path (unsigned 400; optional signed resend/smoke event 2xx) | |
| G | Deploy frontend bundle with live allowlist + maintenance still ON (or remove CTA only after H) | |
| | | **Checkpoint: before beta opening** must PASS |
| H | Maintenance OFF — re-enable Checkout | |
| I | Run production smoke (§5) | Before public announce |
| J | Cancel leftover sandbox test customers/subs if any remain in test mode | Housekeeping |

### 4.5 Pass/fail checkpoints (summary)

#### After SQL migration

| Check | Pass |
|-------|------|
| `is_professional_price('<live_monthly>')` | **true** |
| `is_professional_price('<live_annual>')` | **true** |
| `is_professional_price('price_1U0k4DC2Fmi7ZUCbSniiEewZ')` (sandbox monthly) | **false** |
| `is_professional_price('price_1U0kFVC2Fmi7ZUCb6g0mXIRC')` (sandbox annual) | **false** |
| Billing rows still holding sandbox Professional `price_id` | **0** |

**STOP** if any check fails — do not set live secrets.

#### After secret update / redeploy (D2)

| Check | Pass |
|-------|------|
| Production `STRIPE_SECRET_KEY` is live mode (`sk_live_` prefix; do not log full key) | **yes** |
| Production `STRIPE_WEBHOOK_SECRET` is the **live** endpoint’s `whsec_` | **yes** |
| Sandbox webhook to prod URL still disabled | **yes** |
| Live secret can retrieve live Professional prices (`livemode: true`) | **yes** |
| Operator creates (and immediately expires) one live Checkout Session via Stripe API or a controlled smoke call | **live session** (`livemode: true`); expire before continuing |
| `create-checkout` still returns maintenance `503` for normal users | **yes** (until §4.5 “before beta opening” + step H) |
| Unsigned POST to `stripe-webhook` | **400** |
| Deployed edge allowlist is live-only (sandbox price IDs rejected) | **yes** |

**STOP** if any check fails — keep maintenance ON; fix forward or roll back per §6.

#### Before beta opening (before maintenance OFF)

| Check | Pass |
|-------|------|
| After-SQL and after-secret checkpoints | both **PASS** |
| Live Customer Portal return URL | `https://app.settlerate.com/app/account` |
| No open sandbox Professional Checkout sessions | **0** |
| Sandbox billing cleanup still clean (no reintroduced sandbox rows) | **yes** |
| Production smoke (§5) items 1–9 | **PASS** (item 10–11 as applicable) |
| Founder go/no-go (§9) | **go** |

**STOP** if any check fails — do not announce; keep Checkout disabled.

### 4.6 Why this order

- **Billing cleanup before SQL:** prevents live allowlist from instantly denying leftover sandbox `price_id` rows.
- **Maintenance + Checkout drain before secret swap:** prevents sandbox Checkout completion after `whsec`/`sk` flip (orphan sandbox charges / missing projection).
- **Sandbox webhook disable before secret swap:** avoids dual-mode signature failures and confused monitoring.
- **SQL before live Checkout traffic:** DB and edge allowlists agree before any live sub can be purchased.
- **Secrets then redeploy:** edge isolates must reload env; a single deploy before `secrets set` is not enough.
- **Frontend last / maintenance OFF last:** UI cannot outrun server; beta opens only after checkpoints.

---

## 5. Production smoke test checklist

Use a **dedicated non-admin live smoke account** (not a founder admin). Prefer a real card with immediate refund/cancel, or Stripe test... **Live mode requires real payment methods** — use a low-cost monthly plan and cancel promptly, or a card that can authorize then cancel during trial.

> Trial-first path: complete Checkout with trial eligibility → card authorized but not charged until trial end → cancel in portal before trial ends.

| # | Scenario | Pass criteria |
|---|----------|----------------|
| 1 | New signup | Create account; Free tier; ≤2 scenarios |
| 2 | Checkout | Upgrade → Stripe Checkout (live) for monthly or annual; allowlisted live price only |
| 3 | Trial creation | Eligible user gets 7-day trial; Stripe sub `trialing` |
| 4 | Professional entitlement | Webhook projects billing; `trial_entitled` or `entitled`; PDF/share/comparison allowed |
| 5 | Customer Portal | Manage billing opens live portal; return URL lands on `/app/account` |
| 6 | Cancellation | Schedule cancel; access remains through `current_period_end` while `active`/`trialing` |
| 7 | Webhook processing | `customer.subscription.*` / `invoice.*` appear in `stripe_webhook_events` with `action_taken=updated` (or intentional skip); billing matches Stripe Dashboard |
| 8 | Duplicate checkout protection | Second Upgrade → `409 ALREADY_SUBSCRIBED`; no second live subscription |
| 9 | Idempotency | Replay/resend one processed event to live webhook endpoint → single claim row; no entitlement flip |
| 10 | Returning customer trial | After cancel/expire (or use second path), re-subscribe omits trial when eligibility fails |
| 11 | Portal repair (optional, staging-like) | Only if safe: clear map for metadata-bound live customer → portal repairs; do **not** use on real customer without consent |

Record Stripe live customer id, subscription id, and event ids in the cutover log.

---

## 6. Rollback plan

### 6.1 When to roll back

- Live Checkout cannot create sessions
- Webhooks fail signature verification at rate
- Allowlist/DB mismatch (paid but `free` entitlement)
- Duplicate subscriptions created
- Portal cannot open for newly mapped live customers

### 6.2 Immediate containment

1. **Keep or re-enable maintenance** — `create-checkout` → `503 CHECKOUT_MAINTENANCE`; hide Upgrade CTA.
2. **Stop live webhook damage** — if signatures fail, fix `STRIPE_WEBHOOK_SECRET` before re-enabling traffic; do not point sandbox secret at live endpoint.
3. **Leave sandbox webhook disabled** until a deliberate sandbox fallback is authorized as a full coordinated rollback.
4. **Do not** bulk-delete `billing` rows for users who already have live `cus_` / `sub_` without founder approval.

### 6.3 Revert deployments

| Layer | Rollback action |
|-------|-----------------|
| Frontend | Redeploy previous bundle (sandbox allowlist constants) **only if** also reverting edge + secrets + SQL together |
| Edge functions | Redeploy previous Phase 7A artifacts |
| Secrets | Restore prior `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` **only** if reverting to sandbox mode intentionally |
| SQL | Apply a reverse migration restoring sandbox `is_professional_price` IDs **or** re-apply known-good function bodies from `20260804170000_…` — only as a coordinated sandbox fallback |

**Partial rollback is dangerous.** Prefer: Checkout off → fix forward on live → smoke → Checkout on.

### 6.4 Active subscribers

| Situation | Action |
|-----------|--------|
| No live subscribers yet | Safe to revert allowlist/secrets after Checkout disable; clear any accidental live test customers |
| Live subscribers exist | **Do not** revert to sandbox key. Fix forward. Preserve `billing` projection; reconcile from Stripe live Dashboard |
| Sandbox-era billing rows still present | Clear or leave free; do not expect portal to manage sandbox customers with live key |

### 6.5 Entitlement integrity

- Never grant Professional from success URL or manual SQL “force entitled” without a matching live Stripe subscription.
- After incident: for each affected user, compare Stripe live subscription status/price/period to `billing`, then let webhook retrieve-on-write converge (or carefully replay events).
- Admins continue to use role bypass (not billing).

---

## 7. Security checklist

### 7.1 Secrets

- [ ] No `sk_live_`, `sk_test_`, or `whsec_` in git, PR diffs, screenshots, or CI logs
- [ ] Live secrets set only via Supabase secrets / approved secret manager
- [ ] Sandbox keys removed from production secret slots after cutover
- [ ] Rotate any sandbox secret that was exposed during Phase 7A smoke (test mode)
- [ ] Prefer restricted live secret key with least privilege

### 7.2 Stripe mode verification

- [ ] Dashboard **Live** mode when creating catalog/webhook/portal
- [ ] Live Checkout URL uses live mode (not `checkout.stripe.com` test session patterns for go-live sign-off)
- [ ] `livemode: true` on created Customer / Subscription objects used for smoke
- [ ] Webhook endpoint list shows live endpoint enabled for production URL

### 7.3 Webhook signature verification

- [ ] `stripe-webhook` rejects unsigned/invalid payloads (expect 400)
- [ ] Live `whsec_` matches the live endpoint signing secret
- [ ] Idempotency table `stripe_webhook_events` remains unique on `event_id`
- [ ] No reliance on client-reported subscription status

### 7.4 No sandbox IDs remaining as grantors

- [ ] `PROFESSIONAL_PRICE_IDS` contains **only** live prices
- [ ] `is_professional_price` SQL matches TS allowlist
- [ ] `src/lib/stripe.ts` live IDs only for active constants
- [ ] Sandbox `price_1U0k…` / `prod_V0lU…` only in never-grant / legacy lists or docs history
- [ ] Repo-wide search for `price_1U0k`, `prod_V0lU`, `acct_1U0is`, `sk_test_` as active grantors returns clean

### 7.5 Binding & abuse controls (already in Phase 7A — re-confirm live)

- [ ] Portal/Checkout never bind by email alone
- [ ] `ALREADY_SUBSCRIBED` prevents overlapping Professional Checkout
- [ ] Success URL does not grant entitlement

---

## 8. Suggested implementation PR shape (after approval)

When Phase 7B implementation is authorized, prefer **one** draft PR:

1. Live allowlist TS (both entitlement copies + `stripe.ts`)
2. SQL migration `phase7b_live_stripe_catalog`
3. Doc updates (`ENTITLEMENT_CONTRACT`, cutover record)
4. Test/harness price constant updates
5. **Mandatory:** Checkout maintenance switch (`503 CHECKOUT_MAINTENANCE` + UI disable path)

Ops steps (Stripe Dashboard + `supabase secrets set` + function deploy + webhook disable + session expire) remain **operator-run** from this plan — not silent agent actions without authorization.

---

## 9. Go / no-go

| Go | No-go |
|----|-------|
| Phase 7A live in prod; sandbox smoke green | Allowlist/SQL/edge mismatch |
| Founder worksheet complete; beta trial policy accepted | Sandbox billing rows remain at SQL migration time |
| Backup + rollback owner assigned | Open sandbox Checkout sessions remain at secret swap |
| All §4.5 checkpoints PASS | Sandbox webhook still enabled at secret swap |
| Maintenance held through C→E | Secrets set without subsequent edge redeploy (D2) |
| Live prices created in **Live** mode | Live prices created in Test mode by mistake |

---

## Related documents

- `docs/PHASE7A_DEPLOYMENT.md` — sandbox hardening deploy + deferred cutover stub
- `docs/PHASE6_DEPLOYMENT.md` — entitlement migrations and grants
- `docs/ENTITLEMENT_CONTRACT.md` — plan/price/trial contract
- `docs/SECURITY_MODEL.md` — security baseline
- `docs/superpowers/plans/2026-08-04-phase7a-beta-billing-hardening.md` — Phase 7A implementation history

---

## Authorization gate

This file is a **plan**. Creating live Stripe objects, changing secrets, applying migrations, deploying functions, or merging allowlist PRs requires explicit founder approval of Phase 7B implementation.
