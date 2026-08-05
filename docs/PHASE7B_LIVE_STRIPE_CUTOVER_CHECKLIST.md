# Phase 7B — Live Stripe Cutover Execution Checklist

**Authority:** `docs/PHASE7B_LIVE_STRIPE_CUTOVER_PLAN.md`  
**Project:** Supabase `vpcxzbaxhpucvevnkalo` · App `https://app.settlerate.com`  
**Do not start the maintenance window until Section 0 is complete.**  
**Owners:** Founder = human decision / Stripe Dashboard / secret custody · Cursor = repo PR / deploys / SQL checks (when authorized) · Supabase = Dashboard SQL / secrets / function host · Stripe = Live & Test Dashboards / API

### Global STOP conditions (any time)

| Condition | Action |
|-----------|--------|
| Sandbox billing not zero (before/at SQL) | **STOP** — do not apply SQL / do not set live secrets |
| SQL verification failure | **STOP** — do not set live secrets; keep maintenance ON |
| Webhook signature failure (live `whsec` / unsigned not 400 / live deliveries failing) | **STOP** — keep maintenance ON; fix secret or rollback per §R |
| Live checkout failure (cannot create livemode session with live key) | **STOP** — keep maintenance ON |
| Entitlement mismatch (paid/trialing in Stripe live but app not `trial_entitled`/`entitled`, or free user granted Professional) | **STOP** — keep maintenance ON; do not announce |

### Rollback decision points

| After step | If failed | Decision |
|------------|-----------|----------|
| 0 / 1 (pre-window) | Prep incomplete | **Abort window** — no production changes |
| 2 (maintenance ON) | Cannot disable Checkout | **Abort** — fix PR/deploy; do not touch SQL/secrets |
| 3 (billing cleanup) | Sandbox billing ≠ 0 | **STOP** — clear or founder waiver; do not SQL |
| 4–5 (drain / disable sandbox webhook) | Open sessions remain / webhook still enabled | **STOP** — do not secret-swap |
| 6 (SQL) | Checkpoint fail | **STOP** — do not secrets; consider SQL reverse only under founder order |
| 7–9 (D1 / secrets / D2) | Live key/webhook/checkout fail | **Keep maintenance ON** · fix forward preferred · full sandbox restore only if no live subscribers (§R) |
| 10–12 (smoke / open beta) | Entitlement mismatch or smoke fail | **Do not turn maintenance OFF** / re-enable maintenance if already off |

---

## 0. Pre-window (before maintenance)

### 0.1 Decisions and worksheet

- [ ] **Founder** — Authorize Phase 7B execution for this window  
  - Evidence: written approval (chat/email) with window UTC  
- [x] **Founder** — Accept beta trial policy  
  - **Policy:** New live customers receive the standard **7-day Professional trial** (application-controlled via `create-checkout` / `PROFESSIONAL_TRIAL_DAYS`). Sandbox-era history is not used to deny a first live trial.  
  - Evidence: recorded in this checklist (2026-08-04)  
- [ ] **Founder** — Fill live worksheet window times (IDs already recorded; no secrets in git):

```text
Live account id:           acct_1U0irnC56u2NxRIt
Live product id:           prod_V0usthAF9WnoGJ
Live monthly price id:     price_1U0t2QC56u2NxRItya8dElyg
Live annual price id:      price_1U0t2jC56u2NxRItM185AYK9
Live webhook endpoint id:  we_1U0tp5C56u2NxRItISK9qakr
Live portal config id:     bpc_1U0trlC56u2NxRIt8ypZMHAR
Window start (UTC):        ____________________
Window end target (UTC):   ____________________
Operator / rollback:       Founder / Adam Carpenter
```

- [x] **Founder** — Live account ID recorded — `acct_1U0irnC56u2NxRIt`  
- [x] **Founder** — Live product + prices created (Phase 7B.1) — IDs above  
  - Evidence: Stripe Live Dashboard product `prod_V0usthAF9WnoGJ`  
- [x] **Founder** — Live webhook endpoint ID recorded — `we_1U0tp5C56u2NxRItISK9qakr`  
- [x] **Founder** — Live Customer Portal config ID recorded — `bpc_1U0trlC56u2NxRIt8ypZMHAR`

### 0.2 Live Stripe catalog (Live mode toggle ON)

Dashboard: [Stripe Dashboard](https://dashboard.stripe.com) → ensure **Live** (not Test)

- [ ] **Founder / Stripe** — Product “SettleRate Professional” created + metadata `app=settlerate`, `plan_code=professional`, `environment=live`  
  - Evidence: `prod_…` on worksheet; screenshot or Dashboard URL  
- [ ] **Founder / Stripe** — Monthly price $19 (`settlerate_professional_monthly`, 1900 USD/month)  
  - Evidence: `price_…` on worksheet  
- [ ] **Founder / Stripe** — Annual price $190 (`settlerate_professional_annual`, 19000 USD/year)  
  - Evidence: `price_…` on worksheet  
- [ ] **Founder / Stripe** — No Price-level trial (app controls 7-day trial)  
  - Evidence: price settings show no trial  
- [ ] **Founder / Stripe** — Customer Portal: cancel at period end (or Flexible equiv.), payment methods, invoices; plan switch **off**; `default_return_url` = `https://app.settlerate.com/app/account`  
  - Evidence: Portal settings screenshot / config id `bpc_…`  
- [ ] **Founder / Stripe** — Live webhook endpoint → `https://vpcxzbaxhpucvevnkalo.supabase.co/functions/v1/stripe-webhook`  
  - Events: `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.paid`, `invoice.payment_failed`  
  - Evidence: `we_…` on worksheet; signing secret stored in founder secret store (**not** pasted into chat/git)  
- [ ] **Founder / Stripe** — Live secret key available (`sk_live_…`, restricted preferred) in founder secret store  

### 0.3 Repo / CI

- [x] **Cursor** — Cutover code on `main`: live allowlists (PR #18), Free limit 2 (PR #19), maintenance gate (PR #20), cutover docs (PR #21/#22)  
  - Evidence: `main` @ merge of PRs #18–#22; CI validate green on those PRs  
  - Maintenance gate: server env/secret `CHECKOUT_MAINTENANCE` (`true`/`1`/`on`/`yes`) on project `vpcxzbaxhpucvevnkalo`; `create-checkout` returns **503** + `code: CHECKOUT_MAINTENANCE`. Default unset = off. Never client-controlled. **Not enabled in production until G0.**  
- [x] **Cursor** — Validation green on merged cutover commits (PR CI)  

### 0.4 Backup and roles

- [ ] **Founder / Supabase** — Database backup / PITR note for project `vpcxzbaxhpucvevnkalo`  
  - Evidence: backup timestamp or Dashboard confirmation  
  - Location: Supabase Dashboard → Project → Database → Backups  
- [x] **Founder** — Rollback operator named and available for the window  
  - Evidence: **Founder / Adam Carpenter**  

**STOP if Section 0 incomplete — do not enter maintenance.**

---

## 1. Enter maintenance window (G0)

- [ ] **Cursor / Founder** — Enable Checkout maintenance (`create-checkout` → `503` + `CHECKOUT_MAINTENANCE`; Upgrade CTA disabled/banner)  
  - How: deploy `create-checkout` with maintenance gate code (if not already), then set server secret (no client flag):

```bash
supabase secrets set CHECKOUT_MAINTENANCE=true --project-ref vpcxzbaxhpucvevnkalo
# Redeploy create-checkout so isolates load the secret (same D2 discipline as Stripe secrets)
supabase functions deploy create-checkout --project-ref vpcxzbaxhpucvevnkalo
```

  - Confirm via:

```bash
curl -sS -o /tmp/co.json -w "%{http_code}" \
  -X POST "https://vpcxzbaxhpucvevnkalo.supabase.co/functions/v1/create-checkout" \
  -H "Authorization: Bearer <SMOKE_OR_USER_JWT>" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -H "Origin: https://app.settlerate.com" \
  -d '{"priceType":"annual","maintenance":false}'
# Expect: HTTP 503 and code CHECKOUT_MAINTENANCE (body flag ignored)
```

  - Evidence: HTTP 503 + JSON `code`  
  - Disable after cutover: `supabase secrets unset CHECKOUT_MAINTENANCE --project-ref vpcxzbaxhpucvevnkalo` (or set `false`) + redeploy `create-checkout`
- [ ] **Founder** — Announce freeze (no Checkout / no billing changes)  

**Rollback decision:** If maintenance cannot be enforced → **Abort window** (no SQL, no secret changes).

---

## 2. Sandbox billing cleanup gate (G1) — before SQL

Use **Test mode** Stripe + Supabase SQL.

### 2.1 Inventory

- [ ] **Cursor / Supabase** — Run inventory SQL (adjust live price ids out of “sandbox” once known; before migration, treat current Professional allowlist as sandbox):

```sql
-- Supabase Dashboard → SQL → New query (project vpcxzbaxhpucvevnkalo)
SELECT user_id, stripe_customer_id, stripe_subscription_id, price_id,
       subscription_status, entitlement_status
FROM public.billing
WHERE price_id IN (
    'price_1U0k4DC2Fmi7ZUCbSniiEewZ',
    'price_1U0kFVC2Fmi7ZUCb6g0mXIRC'
  )
   OR stripe_customer_id IS NOT NULL
   OR stripe_subscription_id IS NOT NULL
ORDER BY user_id;
```

  - Evidence: result set saved (row count)

### 2.2 Clear sandbox Stripe + billing

- [ ] **Founder / Stripe (Test)** — Cancel open test subscriptions / delete disposable test customers tied to inventory  
  - Location: Stripe Dashboard → **Test mode** → Customers / Subscriptions  
- [ ] **Cursor / Supabase** — Delete **only inventoried** sandbox projection rows (paste `user_id` list from §2.1; do not run a blind table wipe):

```sql
-- Replace with exact user_ids from inventory. Review each row first.
DELETE FROM public.billing
WHERE user_id IN (
  -- 'uuid-from-inventory-1',
  -- 'uuid-from-inventory-2'
);
```

  - Evidence: `DELETE` row count equals inventoried sandbox rows; re-inventory empty for sandbox prices/customers  

### 2.3 Checkpoint — before SQL migration

- [ ] **Cursor / Supabase** — Verify zero sandbox Professional prices in billing:

```sql
SELECT count(*)::int AS sandbox_price_rows
FROM public.billing
WHERE price_id IN (
  'price_1U0k4DC2Fmi7ZUCbSniiEewZ',
  'price_1U0kFVC2Fmi7ZUCb6g0mXIRC'
);
-- PASS: 0
```

- [ ] **Cursor / Supabase** — Verify zero leftover mapped customers (pre-live expectation):

```sql
SELECT count(*)::int AS mapped_customers
FROM public.billing
WHERE stripe_customer_id IS NOT NULL;
-- PASS: 0 (or founder waiver list attached)
```

- [ ] **Cursor** — Confirm maintenance still ON (503)  
- [ ] **Founder** — Sign waiver **only if** nonzero rows retained (list `user_id` + reason); otherwise require 0  

### STOP — sandbox billing not zero

If `sandbox_price_rows ≠ 0` or unwaived `mapped_customers ≠ 0` → **STOP**. Do not apply SQL. Do not set live secrets.

**Rollback decision:** Stay in maintenance; finish cleanup; re-run checkpoint.

---

## 3. Sandbox Checkout drain (G2)

- [ ] **Founder / Stripe (Test)** — List open Checkout Sessions  
  - Location: Stripe Dashboard → **Test** → Payments / Checkout Sessions (filter status Open), or:

```bash
# Test mode key only
stripe checkout sessions list --status=open --api-key "$STRIPE_TEST_SECRET"
```

- [ ] **Founder / Stripe (Test)** — Expire each open Professional session:

```bash
stripe checkout sessions expire <cs_test_...> --api-key "$STRIPE_TEST_SECRET"
```

- [ ] **Founder** — Confirm team will not complete any open test Checkout tabs  

Evidence: open Professional sessions = **0**

---

## 4. Disable sandbox webhook (W) — before secret swap

- [ ] **Founder / Stripe (Test)** — Disable sandbox endpoint that posts to  
  `https://vpcxzbaxhpucvevnkalo.supabase.co/functions/v1/stripe-webhook`  
  - Location: Stripe Dashboard → **Test** → Developers → Webhooks → endpoint `we_1U0mIkC2Fmi7ZUCbhSBtVdwX` (or current) → **Disable endpoint**  
  - Evidence: status Disabled  

### Checkpoint — before secret swap

- [ ] Open sandbox Professional Checkout sessions = **0**  
- [ ] Sandbox webhook to prod URL = **disabled**  
- [ ] Maintenance ON  
- [ ] Before-SQL billing checkpoint still PASS  

**STOP** if any fail — do not proceed to SQL/secrets.

---

## 5. Apply SQL migration (C)

- [ ] **Cursor / Supabase** — Apply `phase7b_live_stripe_catalog` migration (live price IDs from worksheet only)  
  - How: `supabase db push --project-ref vpcxzbaxhpucvevnkalo` **or** run migration SQL in Supabase SQL editor after review  
  - Evidence: migration applied timestamp  

### Checkpoint — after SQL migration

Replace `<LIVE_MONTHLY>` / `<LIVE_ANNUAL>` with worksheet IDs:

```sql
SELECT
  public.is_professional_price('price_1U0t2QC56u2NxRItya8dElyg') AS live_monthly_ok,   -- expect true
  public.is_professional_price('price_1U0t2jC56u2NxRItM185AYK9')  AS live_annual_ok,    -- expect true
  public.is_professional_price('price_1U0k4DC2Fmi7ZUCbSniiEewZ') AS sandbox_monthly_denied, -- expect false
  public.is_professional_price('price_1U0kFVC2Fmi7ZUCb6g0mXIRC') AS sandbox_annual_denied;  -- expect false

SELECT count(*)::int AS sandbox_price_rows
FROM public.billing
WHERE price_id IN (
  'price_1U0k4DC2Fmi7ZUCbSniiEewZ',
  'price_1U0kFVC2Fmi7ZUCb6g0mXIRC'
);
-- expect 0
```

- [ ] **Cursor / Supabase** — All expects match  
  - Evidence: query result screenshot or pasted booleans (no secrets)

### STOP — SQL verification failure

If any expect fails → **STOP**. Do not set live secrets. Keep maintenance ON. Founder decides fix-forward SQL vs reverse migration (§R).

---

## 6. Deploy edge with live allowlist (D1) — secrets still old

Deploy order (project `vpcxzbaxhpucvevnkalo`):

```bash
supabase functions deploy stripe-webhook --project-ref vpcxzbaxhpucvevnkalo
supabase functions deploy create-checkout --project-ref vpcxzbaxhpucvevnkalo
supabase functions deploy customer-portal --project-ref vpcxzbaxhpucvevnkalo
supabase functions deploy check-subscription --project-ref vpcxzbaxhpucvevnkalo
```

- [ ] **Cursor** — D1 deploys complete  
  - Evidence: `supabase functions list --project-ref vpcxzbaxhpucvevnkalo` versions/timestamps  
- [ ] **Cursor** — `create-checkout` still **503** maintenance  

**Rollback decision:** If deploy fails → keep maintenance; retry D1; do not secrets yet.

---

## 7. Set live secrets (E)

- [ ] **Founder / Supabase** — Set secrets (Dashboard → Edge Functions → Secrets, or CLI):

```bash
# Values from founder secret store — do not echo
supabase secrets set \
  STRIPE_SECRET_KEY="sk_live_..." \
  STRIPE_WEBHOOK_SECRET="whsec_..." \
  --project-ref vpcxzbaxhpucvevnkalo
```

  - Evidence: secrets updated timestamp (not secret values)  
- [ ] **Founder** — Confirm `STRIPE_SECRET_KEY` starts with `sk_live_` (visual check in UI only)  
- [ ] **Founder** — Confirm `STRIPE_WEBHOOK_SECRET` is the **live** endpoint signing secret (not test)  

---

## 8. Redeploy edge for secret load (D2) — REQUIRED

```bash
supabase functions deploy stripe-webhook --project-ref vpcxzbaxhpucvevnkalo
supabase functions deploy create-checkout --project-ref vpcxzbaxhpucvevnkalo
supabase functions deploy customer-portal --project-ref vpcxzbaxhpucvevnkalo
supabase functions deploy check-subscription --project-ref vpcxzbaxhpucvevnkalo
```

- [ ] **Cursor** — D2 complete (new timestamps after secrets set)  
  - Evidence: function list  

### Checkpoint — after secret update / redeploy

- [ ] **Founder / Stripe (Live)** — Live secret retrieves live prices (`livemode: true`)  
  - Location: Stripe → Live → Products, or API with live key (do not log key)  
- [ ] **Founder / Stripe (Live)** — Create one live Checkout Session for smoke customer/price, confirm `livemode: true`, then **expire** it  
  - Evidence: session id prefix / livemode flag; expired  
- [ ] **Cursor** — Normal `create-checkout` still **503** for regular JWT  
- [ ] **Cursor** — Unsigned webhook rejected:

```bash
curl -sS -o /tmp/wh.json -w "%{http_code}" \
  -X POST "https://vpcxzbaxhpucvevnkalo.supabase.co/functions/v1/stripe-webhook" \
  -H "Content-Type: application/json" \
  -d '{}'
# PASS: HTTP 400
```

- [ ] **Founder / Stripe (Live)** — Sandbox (test) webhook to prod URL still **Disabled**  

### STOP — webhook signature failure

If live endpoint deliveries show signature errors, or unsigned is not 400 → **STOP**. Keep maintenance ON. Re-check `STRIPE_WEBHOOK_SECRET` vs live `we_…` signing secret; redeploy D2 after fix.

### STOP — live checkout failure

If live key cannot create a livemode Checkout Session for allowlisted live price → **STOP**. Keep maintenance ON. Verify live price IDs in code match worksheet; verify `sk_live_` account owns those prices.

**Rollback decision:** No live subscribers yet → founder may order coordinated sandbox restore (§R). If any live sub exists → **fix forward only**.

---

## 9. Frontend deploy (G) — maintenance still ON

- [ ] **Cursor / Founder** — Deploy frontend with live allowlist constants; Keep Upgrade disabled / maintenance banner until Section 11  
  - Evidence: deploy URL / commit SHA on production host  
- [ ] **Founder / Stripe (Live)** — Portal return URL still `https://app.settlerate.com/app/account`  

---

## 10. Production smoke (I) — still before public open if possible

Prefer: briefly disable maintenance **only for smoke account path**, or turn maintenance OFF for smoke then re-enable if fail. Default path below assumes temporary maintenance OFF for smoke under founder watch, then Section 11 gate.

### 10.1 Enable Checkout for smoke only when Founder ready

- [ ] **Founder** — Authorize maintenance OFF for smoke  
- [ ] **Cursor** — Maintenance OFF  

Record:

```text
Smoke user id:     ________________________________
Live customer:     cus_____________________________
Live subscription: sub_____________________________
```

| # | Check | Owner | Pass evidence | ☐ |
|---|--------|-------|---------------|---|
| 1 | New signup / Free tier | Founder | Account exists; free limits | ☐ |
| 2 | Live Checkout | Founder | `livemode` Checkout; live price | ☐ |
| 3 | Trial created | Founder / Stripe | Sub `trialing`; 7-day trial | ☐ |
| 4 | Professional entitlement | Cursor / Supabase | `billing.entitlement_status` = `trial_entitled` or `entitled`; PDF/share OK | ☐ |
| 5 | Customer Portal | Founder | Portal opens; return `/app/account` | ☐ |
| 6 | Cancellation | Founder / Stripe | Cancel scheduled; access through period end | ☐ |
| 7 | Webhook processing | Cursor / Supabase | `stripe_webhook_events` rows `action_taken=updated`; billing matches Dashboard | ☐ |
| 8 | Duplicate checkout | Cursor | Second upgrade → `409 ALREADY_SUBSCRIBED` | ☐ |
| 9 | Idempotency | Founder / Stripe + Cursor | Resend event to live `we_…`; single claim row; no entitlement flip | ☐ |
| 10 | Returning trial omit (optional) | Founder | Re-sub after trial used omits trial | ☐ |

### STOP — entitlement mismatch

If Stripe shows `trialing`/`active` on allowlisted live price but app is not Professional, or free user gets Professional without live sub → **STOP**. Re-enable maintenance immediately. Compare Stripe Dashboard vs:

```sql
SELECT * FROM public.billing WHERE user_id = '<smoke_user_id>';
SELECT event_id, event_type, action_taken, details
FROM public.stripe_webhook_events
WHERE app_user_id = '<smoke_user_id>'
ORDER BY processed_at DESC
LIMIT 20;
```

Do not announce. Fix forward (webhook secret, allowlist, replay) per plan §6.

**Rollback decision:** Smoke fail with no other live customers → cancel smoke sub, keep maintenance ON, fix forward or §R.

---

## 11. Checkpoint — before beta opening

- [ ] After-SQL checkpoint PASS (Section 5)  
- [ ] After-secret/redeploy checkpoint PASS (Section 8)  
- [ ] Smoke items 1–9 PASS (Section 10)  
- [ ] Sandbox billing still clean (re-run zero sandbox `price_id` count)  
- [ ] Sandbox webhook still disabled  
- [ ] Live portal return URL correct  
- [ ] **Founder** — Go / No-go = **GO**  

**STOP** if any fail — maintenance ON; no announce.

---

## 12. Open beta (H)

- [ ] **Cursor** — Maintenance OFF permanently for beta  
  - Evidence: `create-checkout` returns 200 + Checkout URL for eligible free user  
- [ ] **Founder** — Announce closed beta billing live  
- [ ] **Founder / Stripe (Test)** — Optional: delete leftover test customers/subs (housekeeping)  

---

## R. Rollback quick card (keep maintenance ON)

| Situation | Owner | Actions |
|-----------|-------|---------|
| No live subscribers; need sandbox restore | Founder + Cursor + Supabase | Keep Checkout 503 → restore prior edge artifacts → restore `sk_test_` + sandbox `whsec_` → redeploy functions → reverse SQL to sandbox `is_professional_price` → re-enable test webhook only if intentionally returning to sandbox mode |
| Any live subscriber exists | Founder | **Do not** restore sandbox secrets. Fix forward on live. Reconcile `billing` from Stripe Live |
| Webhook signature failures | Founder / Supabase | Correct live `whsec_`; D2 redeploy; confirm unsigned 400 + live delivery 2xx |
| Duplicate live subscriptions | Founder / Stripe | Cancel extras in Live Dashboard; confirm `ALREADY_SUBSCRIBED`; repair `billing` from surviving sub |

---

## Sign-off

| Role | Name | Time (UTC) | Result |
|------|------|------------|--------|
| Founder / rollback | Adam Carpenter | | GO / NO-GO / ABORT |
| Cursor operator | | | |
| Notes | Trial policy accepted: new live customers get standard 7-day Professional trial. | | |

**Worksheet IDs used in production (copy at end of window):**

```text
acct: acct_1U0irnC56u2NxRIt  prod: prod_V0usthAF9WnoGJ  price_mo: price_1U0t2QC56u2NxRItya8dElyg  price_yr: price_1U0t2jC56u2NxRItM185AYK9  we: we_1U0tp5C56u2NxRItISK9qakr  bpc: bpc_1U0trlC56u2NxRIt8ypZMHAR
```
