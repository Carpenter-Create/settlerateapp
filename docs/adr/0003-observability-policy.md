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
- **Browser events must retain a privacy-safe stack trace** (frame
  location/identity fields; never captured local variables or inlined
  source-code context) — without it, an uploaded source map has nothing
  to resolve against. See `src/lib/observabilityRedaction.ts`.
- **Release identity must match the deployed artifact.** `Sentry.init` in
  the browser and the Sentry Vite plugin's source-map upload must use one
  deterministic release identifier for a given build (preferring
  `VERCEL_GIT_COMMIT_SHA`, falling back to `GITHUB_SHA`, undefined
  locally — see `src/lib/observabilityRelease.ts`).
- **Production Vercel builds are the authoritative browser source-map
  upload.** The app is built and deployed by Vercel, not GitHub Actions —
  a GitHub Actions CI build is a validation build only and is never what
  users' browsers load. The Sentry Vite plugin must therefore also be
  able to run during the Vercel build itself (server-side build
  environment variables `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
  configured in Vercel, never as `VITE_*`), so the uploaded source maps
  correspond to the exact bundle served in production. The existing
  GitHub Actions upload for CI validation builds may remain — it uploads
  a separate build's own uniquely-identified source-map artifacts under
  the same release name and does not interfere with or override the
  Vercel production artifact's own upload.

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
| CI source-map upload config | GitHub Actions `Build` step scoped `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` secrets | Complete / merged |
| Browser symbolication fix | Preserve privacy-safe browser stack traces in redaction; deterministic client/Vite-plugin release identifier; enable Sentry Vite plugin source-map upload during the Vercel production build | Complete / merged |
| Vendor/secret/production steps | Sentry account creation, DSN/token configuration (including the Vercel-side `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` build variables needed for the Vercel build to upload source maps), production activation and verification | **Complete** — production activated and verified 2026-08-06 (founder-authorized; not a code PR) |

**Epic 3 status:** Complete. Production activated. Browser ingestion
verified. Browser symbolication verified. Edge ingestion verified.
Privacy redaction verification passed for the tested event paths.

Repository code remains fail-soft when DSNs are absent (local/CI without
platform secrets). Production DSNs and upload credentials live only in
Vercel / Supabase platform configuration — never in the repository.
No further DSN changes are required for Epic 3 closure.

## Production verification record (2026-08-06)

Deployed commit SHA (browser release and Edge Function redeploy source):
`059624e178ac51e4ec218ff2ac0a750a564e185b`.

### Browser observability

| Field | Value |
|-------|--------|
| Sentry project slug | `settlerate-web` |
| Sentry project ID | `4511862124904448` |
| Verified issue | `SETTLERATE-WEB-2` |
| Event ID | `440718be6636413593e3630592e4bb26` |
| Event timestamp (UTC) | `2026-08-06T20:06:31.158000+00:00` |
| Environment | `production` |
| Release | `059624e178ac51e4ec218ff2ac0a750a564e185b` |
| Live asset | `index-Bkh_JVcS.js` |
| Debug ID | `35798c69-e2f5-4eaf-95e1-6d4c3dc89d04` |

Results:

- Release matched the deployed Vercel commit SHA.
- Source-map upload succeeded from the authoritative Vercel production build.
- Sentry resolved the bundled frame through the debug ID to original source.
- The remaining `<anonymous>` frame was expected (test throw originated in DevTools).
- Stacktrace redaction preserves safe frame fields and mechanism data.
- No mortgage values, form values, auth tokens, cookies, headers, request
  bodies, local variables, or user financial data were present.
- Sentry default IP-derived geography may still appear; treat as a future
  privacy-policy review item, not an Epic 3 blocker.

### Edge Function observability

Six covered functions redeployed from
`059624e178ac51e4ec218ff2ac0a750a564e185b`:

| Function | Deployed version |
|----------|------------------|
| `check-subscription` | v41 |
| `create-checkout` | v46 |
| `customer-portal` | v44 |
| `stripe-webhook` | v39 |
| `generate-pdf` | v34 |
| `export-share` | v21 |

| Field | Value |
|-------|--------|
| Sentry project slug | `settlerate-edge-functions` |
| Sentry project ID | `4511862129623040` |
| Verified issue | `SETTLERATE-EDGE-FUNCTIONS-3` |
| Event ID | `ac07d9cd30004cc28f1f68789f6069f7` |
| Event timestamp (UTC) | `2026-08-06T20:22:49.926000+00:00` |
| Environment | `production` |
| Exception | `Error: No authorization header provided` |
| `extra.function_name` | `check-subscription` |
| `extra.request_id` | `99c50f64-55e5-4438-ad8c-e4a3d4147838` |

Probe safety and side effects:

- Exactly one unauthenticated `POST` to production `check-subscription`
  using the public anon/publishable key; `Authorization` omitted; body `{}`.
- HTTP response: `500` with `{"error":"No authorization header provided"}`.
- Stacktrace included `check-subscription/index.ts` and Deno runtime frames.
- No user JWT, cookies, request body data, mortgage values, financial
  values, Stripe data, persistence mutation, entitlement mutation, or
  checkout side effect.

## Operational baseline

Do **not** paste DSNs or auth tokens into documentation.

**Vercel Production** must retain:

- `VITE_SENTRY_DSN` (client public DSN for `settlerate-web`)
- `SENTRY_AUTH_TOKEN` (server-side build only; never `VITE_*`)
- `SENTRY_ORG=e8-holdings-llc`
- `SENTRY_PROJECT=settlerate-web`

**Supabase Production** must retain:

- `SENTRY_DSN` pointing at the `settlerate-edge-functions` project

Other baseline rules:

- Browser production builds must upload source maps from the same Vercel
  build that ships the artifact.
- Edge Functions must be redeployed after observability code changes.
- Sentry numeric project IDs are the authoritative project identity; issue
  short IDs (`SETTLERATE-WEB-*`, `SETTLERATE-EDGE-FUNCTIONS-*`) are issue
  labels within those projects, not separate projects.
- No DSN changes are required for Epic 3 closure.

## Remaining non-blocking follow-ups

These are **not** Epic 3 reopen criteria unless a future phase plan makes
alerts an acceptance gate:

- Configure production Sentry alert rules (ADR §8 burn-in / tuning).
- Review whether automatic IP-derived geography should be disabled or
  retained under the privacy policy.
- Consider a dedicated authenticated or admin-only Edge observability probe
  instead of relying on an expected auth-failure path.
- Review browser breadcrumb policy separately if automatic breadcrumbs
  remain enabled.

Do not begin Epic 4 or later Phase 8.1 epics automatically.
