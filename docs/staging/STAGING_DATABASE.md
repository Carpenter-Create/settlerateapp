# Staging Database (Epic 7 PR 2)

**Authority:** `docs/adr/0008-environment-topology.md`, ADR 0006  
**Secrets:** `docs/staging/SECRETS_CONTRACT.md`  
**Seed policy:** `docs/staging/STAGING_SEED_POLICY.md`

## Identifiers

| Item | Value |
|------|--------|
| Staging Supabase project | SettleRate Staging |
| Staging project ref | `gkhbalfpxjtleypbabjo` |
| Staging API URL | `https://gkhbalfpxjtleypbabjo.supabase.co` |
| Region | `us-east-1` |
| Production ref (do not use) | `vpcxzbaxhpucvevnkalo` |
| Schema source of truth | git `supabase/migrations/` (ADR 0006) |

## Applied state (2026-08-08)

| Check | Result |
|-------|--------|
| Migration tip | `20260808040000` / `epic6_pr2h_legacy_share_rpc_execute` |
| Migration versions applied | 33 (full git chain present in staging ledger) |
| Production tip after apply | unchanged at `20260808040000` (no production mutation) |
| User data rows | `auth.users` / `profiles` / `scenarios` = **0** (no prod clone) |
| Storage | private `exports` bucket present (from migrations) |
| RLS | enabled on public application tables |

## Greenfield apply procedure

Historical migration `20260119150338` creates `generate_share_token` with
unqualified `gen_random_bytes()`. On a fresh Supabase project this can fail
for the migration role because pgcrypto resolves under `extensions`.

**Do not rewrite historical migrations** (ADR 0006). Use the staging
preflight wrapper instead:

```bash
# Preferred (restores production CLI link on exit)
bash scripts/staging/apply-staging-migrations.sh
```

Manual equivalent:

1. `supabase link --project-ref gkhbalfpxjtleypbabjo --yes`
2. `supabase db query --linked --file scripts/staging/preflight-pgcrypto-wrappers.sql`
3. `supabase db push --linked --yes`
4. **Always** `supabase link --project-ref vpcxzbaxhpucvevnkalo --yes`

### Known historical quirk (not a staging blocker)

`encode(..., 'base64url')` in the legacy share-token SQL function fails at
**runtime** on current Postgres (`unrecognized encoding: "base64url"`).
The same failure exists on production today. Epic 6 retained the dual
comparison/export model; this does not block migration apply or the active
`pdf_exports` path. Do not “fix” by editing old migrations in Epic 7.

## Isolation falsification (PR 2)

| Probe | Expected | Observed |
|-------|----------|----------|
| Staging API host | `gkhbalfpxjtleypbabjo.supabase.co` | yes |
| Staging ≠ production project id | distinct refs | yes |
| Staging migrations tip matches git tip package | `20260808040000` | yes |
| Production tip unchanged by staging apply | still `20260808040000` | yes |
| Staging contains production customer rows | forbidden | empty app tables |
| CLI default link after ops | production ref | restored to `vpcxzbaxhpucvevnkalo` |

## Auth configuration (staging project only)

Configure on the **staging** Supabase Auth settings (never production):

| Setting | Value |
|---------|--------|
| Site URL | `https://staging.settlerate.com` (or staging Vercel hostname once chosen) |
| Redirect allowlist | Exact staging origin(s) + local if needed for staging-linked local work |
| Email | Prefer Supabase built-in / disabled real-customer delivery; synthetic testers only |

Application origin allowlist already includes `https://staging.settlerate.com`
(Epic 7 PR 1). Arbitrary `*.vercel.app` remains rejected until an exact
hostname is added in a later PR if used as the public staging origin.

## Reset / rebuild

Preferred dirty-staging recovery:

1. Wipe staging DB (Dashboard reset / new project only with founder awareness of cost).
2. Re-run `scripts/staging/apply-staging-migrations.sh`.
3. Reseed per `STAGING_SEED_POLICY.md`.

Never “recover” by pointing staging at production.

## Self-challenge (PR 2)

**Assumptions:** (1) migration chain is sufficient without Dashboard DDL;
(2) pgcrypto preflight remains needed for greenfield replay; (3) empty DB +
synthetic signup is enough until smoke PR.

**Failure modes:** (1) operator leaves CLI linked to staging and pushes to
wrong project; (2) someone edits historical migrations to fix base64url;
(3) Auth redirects configured on production by mistake.

**Alternatives:** Supabase Branching; copy production schema dump.

**Security:** service-role for staging must never be pasted into production
Vercel env.

**Isolation:** verify SPA `VITE_SUPABASE_URL` host before any smoke.

**Rollback:** re-run migrate+seed; do not touch production.

**Future migration:** bootstrap must stay SPA+Supabase; no Next.js/AWS assumption.
