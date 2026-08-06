# ADR 0003: Observability policy

- Status: accepted
- Date: 2026-08-05
- Epic: Phase 8.1 / Epic 3 (Observability)
- Deciders: Founder / Adam Carpenter

## Context

SettleRate currently has no client-side error monitoring, no top-level React
error boundary, and no vendor-based Edge Function error tracking. Failure
visibility today is limited to `console.log`/`console.error` calls captured
in Supabase's native Edge Function logs (short retention, no cross-request
correlation, no alerting) and one-time `sonner` toasts shown to the affected
user only. A React render-time exception anywhere in the tree currently
produces a blank screen with no recovery path and no record that it
happened.

This ADR records the founder-accepted decisions that bound all Epic 3
implementation PRs. It does not implement anything: no dependency is
installed, no Sentry account is created, no secret is added, and no
application or Edge Function code changes as a result of this ADR.

See the Epic 3 implementation brief (chat record) for the full current-state
findings, gap analysis, and vendor comparison that this ADR formalizes.

## Decision

### 1. Vendor and scope

- **Sentry** is the approved observability vendor for Epic 3.
- Supabase native logs remain the operational step-log source (existing
  `logStep`/`logWebhook`-style `console.log` calls in Edge Functions are
  preserved, not replaced).
- Sentry is limited to **errors and exceptions only**.
- Prohibited without separate authorization: session replay, product
  analytics, advertising tracking, user-behavior telemetry, request/response
  body capture, performance tracing.

### 2. Covered surfaces

- The React/Vite client (`src/`).
- These six Supabase Edge Functions only:
  - `create-checkout`
  - `stripe-webhook`
  - `customer-portal`
  - `check-subscription`
  - `generate-pdf`
  - `export-share`

No other Edge Function is in scope for Epic 3 monitoring instrumentation.

### 3. Environment variables

- Client public configuration: `VITE_SENTRY_DSN` (optional).
- Edge Function configuration: `SENTRY_DSN` (optional).
- DSNs are **optional and fail-soft**. The repository implementation (PR 1)
  must remain inert — byte-identical current behavior — when a DSN is
  absent.
- Local development must never send events to the production Sentry
  project.
- Production is the only initially monitored environment. Staging remains
  deferred to Epic 7 (`docs/adr/0008-environment-topology.md`, not yet
  written).

### 4. Prohibited captured data

Sentry must never capture or persist:

- mortgage inputs, purchase price, loan amounts, rates, down payments
- income figures, asset values, debt values
- payment details
- passwords, authentication tokens, Supabase JWTs, cookies, Authorization
  headers
- Stripe secrets, Stripe raw payloads
- Supabase service-role credentials
- names, emails, addresses, or other raw personal information

Opaque internal identifiers may be captured only when operationally
necessary, including: `user_id`, `event_id`, `request_id`, Stripe
customer/subscription/session IDs, scenario/comparison IDs, price IDs, and
generic statuses/error codes.

### 5. Redaction

- Implementation must include a shared, unit-tested redaction policy
  (client and Edge Function).
- Use `beforeSend` and `beforeBreadcrumb` hooks where supported by the
  vendor SDK.
- Disable or remove unsafe automatic breadcrumbs (console capture, DOM
  event capture, automatic network body capture).
- Redaction must **fail closed**: on any doubt or scrub failure, drop the
  field/event rather than transmit it.
- Widening what is captured beyond §4 in the future requires a **new ADR**,
  not a code-review-only change.

### 6. Error boundary

- A top-level React error boundary is approved.
- User-facing fallback must be minimal and neutral. Recommended copy:
  "Something went wrong. Reload the page to continue."
- Include a Reload button.
- Do not expose technical error details (stack traces, error messages) to
  users.
- The boundary may improve current blank-screen-on-crash behavior but must
  not otherwise alter normal application behavior.

### 7. Source maps and releases

- Generate **hidden** production source maps (uploaded for Sentry's use,
  not referenced or served from public static assets).
- Upload via CI using a scoped Sentry auth token.
- Never expose the auth token to the client bundle.
- Do not intentionally serve source maps publicly.
- Tag events with environment and a release/build identifier where
  available (e.g., short git SHA).

### 8. Alerts and ownership

- Initial alert owner: Founder / Adam Carpenter.
- Initial delivery channel: email.
- Start with conservative alerting for: new production error fingerprints,
  systemic Stripe webhook failures, and material Edge Function error-rate
  increases.
- Alert tuning happens after an initial burn-in period, not before launch.

### 9. Retention and access

- Use the default Sentry plan retention; no custom long-term archive is
  required for Epic 3.
- Sentry organization/project access is limited to the founder and any
  explicitly authorized future operators.

### 10. Implementation sequencing

- **PR 0** (this ADR): policy and governance only.
- **PR 1**: one bundled repository implementation PR (client SDK init,
  error boundary, redaction helper, Edge Function SDK wiring, source-map
  build config), inert without DSNs.
- Vendor-account creation is a **separate founder action**.
- Secrets/configuration (`VITE_SENTRY_DSN`, `SENTRY_DSN`, CI upload token)
  are **separately authorized**.
- Production activation and verification are **separately authorized**.
- **No live Sentry connection or production effect is authorized by PR 0.**

## Consequences

- Later Epic 3 PRs may implement observability changes only within the
  decisions above, each under separate authorization / PR sequence
  discipline (per §10).
- Epic 3 PR 0 does not authorize PR 1 implementation, dependency
  installation, Sentry account creation, secret configuration, CI changes,
  or any deployment.
- Financial engine behavior, entitlement behavior, persistence semantics,
  export semantics, authentication/session behavior, `CHECKOUT_MAINTENANCE`,
  current environment/origin policy (ADR 0002), and current production
  behavior are all preserved and out of scope for Epic 3 changes.
- Database migrations, RLS changes, an audit-trail schema (see
  `docs/SECURITY_MODEL.md` §"Audit Trail" — a related but distinct,
  not-yet-implemented concern), AWS migration, product analytics, session
  replay, performance monitoring, and Epic 4+ work remain explicitly out of
  scope for Epic 3.
- Agents must not invent alternate observability vendors, capture scopes,
  or redaction rules when this ADR is accepted.

## Alternatives considered

- **Supabase native logs alone, no vendor.** Rejected as insufficient —
  leaves client-side crashes (the largest current gap) completely
  uncovered, has no alerting, and has short retention with no
  cross-request correlation. Remains the operational step-log source
  alongside Sentry, not a replacement for it.
- **Another vendor (Rollbar, Bugsnag, self-hosted GlitchTip).** Rejected —
  no material advantage over Sentry for this stack, and self-hosting adds
  infrastructure operations out of scope while frontend/infrastructure
  architecture migration is still pending (Phase 7B).
- **Session replay or performance tracing from day one.** Rejected —
  broader data-capture surface than justified for an error-tracking-only,
  pre-beta use case; would require a materially more detailed redaction
  and consent analysis. May be reconsidered later under a separate,
  explicit authorization.
- **Enabling monitoring in local development by default.** Rejected — risk
  of local/test noise reaching the production Sentry project outweighs the
  convenience; DSN-gated, fail-soft design keeps local dev identical to
  today.

## Epic 3 PR sequence (binding)

| PR | Scope | Status |
|----|--------|--------|
| **PR 0** | This ADR + minimum governance status updates | Complete / merged |
| **PR 1** | Bundled repository implementation (client + Edge Function SDK wiring, error boundary, redaction, source maps), inert without DSNs | Complete / merged |
| Vendor/secret/production steps | Sentry account creation, DSN/token configuration, production activation and verification | Each requires separate founder authorization; not code PRs |

**PR 1 shipped the repository implementation only; no DSN is configured
anywhere and no event is ever sent by this work. Never activate live
Sentry monitoring (vendor account, secrets, production DSNs) without
separate explicit founder authorization.**
