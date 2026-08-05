# ADR 0001: Admin provisioning model

- Status: accepted
- Date: 2026-08-04
- Epic: Phase 8.1 / Epic 1 (Admin Provisioning Security)
- Deciders: Founder / Adam Carpenter

## Context

Admin role grants are stored in `public.user_roles` and verified server-side via
`public.has_role(auth.uid(), 'admin')` (see `docs/ROLES_AND_ENTITLEMENTS.md`,
`docs/SECURITY_MODEL.md`). RLS on `user_roles` requires the caller to already be
an admin to `INSERT`/`DELETE` role rows, which is correct for steady-state
operation but creates a bootstrapping problem: there is currently no way to
create the *first* admin except a hardcoded-email trigger
(`grant_admin_on_signup()`, migration `20260112073631_...sql`) that
auto-grants `admin` to any `auth.users` row with
`email = 'adam@carpentercreate.com'` on signup, plus a one-time seed `INSERT`
for that same email.

This implicit, email-hardcoded bootstrap is the risk Epic 1 exists to retire
(`docs/PHASE8_1_EPIC_BOUNDARIES.md` — "Replace implicit/automatic admin grant
risk with an explicit, controlled bootstrap process"). It must not be removed
until a tested replacement exists and existing admin access is verified
(Epic 1 PR 2+, separately authorized).

## Decision

Add an explicit, **service-role-gated, single-use, time-limited bootstrap
mechanism**, additive to (not replacing) the existing trigger in this PR:

1. `public.admin_bootstrap_tokens` — stores only a SHA-256 hash of each
   token, an expiry, and single-use (`used_at`) state. RLS is enabled with
   **no policies**, so the table is default-deny for `anon`/`authenticated`;
   only `service_role` (which bypasses RLS) and the `SECURITY DEFINER`
   functions below can touch it.
2. `public.issue_admin_bootstrap_token(p_ttl_minutes)` — generates a random
   token, stores its hash, and returns the plaintext token **once**. Granted
   to `service_role` only (the same trust boundary already used for
   `claim_stripe_webhook_event`, `log_admin_entitlement_bypass`, etc.). Fails
   closed if any admin already exists.
3. `public.claim_admin_bootstrap(p_token)` — callable by any authenticated
   user. Serializes concurrent claims with `pg_advisory_xact_lock`, re-checks
   that no admin exists, validates the token against its stored hash
   (unused, unexpired, `FOR UPDATE` to prevent double-claim races), marks it
   used, and inserts the caller into `user_roles` as `admin`. Fails closed if
   an admin already exists, the token is invalid/expired/used, or the caller
   is unauthenticated.

The "explicit existing authorization path" required to bootstrap is
**possession of the Supabase `service_role` key** — the same operator trust
boundary already relied on for every other privileged write path in this
schema. No email address, client-supplied claim, or new secret category is
introduced. The token is single-use and expires quickly (default 15 minutes,
capped at 60) so a leaked bootstrap invocation has a small blast radius, and
bootstrap is permanently disabled the moment any admin exists.

**Out of scope for this PR** (Epic 1 PR 1 only creates and validates the
bootstrap path):

- Removing `grant_admin_on_signup()` / the seed `INSERT` for
  `adam@carpentercreate.com` (Epic 1 PR 2, requires separate authorization
  and verification that existing admin access survives).
- Any change to admin *promotion* behavior for users who are already admins.
- A client-facing UI for issuing/claiming tokens. The operator path is a
  documented SQL runbook (`docs/ADMIN_BOOTSTRAP.md`) run against
  `service_role`; the claim path is a single RPC callable from the app or
  SQL editor by the authenticated user completing bootstrap.

## Consequences

- Environments with zero admins (e.g., a fresh database, or after the
  legacy trigger is eventually removed) have a documented, testable way to
  create the first admin without hardcoding an email or weakening RLS.
- The legacy trigger and seed remain functional and unchanged; this ADR does
  not alter their behavior. Both mechanisms can coexist because bootstrap
  issuance/claim both fail closed once any admin exists.
- Adds one new table and two new `SECURITY DEFINER` functions to the schema
  surface that must be covered by the RLS/grant test suite
  (`supabase/tests/`), consistent with existing Phase 6 privileged-function
  conventions (`supabase/tests/phase6_function_grants.sql`).

## Alternatives considered

- **Hardcode a second admin email as a fallback.** Rejected — reintroduces
  the exact risk (implicit, email-based authorization) this epic exists to
  remove, and the requirement explicitly prohibits new hardcoded-email
  authorization.
- **Environment-variable shared secret compared in a client-callable RPC.**
  Rejected — would require distributing and rotating a static secret outside
  Postgres, and doesn't fail closed automatically once an admin exists the
  way the token-issuance check does.
- **Manual `service_role` `INSERT` into `user_roles` with no bootstrap
  function at all.** Rejected as the *sole* mechanism — it works, but is
  undocumented tribal knowledge with no single-use/expiry/fail-closed
  guarantees or test coverage; the RPC pair formalizes and tests the same
  trust boundary instead of relying on an operator remembering the right raw
  SQL.
