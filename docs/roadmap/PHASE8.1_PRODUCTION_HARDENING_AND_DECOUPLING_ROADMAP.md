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

**Status: Complete on `main` (repository)** (ADR 0006 / ADR 0007
**accepted**; PR 0–2J + closure — see `docs/database/EPIC6_CLOSURE.md`).

-   Compare production schema against migrations (after read-only capture).
-   Identify undocumented differences.
-   Resolve schema drift under classified, authorized PRs.
-   Documented consolidated schema baseline boundary (PR 2J; history preserved).

Dependency: requires Epic 4 (met). Production apply of tip migrations remains
founder-gated via `docs/database/EPIC6_PRODUCTION_APPLY_PLAN.md`. Epic 7+
unauthorized.

### Epic 7 --- Staging Environment

Establish: - staging database - staging application environment - Stripe
test configuration - staging administrator process - deployment workflow

### Epic 8 --- Billing Recovery Capability

-   Preserve raw Stripe event payloads.
-   Create billing reconstruction process.
-   Validate recovery workflow.

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

Epic 1–6 (repository) are complete on `main`. Epic 6 production apply is
**not** authorized until founder approval of
`docs/database/EPIC6_PRODUCTION_APPLY_PLAN.md`. ADR 0011 remains open for
destructive advisor disposition.

Do not begin Epic 7 or later epics automatically.
