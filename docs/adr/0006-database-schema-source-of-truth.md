# ADR 0006: Database schema source of truth

- Status: accepted
- Date: 2026-08-07
- Epic: Phase 8.1 / Epic 6 (Schema Reconciliation)
- Deciders: Founder / Adam Carpenter

## Context

SettleRate’s database schema has evolved through a chronological chain of
Supabase migrations (`supabase/migrations/`, currently 29 files), while
generated PostgREST TypeScript types
(`src/integrations/supabase/types.ts`), ephemeral CI reconstruction
(`npm run test:entitlement-sql`), RLS inventory
(`docs/security/RLS_COVERAGE_INVENTORY.md`), and live production may
diverge. Repository inspection already surfaces candidates such as:

- `public.subscriptions` referenced by Edge/types/triggers without a
  migration `CREATE TABLE`;
- `profiles` column-set mismatch between migrations and generated types;
- tables/RPCs present in migrations but absent from generated types
  (e.g. `admin_bootstrap_tokens`, webhook/bypass tables, bootstrap RPCs).

Without a binding source-of-truth hierarchy, Epic 6 implementation could
silently prefer production, silently prefer migrations, treat generated
types as authority, commit customer data as “evidence,” or perform
destructive cleanup without classification.

**Epic 6 PR 0 is ADR + inventory + methodology only.** It does not capture
production, mutate schema, create migrations, or reconcile objects.
Production capture must occur before reconciliation or schema mutation
(Epic 6 PR 1+, separately authorized).

Related: ADR 0004 (RLS testing — ephemeral reconstruction), ADR 0007
(legacy disposition process),
`docs/database/SCHEMA_RECONCILIATION_INVENTORY.md`.

## Decision

### 1. Authority hierarchy after Epic 6

Order of authority for **what the schema ought to be** once
reconciliation is complete:

1. **Reviewed migration history in git** (and, when introduced under a
   separately authorized Epic 6 slice, a consolidated reproducible
   baseline + subsequent incremental migrations) — the durable,
   reviewable definition of schema intent.
2. **Documented intentional exceptions** (ADR 0007 classifications for
   retained legacy / compatibility objects) — never silent.
3. **Live production schema** — authoritative for *what currently exists*
   during capture and drift classification; **not** an ongoing license to
   invent schema outside git.
4. **Local / CI reconstruction** from repository migrations/baseline —
   proof that git can rebuild an equivalent catalog.
5. **Generated Supabase TypeScript types** — **derived artifact only**;
   regenerated from the reconciled schema; never an independent schema
   authority.
6. **Narrative documentation** — describes intent and operators’ guides;
   must be updated to match reconciled reality, but does not override
   migrations.

**Explicit:** `src/integrations/supabase/types.ts` is evidence of a past
introspection snapshot (project/environment unknown unless documented).
It must not be used to “win” conflicts against migrations or production
without classification and a migration PR.

### 2. Drift detection

Epic 6 must compare, in a reproducible, machine-readable way:

| ID | Surface | Role |
|----|---------|------|
| **A** | Production schema evidence (read-only capture) | Live reality |
| **B** | Schema reconstructed solely from repository migrations/baseline | Git reconstructability |
| **C** | Generated TypeScript database types | Derived client contract |
| **D** | Application / Edge / RPC assumptions (static inventory) | Runtime dependency evidence |

Minimum comparison dimensions: tables, columns/types, views, enums,
functions/RPCs, triggers, constraints/FKs/uniques, indexes relied on for
security or uniqueness, RLS enablement, policies, grants, and
security-relevant extensions.

Drift reports must be **schema-only**. No customer row payloads in git.

**Production capture is a prerequisite** before reconciliation or schema
mutation. Repository history alone must not erase unknown live objects by
assumption.

### 3. Drift classification (before mutation)

Every differing object must be classified before any change:

| Class | Meaning |
|-------|---------|
| `repo_missing_production_object` | Live object absent from migrations/baseline |
| `production_missing_repo_object` | Migration object absent from production |
| `definition_mismatch` | Same name, different definition |
| `policy_rls_mismatch` | RLS enablement or policy text/set differs |
| `grant_mismatch` | Privilege matrix differs |
| `function_rpc_mismatch` | Function/RPC signature or body differs |
| `constraint_index_mismatch` | Constraint/index differs |
| `generated_types_mismatch` | Types disagree with reconciled schema |
| `intentional_legacy` | Retained under ADR 0007 with documented reason |
| `unknown_founder_decision` | Blocked pending founder/product decision |

**No automatic “production wins” or “migrations win” rule** for conflicting
business, billing, entitlement, admin, or security semantics. Classification
→ authorized reconciliation PR → migration (if needed).

### 4. Future change rule (post-reconciliation)

Once Epic 6 closes under this accepted ADR:

- Schema changes originate as **reviewed migrations** in git.
- Supabase Dashboard / manual production DDL is **prohibited** except a
  documented emergency procedure.
- Emergency DDL must be captured back into migration history **immediately**
  (same incident window).
- Generated types are regenerated from the reconciled schema and reviewed
  with the migration PR when the client contract changes.
- CI should eventually prove **clean reconstruction** of the canonical
  catalog (and remain green for RLS/entitlement SQL gates).

### 5. Baseline strategy (accepted; implementation deferred)

**Accepted decision:** preserve the full historical migration chain for
audit/history **and** establish a documented consolidated reproducible
baseline boundary for new environments.

Implementation of that baseline artifact is delivered in Epic 6 PR 2J as a
**documented boundary** over the preserved historical migration chain (see
`docs/database/SCHEMA_BASELINE_PR2J.md`). No history squash.

Tradeoffs considered:

| Approach | Pros | Cons |
|----------|------|------|
| Replay all historical migrations forever | Maximal history fidelity | Slow/fragile greenfield; harness stubs (e.g. `subscriptions`) paper over gaps |
| Squash-only baseline | Fast clean environments | Loses audit narrative unless history retained elsewhere |
| **History + documented baseline boundary** (**accepted**) | Clean reconstruct for new envs; history retained | Requires careful cutover and CI wiring |

### 6. Production evidence capture (read-only; later PR)

Preferred process (conceptual; operator credentials **outside git**):

1. Founder/operator authenticates to the production Supabase/Postgres
   project with least-privilege read access.
2. Capture **schema-only** catalog evidence via Supabase CLI and/or
   Postgres introspection (`pg_catalog` / `information_schema`), e.g.
   schema dump without data, plus policy/grant/function listings.
3. Store machine-readable drift inputs as **non-secret** artifacts under a
   docs/database path (or CI artifact) with clear “PRODUCTION EVIDENCE”
   labeling and capture date/project ref (no passwords, no service-role
   keys, no customer rows).
4. Never commit `COPY`/CSV dumps of user, billing, or scenario data.

PR 0 does **not** execute against production. PR 1 (read-only capture)
remains separately unauthorized until founder authorization.

### 7. Epic 6 PR sequence

| PR | Scope | Authorization |
|----|--------|---------------|
| **PR 0** | ADR 0006 + ADR 0007 + repository inventory + methodology + governance | Complete / merged |
| **PR 1** | Read-only production schema capture + machine-readable drift report; no schema mutation | Complete / merged |
| **PR 2A** | Schema provenance / reconstruction blocker (`subscriptions` + scoped `profiles` columns) | Complete / merged |
| **PR 2B** | Post-provenance drift refresh (evidence only) | Complete / merged |
| **PR 2C** | Grant/security classification + founder decision package (evidence only) | Complete / merged |
| **PR 2D–2J** | Grant remediation, types, RPC EXECUTE, storage, dual-model, advisor check, baseline | Complete (repository) |
| **Closure** | Prove clean reconstruction; update baseline/SoT docs; regenerate types as needed | Complete (repository) |

Suggested slice grouping (to refine from drift report):

1. Core user/profile/scenario/comparison tables  
2. Entitlement/billing/webhook tables + RPCs  
3. Admin/bootstrap/advisor leftovers (with ADR 0007 / ADR 0011)  
4. Functions/RPCs/triggers  
5. RLS/policies/grants  
6. Generated types alignment  
7. Baseline / reconstruction CI wiring  

### 8. Preserve constraints

Epic 6 must not change: mortgage/financial semantics; calculator version;
benchmarks; entitlement outcomes; export field semantics; Phase 7B
checkout maintenance posture; security weakenings “to make green.”

## Consequences

- This ADR is **accepted** and binding for Epic 6 schema work.
- Schema mutation PRs still require separate authorization and must follow
  production capture → classification → migration (when needed).
- Agents treat generated types as derived until regeneration is authorized.
- Production capture is complete (Epic 6 PR 1). PR 2A restored orphan
  provenance in git without applying DDL to production in that PR.
- PR 2B refreshed the post-provenance drift baseline (evidence only).
- PR 2C classified grant/security least-privilege decisions (founder FD-*
  accepted).
- PR 2D–2J + closure complete on the repository; consolidated tip package
  applied to production 2026-08-08 (see
  `docs/database/EPIC6_PRODUCTION_APPLY_PLAN.md` execution record and
  `docs/database/EPIC6_CLOSURE.md`).
- Baseline boundary documented in `docs/database/SCHEMA_BASELINE_PR2J.md`.

## Alternatives considered

- **Production-only authority.** Rejected — unreproducible; bypasses review.
- **Migrations-only without production capture.** Rejected — can erase
  unknown live objects by assumption.
- **Types.ts as SoT.** Rejected — derived; already drifts from migrations.
- **Immediate squash of all history in PR 0.** Rejected — out of scope;
  loses audit trail without an accepted baseline plan.
- **Replay-forever without a baseline boundary.** Rejected in favor of
  history + documented baseline boundary (PR 2J).
