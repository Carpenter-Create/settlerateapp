# Epic 8 — Billing recovery inventory (PR 0)

- Status: discovery record for ADR 0009
- Date: 2026-08-08
- Main SHA at inventory: `fbdb27500375397376b50bb5a087249a3908cb32`
- Authority after PR 0: `docs/adr/0009-billing-recovery-guarantee.md`

This document is **evidence-only**. It does not authorize production
mutation, Phase 7B resume, ADR 0011, Epic 9+, or entitlement redesign.

## 1. Governing surfaces inspected

| Area | Paths |
|------|--------|
| Phase / epic governance | `AGENTS.md`, `.cursor/rules/*`, `docs/PHASE8_1_EXECUTION_CHARTER.md`, `docs/PHASE8_1_EPIC_BOUNDARIES.md`, roadmap |
| ADRs | `docs/adr/README.md`, 0002–0006, 0008; 0009 required/not accepted at kickoff |
| Staging | `docs/staging/EPIC7_CLOSURE.md`, smoke/seed/deploy docs |
| Phase 7B | cutover plan/checklist (paused) |
| Security / entitlement | `docs/SECURITY_MODEL.md`, `docs/ENTITLEMENT_CONTRACT.md`, RLS docs |
| Core | `packages/core` entitlement/billing contracts |
| Edge | `stripe-webhook`, `create-checkout`, `check-subscription`, `customer-portal`, shared helpers |
| Schema | `billing`, `stripe_webhook_events`, related migrations, generated types |
| Tests / CI | webhook tests, entitlement SQL harness, `.github/workflows/ci.yml` |

## 2. Canonical state at discovery

| Item | Status |
|------|--------|
| Epic 1–7 | Complete (Epic 7 staging E2E verified) |
| ADR 0008 | Accepted |
| Epic 8 | Not begun before this authorization |
| ADR 0009 | Required; formulated/accepted in PR 0 under founder intent |
| ADR 0011 | Unstarted; not on Epic 8 critical path |
| Phase 7B | Paused |
| Production checkout | Must remain paused (`CHECKOUT_MAINTENANCE=true`) |
| Prod Supabase | `vpcxzbaxhpucvevnkalo` (protected) |
| Staging Supabase | `gkhbalfpxjtleypbabjo` |
| Staging app | `https://settlerate-app-staging.vercel.app` |

## 3. What `stripe_webhook_events` stores today

Created/owned by Phase 6 migration
`supabase/migrations/20260804120000_phase6_entitlement_hardening.sql`.

Observed columns:

| Column | Meaning |
|--------|---------|
| `event_id` | Stripe Event id (PK) |
| `event_type` | Stripe event type string |
| `processed_at` | Claim/process timestamp |
| `stripe_customer_id` | Optional resolved customer |
| `app_user_id` | Optional resolved user |
| `action_taken` | Processing status / outcome label |
| `details` | Thin jsonb metadata (not full Event) |

RLS: enabled; no client SELECT/INSERT/UPDATE/DELETE policies observed.
Claim/release via SECURITY DEFINER RPCs restricted to service_role.

### Evidence lost after the webhook request finishes

| Artifact | Retained? |
|----------|-----------|
| Raw HTTP body | **No** — memory only |
| `Stripe-Signature` header | **No** — must not be retained (ADR 0009) |
| Verified Stripe Event JSON | **No** |
| `event.created` / `livemode` / `api_version` | **No** as durable columns |
| Thin success `details` | Sometimes, if ledger row not deleted |
| Ledger row on retryable failure | **Deleted** by `release_stripe_webhook_event` |

**Recovery today** therefore depends on (a) current derived `billing` row
and/or (b) Stripe API history — not on a local authenticated event archive.

## 4. Webhook pipeline (current)

```
request
  → read body + Stripe-Signature
  → constructEventAsync (reject if invalid)
  → claim_stripe_webhook_event (idempotency)
  → classify supported event type
  → extract / retrieve subscription + customer context
  → resolve app user
  → stale-event guard vs billing.last_stripe_event_at
  → upsert/update billing (derived state)
  → update ledger action_taken / details
  → HTTP response
```

Handled event families (repository):

- `customer.subscription.created|updated|deleted`
- `checkout.session.completed`
- `invoice.paid` / `invoice.payment_failed`

Live path often re-fetches Stripe objects after Event decode (network
dependency during ingestion). Entitlement/plan mapping uses existing price
allowlists and core entitlement helpers — **must not change semantics**
in Epic 8.

## 5. Failure windows

| Window | What can go wrong | Current consequence |
|--------|-------------------|---------------------|
| After verify, before claim | Crash / DB down | Stripe retries; no local evidence |
| Claim succeeds, processing fails | Partial work | `release_*` **DELETE**s claim → thin audit gone |
| Billing write succeeds, ledger update fails | Derived state ahead of ledger | Retry may no-op or re-enter; audit inconsistent |
| Ledger update succeeds, response lost | Stripe retries | Claim should make duplicate a no-op if not released |
| Duplicate delivery | Same `event.id` | Intended claim short-circuit |
| Unsupported / malformed event | Not applied | May still claim inconsistently |
| User/customer unresolved | Cannot map entitlement owner | Fail path; may release |
| Stale / out-of-order event | Older `created` after newer apply | Guard should skip overwrite |
| Terminal 200 with `action_taken='processing'` | Status never finalized | False “in flight” forever |
| DB unavailable mid-request | Partial | Retry + possible DELETE of claim |

## 6. Dependency graph (Epic 8)

```
PR0  ADR 0009 + this inventory + governance
  │
  ├─► A  Durable event evidence schema (migration, RLS, types)
  │     depends on: ADR 0009 §§3–4, 12–14
  │
  ├─► B  Ingestion: persist evidence; fix release/delete; honest status
  │     depends on: A; preserve signature verify + entitlement semantics
  │
  ├─► C  Deterministic reconstruction (prefer packages/core)
  │     depends on: ADR 0009 §§1,6–7; no I/O in core
  │
  ├─► D  Recovery tool (dry-run / compare / apply; env fail-closed)
  │     depends on: A–C; staging-only apply under this Epic
  │
  ├─► E  Automated tests (dupes, order, incomplete, RLS, no Sentry leak)
  │     depends on: A–D as each lands
  │
  ├─► F  Staging recovery drill (damage derived billing; restore)
  │     depends on: A–E; Stripe TEST only; project gkhbalfpxjtleypbabjo
  │
  ├─► G  Failure-injection / adversarial boundary proofs
  │     depends on: B–F
  │
  └─► H  Runbook + Epic 8 closure record
        depends on: F–G green; no production mutation
```

ADR 0011 / advisor model: **no concrete dependency** found for billing
recovery. Do not start ADR 0011.

## 7. What ADR 0009 chooses (summary)

See full ADR. Short form:

1. Reconstruct canonical `billing`/entitlement fields only; never invent
   entitlement.
2. Durable verified Event JSON is recovery authority; Stripe API is
   auxiliary.
3. Store verified Event JSON + immutable scalars; never secrets/headers.
4. Evidence append-only; ledger status mutable.
5. Idempotent on `event.id`; recovery repeatable.
6. Order by `event.created` then `event_id`; stale protection retained.
7. Incomplete → fail closed.
8. Stripe TEST GET allowed as reconcile/gap detector only.
9. No checkout/charge/email/Stripe mutation side effects from recovery.
10. Reconstruct → compare (dry-run) → explicit apply.
11. Audit runs without payload-to-Sentry.
12. Service-role only; RLS deny clients; ADR 0003 redaction.
13. Staging-only autonomy; production blocked.
14. Production activation separately founder-gated.
15. Snapshot before apply; reversible staging restore path.

## 8. Explicit non-goals

- Production migration apply / Edge deploy / recovery apply
- Phase 7B resume / public checkout / live Stripe
- Plan/price/entitlement/export/formula semantic changes
- ADR 0011 advisor work
- Epic 9+
- Unrestricted payload dumps in git, Sentry, or client APIs
