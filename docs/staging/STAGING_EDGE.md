# Staging Edge / Auth / Export / Observability (Epic 7 PR 3)

**Authority:** `docs/adr/0008-environment-topology.md`  
**Secrets:** `docs/staging/SECRETS_CONTRACT.md`  
**Deploy SPA:** `docs/staging/STAGING_DEPLOYMENT.md`

## Edge Functions

| Item | Staging |
|------|---------|
| Project ref | `gkhbalfpxjtleypbabjo` |
| Deploy command | `bash scripts/staging/deploy-staging-functions.sh` |
| Deploy notes | Uses `--use-api` plus `supabase/functions/_shared/ensureCoreAssets.ts` so monorepo `packages/core` modules are uploaded (CLI Docker mount / bare import-map walk is insufficient) |
| Forbidden | Any deploy with `--project-ref vpcxzbaxhpucvevnkalo` from this script |

Functions deployed to staging (2026-08-08, ACTIVE):

- `check-subscription`
- `create-checkout`
- `customer-portal`
- `admin-assign-advisor`
- `stripe-webhook`
- `generate-pdf`
- `export-share`

`verify_jwt` remains `false` per `supabase/config.toml` (auth handled in function bodies / webhooks).

### Secrets required before meaningful smoke

| Secret | Staging value |
|--------|----------------|
| Platform-injected Supabase URL / anon / service role | Staging project only (platform-managed) |
| `SENTRY_DSN` | Optional staging DSN |
| `SENTRY_ENVIRONMENT` | **`staging`** when DSN is set |
| `STRIPE_*` | Test-mode only — **Epic 7 PR 4** |
| `CHECKOUT_MAINTENANCE` | May remain `true` until PR 4 enables test checkout |

Set secrets with staging project ref only:

```bash
supabase secrets set SENTRY_ENVIRONMENT=staging --project-ref gkhbalfpxjtleypbabjo
# optional: supabase secrets set SENTRY_DSN=... --project-ref gkhbalfpxjtleypbabjo
```

Never copy production secrets into staging.

## Auth (staging project only)

Configure in the **staging** Supabase Auth settings (HARD STOP if done on production):

| Setting | Value |
|---------|--------|
| Site URL | `https://staging.settlerate.com` (or exact staging Vercel hostname once allowlisted) |
| Additional redirect URLs | Same staging origin(s); local origins only if intentionally staging-linked |
| Email | Synthetic testers only; do not use production SMTP |

Application allowlist already includes `https://staging.settlerate.com` (PR 1).
If the public staging host is a specific `*.vercel.app` URL, add that **exact**
origin in app allowlists in a follow-up commit before using it for Auth.

## Export / storage

Staging `exports` bucket exists from migrations (private). `generate-pdf` /
`export-share` must run against staging Edge + staging service role only.
Export **field semantics** remain fenced (`docs/EXPORT_CONTRACT.md`).

## Observability separation

| Surface | Variable | Staging value |
|---------|----------|---------------|
| Client | `VITE_SENTRY_DSN` | Staging DSN (or unset = inert) |
| Client | `VITE_SENTRY_ENVIRONMENT` | `staging` |
| Edge | `SENTRY_DSN` | Staging DSN (or unset = inert) |
| Edge | `SENTRY_ENVIRONMENT` | `staging` |

Vite staging builds use `MODE=production`; without `VITE_SENTRY_ENVIRONMENT=staging`,
client events would incorrectly tag as `production`.

## Vercel SPA project

Created: `settlerate-app-staging` (`prj_GMmcFJmTAQnpXRtwux8VqUzM6wGo`) under
team `e8holdings` (ADR 0008).

Production env on that project (staging SPA) currently includes:

- `VITE_SUPABASE_URL` → staging Supabase
- `VITE_SUPABASE_PUBLISHABLE_KEY` → staging anon
- `VITE_APP_ORIGIN` → `https://staging.settlerate.com`
- `VITE_SENTRY_ENVIRONMENT` → `staging`

Still required before SPA smoke:

1. Connect GitHub repo `Carpenter-Create/settlerateapp` to this Vercel project
   (or `vercel deploy` from an authorized operator) — do not point the
   production `settlerate-app` project at staging env.
2. Enable Deployment Protection when available.
3. Attach custom domain `staging.settlerate.com` when DNS is ready.
4. Configure staging Supabase Auth Site URL / redirects for that origin.

## Isolation falsification (PR 3)

- [x] `supabase functions list --project-ref gkhbalfpxjtleypbabjo` shows the seven functions
- [x] Staging Edge invoke URL host contains `gkhbalfpxjtleypbabjo`
- [ ] No production service-role / live Stripe secrets in staging secrets list
- [ ] Auth Site URL is staging (not `app.settlerate.com`) — configure on staging Dashboard
- [ ] `SENTRY_ENVIRONMENT=staging` set on staging secrets (Dashboard/CLI) when DSN used
- [ ] Staging Vercel project env points only at staging Supabase
- [ ] Production Auth Dashboard / production Edge secrets unchanged

## Phase 7B

Does not authorize Phase 7B resume or production `CHECKOUT_MAINTENANCE=false`.
