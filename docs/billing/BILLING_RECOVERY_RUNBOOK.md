# Billing recovery runbook

Authority: `docs/adr/0009-billing-recovery-guarantee.md`  
Tool: `npm run billing:recover -- --mode=dry_run --user=<uuid>`

## When to use

- Derived `billing` row lost/corrupted while durable `stripe_event_evidence` exists
- Webhook partial failure left ledger/evidence ahead of `billing`
- Staging recovery drills (Epic 8 authorized)

## When NOT to use

- To grant entitlement without Stripe evidence
- Against production (`vpcxzbaxhpucvevnkalo`) under Epic 8
- With live Stripe keys (`sk_live_`)
- To redesign plans/prices/checkout
- When evidence history is incomplete (tool must fail closed)

## Prerequisites

- Target project ref known and unambiguous
- Epic 8 migration applied on that environment
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for **staging only** by default
- Optional `STRIPE_SECRET_KEY` must be `sk_test_` if set
- `RECOVERY_ALLOWED_PROJECT_REF=gkhbalfpxjtleypbabjo` (default)

## Dry-run

```bash
export SUPABASE_URL="https://gkhbalfpxjtleypbabjo.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="…"   # staging service role only
npm run billing:recover -- --mode=dry_run --user=<uuid>
```

Interpret output: `proposed` vs `current`, `diffs`, `unresolvedReasons`.
Never expect Event payloads in stdout (ids/counts/summaries only).

## Apply (staging only)

```bash
npm run billing:recover -- --mode=apply --user=<uuid> --confirm-staging-apply
```

Re-run dry-run afterward; expect `noop` / empty diffs.

## Incomplete history

If `result=unresolved`, do **not** apply. Collect missing event ids, confirm
webhook retention, optionally use labeled Stripe TEST reconcile outside this
tool’s default offline path (ADR 0009 §8). Do not invent entitlement.

## Rollback (staging apply)

1. Keep the pre-apply `current` snapshot from dry-run output.
2. Upsert that snapshot back to `billing` for the user (service role), or
3. Re-run recovery after restoring evidence integrity.

## Production boundary

Production mutation/apply/deploy/backfill requires a **separate founder
package**. Epic 8 does not authorize it. Phase 7B remains paused;
`CHECKOUT_MAINTENANCE=true` on production must remain preserved.
