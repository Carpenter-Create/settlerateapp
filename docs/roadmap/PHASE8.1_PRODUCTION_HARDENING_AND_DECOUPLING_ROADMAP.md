# Phase 8.1 --- Production Hardening & Decoupling Roadmap

**Project:** SettleRate\
**Status:** Approved for execution planning

## Purpose

Phase 8.1 moves SettleRate from a strong pre-launch application into a
production-ready SaaS platform.

The goal is not to migrate technology for its own sake. The goal is to
remove unnecessary technical coupling, eliminate known risks, improve
operational maturity, and preserve future infrastructure flexibility.

AWS migration is intentionally deferred until a forcing reason exists.

## Execution Roadmap

### Epic 1 --- Admin Provisioning Security

-   Create explicit admin bootstrap process.
-   Test bootstrap process.
-   Verify existing admin access.
-   Remove automatic admin grant trigger only after replacement exists.

### Epic 2 --- Environment and Origin Hygiene

-   Add environment handling policy.
-   Add `.env.example`.
-   Remove development artifacts and obsolete origins.
-   Remove unused dependencies and duplicate lockfiles.

### Epic 3 --- Observability

**Status: Complete** (production activated and verified 2026-08-06; see
`docs/adr/0003-observability-policy.md`).

-   Add error tracking.
-   Configure monitoring.
-   Exclude financial information from logs and breadcrumbs.

### Epic 4 --- RLS Security Test Expansion

**Status: Complete on `main`** (ADR 0004; PR 0–2 merged; PR 3 not
required — CI already gates `npm run test:entitlement-sql`; see
`docs/adr/0004-rls-testing-standard.md` and
`docs/security/RLS_COVERAGE_INVENTORY.md`).

-   Validate all RLS policies.
-   Test owner access.
-   Test non-owner restrictions.
-   Test administrative paths.

Dependency: complete before schema reconciliation.

### Epic 5 --- Shared Core Package

**Status: Complete on `main`** (ADR 0005 accepted; PR 0–6 merged — see
`docs/adr/0005-shared-package-architecture.md` and
`docs/EXPORT_CONTRACT.md`).

Shared `packages/core` holds entitlement, checkout maintenance,
subscription guards, pure billing/customer/origin/observability helpers,
and export-summary mapping. Goal: prevent business-logic drift.

### Epic 6 --- Schema Reconciliation

**Status: COMPLETE** — repository closure and production tip remediation
applied/verified 2026-08-08 (ADR 0006 / ADR 0007 **accepted**; PR 0–2J +
closure — see `docs/database/EPIC6_CLOSURE.md` and
`docs/database/EPIC6_PRODUCTION_APPLY_PLAN.md`).

-   Compare production schema against migrations (after read-only capture).
-   Identify undocumented differences.
-   Resolve schema drift under classified, authorized PRs.
-   Documented consolidated schema baseline boundary (PR 2J; history preserved).
-   Tip privilege package applied to production (`20260808020000`–`40000`).

Dependency: requires Epic 4 (met). Epic 7 **COMPLETE**. Epic 8 authorized
separately (in progress). ADR 0011 remains open for destructive advisor
disposition.

### Epic 7 --- Staging Environment

**Status: COMPLETE** (ADR 0008 accepted; E2E verified). Staging database
(separate Supabase project) - staging application environment (separate
Vercel project) - Stripe test configuration - staging administrator process
- deployment workflow. See `docs/adr/0008-environment-topology.md` and
`docs/staging/EPIC7_CLOSURE.md`.

### Epic 8 --- Billing Recovery Capability

**Status: COMPLETE** (ADR 0009 accepted; staging drill verified — see
`docs/billing/EPIC8_CLOSURE.md`). Per ADR 0009:

-   Preserve verified Stripe Event JSON (recovery-authoritative evidence).
-   Create billing reconstruction process (dry-run / compare / apply).
-   Validate recovery workflow (staging drills; production apply blocked).

### Epic 9 --- Deployment Pipeline

Target:

Development → Staging → Production

Include: - staging deployment automation - production approval gate -
migration controls

### Epic 10 --- Backup and Restore Validation

-   Confirm backup configuration.
-   Perform restore test.
-   Validate application behavior.
-   Document recovery process.

## Required ADRs

-   Admin provisioning model
-   Secrets and environment policy
-   Observability policy
-   RLS testing standard
-   Shared package architecture
-   Database schema source of truth
-   Legacy schema disposition
-   Environment topology
-   Billing recovery guarantee
-   Backup and restore policy
-   Advisor model decision
-   Entitlement logic location
-   Analytics and tracking restrictions

## AWS Position

AWS is deferred, not rejected.

AWS should begin only when justified by: - compliance requirements -
enterprise requirements - measured cost crossover - infrastructure
limitations - operational necessity

## Pre-Beta Requirements

Before beta: - security issues resolved - RLS coverage expanded - schema
reproducible - staging operational - billing recovery tested -
deployment process documented - backups verified - monitoring available

## Next Approved Execution Step

Epic 1–7 are complete on `main` (Epic 6 includes verified production tip
remediation; Epic 7 staging E2E verified — see `docs/staging/EPIC7_CLOSURE.md`).
Epic 8 is **COMPLETE** (ADR 0009; staging verified). ADR 0011 remains open
for destructive advisor disposition. Epic 9+ require separate authorization.

Do not begin Epic 9 or later epics automatically. Do not resume Phase 7B
from Epic 7 or Epic 8.
