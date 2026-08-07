# ADR 0004: RLS testing standard

- Status: accepted
- Date: 2026-08-06
- Epic: Phase 8.1 / Epic 4 (RLS Security Test Expansion)
- Deciders: Founder / Adam Carpenter

## Context

SettleRate requires Row-Level Security on all user data tables
(`docs/SECURITY_MODEL.md`). Production migrations enable RLS across
user-owned and related tables, and Phase 6 / Epic 1 SQL harnesses
(`npm run test:entitlement-sql`, `supabase/tests/`) already exercise
entitlement RPCs, privileged grants, and admin bootstrap under an
ephemeral Postgres + `auth` stub (`supabase/tests/00_auth_stub.sql`,
including `test.set_auth`).

What is still missing is a **binding standard** for expanding that
harness into systematic **owner / non-owner / administrative** RLS
coverage across the in-scope table set — the gap Epic 4 exists to close
(`docs/PHASE8_1_EPIC_BOUNDARIES.md`, roadmap Epic 4). Without an ADR,
agents could invent ad-hoc client-only checks, probe production, weaken
policies for green CI, or expand into schema reconciliation (Epic 6).

This ADR records founder-accepted decisions that bound all Epic 4
implementation PRs. **Epic 4 PR 0 is policy/governance only** — it does
not add RLS tests, change policies or migrations, modify application
code, or touch Supabase / production configuration.

## Decision

### 1. Purpose of Epic 4

- Expand **automated RLS security tests** so isolation is proven in CI.
- Prove, for each in-scope table, the expected outcomes for:
  - **owner** access (authenticated caller whose `auth.uid()` matches the
    row ownership rule),
  - **non-owner** authenticated access (denied where isolation requires),
  - **administrative** paths (where policies explicitly grant admin via
    `public.has_role(auth.uid(), 'admin')` or equivalent),
  - **anon** access (denied except for intentionally public write/read
    surfaces already defined by migrations — e.g. contact insert).
- Epic 4 is a **test-expansion** epic. It does **not** authorize a general
  RLS redesign, schema reconciliation (Epic 6), or staging topology
  (Epic 7).

### 2. Authority and preserve constraints

Authoritative security target: `docs/SECURITY_MODEL.md` (RLS required;
standard owner pattern; admin via `user_roles` + `has_role`).

All Epic 4 work must preserve:

- Financial engine behavior and benchmarks
- Entitlement SQL semantics (Phase 6)
- Persistence dual-snapshot semantics
- Export field semantics (`docs/EXPORT_CONTRACT.md`)
- `CHECKOUT_MAINTENANCE=true` (Phase 7B pause)
- Current production RLS policies unless a **confirmed** isolation defect
  is fixed under a separately authorized Epic 4 implementation PR

### 3. Test execution model

- RLS tests run against an **ephemeral Postgres** database that applies
  the repository migration chain (same family as
  `npm run test:entitlement-sql`).
- Use the existing auth stub and role helpers
  (`supabase/tests/00_auth_stub.sql`, `test.set_auth` / clear helpers)
  so policies evaluate `auth.uid()` / `auth.role()` under
  `anon` / `authenticated` / `service_role` as appropriate.
- Prefer additive SQL under `supabase/tests/` (and harness wiring in
  `scripts/test-entitlement-sql.mjs` or a dedicated sibling script only if
  required). Do **not** introduce a second conflicting auth stub.
- **Prohibited as Epic 4 test evidence:** production database probing,
  relying solely on client-side mocks without SQL/RLS evaluation, or
  disabling RLS / using table-owner bypass to force green results.

### 4. In-scope table classes

Implementation PRs must maintain an explicit coverage inventory derived
from migrations (RLS-enabled relations). Minimum classes:

| Class | Examples (non-exhaustive; inventory from migrations) |
|-------|------------------------------------------------------|
| Core user-owned | `scenarios`, `saved_comparisons`, `comparison_items`, `comparison_versions`, `user_comparisons`, `profiles` |
| Export / share | `pdf_exports`, `export_files`, `export_shares`, `comparison_shares` |
| Billing / entitlement support | `billing` (client read rules), `stripe_webhook_events`, `entitlement_bypass_log` |
| Roles / admin | `user_roles`, `admin_audit_log`, `admin_bootstrap_tokens`, `advisor_access_requests` |
| Public-ish | `contact_messages` (intentional anon/authenticated insert; no public select) |
| Storage | `storage.objects` / exports-bucket policies when covered by repo migrations |

Exact inventory and per-operation expectations are fixed in implementation
PRs against current migrations — not invented here as a frozen table list
that could drift before Epic 6.

### 5. Required assertion matrix (per in-scope relation)

For each in-scope relation, tests must document and assert the applicable
subset of:

1. **RLS enabled** (fail if disabled).
2. **Owner** — allowed operations match declared policies (typically
   SELECT/INSERT/UPDATE/DELETE where owner policies exist).
3. **Non-owner authenticated** — cannot read or mutate another user's rows
   (or narrower: only the operations the policy denies).
4. **Admin** — where an admin policy exists, an admin subject can perform
   the granted operation; where none exists, admin is not an implicit
   bypass (except `service_role`, which bypasses RLS by design and must
   not be used to “prove” user isolation).
5. **Anon** — denied except intentional public operations already defined
   by migrations.

`service_role` bypass may be used only to **seed fixtures** or assert
privileged RPC behavior already covered elsewhere — never as a substitute
for owner/non-owner/admin matrix rows.

### 6. Defect handling

- A failing RLS test is a **security finding**, not an invitation to weaken
  the test.
- Policy or migration fixes require **separate founder authorization** for
  that implementation PR (still under Epic 4 if scoped to the confirmed
  defect). Fixes must strengthen or correctly implement the
  `SECURITY_MODEL.md` isolation target — never broaden cross-user access
  to make CI green.
- Do not convert failing RLS assertions to `it.todo` / skipped SQL without
  founder decision.

### 7. CI and validation

- Epic 4 RLS tests must be runnable locally via the documented npm script
  path (extend `test:entitlement-sql` or add a clearly named companion
  script invoked by CI when authorized).
- Implementation PRs must keep the Phase 8.1 validation suite green:

```bash
npm run lint
npm run typecheck
npm run verify:benchmarks
npm run test:run
npm run build
```

- Plus the SQL/RLS harness command(s) defined by the implementation PR.
- Do not weaken CI, RLS, or financial benchmarks
  (`.cursor/rules/settlerate-validation-and-git.mdc`).

### 8. Explicitly out of scope for Epic 4

- Changing application TypeScript/React behavior unrelated to running tests
- Broad entitlement/billing redesign
- Schema reconciliation or consolidated schema baseline (Epic 6)
- Staging environment / topology (Epic 7 / ADR 0008)
- Billing recovery / raw Stripe payload retention (Epic 8)
- Shared `packages/core` extraction (Epic 5)
- AWS / Cloudflare / Next.js platform migration
- Resuming Phase 7B live smoke / public checkout / disabling
  `CHECKOUT_MAINTENANCE`
- Production secret rotation or Supabase dashboard policy edits as a
  substitute for repository tests
- Implementing RLS tests in **this PR (PR 0)**

### 9. Implementation sequencing

- **PR 0** (this ADR): policy and governance only; no tests.
- **Later implementation PRs** (each separately authorized; see Epic 4
  PR sequence in `docs/PHASE8_1_EPIC_BOUNDARIES.md`):
  - inventory + harness wiring,
  - owner / non-owner / anon matrix,
  - administrative path coverage,
  - CI gate completion.
- **No production schema or policy change is authorized by PR 0.**

## Consequences

- Later Epic 4 PRs may add SQL/RLS tests only within the decisions above.
- Epic 4 PR 0 does not authorize writing RLS tests, modifying migrations or
  policies, changing application code, deploying, or beginning Epic 5+.
- Existing Phase 6 / Epic 1 SQL tests remain; Epic 4 extends coverage rather
  than replacing entitlement semantics tests.
- Agents must not invent alternate authorization test strategies (e.g.
  UI-only checks) when this ADR is accepted.
- Epic 6 remains blocked until Epic 4 acceptance criteria are met.

## Alternatives considered

- **Client/integration tests only (Supabase JS against a shared project).**
  Rejected as the sole standard — slower, environment-coupled, and easier
  to accidentally use elevated keys; ephemeral migration-chain SQL remains
  the authoritative gate.
- **Rewrite RLS policies as the first Epic 4 step.** Rejected — epic goal is
  test expansion against current policy intent; policy edits only for
  confirmed defects under separate authorization.
- **Defer all RLS testing to Epic 6 schema reconciliation.** Rejected —
  charter/roadmap place RLS coverage **before** schema reconciliation;
  security isolation evidence must not wait on drift cleanup.
- **Probe production RLS with live user JWTs as acceptance evidence.**
  Rejected — unsafe, non-repeatable, and out of scope for CI; ephemeral
  harness is required.

## Epic 4 PR sequence (binding)

| PR | Scope | Status |
|----|--------|--------|
| **PR 0** | This ADR + minimum governance status updates (acceptance criteria, PR sequence, roadmap next-step correction) | Complete / merged |
| **PR 1** | RLS coverage inventory + harness wiring; owner / non-owner / anon matrix for core user-owned tables | Complete / merged |
| **PR 2** | Remaining in-scope relations (export/share, billing support, roles/admin, public-ish, storage as applicable) + administrative path assertions | **In progress** |
| **PR 3** | CI gate completion for the RLS suite (if not fully landed in PR 1–2); gap closure against the acceptance criteria | Not authorized — requires separate founder authorization |

**Epic 4 status:** In progress — PR 2. Do not begin PR 3 automatically.
