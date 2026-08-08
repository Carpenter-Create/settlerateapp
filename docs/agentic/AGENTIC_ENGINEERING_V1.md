# SettleRate Agentic Engineering v1

**Classification:** `governance/agentic-engineering-v1`  
**Status:** Active as repository operating procedure (Phase A / PR 0)  
**Authority level:** Agentic procedure only — does **not** supersede domain contracts, accepted ADRs, phase/epic bounds, or `TEST_BASELINE.md`

## 1. Governance positioning

This document defines a repository-native multi-agent engineering control plane for Cursor, Codex, and other approved agents.

It is **orthogonal** to the Phase 8.1 epic sequence. It:

- does **not** constitute Epic 10;
- does **not** authorize Epic 10+;
- does **not** resume Phase 7B;
- does **not** authorize Epic 8 production activation;
- does **not** decide or implement ADR 0011;
- does **not** authorize production mutation.

Existence of this charter does **not** enable broader autonomous agent push/merge operation. See §11.

## 2. Operating goals

- Reduce founder copy/paste coordination between ChatGPT, Cursor, Codex, and GitHub.
- Let the founder authorize an objective once via an Authorization Packet.
- Let agents execute bounded implement → validate → review → repair loops.
- Stop autonomous progression only for real founder decisions.
- Return a compact Completion Packet (`PASS` / `BLOCKED` / `FOUNDER_REVIEW`).
- Preserve SettleRate financial correctness, security, phase boundaries, and founder authority.

## 3. Non-goals

- Replacing domain contracts or accepted ADRs with agentic procedure.
- Infinite autonomous repair loops.
- Agent self-approval or agent merge authority.
- Hash-chained ledgers, cryptographic self-attestation, or ledger theater.
- Weakening CI, benchmarks, RLS/security tests, or production fences.
- Platform migration (AWS / Cloudflare / Next.js).
- Changing application, financial, billing, schema, or deploy behavior via this package alone.

## 4. Source-of-truth hierarchy

Agents must respect this order. The agentic layer must not become a competing product-truth source.

1. Domain contracts, accepted ADRs, and `TEST_BASELINE.md`  
   (financial methodology, export, comparison, persistence, security, entitlements, etc.)
2. Phase / epic authority  
   (`docs/PHASE8_1_EXECUTION_CHARTER.md`, `docs/PHASE8_1_EPIC_BOUNDARIES.md`, roadmap)
3. `docs/agentic/*` — agentic operating procedure (this document and task records)
4. `AGENTS.md` — thin cross-agent index
5. `.cursor/rules/*` — Cursor enforcement / adapters summarizing the above
6. Future `.codex/*` — Codex adapters only (pointers / tool constraints; no novel policy)

Do not place novel product or governance policy only inside `.cursor` or future `.codex`.

## 5. Operational roles

Four functional roles. Validation is mechanical, not a standing persona.

### 5.1 Orchestrator

- Ingest the founder Authorization Packet.
- Establish authorized scope and base SHA.
- Enforce path / scope boundaries.
- Maintain loop state.
- Invoke the mandatory validation sequence and record results.
- Identify founder-gate conditions.
- Prevent self-approval (`implementer` session ≠ `reviewer` session for `PASS`).
- Enforce bounded repair / STOP rules.
- Emit the Completion Packet.

The Orchestrator **cannot** override founder gates.

### 5.2 Implementer

- Make authorized changes on a dedicated branch.
- Remain within path and task scope.
- Respond to accepted routine review findings (repair).

### 5.3 Independent Reviewer

- Adversarially review the **actual diff** against repository authority (not Implementer narrative).
- Apply financial-integrity, security/data, production, and governance lenses as relevant to touched paths.
- Issue exactly one of: `APPROVE` | `REPAIR` | `BLOCK` | `FOUNDER_REVIEW`.

For a task to reach `PASS`, the Independent Reviewer must be a **separate invocation/session** from the Implementer. The Implementer cannot self-approve.

### 5.4 Validator (mechanical)

Not a standing agent. The Orchestrator requires the repository mandatory validation sequence and records the result. Do not weaken or redefine these gates:

```bash
npm run lint
npm run typecheck
npm run verify:benchmarks
npm run test:run
npm run build
```

Additional suite commands required by the Authorization Packet (for example entitlement SQL or Deno export parity) must also be recorded when specified.

## 6. Execution state machine

```text
UNAUTHORIZED
  ↓ founder Authorization Packet
AUTHORIZED
  ↓
IMPLEMENTING
  ↓
VALIDATING
  ├─ routine failure + repair budget available
  │      ↓
  │   REPAIRING
  │      ↓
  │   VALIDATING
  │
  └─ validation pass
         ↓
      REVIEWING
         ├─ APPROVE → PASS
         ├─ REPAIR → REPAIRING → VALIDATING → REVIEWING
         ├─ BLOCK → BLOCKED
         └─ GATE → FOUNDER_REVIEW
```

### Hard STOP (immediate halt of autonomous progression)

Stop if any of the following occur:

- a founder-gated decision is encountered;
- authorized scope / path boundaries must be crossed;
- a required ADR or founder decision is missing;
- `MAX_REPAIR_CYCLES` is exhausted;
- substantially the same finding survives repair twice;
- the Implementer disputes a material Independent Reviewer finding that cannot be resolved mechanically;
- the authorized base / repository state has materially drifted;
- the proposed action would weaken CI, financial benchmarks, RLS/security tests, production fences, or active regressions;
- the Independent Reviewer is not actually independent (`implementer` session == `reviewer` session).

**`PASS` never means merge.**  
`PASS` means the authorized work and review loop completed successfully and the founder receives a Completion Packet. Merge, ready-for-review, and `main` promotion remain founder-gated unless a later prompt explicitly restores scoped autonomy.

## 7. Bounded autonomy

| Rule | Value |
|------|--------|
| `MAX_REPAIR_CYCLES` | `2` |
| Same material finding after repair | STOP (`BLOCKED` or `FOUNDER_REVIEW`) |
| Task binding | Authorization Packet + authorized base SHA |
| After `BLOCKED` / `FOUNDER_REVIEW` | New founder Authorization Packet required |
| Draft PRs | One draft PR per Authorization Packet unless explicitly extended |
| “One more fix” beyond budget | Forbidden |
| Commit count | Informational only; not the primary anti-loop mechanism |

## 8. Founder-gate matrix

Preserve all existing SettleRate founder gates. At minimum, STOP autonomous progression for:

### 8.1 Financial semantics

- Mortgage methodology
- Amortization semantics
- APR or cost methodology
- Scenario comparison meanings
- Cash-to-close semantics
- Equity semantics
- Export field semantics
- Persistence dual-snapshot semantics
- Benchmark expected values that change approved behavior
- Calculator / methodology version changes that alter approved behavior

Routine implementation of an **already-approved** financial DEF / behavior inside an Authorization Packet is not automatically a founder gate.

### 8.2 Commercial / billing

- Pricing
- Production Stripe operations
- Entitlement model redesign
- Checkout activation
- Disabling `CHECKOUT_MAINTENANCE`
- Money movement

### 8.3 Production / data

- Destructive database operations
- Production migrations unless contained in a separately authorized founder package
- Production recovery
- Destructive legacy schema disposition
- Production Edge / SPA / secrets mutation
- ADR 0011 disposition

### 8.4 Security / operations

- Production Sentry DSN / routing / capture-scope changes
- Supabase Auth Dashboard redirect-allowlist operations
- Weakening CI
- Weakening RLS coverage
- Weakening benchmark enforcement
- Deleting active regression coverage
- Admin bootstrap / privileged role-grant mechanism changes
- Staging / production cross-wiring
- Live Stripe use in staging

### 8.5 Architecture

- AWS migration
- Cloudflare migration
- Next.js migration
- Other material platform replacements

Routine patch / minor dependency maintenance inside an authorized task is not automatically founder-gated unless it creates one of the risks above.

### 8.6 Current governance

- Epic 10+ authorization
- Phase 7B resume
- Epic 8 production activation
- ADR 0011 decision / implementation
- Merge to `main`
- Changing a draft PR to ready-for-review unless later specifically authorized
- Direct `main` promotion

Draft PR creation / update remains allowed within an authorized task.

## 9. Authorization Packet (founder → agents)

First-class interface. The founder authorizes an objective once; agents must not require per-step shuttle instructions for routine work inside scope.

### Template

```markdown
# Authorization Packet

- Authorization ID / Task ID:
- Classification / epic / phase: (e.g. governance/agentic-engineering-v1 or Phase 8.1 / Epic N)
- Objective:
- Authorized base SHA:
- Allowed scope / paths:
- Explicit non-goals:
- Founder-gate reminders (if relevant):
- Required validation:
  - npm run lint
  - npm run typecheck
  - npm run verify:benchmarks
  - npm run test:run
  - npm run build
  - (additional if any:)
- MAX_REPAIR_CYCLES: 2
- Expected final state / output:
  - draft PR (default)
  - Completion Packet with PASS | BLOCKED | FOUNDER_REVIEW
- Independent Reviewer required: yes (separate session from Implementer)
- Merge / ready-for-review authorized: no (unless explicitly stated)
```

## 10. Completion Packet (agents → founder)

Primary founder-facing output. The founder must not need to reconstruct state from chat history.

### Template

```markdown
# Completion Packet

- Task ID:
- Final state: PASS | BLOCKED | FOUNDER_REVIEW
- Base SHA:
- Head SHA:
- Branch:
- Draft PR URL (if any):
- Files changed:
- Validation result:
- Benchmark result:
- Independent Reviewer decision: APPROVE | REPAIR | BLOCK | FOUNDER_REVIEW
- Implementer session / identity:
- Reviewer session / identity: (must differ from Implementer for PASS)
- Repair-cycle count:
- Unresolved findings:
- Founder gate (if any):
- Exact decision / action requested from founder:
- Recommended next action:
```

## 11. Prerequisites before broader agent autonomy

PR 0 / this charter alone does **not** enable broader autonomous agent push/merge operation.

Before agents receive broader repository autonomy, the founder / operator must separately address GitHub `main` protection. As of the PR 0 baseline, `main` is unprotected and successful `main` updates can trigger staging deployment activity (Epic 9 / ADR 0014 staging pipeline).

At minimum, future prerequisite for broader autonomy:

- PR-only changes to `main`;
- required CI status checks;
- no direct agent push to `main`.

This charter does not modify GitHub repository settings.

Default agent autonomy remains as elsewhere in repository governance: dedicated branch work and **draft** PRs when authorized; merge / ready-for-review / `main` promotion require explicit founder authorization.

## 12. Minimal task audit model

Do **not** use hash-chained JSONL or cryptographic self-attestation.

When a task record is warranted, use a simple committed markdown file:

`docs/agentic/tasks/<TASK-ID>.md`

Minimum sections:

- Authorization (packet summary or link)
- Base SHA
- Scope / path bounds
- Implementer identity / session
- Reviewer identity / session
- Head SHA / PR
- Validation evidence (commands + results; CI URL when available)
- Benchmark result
- Review result
- Repair count
- Final state
- Founder gate (if any)
- Next action

Git history, PR history, Independent Review, and CI evidence are the primary integrity mechanisms. Corrections are represented as transparent amendments, not rewritten attestations.

PR 0 establishes the directory and this concept only; it does not add ledger machinery.

## 13. How agents use this charter

When a founder Authorization Packet is present:

1. Orchestrator treats the packet as binding scope.
2. Implementer works only within allowed paths on a dedicated branch.
3. Orchestrator runs mandatory validation before claiming completion.
4. Independent Reviewer reviews in a separate session.
5. Repair only within `MAX_REPAIR_CYCLES` for routine findings.
6. On hard STOP or gate → emit Completion Packet with `BLOCKED` or `FOUNDER_REVIEW`.
7. On success → emit Completion Packet with `PASS` (draft PR only unless merge was explicitly authorized).

When no Authorization Packet is present, existing `AGENTS.md` and `.cursor/rules` autonomy rules continue to apply; agents must still obey phase boundaries and founder gates.
