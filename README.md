# SettleRate — Application Repository

The authenticated application surface for SettleRate, a mortgage analysis and comparison tool.

## Overview

This repository contains the core product experience for authenticated users. Marketing and public-facing pages are maintained in a separate repository.

## Technology Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Supabase (database, auth, edge functions)
- **Payments**: Stripe (subscription management)

## Routing

| Route | Description |
|-------|-------------|
| `/` | Authentication (sign in) |
| `/app/*` | Protected application pages |
| `/admin/*` | Admin-only pages |

**Note**: This repository does not contain marketing pages (`/pricing`, `/terms`, etc.). Those belong in the marketing repository.

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── ui/          # shadcn/ui components
│   ├── calculator/  # Mortgage calculator components
│   ├── layout/      # App layout components
│   └── auth/        # Authentication components
├── pages/           # Route pages
│   ├── app/         # Protected app pages
│   └── admin/       # Admin pages
├── hooks/           # Custom React hooks
├── contexts/        # React contexts
├── lib/             # Utility functions
└── integrations/    # External service integrations

docs/                # Project standards and documentation
supabase/
├── functions/       # Edge functions
└── config.toml      # Supabase configuration
```

## Documentation

Standards and guidelines are maintained in the `/docs` folder:

- [APP_SCOPE.md](docs/APP_SCOPE.md) — Repository scope definition
- [COPY_STANDARD.md](docs/COPY_STANDARD.md) — Copy and language guidelines
- [UI_STANDARD.md](docs/UI_STANDARD.md) — UI and design system standards
- [ROUTING_STANDARD.md](docs/ROUTING_STANDARD.md) — Route structure and guards
- [SECURITY_MODEL.md](docs/SECURITY_MODEL.md) — Security and access control
- [ROLES_AND_ENTITLEMENTS.md](docs/ROLES_AND_ENTITLEMENTS.md) — User roles and subscription tiers

## Environment

Authority: [`docs/adr/0002-secrets-and-environment-policy.md`](docs/adr/0002-secrets-and-environment-policy.md).

### Local client setup

The SPA reads public Supabase configuration from Vite environment variables.

1. Copy the template (do not commit your local `.env`):

```bash
cp .env.example .env
```

2. Set the required public client variables in `.env`:

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project API URL (`https://<project-ref>.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon / publishable key |
| `VITE_APP_ORIGIN` (optional) | Local-development-only auth email redirect origin override (signup confirmation, magic-link, password reset). Leave unset to use the production default. Only `http://localhost:5173`, `http://localhost:8080`, `http://127.0.0.1:5173`, and `http://127.0.0.1:8080` are accepted (exact match) — see `src/lib/authRedirect.ts`. |
| `VITE_SENTRY_DSN` (optional) | Sentry client DSN (public identifier, not a secret). Leave unset to keep client error monitoring disabled — see [Observability](#observability-sentry) below. |

These are **public client configuration** (bundled into the browser). Do **not**
put service-role keys, Stripe secrets, or other server secrets in `.env` or
any `VITE_*` variable.

See [`.env.example`](.env.example) for the exact template. `.env` is gitignored.

CI sets the same two public `VITE_*` variables to non-secret placeholders so
lint/tests/build can import the client without a committed `.env`.

### Supabase

This project uses Supabase for:
- User authentication
- Database with Row-Level Security
- Edge Functions for server-side logic

Platform-managed Edge Function env includes `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

### Stripe

Subscription management is handled via Stripe:
- Checkout sessions created via Edge Function
- Webhook events sync subscription status to Supabase
- Customer portal for billing management

**Important:** Stripe secret keys and webhook signing secrets are stored as
Supabase Edge Function secrets, never in client code or `.env`.

### Observability (Sentry)

Authority: [`docs/adr/0003-observability-policy.md`](docs/adr/0003-observability-policy.md).

Client (`src/lib/observability.ts`) and Edge Function
(`supabase/functions/_shared/sentry.ts`) error monitoring foundations are in
the repository but **inert by default**:

- The client only sends events in a production build (`MODE === "production"`)
  with a structurally valid `VITE_SENTRY_DSN`; local development never sends
  events regardless of configuration.
- Each of the six covered Edge Functions (`create-checkout`, `stripe-webhook`,
  `customer-portal`, `check-subscription`, `generate-pdf`, `export-share`)
  only sends events when the `SENTRY_DSN` platform secret is set.
- Scope is errors/exceptions only — no session replay, product analytics,
  advertising tracking, performance tracing, or request/response body
  capture. A shared, unit-tested, fail-closed redaction policy
  (`src/lib/observabilityRedaction.ts`, mirrored for Edge Functions) allows
  only approved opaque identifiers and generic status/error metadata through
  `beforeSend` / `beforeBreadcrumb`.
- A top-level React error boundary (`src/components/system/ErrorBoundary.tsx`)
  shows a minimal "Something went wrong. Reload the page to continue."
  fallback on render-time failures — never technical details.
- Browser exception events retain a privacy-safe stack trace (frame
  filename/function/line/column/`in_app`/debug-ID fields only — never
  captured local variables or inlined source-code context) and a
  deterministic release identifier (`VERCEL_GIT_COMMIT_SHA` in
  production, `GITHUB_SHA` in CI, undefined locally —
  `src/lib/observabilityRelease.ts`), so an uploaded source map has a
  matching event to resolve.

**Source maps — production build is authoritative.** The app is built
and deployed by **Vercel**, not GitHub Actions. The Sentry Vite plugin
(`vite.config.ts`) uploads hidden source maps whenever
`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are present as
**server-side build environment variables** — this must include the
Vercel Project → Settings → Environment Variables (Production scope,
never prefixed `VITE_`) in addition to the GitHub Actions repository
secrets already configured for CI validation builds. A CI build's own
source maps are for that (non-deployed) validation build only; only the
Vercel build's upload corresponds to what a user's browser actually
loads.

**Not yet done** (separate, founder-authorized steps): creating a Sentry
account/project, setting `VITE_SENTRY_DSN` / `SENTRY_DSN`, configuring
`SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` as Vercel build
environment variables, alert configuration, and production
activation/smoke verification.

### Environment and origin controls (summary)

These are related but separate controls — see
[`docs/adr/0002-secrets-and-environment-policy.md`](docs/adr/0002-secrets-and-environment-policy.md)
for the authoritative decisions:

| Control | What it governs | Where |
|---------|------------------|-------|
| Public client configuration | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — safe to bundle into the browser | `.env` / `.env.example`, validated by `src/lib/clientEnv.ts` |
| Server-side secrets | Service-role keys, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Supabase Edge Function / platform secrets only — never client env |
| CORS | `Access-Control-Allow-Origin` on Edge Function responses | Set per Edge Function (e.g. `supabase/functions/*/index.ts`) |
| Stripe return-origin validation | Which browser `Origin` values are trusted for Checkout/Portal return URLs | `supabase/functions/_shared/appOrigin.ts` (exact-match allowlist) |
| Auth email redirect origin | Which origin Supabase Auth emails (signup, magic-link, password reset) redirect back to | `src/lib/authRedirect.ts` (exact-match allowlist; optional `VITE_APP_ORIGIN` for local dev only) |
| Observability (Sentry) | Client/Edge Function error monitoring — inert without `VITE_SENTRY_DSN` / `SENTRY_DSN` | `src/lib/observability.ts`, `supabase/functions/_shared/sentry.ts` (see [Observability](#observability-sentry) above) |

## Local Development

```bash
# Install dependencies
npm install

# Configure public client env (see Environment above)
cp .env.example .env
# edit .env with your Supabase URL and publishable key

# Start development server (default: http://localhost:8080)
npm run dev
```

## Security

- All user data tables have Row-Level Security enabled
- Admin access requires explicit role assignment
- Entitlements are enforced server-side via Supabase
- See [SECURITY_MODEL.md](docs/SECURITY_MODEL.md) for details
- Client env may only contain public `VITE_*` configuration; server secrets
  stay on the Edge / platform side (ADR 0002)

## License

Proprietary. All rights reserved.
