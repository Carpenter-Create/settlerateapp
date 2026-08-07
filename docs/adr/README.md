# Architecture Decision Records (ADRs)

**Phase:** 8.1 — Production Hardening & Decoupling  
**Charter:** `docs/PHASE8_1_EXECUTION_CHARTER.md`  
**Roadmap:** `docs/roadmap/PHASE8.1_PRODUCTION_HARDENING_AND_DECOUPLING_ROADMAP.md`

## Purpose

ADRs record durable decisions that constrain implementation. Prefer an ADR
**before** or **with** the first PR that depends on the decision.

Status values:

| Status | Meaning |
|--------|---------|
| `proposed` | Draft; not binding |
| `accepted` | Founder-accepted; agents must follow |
| `superseded` | Replaced by a later ADR |
| `rejected` | Explicitly not taken |

## Required ADRs (Phase 8.1)

Create one file per decision under `docs/adr/` using
`NNNN-kebab-title.md` (four-digit sequence). Until a file exists, the decision
is **unresolved** — do not invent the outcome in code.

| # | Topic | Filename | Primary epic | Status |
|---|--------|----------|--------------|--------|
| 0001 | Admin provisioning model | `0001-admin-provisioning-model.md` | Epic 1 | accepted |
| 0002 | Secrets and environment policy | `0002-secrets-and-environment-policy.md` | Epic 2 | accepted (Epic 2 complete) |
| 0003 | Observability policy | `0003-observability-policy.md` | Epic 3 | accepted (Epic 3 complete; production activated and verified 2026-08-06) |
| 0004 | RLS testing standard | `0004-rls-testing-standard.md` | Epic 4 | accepted (Epic 4 in progress — PR 2 remaining relations) |
| 0005 | Shared package architecture | `0005-shared-package-architecture.md` | Epic 5 | required / not yet written |
| 0006 | Database schema source of truth | `0006-database-schema-source-of-truth.md` | Epic 6 | required / not yet written |
| 0007 | Legacy schema disposition | `0007-legacy-schema-disposition.md` | Epic 6 | required / not yet written |
| 0008 | Environment topology | `0008-environment-topology.md` | Epic 7 | required / not yet written |
| 0009 | Billing recovery guarantee | `0009-billing-recovery-guarantee.md` | Epic 8 | required / not yet written |
| 0010 | Backup and restore policy | `0010-backup-and-restore-policy.md` | Epic 10 | required / not yet written |
| 0011 | Advisor model decision | `0011-advisor-model-decision.md` | Cross-cutting | required / not yet written |
| 0012 | Entitlement logic location | `0012-entitlement-logic-location.md` | Epic 5 | required / not yet written |
| 0013 | Analytics and tracking restrictions | `0013-analytics-and-tracking-restrictions.md` | Epic 3 | required / not yet written |

## Template

```markdown
# ADR NNNN: Title

- Status: proposed | accepted | superseded | rejected
- Date: YYYY-MM-DD
- Epic: Phase 8.1 / Epic N
- Deciders: Founder / …

## Context

## Decision

## Consequences

## Alternatives considered
```

## Agent rules

- Do not mark an ADR `accepted` without founder authorization.
- Do not implement against a `rejected` or missing required ADR when the PR
  depends on that decision — stop and report.
- Cross-link ADRs from epic PRs and from `docs/PHASE8_1_EPIC_BOUNDARIES.md`
  when relevant.
