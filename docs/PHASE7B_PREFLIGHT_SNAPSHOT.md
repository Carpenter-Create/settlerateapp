# Phase 7B — Pre-flight Snapshot Report

> **Historical snapshot** taken before Phase 7B.1 live catalog IDs were recorded in code.
> Current allowlist authority: `docs/ENTITLEMENT_CONTRACT.md` and migration `20260805010000_phase7b_live_stripe_catalog.sql`.

**Captured:** 2026-08-05 (local evening window; UTC ~00:41+ next-day context from CLI timestamps)  
**Operator:** Cursor (read-only pre-flight)  
**Mode:** Pre-flight **only** — no live Stripe objects created, no secrets changed, no deploys, no code modifications.

**Authority for next steps:** `docs/PHASE7B_LIVE_STRIPE_CUTOVER_PLAN.md` · `docs/PHASE7B_LIVE_STRIPE_CUTOVER_CHECKLIST.md`

---

## Verdict

| Gate | Status |
|------|--------|
| Repo / SHA identifiable | **PASS** |
| Working tree understood | **PASS** (untracked Phase 7B docs only) |
| Latest CI validation for cutover base SHA | **PASS** (CI `validate` SUCCESS) |
| Deployed billing edge versions known | **PASS** |
| Supabase project ref confirmed | **PASS** (`vpcxzbaxhpucvevnkalo`) |
| Production still on sandbox catalog (DB + code) | **PASS** |
| Direct proof of `sk_test_` vs `sk_live_` secret prefix | **NOT VERIFIED** (secrets list blocked) |
| Local Stripe CLI points at SettleRate sandbox account | **FAIL / N/A** (CLI logged into different account) |

**Stop after this report.** Do not enter maintenance window until founder completes checklist §0 (live worksheet + authorization) and secret-mode is confirmed in Supabase Dashboard (`STRIPE_SECRET_KEY` starts with `sk_test_`).

---

## 1. Git branch and commit SHA

| Item | Value |
|------|--------|
| Current branch | `feat/phase7a-beta-billing-hardening` |
| HEAD SHA | `54ecae232f207b8a9fb7047016c06df74c5672cc` |
| Short | `54ecae2` |
| Tip commit | `fix: fail closed when portal repair hits a bound customer` |
| Tracking | `origin/feat/phase7a-beta-billing-hardening` (up to date with remote branch tip) |

### Main / merge context (informational)

| Item | Value |
|------|--------|
| PR #17 | **MERGED** 2026-08-05T00:30:38Z |
| Merge commit on `origin/main` | `9992f96bc6f336f044410e64d67f1d89e884dedc` |
| Relationship | `54ecae2` **is ancestor of** `origin/main` |
| Local `main` checkout | Still at older `0c2b525` (behind `origin/main` by 10 commits) — not used for this snapshot |

---

## 2. Working tree status

```text
On branch feat/phase7a-beta-billing-hardening
Your branch is up to date with 'origin/feat/phase7a-beta-billing-hardening'.

Untracked files:
  docs/PHASE7B_LIVE_STRIPE_CUTOVER_CHECKLIST.md
  docs/PHASE7B_LIVE_STRIPE_CUTOVER_PLAN.md
  supabase/.temp/

nothing added to commit but untracked files present
```

No staged or modified tracked files. Phase 7B planning docs are local-only until committed. `supabase/.temp/` is CLI link metadata (includes `linked-project.json` → `vpcxzbaxhpucvevnkalo`).

---

## 3. Test suite status (latest validation)

**Source:** GitHub Actions CI on PR #17 (not re-run in this pre-flight session).

| Item | Value |
|------|--------|
| Workflow | `CI` / job `validate` |
| Run | https://github.com/Carpenter-Create/settlerateapp/actions/runs/30961533593 |
| Head OID checked | `54ecae232f207b8a9fb7047016c06df74c5672cc` |
| Conclusion | **SUCCESS** |
| Completed | 2026-08-04T23:55:09Z |
| Duration | ~1m5s |
| Bugbot | NEUTRAL (informational) |

**Not run this pre-flight:** local `npm run lint|typecheck|verify:benchmarks|test:run|build` or `test:entitlement-sql`. Treat CI SUCCESS on `54ecae2` as the latest authoritative validation for that SHA.

**Related sandbox operational validation (not unit CI):**  
`.superpowers/sdd/2026-08-04-phase7a-beta-billing-hardening/sandbox-release-report.md` — Phase 7A sandbox smoke **PASS** (idempotency, `ALREADY_SUBSCRIBED`, webhook projection, portal repair, cleanup). Live cutover explicitly **not** performed.

---

## 4. Current deployed Supabase Edge Function versions

`supabase functions list --project-ref vpcxzbaxhpucvevnkalo` (read-only):

| Function | Status | Version | Updated at (UTC) |
|----------|--------|--------:|------------------|
| `stripe-webhook` | ACTIVE | **29** | 2026-08-05 00:01:26 |
| `create-checkout` | ACTIVE | **34** | 2026-08-05 00:09:53 |
| `customer-portal` | ACTIVE | **35** | 2026-08-05 00:09:56 |
| `check-subscription` | ACTIVE | **33** | 2026-08-04 16:50:13 |
| `admin-assign-advisor` | ACTIVE | 24 | 2026-08-04 16:53:15 |
| `generate-pdf` | ACTIVE | 26 | 2026-08-04 06:33:01 |
| `export-share` | ACTIVE | 13 | 2026-08-04 06:33:03 |

Matches Phase 7A sandbox redeploy report (webhook 29 / checkout 34 / portal 35). **No deploy performed during this pre-flight.**

---

## 5. Supabase project reference

| Item | Value |
|------|--------|
| Project ref | `vpcxzbaxhpucvevnkalo` |
| Project name (link metadata) | SettleRate |
| API URL | `https://vpcxzbaxhpucvevnkalo.supabase.co` |
| `supabase/config.toml` `project_id` | `vpcxzbaxhpucvevnkalo` |
| CLI linked-project | `supabase/.temp/linked-project.json` → same ref |

---

## 6. Stripe connection mode (sandbox / test)

### Confirmed (production DB + app allowlist)

| Check | Result |
|-------|--------|
| `public.is_professional_price('price_1U0k4DC2Fmi7ZUCbSniiEewZ')` | **true** |
| `public.is_professional_price('price_1U0kFVC2Fmi7ZUCb6g0mXIRC')` | **true** |
| Function body allowlist | Only the two sandbox Professional price IDs above |
| App / edge allowlists (`entitlementContract.ts`, `stripe.ts`) | Same sandbox IDs + product `prod_V0lUMpnsvxSxP1` |
| Phase 7A production smoke Checkout IDs | `cs_test_…` (test mode) |
| Live cutover performed? | **No** (release report + plan status) |

### Billing projection cleanliness (bonus observation)

| Metric | Value |
|--------|------:|
| `public.billing` row count | **0** |
| Rows with `stripe_customer_id` | **0** |
| Rows with sandbox Professional `price_id` | **0** |

Sandbox billing cleanup gate for cutover is currently satisfied on row counts (re-verify immediately before SQL in the window).

### Not directly verified this pre-flight

| Check | Result |
|-------|--------|
| Supabase `STRIPE_SECRET_KEY` prefix (`sk_test_` / `sk_live_`) | **Blocked** — `supabase secrets list` failed: invalid access token format |
| Supabase `STRIPE_WEBHOOK_SECRET` identity | **Not listed** (same) |

**Founder action before any secret swap:** In Supabase Dashboard → Project `vpcxzbaxhpucvevnkalo` → Edge Functions → Secrets, visually confirm `STRIPE_SECRET_KEY` still starts with `sk_test_` (do not paste into chat/git).

### Local Stripe CLI (do not trust for SettleRate)

Local `stripe` CLI is authenticated to **`acct_1NbWNGEIjRW0Sj3O`**, not SettleRate sandbox `acct_1U0isCC2Fmi7ZUCb`. Retrieving SettleRate sandbox price IDs via this CLI returns `resource_missing`. Ignore local CLI for SettleRate mode confirmation until re-authenticated to the correct account.

---

## 7. Current sandbox product and price IDs

| Item | ID / value |
|------|------------|
| Stripe account (sandbox) | `acct_1U0isCC2Fmi7ZUCb` |
| Product | `prod_V0lUMpnsvxSxP1` (SettleRate Professional) |
| Monthly price | `price_1U0k4DC2Fmi7ZUCbSniiEewZ` · lookup `settlerate_professional_monthly` · $19/mo |
| Annual price | `price_1U0kFVC2Fmi7ZUCb6g0mXIRC` · lookup `settlerate_professional_annual` · $190/yr |
| Sandbox webhook (reference) | `we_1U0mIkC2Fmi7ZUCbhSBtVdwX` → prod `stripe-webhook` URL |
| Sources | `src/lib/entitlementContract.ts`, `src/lib/stripe.ts`, `supabase/functions/_shared/entitlementContract.ts`, live DB `is_professional_price`, `docs/ENTITLEMENT_CONTRACT.md`, Phase 7A release report |

---

## Explicit non-actions (this pre-flight)

- [x] Did **not** create live Stripe products, prices, webhooks, or customers  
- [x] Did **not** change Supabase secrets  
- [x] Did **not** deploy Edge Functions or frontend  
- [x] Did **not** modify application/source code  
- [x] Did **not** apply SQL migrations  
- [x] Did **not** enable maintenance mode  

---

## Recommended next step (founder-gated)

1. Confirm `STRIPE_SECRET_KEY` is still `sk_test_…` in Supabase Dashboard.  
2. Complete checklist §0 (live worksheet + backup + window authorization) **without** creating live objects until founder is ready for §0.2.  
3. Only then proceed to live catalog creation / maintenance window per `docs/PHASE7B_LIVE_STRIPE_CUTOVER_CHECKLIST.md`.

**Pre-flight complete. Stopped.**
