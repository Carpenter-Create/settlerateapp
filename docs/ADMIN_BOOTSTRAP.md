# ADMIN_BOOTSTRAP.md — Creating the first admin

**Authority:** `docs/adr/0001-admin-provisioning-model.md`
**Related:** `docs/ROLES_AND_ENTITLEMENTS.md`, `docs/SECURITY_MODEL.md`

## When to use this

Use this procedure in any environment (fresh database, restored backup, new
Supabase project) that currently has **zero** rows in `public.user_roles`
with `role = 'admin'`. If an admin already exists, use normal in-app admin
management instead — the bootstrap functions below refuse to run once any
admin exists.

As of Epic 1 PR 2 (migration `20260807010000_remove_legacy_admin_trigger.sql`),
the legacy `grant_admin_on_signup()` trigger that auto-granted admin to
`adam@carpentercreate.com` on signup has been removed from the schema. This
procedure is now the **only** way to create an admin where none exists. (In
any environment where PR 2's migration has not yet been applied, that legacy
trigger may still be present and active — check for it directly with
`select to_regprocedure('public.grant_admin_on_signup()');` before relying on
this being the only path.)

## Procedure

You need **Supabase `service_role`** access (SQL editor in the Supabase
dashboard, or `psql` connected with the service role, or any client
authenticated as `service_role`). This is the same trust boundary already
required for other privileged operations in this schema (Stripe webhook
claims, admin bypass logging).

### 1. Issue a bootstrap token (service_role only)

Run as `service_role`:

```sql
select public.issue_admin_bootstrap_token(15); -- ttl in minutes, default 15, max 60
```

This returns a **plaintext token string once**. Copy it immediately — only
its SHA-256 hash is stored, so it cannot be retrieved again. If it expires or
is lost, issue a new one (issuing again is allowed as long as no admin
exists yet).

Fails with `admin bootstrap unavailable: an admin already exists` if any
admin already exists — this is expected and means bootstrap is not needed
(or not allowed) in this environment.

### 2. Sign in as the intended first admin

Have the person who should become the first admin sign in to the app
normally (or via Supabase Auth) so they have an authenticated session.

### 3. Claim the token as that authenticated user

While authenticated as that user, call:

```sql
select public.claim_admin_bootstrap('<token-from-step-1>');
```

This can be run from the Supabase SQL editor with
`request.jwt.claim.sub` set to the user's id for a manual/SQL-only bootstrap,
or from any authenticated client context (e.g. `supabase.rpc('claim_admin_bootstrap', { p_token: token })`)
if a temporary internal tool is wired up to call it. No such UI ships in this
PR; the RPC itself is the validated, testable bootstrap path.

On success, the function returns `true` and the caller's `user_id` now has a
`role = 'admin'` row in `public.user_roles`, verifiable via:

```sql
select public.has_role('<user-id>'::uuid, 'admin');
```

### Failure modes (all fail closed)

| Condition | Result |
|---|---|
| Any admin already exists | Both `issue_admin_bootstrap_token` and `claim_admin_bootstrap` raise and do nothing |
| Token wrong / expired / already used | `claim_admin_bootstrap` raises `invalid or expired bootstrap token` |
| Caller not authenticated (`auth.uid()` null) | `claim_admin_bootstrap` raises `not authorized` |
| Two concurrent claims | An advisory lock serializes them; at most one can succeed |

## Security properties

- No hardcoded email or client-supplied identity is trusted — the only
  "existing authorization path" is possession of the `service_role` key.
- Tokens are single-use, hashed at rest (SHA-256), and expire (default 15
  minutes, max 60).
- Bootstrap is permanently disabled the instant any admin exists, so it
  cannot be replayed to mint additional admins later.
- `public.admin_bootstrap_tokens` has RLS enabled with no policies —
  `anon`/`authenticated` cannot read or write it directly under any
  circumstance; only `service_role` and the two `SECURITY DEFINER` functions
  above can.

See `supabase/tests/epic1_admin_bootstrap.sql` (run via `npm run test:entitlement-sql`)
for the automated proof of every case in this document.
