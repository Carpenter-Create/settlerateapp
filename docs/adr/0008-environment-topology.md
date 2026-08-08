# ADR 0008: Environment topology

- Status: accepted
- Date: 2026-08-08
- Epic: Phase 8.1 / Epic 7 (Staging Environment)
- Deciders: Founder / Adam Carpenter (authorized via Epic 7 kickoff)

## Context

SettleRate today has only two operational tiers:

1. **Local development** (Vite + localhost allowlists + operator `.env`)
2. **Production** (Vercel SPA at `https://app.settlerate.com` + Supabase
   project `vpcxzbaxhpucvevnkalo` + manual Edge Function deploys)

There is no staging environment. ADR 0002 explicitly deferred staging to
this ADR. ADR 0003 deferred staging observability here as well. Phase 7B
live Stripe cutover remains **paused** and must not be resumed by Epic 7.

Without a binding topology, staging work could silently share production
Supabase/Stripe/Sentry secrets, clone customer data, or invent a Preview-
as-staging model that fails closed against auth/Stripe allowlists.

Discovery evidence: `docs/environment/EPIC7_ENVIRONMENT_INVENTORY.md`.

**Epic 7 PR 0 is ADR + inventory only.** It does not provision cloud
resources, mutate production, change runtime allowlists, or resume Phase 7B.

## Decision

### 1. Environment set

SettleRate recognizes exactly three application environments:

| Environment | Purpose |
|-------------|---------|
| **local** | Developer machines; synthetic/local Supabase or pointed at staging only with explicit operator intent |
| **staging** | Production-like proving ground for auth, entitlement, billing test-mode, export, observability |
| **production** | Live customer environment (`app.settlerate.com` / `vpcxzbaxhpucvevnkalo`) |

**Vercel Preview deployments are not staging.** Preview may exist for UI
review but must not receive production secrets and is not the Epic 7
validation target. Treating Preview as staging is rejected.

### 2. Staging frontend topology

Use a **separate Vercel project** for staging (recommended name:
`settlerate-app-staging`), deployed from the same git repository.

Rationale: isolates `VITE_*` and build secrets from the production Vercel
project; reduces accidental Production-env inheritance.

Initial public URL may be the Vercel-assigned `*.vercel.app` hostname.
A custom domain such as `https://staging.settlerate.com` is **allowed**
when DNS/TLS are configured; it is not required to begin Epic 7 if the
Vercel staging hostname is allowlisted in app origin controls.

### 3. Staging database / Auth / Storage / Edge topology

Use a **separate Supabase project** in the same organization, same region
as production (`us-east-1`), dedicated to staging.

Rationale: strongest isolation for Postgres, Auth users, storage buckets,
Edge secrets, and RLS evaluation. Supabase Branching is deferred (no
current repo branching workflow; may be reconsidered later without
changing this ADR’s isolation requirement).

Schema authority remains ADR 0006: apply the git migration chain to the
staging project. Do not treat production Dashboard state as staging SoT.

### 4. Auth isolation

- Staging Auth is the **staging Supabase project’s** Auth configuration.
- Staging app origin(s) must be explicitly allowlisted in application code
  (auth redirects + Stripe return Origin) in a later Epic 7 PR.
- Configure redirect URLs on the **staging** Auth Dashboard / project
  settings only.
- **Do not** change production Auth Dashboard redirects to make staging
  work (HARD STOP / standing Epic 2 gate).

### 5. Stripe isolation

- Staging Edge Functions use **Stripe test-mode** secrets only
  (`sk_test_…`, test webhook signing secret).
- Staging must **never** receive live Stripe secrets unless separately
  founder-authorized (Epic 7 boundary forbids this by default).
- Staging entitlement/price allowlists must be defined for test-mode
  catalog objects (implementation PR). Do not silently reuse live price
  IDs against test keys.
- Production `CHECKOUT_MAINTENANCE=true` remains required while Phase 7B
  is paused. Staging may disable maintenance **only in the staging
  project’s** Edge secrets to enable test checkout validation.

### 6. Storage / export isolation

- Staging uses its own storage bucket(s) inside the staging Supabase
  project (including `exports`).
- Export field semantics remain fenced (`docs/EXPORT_CONTRACT.md`).
- No production storage access from staging.

### 7. Observability separation

- Staging may enable Sentry with `environment: "staging"` (or equivalent).
- Prefer a **distinct staging DSN / Sentry project** when available; if a
  shared org project is used temporarily, environment tagging is mandatory
  and production alert rules must not page on staging noise.
- Local development must not send events to production or staging projects
  (preserve ADR 0003 local inertness).

### 8. Environment-variable ownership

| Variable class | local | staging | production |
|----------------|-------|---------|------------|
| `VITE_SUPABASE_URL` / publishable key | operator `.env` | staging Vercel project | production Vercel project |
| `VITE_APP_ORIGIN` | localhost allowlist values | staging app origin | unset / production default |
| `VITE_SENTRY_DSN` | unset | staging DSN (optional) | production DSN |
| Edge `STRIPE_*` | n/a / local functions | **test** secrets | live/test per Phase 7B ops state — not changed by Epic 7 |
| Edge `CHECKOUT_MAINTENANCE` | n/a | may be `false` for staging tests | `true` while Phase 7B paused |
| Service role / DB password | never in client; never committed | staging project only | production project only |

**Never share** across staging and production:

- Supabase service-role keys
- DB passwords / connection strings
- Stripe secrets
- Auth JWT secret / project keys
- Production Sentry auth tokens used to upload to production releases
  (staging builds must not overwrite production release artifacts)

**Allowed to share (non-secret):**

- Git repository / migration history
- Public product documentation
- Synthetic fixture definitions
- npm package versions

### 9. Production-data and test-data policy

- **No production customer data** in staging without a separate founder
  authorization for a sanitized extract (default: **forbidden**).
- Staging uses **deterministic synthetic seed data** only.
- Staging reset/reseed is allowed and should be documented; prefer
  wipe+migrate+seed over partial mutation when recovering a dirty staging DB.

### 10. Staging access control

- Staging should not be an open public acquisition funnel.
- Prefer Vercel Deployment Protection / authentication for the staging
  SPA when available on the plan.
- Staging admin uses Epic 1 bootstrap tokens against the **staging**
  project only.

### 11. Domain / URL structure

| Env | App origin |
|-----|------------|
| production | `https://app.settlerate.com` |
| staging | staging Vercel hostname and/or `https://staging.settlerate.com` once DNS exists |
| local | `http://localhost:5173` / `:8080` (and 127.0.0.1 variants) |

Marketing site domains remain out of this repository’s scope.

### 12. Deployment promotion path (Epic 7)

Epic 7 establishes a **manual, documented** path:

1. Merge to `main` after CI green.
2. Deploy staging SPA to staging Vercel project.
3. Apply migrations / deploy Edge Functions to staging Supabase project.
4. Run staging smoke checklist.
5. Only then consider production deploy of the same git SHA (existing
   production Vercel/Supabase process).

Automated Dev → Staging → Production promotion is **Epic 9**, not Epic 7.

Rollback: redeploy previous known-good git SHA to staging; restore staging
DB via reseed/migrate rather than pointing staging at production.

### 13. How staging supports Phase 7B validation

Staging is the proving ground for:

- Auth signup/login/reset against an isolated Auth project
- Entitlement evaluation and billing **test-mode** webhooks
- Export/PDF share paths
- Observability event flow with staging environment tags
- Admin bootstrap and RLS behavior under production-like schema

Phase 7B **resume** (live smoke, disable production maintenance, public
checkout) remains a **separate founder decision** after Epic 7 closure
produces a readiness report. Epic 7 does not authorize Phase 7B.

### 14. Explicit non-goals

- AWS / Cloudflare / Next.js platform migration
- Production Auth Dashboard changes
- Production Stripe live configuration changes
- Cloning production data
- Resuming Phase 7B
- Treating Vercel Preview as staging

## Consequences

- Later Epic 7 PRs must implement allowlists, secrets contracts, staging
  project wiring, synthetic seed, and smoke docs against this topology.
- Creating the staging Supabase/Vercel projects is an authorized Epic 7
  provisioning action **after** PR 0, not a production mutation.
- Cost: a separate Supabase project incurs org project cost (confirm at
  provision time).
- ADR 0002 §7 and ADR 0003 staging deferrals are fulfilled by this ADR.

## Alternatives considered

| Alternative | Decision |
|-------------|----------|
| Same Vercel project with Preview = staging | Rejected — secret bleed; auth/Stripe allowlists; not production-like |
| Same Vercel project Staging env only | Rejected as sole model — higher accidental Production-env coupling |
| Share production Supabase | Rejected — HARD STOP risk to customer data/billing/storage |
| Supabase Branching as primary | Deferred — isolation OK in principle, but no current workflow; separate project selected |
| Staging uses live Stripe | Rejected — Epic 7 boundary |
| Custom domain required before any staging | Rejected — Vercel hostname sufficient to start; custom domain optional |

## Self-challenge (PR 0)

**Assumptions:** (1) org can host a second Supabase project; (2) separate
Vercel project can deploy this repo; (3) Stripe test-mode catalog can be
wired without live keys.

**Failure modes:** (1) staging still points at prod via mis-set `VITE_*`;
(2) Edge deploy targets wrong `--project-ref`; (3) auth fallback to
production origin masks misconfiguration.

**Alternatives:** Preview-as-staging; Supabase branching.

**Security:** service-role leakage into Vercel client env.

**Isolation:** shared Sentry DSN without environment tag.

**Rollback:** bad staging migration — reseed from git migrations.

**Future migration:** topology should not assume Next.js/AWS; SPA+Supabase
Edge remains the current stack.
