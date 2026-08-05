# Phase 8.1 — Epic Boundaries

**Authority:** `docs/PHASE8_1_EXECUTION_CHARTER.md`,  
`docs/roadmap/PHASE8.1_PRODUCTION_HARDENING_AND_DECOUPLING_ROADMAP.md`

Agents may work only on the **currently authorized epic and PR**. Do not pull
forward later-epic work to “finish related items.”

---

## Epic 1 — Admin Provisioning Security

**Status:** Complete on `main` (PR 0, PR 1, and PR 2 merged).

**Goal:** Replace implicit/automatic admin grant risk with an explicit,
controlled bootstrap process.

### Completed work

- Explicit admin bootstrap mechanism (`docs/ADMIN_BOOTSTRAP.md`,
  `docs/adr/0001-admin-provisioning-model.md`)
- Tests for the bootstrap process and legacy-trigger removal
- Verification of existing admin access before removing legacy grant paths
- Removal of the automatic admin grant trigger after bootstrap existed and
  was tested
- Documentation and ADRs for the admin provisioning model

### Historical prohibitions (kept for audit; Epic 1 closed)

- Removing the admin trigger before replacement is proven
- Broad roles/entitlements redesign beyond admin provisioning
- Phase 7B live smoke subscription, beta opening, or public checkout
- AWS / Cloudflare / Next.js migration
- Shared `packages/core` extraction (Epic 5)
- Schema reconciliation or broad DDL (Epic 6)
- Staging environment build-out (Epic 7)
- Billing recovery / raw Stripe payload work (Epic 8)
- Deployment pipeline redesign (Epic 9)
- Backup/restore campaigns (Epic 10)

### Epic 1 PR sequence

| PR | Scope | Status |
|----|--------|--------|
| **PR 0** | Governance only (`AGENTS.md`, `.cursor/rules/*`, `docs/PHASE8_1_*`, `docs/adr/README.md`) | Complete / merged |
| **PR 1** | Controlled admin bootstrap mechanism (implementation) | Complete / merged |
| **PR 2** | Legacy admin auto-grant trigger removal (tests + docs) | Complete / merged |

Epic 1 repository work is complete. Do **not** begin Epic 2 unless the founder
explicitly authorizes it. Applying Epic 1 migrations to production remains a
separate, explicitly authorized deployment step (see ADR 0001).

---

## Epic 2 — Environment and Origin Hygiene

Allowed when authorized: environment handling policy, `.env.example`, remove
development artifacts / obsolete origins, unused dependencies and duplicate
lockfiles.  
Prohibited until authorized: secret rotation in production, Stripe live cutover
resume, unrelated refactors.

---

## Epic 3 — Observability

Allowed when authorized: error tracking, monitoring configuration, exclusion of
financial information from logs and breadcrumbs.  
Prohibited: logging raw Stripe payloads, account numbers, or full mortgage
inputs in third-party tools.

---

## Epic 4 — RLS Security Test Expansion

Allowed when authorized: validate RLS policies; owner / non-owner /
administrative path tests.  
**Dependency:** complete before Epic 6 schema reconciliation.

---

## Epic 5 — Shared Core Package

Allowed when authorized: create `packages/core` shared by frontend and backend
for entitlement contracts, checkout maintenance, subscription guards, Stripe
billing snapshots.  
Goal: prevent business-logic drift. Do not change formula semantics while
moving code unless a DEF-* is authorized.

**Export fence (hard rule during Phase 8.1):** Authority
`docs/EXPORT_CONTRACT.md`. Protected surfaces:
`docs/EXPORT_CONTRACT.md`,
`supabase/functions/generate-pdf/mapDerivedForExport.ts`,
`src/lib/exports/`.

- Epic 5 **may** relocate export-related code and update imports.
- Epic 5 **may not** redefine export fields, meanings, omission rules,
  snapshot-selection behavior, or other contract behavior.
- Any export field semantics change requires **explicit architectural
  approval** (not implied by Epic 5 authorization alone).

---

## Epic 6 — Schema Reconciliation

Allowed when authorized: compare production schema vs migrations; resolve
drift; consolidated schema baseline.  
**Requires Epic 4.** Prefer ADR “Database schema source of truth” first.

---

## Epic 7 — Staging Environment

Allowed when authorized: staging database/app, Stripe **test** configuration,
staging admin process, deployment workflow.  
Do not point staging at live Stripe secrets.

---

## Epic 8 — Billing Recovery Capability

Allowed when authorized: preserve raw Stripe event payloads; reconstruction
process; recovery validation.  
Respect Phase 7B pause and maintenance gate; do not open public checkout.

---

## Epic 9 — Deployment Pipeline

Allowed when authorized: Development → Staging → Production automation,
production approval gate, migration controls.

---

## Epic 10 — Backup and Restore Validation

Allowed when authorized: confirm backups, restore test, document recovery.

---

## Global prohibitions (all Phase 8.1 epics unless separately authorized)

- Begin AWS / Cloudflare migration
- Begin Next.js migration as a platform rewrite
- Weaken CI, RLS, or financial benchmarks for green builds
- Commit secrets to git
- Resume Phase 7B live customer smoke / beta / public checkout without founder
  re-authorization after infrastructure deployment
- Cross epic boundaries to “finish related work”
- Change export field semantics (`docs/EXPORT_CONTRACT.md`,
  `mapDerivedForExport.ts`, `src/lib/exports/`) without explicit
  architectural approval — relocation/import updates under Epic 5 do not
  authorize semantic redefinition
