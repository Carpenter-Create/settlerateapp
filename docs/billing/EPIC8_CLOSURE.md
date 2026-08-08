# Epic 8 — Billing Recovery Capability — CLOSURE

- Status: **COMPLETE** (repository + staging drill)
- Date: 2026-08-08
- Final main SHA: `4a8120782b09f2e5b9382e04ce5305dd30658216`
  (closure content landed in `6eafd0e7a66df8350ca77f6f0c7dfd31b1c3363e`;
  subsequent commits only pin/polish this record)
- Authority: `docs/adr/0009-billing-recovery-guarantee.md`

## PR train

| PR | Scope | Status |
|----|--------|--------|
| [#81](https://github.com/Carpenter-Create/settlerateapp/pull/81) | ADR 0009 + inventory + governance | Merged |
| [#82](https://github.com/Carpenter-Create/settlerateapp/pull/82) | Evidence schema, webhook ingestion, reconstruction, CLI, tests, runbook | Merged |
| [#83](https://github.com/Carpenter-Create/settlerateapp/pull/83) | Staging drill + closure + timestamp diff normalize | Merged |
| [#84](https://github.com/Carpenter-Create/settlerateapp/pull/84) | Closure SHA pin | Merged |

## ADR 0009 decision summary

- Reconstruct canonical `billing`/entitlement fields from durable authenticated
  Stripe Event evidence; never invent entitlement.
- Layer A = verified Event JSON; Layer B = post-retrieve subscription source
  used at apply; Stripe API is auxiliary only.
- Evidence append-only; ledger status mutable; release no longer DELETEs.
- Order by `event.created` + `event_id`; stale/admin/side-effect parity with
  live webhook rules.
- Dry-run → compare → explicit staging apply; production blocked.
- ADR 0003 redaction: no payloads to Sentry/logs.

## Schema / migration

- `20260808200000_epic8_stripe_event_evidence`
- Relations: `stripe_event_evidence`, `billing_recovery_runs`
- RPCs: `record_stripe_event_evidence`,
  `set_stripe_event_applied_subscription_source`,
  `insert_billing_recovery_run`; claim/release rewritten per ADR

## Security / access

- RLS on; zero client policies; `REVOKE ALL` from anon/authenticated
- service_role (+ SECURITY DEFINER RPCs) only
- Proven in `supabase/tests/epic8_billing_recovery.sql`

## Reconstruction

- `@settlerate/core/billing-recovery` (`reconstructBillingFromEvidence`,
  `diffBillingState`, `assertRecoveryEnvironmentTarget`)
- Operational tool: `npm run billing:recover`

## Staging drill evidence (2026-08-08)

Project: `gkhbalfpxjtleypbabjo` only. Stripe TEST / `livemode=false`.

1. Applied migration `20260808200000` to staging; CLI link restored to prod.
2. Deployed staging Edge Functions including `stripe-webhook` v10.
3. Seeded synthetic Layer A/B evidence for existing staging ledger events for
   user `ded86621-5cdc-4ca1-99cf-703f39066635` / `cus_V2J5tJ6cd6Zney`.
4. Deliberately damaged derived `billing` (canceled/free/null price).
5. Dry-run reconstructed `entitled` / `professional` /
   `price_1U2BGAC56u2NxRItx3etGK2q` / `sub_1U2ETnC56u2NxRItij0hOw8S`.
6. Apply restored billing (`applied=true`).
7. Repeat dry-run: entitlement restored (timestamp compare normalized in this
   closure PR for idempotent noop).
8. Incomplete-history subject
   `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee` with Layer A only →
   `result=unresolved`, `insufficient_applied_subscription_evidence`,
   `proposed=null`.
9. Production URL targeting → `blocked` / `production_project_blocked`.
10. No Stripe object mutation by recovery tool (DB-only apply).
11. Production tip remains `20260808040000`; `stripe_event_evidence` absent on
    production; production `CHECKOUT_MAINTENANCE` digest remains
    `b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b`
    (`sha256("true")`).

## Confirmations

| Item | Status |
|------|--------|
| Phase 7B | Still **PAUSED** |
| Production checkout maintenance | Preserved `true` |
| Production mutation | None (tip unchanged; no Epic 8 objects) |
| Epic 9+ | Not begun |
| ADR 0011 | Unstarted |

## Rollback

- Schema: forward-fix; do not drop evidence without founder auth
- Staging apply: re-upsert prior `billing` snapshot from dry-run `current`
- Capture: code revert; retained evidence remains append-only

## Non-blocking follow-ups

- Forward-fill Layer B for pre-Epic-8 historical staging events only as needed
  for future drills (synthetic or new webhook traffic)
- Optional dry-run audit-row gate before apply (runbook already requires
  human dry-run first)
- Production activation package remains founder-gated separately
