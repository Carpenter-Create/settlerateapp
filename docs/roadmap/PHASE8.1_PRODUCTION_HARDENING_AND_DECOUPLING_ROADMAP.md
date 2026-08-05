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

-   Add error tracking.
-   Configure monitoring.
-   Exclude financial information from logs and breadcrumbs.

### Epic 4 --- RLS Security Test Expansion

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

Begin Epic 1 --- Admin Provisioning Security.

First step: Create the controlled admin bootstrap mechanism.

Do not remove the existing admin trigger until: - bootstrap exists -
bootstrap is tested - existing admin access is verified
