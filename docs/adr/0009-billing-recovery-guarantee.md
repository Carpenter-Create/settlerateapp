# ADR 0009: Billing recovery guarantee

- Status: accepted
- Date: 2026-08-08
- Epic: Phase 8.1 / Epic 8 (Billing Recovery Capability)
- Deciders: Founder / Adam Carpenter (authorized via Epic 8 kickoff;
  decisions bound by stated founder intent + repository discovery)

## Context

Epic 7 established an isolated staging environment with working Stripe
**test-mode** checkout, webhook, entitlement, portal, and export paths.
Phase 7B remains paused; production `CHECKOUT_MAINTENANCE` remains `true`.

Current webhook durability (`stripe_webhook_events`) is an **idempotency
ledger**, not a recovery archive:

- Columns: `event_id` (PK), `event_type`, `processed_at`,
  `stripe_customer_id`, `app_user_id`, `action_taken`, `details` (jsonb).
- `details` stores thin processing metadata (e.g. entitlementStatus /
  planCode / priceId on success) — **not** the Stripe Event.
- The signed HTTP body and verified Event object exist only in Edge memory
  for the duration of the request.
- Retryable failures call `release_stripe_webhook_event`, which **DELETEs**
  the ledger row so Stripe can retry — destroying even that thin audit.
- Several terminal HTTP 200 paths leave `action_taken='processing'` without
  a durable terminal status.

Therefore, if derived `billing` rows are lost/corrupted, or processing fails
after Stripe will not redeliver, SettleRate cannot reconstruct entitlement
from repository-local evidence without guessing or calling Stripe.

Discovery inventory: `docs/billing/EPIC8_BILLING_RECOVERY_INVENTORY.md`.

**Epic 8 PR 0 is ADR + inventory + governance only.** It does not add
migrations, change webhook behavior, deploy Edge Functions, or mutate
staging/production.

## Decision

### 1. Recovery guarantee

**Billing recovery** means SettleRate can reconstruct the **canonical
`billing` / entitlement fields** governed by existing contracts
(`docs/ENTITLEMENT_CONTRACT.md`, `@settlerate/core/entitlement`) for a
scoped user/customer from durable, authenticated Stripe event evidence,
without inventing favorable entitlement.

In scope for reconstruction (existing columns / meanings only):

- `stripe_customer_id`, `stripe_subscription_id`
- `subscription_status`, `price_id`, `product_id`
- `cancel_at_period_end`, `current_period_end`
- `plan_code`, `entitlement_status`
- `last_stripe_event_id`, `last_stripe_event_at`

Out of scope: redesigning plans, prices, checkout, Professional features,
export contract, calculator, admin model, or Phase 7B activation.

If evidence is insufficient, recovery **must** emit an explicit unresolved /
failed result and **must not** apply an entitled state.

### 2. Event authority

| Layer | Role |
|-------|------|
| Webhook signature verification (`constructEvent`) | Authenticity gate at **ingestion** only |
| Durable verified Event evidence | **Authoritative recovery input** after verification |
| Derived billing snapshot / `billing` row | Current applied state (mutable; may be damaged) |
| Stripe API (TEST in Epic 8 drills) | **Auxiliary**: reconciliation aid / gap detector — not silent sole authority for apply when durable history is incomplete |

Do not conflate “we verified the signature once” with “we retained the
event.” Do not treat `billing` as proof of historical events.

### 3. Retained representation

Persist **two** immutable evidence layers per authenticated event:

**A. Verified Stripe Event JSON** — the object returned by `constructEvent` /
`constructEventAsync` (required for every retained event).

**B. Applied subscription source object (when billing is applied)** — the
Subscription-shaped JSON that the live webhook actually passed into
`mapSubscriptionToBillingSnapshot` **after**
`resolveSubscriptionBillingSnapshot` / Stripe retrieve (when that path runs).
If the live handler applies billing without a retrieve (rare), store the
same object it mapped. If the live handler does **not** apply billing
(ignored, unsupported, unresolved user, stale skip, error), omit B or store
null — do not invent a snapshot.

Also persist immutable scalar metadata extracted at ingest:

- `event_id` (Stripe Event id)
- `event_type`
- `event_created` (Stripe `event.created` unix timestamp)
- `livemode` (must be `false` for staging drills)
- `api_version` when present on the Event
- `ingested_at`

**Do not store:** request headers (including `stripe-signature`), Stripe
secret keys, webhook signing secrets, Authorization values, cookies, or
unrelated secrets.

**Rationale:** Live ingestion is retrieve-first for subscription mapping
(`resolveSubscriptionBillingSnapshot`); Event `data.object` alone can
diverge from what was applied. Layer A authenticates “what Stripe
delivered.” Layer B records “what SettleRate applied.” Offline recovery
reconstructs from A+B without requiring Stripe network. Exact raw HTTP body
retention is **not** required.

Payloads remain sensitive (emails and other Stripe fields may appear).
Treat as confidential service-role data (see §12).

### 4. Immutability

- Event evidence rows are **append-only**: insert once per `event_id`;
  **never UPDATE or DELETE** the verified payload or immutable scalars.
- Processing/ledger metadata (`action_taken`, processing timestamps,
  thin operational `details`) **may** change as status evolves.
- Prefer a dedicated evidence relation keyed by `event_id` (1:1 with the
  processing ledger) so payload immutability is enforceable separately
  from ledger status transitions.

### 5. Idempotency / duplicates

- Stripe `event.id` remains the deterministic idempotency key.
- Duplicate deliveries must not double-apply billing mutations.
- Recovery/replay over the same evidence set must be safely repeatable
  (second apply is a no-op when state already matches).

### 6. Ordering and reconstruction parity

- Primary ordering key for reconstruction: Stripe `event.created`
  ascending, with `event_id` as deterministic tie-break.
- Do **not** use database insertion order as authority.
- Preserve and strengthen the existing stale-event protection:
  do not let an older `event.created` overwrite newer applied billing
  (`last_stripe_event_at` semantics), during live webhook processing **or**
  recovery apply.
- Out-of-order evidence is folded by replaying the ordered history.
- **Parity rule:** reconstruction must apply the **same acceptance /
  ignore / stale / admin-bypass / entitlement-mapping rules** as the live
  webhook handlers for each event type. Prefer Layer B (applied
  subscription source) when present; otherwise map from Event
  `data.object` only when the live path would have done so without
  retrieve. Do not claim bit-identical parity with historical retrieve
  results when Layer B was never stored (pre-Epic-8 ledger rows) —
  those subjects are incomplete for offline recovery unless an explicit
  external-reconcile mode (§8) is used.

### 6a. Side-effect parity (admin and non-apply paths)

Recovery **must not** write `billing` for subjects the live webhook would
have ignored (including admin entitlement bypass) or otherwise refused.
Replayed ignored/unsupported/unresolved events contribute audit/status
only, not manufactured entitlement.

### 7. Incomplete history

“Complete enough” for a scoped subject means: durable evidence exists for
the events needed to justify the proposed `billing` row under the same
rules the live webhook uses, including Layer B for any retrieve-first apply
that Epic 8 ingestion performed. Absence of pre-Epic-8 historical
payloads is an explicit gap — fail closed for offline apply.

Recovery must **fail closed** (unresolved) when:

- evidence required to justify proposed entitlement is missing
- evidence is malformed / not valid Event JSON
- customer/user cannot be resolved under existing webhook rules
- evidence conflicts cannot be reduced by ordering + stale rules
- Layer B is missing for a retrieve-first apply that reconstruction would
  need for offline parity (unless §8 external-reconcile is explicitly
  invoked and labeled)
- `livemode=true` evidence appears in a staging-only recovery run
- environment targeting is ambiguous

Do not manufacture entitlement to “help” the customer. There is no
fixed universal “must have checkout.session.completed” checklist —
coverage is defined by live handler acceptance for the scoped outcome.

### 8. Stripe API as auxiliary evidence

During Epic 8, Stripe API access is allowed **only in TEST mode** and only
as:

- reconciliation aid (compare reconstructed state to Stripe),
- gap detector (identify missing local evidence),

not as a silent substitute that grants entitlement when durable history is
incomplete.

A separate, explicitly labeled external-reconcile mode may propose Stripe-
observed state for operator review; it must not auto-apply entitled state
from incomplete local evidence without making the authority source
explicit in the recovery audit record.

### 9. Replay side effects

Recovery/replay **must not**:

- create Checkout sessions
- charge customers
- create/cancel/modify Stripe subscriptions or customers
- send customer emails
- open Customer Portal sessions
- call live Stripe (`sk_live_` / `livemode=true` operations)
- trigger unrelated application side effects (exports, admin grants, etc.)

Allowed effects: read durable evidence; optional read-only Stripe TEST GETs
for reconcile; compute proposed `billing` state; dry-run compare; explicit
apply to **staging** DB rows under this Epic’s authorization.

### 10. Apply model

Separate stages:

1. **Reconstruct** — pure/deterministic computation from evidence → proposed
   billing/entitlement fields or unresolved.
2. **Compare** — proposed vs current `billing` (dry-run; no mutation).
3. **Apply** — explicit operator/tool invocation writes staging `billing`
   (and only the bounded fields in §1).

Dry-run is mandatory before apply in the operational tool. Apply output
must be inspectable (counts, per-user diffs, unresolved list).

### 11. Auditability

Each recovery attempt records (without embedding full Event payloads in
logs/Sentry):

- environment / project ref targeted
- scope (user/customer/subscription/event range)
- evidence counts / event_id list (ids only)
- dry-run vs apply
- proposed vs current summaries
- applied changes
- unresolved/error cases
- operator/tool identity when available

Prefer a DB audit table for recovery runs (service-role only). Console may
emit opaque ids and counts only.

### 12. Security / privacy

- Evidence and recovery audit tables: RLS enabled, **no** anon/authenticated
  policies; `REVOKE ALL` from client roles; service_role (or narrowly
  granted SECURITY DEFINER ops) only.
- Never expose evidence via browser/client APIs.
- ADR 0003 remains binding: **never** send Event payloads, raw bodies, or
  Stripe secrets to Sentry.
- Retention: retain evidence for a minimum of **400 days** (covers common
  Stripe dispute/ops windows) unless a later founder policy shortens it;
  deletion is a founder-authorized ops action with audit.
- Fixtures must be fully synthetic.

### 13. Environment isolation

| Target | Epic 8 autonomy |
|--------|-----------------|
| Staging Supabase `gkhbalfpxjtleypbabjo` | Authorized for migrations, Edge deploy, recovery drills |
| Staging Stripe TEST | Authorized |
| Production `vpcxzbaxhpucvevnkalo` | **Blocked** for mutation/apply/deploy under this Epic |
| Live Stripe | **Blocked** |

Recovery tooling must fail closed if project ref / Stripe mode is ambiguous
or production-targeted.

### 14. Production activation

Epic 8 may land production-ready migrations/code on `main` and fully
exercise recovery on **staging**.

This ADR does **not** authorize applying Epic 8 migrations, deploying
modified Edge Functions, backfilling payloads, or running recovery against
production. Production activation requires a separate founder package.

### 15. Rollback

| Change | Rollback |
|--------|----------|
| Evidence schema | Forward-fix migrations preferred; drop evidence relation only with founder auth if unused |
| Ingestion write | Feature-flag / code revert; evidence already written remains (append-only) |
| Staging apply | Re-run recovery dry-run; restore from prior `billing` snapshot taken before apply; or re-apply from evidence |
| Mistaken production apply | Out of scope — blocked by §13–14 |

Recovery apply on staging must snapshot current `billing` rows for the
scoped subjects before mutation.

## Consequences

- Implementation must add durable evidence persistence after successful
  signature verification (Layer A immediately; Layer B when billing is
  applied), without deleting evidence on retryable failure.
- `release_stripe_webhook_event` DELETE-as-retry must be replaced or
  narrowed so evidence retention is not destroyed (ledger status machine).
- Terminal webhook outcomes must record honest `action_taken` values.
- Deterministic reconstruction belongs in `@settlerate/core` where ADR 0005
  allows; I/O orchestration stays in Edge/scripts.
- Entitlement/price semantics remain unchanged; recovery replays current
  rules over historical evidence.
- Phase 7B stays paused; production maintenance stays enabled.

## Alternatives considered

1. **Rely on Stripe Event API alone** — Rejected as sole strategy: network
   dependency, retention limits, and weaker local auditability.
2. **Store raw body + signature for re-verify** — Rejected as requirement;
   verified Event JSON is sufficient; headers/secrets must not be stored.
3. **Store only mapped billing snapshot fields** — Rejected as sole
   evidence: cannot re-derive after mapper bugfixes or dispute full Event
   contents.
4. **Continue DELETE-on-failure ledger** — Rejected for recovery; destroys
   audit and conflicts with append-only evidence.
5. **Auto-apply from Stripe current subscription state** — Rejected as
   default: can grant entitlement without local evidence trail; allowed
   only as explicit external-reconcile with labeling (§8).
