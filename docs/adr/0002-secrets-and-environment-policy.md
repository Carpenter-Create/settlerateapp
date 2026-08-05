# ADR 0002: Secrets and environment policy

- Status: accepted
- Date: 2026-08-05
- Epic: Phase 8.1 / Epic 2 (Environment and Origin Hygiene)
- Deciders: Founder / Adam Carpenter

## Context

SettleRate currently mixes production-coupled configuration with local
development needs: a committed `.env` (Vite Supabase public vars), hardcoded
production auth redirect URLs, a Lovable preview origin in the Stripe
return-URL allowlist, hardcoded Supabase Edge Function hosts in the SPA,
dual package-manager lockfiles (`package-lock.json` + `bun.lockb`), and no
binding secrets/environment policy ADR.

Epic 2 is authorized to establish policy and then apply bounded hygiene
changes. This ADR records founder decisions that constrain later Epic 2
implementation PRs. **Epic 2 PR 0 is policy/governance only** — it does not
change runtime code, `.env`, `.gitignore`, package files, Edge Functions,
migrations, or deployments.

Required preserve constraints for all Epic 2 work:

- Financial engine behavior
- Entitlement behavior
- Persistence dual-snapshot semantics
- Export field semantics
- `CHECKOUT_MAINTENANCE=true` (Phase 7B pause)
- Current production behavior except specifically approved hygiene changes

## Decision

### 1. Committed `.env`

- Stop tracking `.env` going forward.
- Add `.env` to `.gitignore` during a later implementation PR (not PR 0).
- Create `.env.example` without real credentials in a later implementation PR.
- Do **not** scrub git history in Epic 2.
- No production secret rotation is authorized by this decision.

### 2. Lovable

- The Lovable preview origin
  (`https://vpcxzbaxhpucvevnkalo.lovable.app`) is obsolete.
- Remove it from the Stripe return-origin allowlist in the later
  origin-hygiene PR.
- Remove `lovable-tagger`, Lovable publishing instructions, and obsolete
  Lovable artifacts in the later cleanup PR.

### 3. Authentication redirects

- Replace hardcoded production URLs with an environment-defined application
  origin in a later **gated** PR.
- Production must resolve to `https://app.settlerate.com`.
- Local development may use the active localhost origin only when
  **explicitly configured**.
- Redirect targets must **not** accept arbitrary runtime origins (no
  open redirect via raw `window.location.origin` without an allowlist /
  explicit config).
- Supabase Auth redirect allowlist changes must be separately verified
  before any deployment that depends on them.

### 4. CORS

- Preserve `Access-Control-Allow-Origin: *` for existing Edge Functions
  during Epic 2.
- CORS policy and Stripe return-URL validation (`resolveAppOrigin` /
  allowlist) are **separate controls**.
- A CORS redesign is out of scope for Epic 2.

### 5. Package manager

- Standardize on **npm**.
- Delete `bun.lockb` in the later cleanup PR.
- CI continues to use `npm ci`.

### 6. Edge Function URLs

- Approve deriving the Edge Function base URL from `VITE_SUPABASE_URL`
  through a shared, validated helper.
- This change must be **behavior-preserving in production** (same host /
  paths as today’s hardcoded `vpcxzbaxhpucvevnkalo` function URLs when
  production env matches).

### 7. Environment topology

- Epic 2 supports **production** and **local development** only.
- Dedicated staging remains deferred to Epic 7 (`ADR 0008`).
- Do not invent a staging or preview deployment topology in Epic 2.

### 8. Environment validation

- Add lightweight fail-fast validation for required public client variables
  in a later PR.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are **public
  client configuration**, not server secrets.
- Service-role and Stripe secrets (`SUPABASE_SERVICE_ROLE_KEY`,
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and equivalent) must remain
  **server-side only** (Edge / platform secrets). Never introduce them as
  `VITE_*` or other client-bundled values.

## Consequences

- Later Epic 2 PRs may implement hygiene changes only within the decisions
  above, each under separate authorization / PR sequence discipline.
- Epic 2 PR 0 does not authorize PR 1+ implementation (`.env` untracking,
  origin allowlist edits, auth redirect changes, Edge URL helper, cleanup).
- Production secret rotation, Phase 7B live checkout reopening, staging
  topology, and CORS redesign remain prohibited.
- Agents must not invent alternate env/origin policies when this ADR is
  accepted.

## Alternatives considered

- **Scrub `.env` from git history in Epic 2.** Rejected — out of scope;
  stop tracking going forward is sufficient for this epic.
- **Tighten Edge CORS to the Stripe origin allowlist in Epic 2.** Rejected —
  higher risk / broader behavior change; document separation of controls
  instead.
- **Allow arbitrary `window.location.origin` for auth redirects.** Rejected —
  open-redirect risk; redirects require explicit configuration / allowlist.
- **Introduce staging/preview topology in Epic 2.** Rejected — deferred to
  Epic 7 / ADR 0008.
- **Keep dual npm + Bun lockfiles.** Rejected — standardize on npm; CI
  already uses `npm ci`.

## Epic 2 PR sequence (binding)

| PR | Scope | Authorization |
|----|--------|---------------|
| **PR 0** | This ADR + minimum governance status updates | Authorized (this PR) |
| **PR 1+** | `.env.example`, `.gitignore`, stop tracking `.env`, origin hygiene, Edge URL helper, client env validation, auth redirects (gated), artifact cleanup | Require separate founder authorization; implement only decisions above |

**Never begin the next Epic 2 PR automatically.**
