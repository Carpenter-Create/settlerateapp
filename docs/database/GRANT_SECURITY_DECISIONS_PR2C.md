# Grant Security Decisions — Epic 6 PR 2C

**Phase:** 8.1 / Epic 6 PR 2C
**Generated:** 2026-08-08T00:44:48.115Z
**Status:** EVIDENCE / CLASSIFICATION ONLY — no GRANT/REVOKE executed
**Authority:** ADR 0006, ADR 0007; post-PR2B drift baseline
**Machine inventory:** `docs/database/grant-security-inventory-pr2c.json`

This document converts production-vs-migration_only grant drift into a
least-privilege decision package. **No privilege changes are authorized**
by this PR.

---

## Summary counts

| Metric | Count |
|---|---:|
| Total inventory records (mismatches + matched critical) | 879 |
| Migration-only `grant_mismatch` analyzed | 700 |
| Public-schema mismatches | 579 |
| Storage/platform mismatches | 121 |
| Matched critical grants included | 179 |

### By taxonomy category

| Category | Count |
|---|---:|
| `expected_platform_default` | 408 |
| `excessive_but_rls_constrained` | 185 |
| `excessive_high_risk` | 74 |
| `repository_provenance_gap` | 56 |
| `function_execute_review` | 56 |
| `required_service_role` | 44 |
| `unknown_founder_decision` | 33 |
| `required_runtime` | 23 |

### By severity

| Severity | Count |
|---|---:|
| CRITICAL | 0 |
| HIGH | 62 |
| MEDIUM | 168 |
| LOW | 241 |
| INFORMATIONAL | 408 |

### By proposed later action

| Action | Count |
|---|---:|
| `PLATFORM_EXPECTED` | 408 |
| `REVOKE_CANDIDATE` | 298 |
| `NEEDS_MORE_EVIDENCE` | 69 |
| `ADD_TO_REPO_PROVENANCE` | 38 |
| `NEEDS_FOUNDER_DECISION` | 37 |
| `KEEP` | 29 |

---

## Exposure model (repository evidence)

| Path | Role | Notes |
|---|---|---|
| Browser `src/integrations/supabase/client.ts` | `authenticated` when JWT present; else `anon` | Never holds service role |
| Edge user-JWT paths | `authenticated` | `generate-pdf`, parts of `export-share` |
| Edge service paths | `service_role` (RLS bypass) | `stripe-webhook`, `check-subscription`, `create-checkout`, `customer-portal` |
| PostgREST table API | SELECT/INSERT/UPDATE/DELETE only | **TRUNCATE / REFERENCES / TRIGGER are not PostgREST operations** |
| RLS | Filters row visibility for table DML/SELECT | **Does not protect TRUNCATE** |

---

## `public.subscriptions` matrix

Structural definition matches repository (PR 2A/2B). Grants currently **match**
production and migration-only (broad privileges restored for parity).
Billing remains authoritative; Edge `stripe-webhook` performs best-effort sync via **service_role**.
RLS enabled; only policy `subscriptions_select_own` (SELECT).

| Role | Privilege | Prod | Repo (migration_only) | Category | Action | Severity | Target |
|---|---|---|---|---|---|---|---|
| `anon` | `SELECT` | present | present | `excessive_but_rls_constrained` | `REVOKE_CANDIDATE` | MEDIUM | anon: no subscriptions privileges |
| `anon` | `INSERT` | present | present | `excessive_high_risk` | `REVOKE_CANDIDATE` | HIGH | anon: REVOKE INSERT on subscriptions |
| `anon` | `UPDATE` | present | present | `excessive_high_risk` | `REVOKE_CANDIDATE` | HIGH | anon: REVOKE UPDATE on subscriptions |
| `anon` | `DELETE` | present | present | `excessive_high_risk` | `REVOKE_CANDIDATE` | HIGH | anon: REVOKE DELETE on subscriptions |
| `anon` | `TRUNCATE` | present | present | `excessive_high_risk` | `REVOKE_CANDIDATE` | HIGH | anon: REVOKE TRUNCATE (RLS does not apply to TRUNCATE) |
| `anon` | `REFERENCES` | present | present | `excessive_but_rls_constrained` | `REVOKE_CANDIDATE` | LOW | anon: REVOKE REFERENCES |
| `anon` | `TRIGGER` | present | present | `excessive_but_rls_constrained` | `REVOKE_CANDIDATE` | LOW | anon: REVOKE TRIGGER |
| `authenticated` | `SELECT` | present | present | `excessive_but_rls_constrained` | `NEEDS_FOUNDER_DECISION` | MEDIUM | authenticated: prefer no direct subscriptions SELECT; entitlement via billing / get_effective_tier |
| `authenticated` | `INSERT` | present | present | `excessive_but_rls_constrained` | `NEEDS_FOUNDER_DECISION` | HIGH | authenticated: REVOKE INSERT on subscriptions (no RLS policy for this command) |
| `authenticated` | `UPDATE` | present | present | `excessive_but_rls_constrained` | `NEEDS_FOUNDER_DECISION` | HIGH | authenticated: REVOKE UPDATE on subscriptions (no RLS policy for this command) |
| `authenticated` | `DELETE` | present | present | `excessive_but_rls_constrained` | `NEEDS_FOUNDER_DECISION` | HIGH | authenticated: REVOKE DELETE on subscriptions (no RLS policy for this command) |
| `authenticated` | `TRUNCATE` | present | present | `excessive_high_risk` | `REVOKE_CANDIDATE` | HIGH | authenticated: REVOKE TRUNCATE (RLS does not apply to TRUNCATE) |
| `authenticated` | `REFERENCES` | present | present | `excessive_but_rls_constrained` | `REVOKE_CANDIDATE` | LOW | authenticated: REVOKE REFERENCES |
| `authenticated` | `TRIGGER` | present | present | `excessive_but_rls_constrained` | `REVOKE_CANDIDATE` | LOW | authenticated: REVOKE TRIGGER |
| `service_role` | `SELECT` | present | present | `required_service_role` | `KEEP` | LOW | service_role: KEEP SELECT if Edge writes/reads; document in migrations if production-only |
| `service_role` | `INSERT` | present | present | `required_service_role` | `KEEP` | LOW | service_role: KEEP INSERT if Edge writes/reads; document in migrations if production-only |
| `service_role` | `UPDATE` | present | present | `required_service_role` | `KEEP` | LOW | service_role: KEEP UPDATE if Edge writes/reads; document in migrations if production-only |
| `service_role` | `DELETE` | present | present | `required_service_role` | `KEEP` | LOW | service_role: KEEP DELETE if Edge writes/reads; document in migrations if production-only |
| `service_role` | `TRUNCATE` | present | present | `excessive_but_rls_constrained` | `REVOKE_CANDIDATE` | MEDIUM | service_role: SELECT/INSERT/UPDATE/DELETE only (no TRUNCATE) unless ops prove need |
| `service_role` | `REFERENCES` | present | present | `excessive_but_rls_constrained` | `REVOKE_CANDIDATE` | MEDIUM | service_role: SELECT/INSERT/UPDATE/DELETE only (no REFERENCES) unless ops prove need |
| `service_role` | `TRIGGER` | present | present | `excessive_but_rls_constrained` | `REVOKE_CANDIDATE` | MEDIUM | service_role: SELECT/INSERT/UPDATE/DELETE only (no TRIGGER) unless ops prove need |
| `postgres` | `SELECT` | present | present | `expected_platform_default` | `PLATFORM_EXPECTED` | INFORMATIONAL | KEEP owner/admin postgres privileges |
| `postgres` | `INSERT` | present | present | `expected_platform_default` | `PLATFORM_EXPECTED` | INFORMATIONAL | KEEP owner/admin postgres privileges |
| `postgres` | `UPDATE` | present | present | `expected_platform_default` | `PLATFORM_EXPECTED` | INFORMATIONAL | KEEP owner/admin postgres privileges |
| `postgres` | `DELETE` | present | present | `expected_platform_default` | `PLATFORM_EXPECTED` | INFORMATIONAL | KEEP owner/admin postgres privileges |
| `postgres` | `TRUNCATE` | present | present | `expected_platform_default` | `PLATFORM_EXPECTED` | INFORMATIONAL | KEEP owner/admin postgres privileges |
| `postgres` | `REFERENCES` | present | present | `expected_platform_default` | `PLATFORM_EXPECTED` | INFORMATIONAL | KEEP owner/admin postgres privileges |
| `postgres` | `TRIGGER` | present | present | `expected_platform_default` | `PLATFORM_EXPECTED` | INFORMATIONAL | KEEP owner/admin postgres privileges |

### Direct answers

| Question | Answer |
|---|---|
| Does anon need SELECT? | **No** — no browser anon consumer; revoke candidate |
| Does anon need INSERT/UPDATE/DELETE? | **No** — no write policy; no consumer; revoke candidate / founder confirm |
| Does anon need TRUNCATE? | **No** — RLS does not apply; revoke candidate (HIGH on sensitive table) |
| Does authenticated need INSERT/UPDATE/DELETE? | **No** for known runtime — no INSERT/UPDATE/DELETE policies; no `.from('subscriptions')` |
| Does authenticated need TRUNCATE? | **No** |
| Does anon/authenticated need REFERENCES/TRIGGER? | **No** |
| What does service_role require? | **SELECT/INSERT/UPDATE** (upsert sync); DELETE optional; TRUNCATE/REFERENCES/TRIGGER not required |
| postgres privileges? | Owner/admin semantics — informational KEEP / platform |

---

## `protect_admin_subscriptions()` EXECUTE

| Fact | Evidence |
|---|---|
| Kind | `RETURNS TRIGGER` |
| SECURITY DEFINER | **yes** (`search_path=public`) |
| Callers | Trigger-only on `subscriptions` BEFORE INSERT/UPDATE — **no** app/Edge `.rpc` |
| Migration intent | `REVOKE ALL FROM public`; `GRANT EXECUTE` to `postgres`, `service_role` |
| Production drift | EXECUTE also present for `anon` / `authenticated` (`privilege_only_in_a`) |
| Trigger needs client EXECUTE? | **No** — trigger execution does not require anon/authenticated EXECUTE grants |
| Conclusion | **REVOKE_CANDIDATE** for anon/authenticated EXECUTE; KEEP postgres/service_role |
| Category | `function_execute_review` |

---

## Admin / bootstrap surfaces

| Object | Conclusion |
|---|---|
| `admin_bootstrap_tokens` | RLS on, **no policies** (deny-all for clients). Broad anon/authenticated grants are excessive; service_role DML may be ops-needed via RPCs (SECURITY DEFINER). Prefer service_role/RPC-only; revoke client table privileges. |
| `admin_audit_log` | Client SELECT only via admin RLS + admin UI uses RPCs. Prefer RPC path; revoke anon; limit authenticated to SELECT if direct reads remain. TRUNCATE revoke. |
| `entitlement_bypass_log` | Written via SECURITY DEFINER RPC from Edge service — not direct `.from`. Client table privileges unnecessary. |
| `stripe_webhook_events` | service_role + claim/release RPCs. No browser access. Revoke any client grants; KEEP service_role DML. |
| `user_roles` | App authenticated reads; Edge service writes/reads. KEEP authenticated SELECT (+ admin policies); revoke anon; revoke TRUNCATE/REFERENCES/TRIGGER. |
| Bootstrap / admin / webhook RPCs | Align EXECUTE to migration intent (`service_role` and/or `authenticated` only). Revoke PUBLIC/anon where not intended. |

---

## Billing / entitlement

- `billing`: Edge **service_role** is required for write/read paths; authenticated SELECT-own policy exists but app does not `.from('billing')` (uses Edge + `get_effective_tier`). Prefer service_role DML + optional authenticated SELECT; revoke anon and TRUNCATE/REFERENCES/TRIGGER.
- Entitlement RPCs (`evaluate_entitlement`, `feature_allowed`, `assert_feature_allowed`, `get_effective_tier`): KEEP authenticated/service_role EXECUTE per Phase 6 grants; revoke unintended PUBLIC/anon EXECUTE.

---

## Comparison / export grants

Active path: `user_comparisons` + `pdf_exports`.
Legacy dual models (`saved_comparisons` / items / versions / shares; `export_files` / `export_shares`) have RLS but **no app/Edge `.from` consumers**.
**ADR 0007 disposition is not decided here** — grant actions for legacy tables are `NEEDS_FOUNDER_DECISION` or retain-until-disposition, while TRUNCATE/REFERENCES/TRIGGER remain confident `REVOKE_CANDIDATE`.

---

## Profiles / scenarios

| Table | Runtime need | Recommendation |
|---|---|---|
| `profiles` | authenticated SELECT/UPDATE (+ INSERT policy) via `useProfile` | KEEP those; ADD_TO_REPO_PROVENANCE; revoke anon + TRUNCATE/REFERENCES/TRIGGER |
| `scenarios` | authenticated CRUD via app + user-JWT Edge read | KEEP authenticated DML/SELECT matching RLS; revoke anon + TRUNCATE/REFERENCES/TRIGGER; service_role SELECT for `check-subscription` |

---

## Function EXECUTE matrix (priority)

| Function | Intended roles | Drift / issue | Action |
|---|---|---|---|
| `protect_admin_subscriptions()` | per migration | 2 mismatch row(s) | authenticated:REVOKE_CANDIDATE, anon:REVOKE_CANDIDATE |
| `claim_stripe_webhook_event` | (see migrations) | no migration_only EXECUTE mismatch in inventory subset | review matched grants in JSON |
| `release_stripe_webhook_event` | (see migrations) | no migration_only EXECUTE mismatch in inventory subset | review matched grants in JSON |
| `log_admin_entitlement_bypass` | (see migrations) | no migration_only EXECUTE mismatch in inventory subset | review matched grants in JSON |
| `issue_admin_bootstrap_token` | (see migrations) | no migration_only EXECUTE mismatch in inventory subset | review matched grants in JSON |
| `claim_admin_bootstrap` | (see migrations) | no migration_only EXECUTE mismatch in inventory subset | review matched grants in JSON |
| `get_effective_tier` | (see migrations) | no migration_only EXECUTE mismatch in inventory subset | review matched grants in JSON |
| `assert_feature_allowed` | (see migrations) | no migration_only EXECUTE mismatch in inventory subset | review matched grants in JSON |
| `promote_to_admin` | per migration | 2 mismatch row(s) | service_role:NEEDS_MORE_EVIDENCE, anon:REVOKE_CANDIDATE |
| `list_admins` | per migration | 2 mismatch row(s) | anon:REVOKE_CANDIDATE, service_role:NEEDS_MORE_EVIDENCE |
| `evaluate_entitlement` | (see migrations) | no migration_only EXECUTE mismatch in inventory subset | review matched grants in JSON |
| `is_professional_price` | per migration | 3 mismatch row(s) | service_role:NEEDS_MORE_EVIDENCE, authenticated:REVOKE_CANDIDATE, anon:REVOKE_CANDIDATE |

Full per-signature rows are in the JSON inventory (`objectType=function`).

---

## Top highest-risk grant records

| ID | Object | Grantee | Privilege | Severity | Action |
|---|---|---|---|---|---|
| `GS-88661a77b5a3` | `public.admin_audit_log` | `anon` | `TRUNCATE` | HIGH | `REVOKE_CANDIDATE` |
| `GS-22772aad63a2` | `public.admin_bootstrap_tokens` | `anon` | `TRUNCATE` | HIGH | `REVOKE_CANDIDATE` |
| `GS-1e1cddd1195b` | `public.billing` | `anon` | `TRUNCATE` | HIGH | `REVOKE_CANDIDATE` |
| `GS-953c6199e7b8` | `public.profiles` | `anon` | `TRUNCATE` | HIGH | `REVOKE_CANDIDATE` |
| `GS-7dbce89ee536` | `public.subscriptions` | `anon` | `TRUNCATE` | HIGH | `REVOKE_CANDIDATE` |
| `GS-df40930e9ab4` | `public.user_roles` | `anon` | `TRUNCATE` | HIGH | `REVOKE_CANDIDATE` |
| `GS-3da2c8bb7795` | `public.approve_advisor_request(request_id uuid, approve boolean)` | `anon` | `EXECUTE` | HIGH | `REVOKE_CANDIDATE` |
| `GS-14c984ebf8ce` | `public.has_role(_user_id uuid, _role app_role)` | `anon` | `EXECUTE` | HIGH | `REVOKE_CANDIDATE` |
| `GS-7877fb68d69e` | `public.is_admin(uid uuid)` | `anon` | `EXECUTE` | HIGH | `REVOKE_CANDIDATE` |
| `GS-7fd72ced3ffa` | `public.is_advisor(uid uuid)` | `anon` | `EXECUTE` | HIGH | `REVOKE_CANDIDATE` |

---

## Founder decision package

Low-level PostgreSQL mechanics are pre-answered. Founder choices are limited to product/security posture.

**Binding status:** all `FD-*` decisions below are recorded as
**FOUNDER DECISION: ACCEPTED**. The **Recommended target** and
**Recommended answer** rows are the binding targets. Acceptance
authorizes documentation/governance within PR 2C only — it does
**not** authorize GRANT/REVOKE execution, a remediation migration,
production mutation, PR 2D, legacy object removal, ADR 0011
decisions, or Epic 7+.

### FD-SUB-CLIENT-WRITES

**FOUNDER DECISION: ACCEPTED**

| Field | Value |
|---|---|
| Object / surface | public.subscriptions — anon/authenticated INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER (+ anon SELECT) |
| Current production state | Full privilege matrix granted to anon/authenticated (matches repo after PR 2A parity GRANT) |
| Recommended target | No anon privileges; authenticated none (prefer) or SELECT-only if product insists on direct client reads; service_role SELECT/INSERT/UPDATE(+DELETE) |
| Security rationale | No browser `.from('subscriptions')`; Edge sync is service_role; RLS has no write policies; TRUNCATE ignores RLS; billing is SoT |
| Behavior risk if reduced | None for current app if revoked — Edge sync and RPCs unaffected |
| Production mutation required later? | yes |
| Recommended answer | **Approve revoke of anon/authenticated non-essential privileges on subscriptions** |
| Founder decision | **ACCEPTED** |

### FD-DEFAULT-BROAD-GRANTS

**FOUNDER DECISION: ACCEPTED**

| Field | Value |
|---|---|
| Object / surface | Active user-facing tables (profiles, scenarios, user_comparisons, pdf_exports, user_roles) |
| Current production state | Production has default-like ALL privileges for anon/authenticated/service_role; migration-only often only postgres until explicit GRANTs |
| Recommended target | Explicit least privilege: authenticated privileges matching RLS policies; service_role as needed; revoke anon + TRUNCATE/REFERENCES/TRIGGER |
| Security rationale | PostgREST needs table GRANT + RLS policy; current broad defaults are inherited privilege surface |
| Behavior risk if reduced | Low if authenticated policy-aligned privileges preserved; must regression-test app CRUD |
| Production mutation required later? | yes |
| Recommended answer | **Approve move to explicit least privilege on active tables** |
| Founder decision | **ACCEPTED** |

### FD-LEGACY-DUAL-MODEL-GRANTS

**FOUNDER DECISION: ACCEPTED**

| Field | Value |
|---|---|
| Object / surface | saved_comparisons / comparison_* / export_files / export_shares (and advisor_access_requests grants) |
| Current production state | Broad production grants + RLS; no active app/Edge `.from` consumers |
| Recommended target | Until ADR 0007/0011 disposition: revoke TRUNCATE/REFERENCES/TRIGGER confidently; defer SELECT/DML disposition with object removal decisions |
| Security rationale | Grant cleanup ≠ object removal; avoid behavior surprises if latent clients exist outside this repo |
| Behavior risk if reduced | Unknown external/marketing clients for contact/advisor; dual models unused in-repo |
| Production mutation required later? | partial yes |
| Recommended answer | **Approve TRUNCATE/REFERENCES/TRIGGER revokes now; keep DML/SELECT decisions tied to later disposition slices** |
| Founder decision | **ACCEPTED** |

### FD-RPC-EXECUTE-PUBLIC

**FOUNDER DECISION: ACCEPTED**

| Field | Value |
|---|---|
| Object / surface | Privileged RPC EXECUTE to PUBLIC/anon where migrations intend authenticated/service_role only |
| Current production state | Some production EXECUTE grants broader than migration least-privilege intent (and extension noise) |
| Recommended target | EXECUTE only for intended roles; especially revoke anon/PUBLIC on SECURITY DEFINER privileged RPCs |
| Security rationale | EXECUTE on SECURITY DEFINER is a direct privilege boundary |
| Behavior risk if reduced | Must ensure intended authenticated/service_role grants remain; test admin + entitlement + webhook paths |
| Production mutation required later? | yes |
| Recommended answer | **Approve aligning EXECUTE to migration intent (revoke unintended anon/PUBLIC)** |
| Founder decision | **ACCEPTED** |

---

## Proposed later remediation grouping (NOT AUTHORIZED)

| Group | Description |
|---|---|
| **A** | Obvious safe provenance-only additions — document KEEP privileges in migrations (no prod revoke) |
| **B** | Obvious safe privilege reductions — anon TRUNCATE/REFERENCES/TRIGGER; trigger-only EXECUTE to anon/authenticated |
| **C** | Behavior-sensitive reductions — authenticated DML on active tables; RPC EXECUTE tightening — needs tests |
| **D** | Platform/storage exclusions — do not chase storage/extension grant noise as app drift |
| **E** | Founder decisions (FD-* above) — **ACCEPTED**; remediation still NOT AUTHORIZED in PR 2C |
| **F** | Blocked by ADR 0007 / ADR 0011 — legacy dual-model/advisor object removal (grants may partially proceed in B) |

### Illustrative later statements (NON-EXECUTABLE / NOT AUTHORIZED)

```text
-- NOT AUTHORIZED IN PR 2C. Illustrative only.
-- REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.subscriptions FROM anon, authenticated;
-- REVOKE INSERT, UPDATE, DELETE ON TABLE public.subscriptions FROM anon, authenticated;
-- REVOKE ALL ON FUNCTION public.protect_admin_subscriptions() FROM anon, authenticated;
-- Required tests: entitlement-sql, stripe-webhook paths, admin RPC suite, app scenario/profile CRUD.
-- Rollback: re-GRANT the revoked privileges (exact prior matrix from production catalog).
```

---

## Confident KEEP / REVOKE / provenance / platform

- **KEEP (mismatches):** 12; **KEEP (matched critical):** 17
- **REVOKE_CANDIDATE:** 298
- **ADD_TO_REPO_PROVENANCE:** 38
- **PLATFORM_EXPECTED:** 408
- **NEEDS_FOUNDER_DECISION:** 37
- **NEEDS_MORE_EVIDENCE:** 69

---

## Confirmations

- No production mutation occurred in PR 2C.
- No GRANT/REVOKE executed.
- No migrations created.
- Harness-only differences did not drive conclusions.

