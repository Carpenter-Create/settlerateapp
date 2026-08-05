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
(`grant_admin_on_signup()`, migration
`20260112073255_b843502b-023c-47cf-9db8-5fbc6d281c66.sql`) that auto-grants
`admin` to any `auth.users` row with `email = 'adam@carpentercreate.com'` on
signup, plus a one-time seed `INSERT` for that same email in the same
migration.

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

## Update — Epic 1 PR 2 (legacy trigger removal)

- Date: 2026-08-05
- Migration: `supabase/migrations/20260807010000_remove_legacy_admin_trigger.sql`

**Deployment sequencing (required in every environment):**

1. The Epic 1 PR 1 migration (`20260806010000_admin_bootstrap.sql`) **must
   be applied before** the Epic 1 PR 2 migration
   (`20260807010000_remove_legacy_admin_trigger.sql`). Applying PR 2 first
   would remove the legacy auto-grant path before the explicit bootstrap
   path exists, leaving an environment with zero admin-provisioning paths.
2. PR 2 removes the legacy implicit bootstrap path (the
   `grant_admin_on_signup()` trigger) **only after** the explicit bootstrap
   path from PR 1 (`issue_admin_bootstrap_token` / `claim_admin_bootstrap`)
   exists and is tested — this is the ordering PR 1's ADR text above
   required before removal was authorized.

Per the decision above, the PR 2 migration drops only
`on_auth_user_created_grant_admin` (trigger) and `grant_admin_on_signup()`
(function). It does not edit the historical seed migration, does not modify
`user_roles` rows, and does not change `promote_to_admin()` or any RLS
policy. See `supabase/tests/epic1_remove_admin_trigger.sql` for the
automated proof that: new signups using the legacy hardcoded email are no
longer auto-granted admin; the PR 1 bootstrap mechanism still works after
removal; and existing admin promotion (`promote_to_admin`) still works.

## Update — Epic 1 production deployment complete

- Date: 2026-08-05
- Project: `vpcxzbaxhpucvevnkalo`

Production deployment completed in order:

1. PR 1 migration recorded as version `20260805151537` / `admin_bootstrap`
2. PR 2 migration recorded as version `20260805175819` /
   `remove_legacy_admin_trigger`

Verified after deployment:

- Explicit bootstrap path is live (`admin_bootstrap_tokens`,
  `issue_admin_bootstrap_token`, `claim_admin_bootstrap`)
- Legacy hardcoded-email auto-grant path is removed
  (`on_auth_user_created_grant_admin` and `grant_admin_on_signup()` gone)
- Existing admin access preserved —
  `adam@carpentercreate.com` (`d7ed78d7-69b8-43c9-bb54-1eb936a5a993`),
  granted `2026-01-12 07:37:48 UTC`, unchanged
- Admin promotion (`promote_to_admin`) remains present and unchanged

Epic 1 is fully effective in production.
