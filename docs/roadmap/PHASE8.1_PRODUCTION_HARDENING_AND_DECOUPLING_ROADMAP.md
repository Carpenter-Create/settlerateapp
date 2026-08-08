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

**Status: In progress — PR 2D** (ADR 0006 / ADR 0007 **accepted**; PR 0–2C
complete/merged — see `docs/adr/0006-database-schema-source-of-truth.md`,
`docs/database/GRANT_SECURITY_DECISIONS_PR2C.md`,
`docs/database/GRANT_REMEDIATION_PR2D.md`).

-   Compare production schema against migrations (after read-only capture).
-   Identify undocumented differences.
-   Resolve schema drift under classified, authorized PRs.
-   Create consolidated schema baseline when authorized (accepted strategy:
    preserve historical migrations **and** a documented consolidated
    baseline boundary; implementation deferred).

Dependency: requires Epic 4 (met). PR 2D = first least-privilege grant
remediation (in progress; production apply gated). Later PR 2 slices
unauthorized. Epic 7+ unauthorized.

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

Epic 1–5 are complete on `main`. Epic 6 is **in progress — autonomous
repository completion train** (ADR 0006 / ADR 0007 **accepted**; PR 0–2C
complete/merged; PR 2D+ repository slices authorized under master prompt;
production apply gated via `docs/database/EPIC6_PRODUCTION_APPLY_PLAN.md`).

**Production apply** of Epic 6 tip migrations requires separate founder
authorization of the consolidated apply package — never automatic.

Do not begin Epic 7 or later epics automatically.
