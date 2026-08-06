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

**Status: In progress — PR 1** (ADR 0004; inventory + core user-owned
owner/non-owner/anon matrix; see `docs/adr/0004-rls-testing-standard.md`
and `docs/security/RLS_COVERAGE_INVENTORY.md`).

-   Validate all RLS policies.
-   Test owner access.
-   Test non-owner restrictions.
-   Test administrative paths.

Dependency: complete before schema reconciliation.

### Epic 5 --- Shared Core Package

Create:

`packages/core`

Shared by frontend and backend for: - entitlement contracts - checkout
maintenance logic - subscription guards - Stripe billing snapshots

Goal: prevent business logic drift.

### Epic 6 --- Schema Reconciliation

-   Compare production schema against migrations.
-   Identify undocumented differences.
-   Resolve schema drift.
-   Create consolidated schema baseline.

Dependency: requires Epic 4.

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

Epic 1–3 are complete. Epic 4 is **in progress — PR 1** (core RLS matrix +
inventory).

**Next implementation step (requires separate founder authorization):**
Epic 4 PR 2 — remaining in-scope relations + administrative path
assertions.

Do not begin Epic 4 PR 2–3, Epic 5, or later epics automatically.
