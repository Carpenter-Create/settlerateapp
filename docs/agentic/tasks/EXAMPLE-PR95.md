# Worked Example — Agentic Engineering v1 PR 0 (#95)

This is a retrospective, non-authorizing worked example. It normalizes the
actual PR #95 workflow into the packet formats defined by
`docs/agentic/AGENTIC_ENGINEERING_V1.md`.

The example distinguishes repository/GitHub evidence from coordination that
occurred outside GitHub. It does not create new authority, reopen PR #95, or
retroactively treat a merge as proof of independent approval.

## Authorization Packet

- **Authorization ID / Task ID:** `AEV1-PHASE-A-PR0`
- **Classification / epic / phase:** `governance/agentic-engineering-v1`;
  repository governance infrastructure orthogonal to the Phase 8.1 epic
  sequence
- **Objective:** Establish the minimum repository-native Agentic Engineering v1
  charter, including four functional roles, the bounded execution state
  machine, founder gates, Authorization and Completion Packet templates, and a
  minimal task-record concept.
- **Authorized base SHA:**
  `9739c3ea2233802db1f61f251c33cafa1ddba714`
- **Allowed scope / paths:**
  - Add `docs/agentic/AGENTIC_ENGINEERING_V1.md`
  - Add `docs/agentic/tasks/.gitkeep`
  - Add a concise pointer in `AGENTS.md`
  - Add the minimum bounded-loop pointer in
    `.cursor/rules/settlerate-phase-and-agent-workflow.mdc`
  - Optionally add a one-line authority pointer in
    `.cursor/rules/settlerate-governance.mdc`
- **Explicit non-goals:**
  - No `.codex/` implementation
  - No destructive-command guards, hooks, or pre-push automation
  - No CI ledger validation, JSONL ledger, or hash chaining
  - No CODEOWNERS, branch-protection, secret-scanning, or other GitHub setting
    changes
  - No ADR 0015 unless structurally unavoidable
  - No application, financial, billing, entitlement, schema, migration,
    deployment, production, Stripe, or database changes
  - No Epic 10+, Phase 7B resume, Epic 8 production activation, or ADR 0011
- **Founder-gate reminders:**
  - Draft PR creation/update was authorized.
  - Merge, ready-for-review, direct `main` promotion, and GitHub settings
    changes were not authorized.
  - `PASS` would not mean merge.
- **Required validation:**
  - `npm run lint`
  - `npm run typecheck`
  - `npm run verify:benchmarks`
  - `npm run test:run`
  - `npm run build`
- **MAX_REPAIR_CYCLES:** `2`
- **Expected final state / output:**
  - One bounded commit series on
    `docs/agentic-engineering-v1-pr0`
  - One draft PR
  - Local mandatory validation results
  - Separate independent Codex review
  - Completion handoff without merge or ready-for-review
- **Independent Reviewer required:** Yes; separate Codex invocation/session
  from the Cursor Implementer.
- **Merge / ready-for-review authorized:** No.

## Completion Packet

- **Task ID:** `AEV1-PHASE-A-PR0`
- **Final state at Implementer handoff:** `FOUNDER_REVIEW`
  - The repaired branch was ready for independent rereview.
  - The repository and PR do not retain the final external rereview artifact,
    so this retrospective example does not invent an `APPROVE` decision.
- **Base SHA:** `9739c3ea2233802db1f61f251c33cafa1ddba714`
- **Head SHA:** `b5c580c746d9d8ae322dec057c38e8315c0f9223`
- **Branch:** `docs/agentic-engineering-v1-pr0`
- **Draft PR URL:** <https://github.com/Carpenter-Create/settlerateapp/pull/95>
- **Files changed:**
  - `.cursor/rules/settlerate-governance.mdc`
  - `.cursor/rules/settlerate-phase-and-agent-workflow.mdc`
  - `AGENTS.md`
  - `docs/agentic/AGENTIC_ENGINEERING_V1.md`
  - `docs/agentic/tasks/.gitkeep`
- **Validation result:**
  - The full required sequence passed locally before the initial commit and
    again after Repair Cycle 1.
  - GitHub `validate` passed:
    <https://github.com/Carpenter-Create/settlerateapp/actions/runs/31288213663/job/93180772122>
- **Benchmark result:** `npm run verify:benchmarks` passed.
- **Independent Reviewer decision:**
  - Initial Codex review at
    `2daa35e5f8b0c293327d23e6e288063289f1ef40`: `REPAIR`
  - Findings: one medium and two low
  - Final external rereview decision: not retained in repository/PR evidence
- **Implementer identity / session:** Cursor Implementer; repository commit
  co-author `cursoragent`
- **Reviewer identity / session:** Separate Codex reviewer; session identifier
  not retained in repository/PR evidence
- **Repair-cycle count:** `1` of `2`
- **Repair commit:**
  `b5c580c746d9d8ae322dec057c38e8315c0f9223`
  (`docs(agentic): resolve PR 0 review findings`)
- **Repairs applied:**
  1. One failed repair attempt for the same material finding now causes STOP.
  2. Charter status changed to active upon merge to `main`.
  3. The undeclared `GATE` outcome was replaced with the declared
     `FOUNDER_REVIEW` outcome.
- **Unresolved findings / evidence gaps:**
  - The final separate Codex rereview artifact and session identifier were not
    committed or attached to PR #95.
  - Cursor Bugbot raised a separate validation-failure transition finding on
    the initial head. PR #95 does not retain a governance triage disposition
    for that review input.
- **Founder gate:** Ready-for-review and merge to `main`.
- **Exact decision / action requested from founder at handoff:** Obtain and
  record independent rereview; if it approves, decide separately whether to
  mark ready and merge.
- **Recommended next action at handoff:** Independent rereview of repaired head
  `b5c580c746d9d8ae322dec057c38e8315c0f9223`; no autonomous Repair Cycle 2.

## Historical closure after the packet

- Founder marked PR #95 ready for review at `2026-08-09T01:31:09Z`.
- Founder merged PR #95 at `2026-08-09T01:31:29Z`.
- The resulting `main` commit is
  `52aae722656e8edaafcb04d75816f6160c012cf0`.
- PR checks recorded as passing: GitHub `validate`, Cursor Bugbot, and both
  Vercel preview checks.

The founder merge satisfied the separate merge gate. It is not, by itself,
evidence of an independent reviewer `APPROVE` decision. Future task records
should retain the reviewer session identifier and final review artifact so a
`PASS` Completion Packet is directly auditable.
