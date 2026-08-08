# Advisor / ADR 0011 Check — Epic 6 PR 2I

**Phase:** 8.1 / Epic 6 PR 2I  
**Status:** Check complete — **HARD STOP for destructive advisor disposition**

## Verdict

ADR 0011 is **not accepted** (`docs/adr/README.md`: required / not yet written).

Accepted **ADR 0007 §4** therefore remains binding:

> Until ADR 0011 is accepted, advisor leftovers are `legacy_temporarily_retained`
> or `unknown_blocked` — **not** `safe_to_remove`.

Phase 6 product-model removal (fail-closed advisor RPCs; no Advisor tier) does
**not** authorize schema drops or invent keep-vs-remove intent.

## Leftovers retained (no migration in PR 2I)

- Table: `advisor_access_requests`
- RPCs: `approve_advisor_request`, `list_pending_advisor_requests`, `is_advisor`
- Enum value: `app_role.advisor`
- Related client EXECUTE (deferred from PR 2F)

## Minimum founder decision to unlock further advisor work

Accept `docs/adr/0011-advisor-model-decision.md` with explicit disposition for:

1. `advisor_access_requests` — retain / deprecate / remove  
2. Advisor RPCs — keep fail-closed / further revoke / drop  
3. `app_role.advisor` (+ legacy `user_roles` rows) — keep for audit vs migrate/remove  

## Epic 6 implication

Repository Epic 6 may continue/close with advisor objects classified
`legacy_temporarily_retained` under ADR 0007. Destructive advisor cleanup is
**out of Epic 6 autonomous authority** until ADR 0011 is accepted.
