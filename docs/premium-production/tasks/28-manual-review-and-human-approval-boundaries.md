# 28 — Manual approval boundaries

## Metadata

- Status: DONE
- Placement: docs/core plugin
- Suggested skill: compound-agent-system
- Dependencies: 09-security-boundary-model
- Parallel wave: 6
- Risk: high; unclear approvals cause unsafe autonomy.

## Objective

Define which actions require human approval and ensure CLI/task output preserves those boundaries.

## DoD

- [x] Approval matrix covers secrets, network, destructive git, overwrite, uninstall, external APIs, and multi-agent spawning.
- [x] Tasks and blockers can distinguish must-ask, defaultable, and defer.
- [x] Tests cover at least one must-ask action staying blocked.
- [x] Docs explain how to proceed after approval.
- [x] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Do not downgrade must-ask items for convenience.
- Keep read-only inspection unblocked.

## Quality bar

Premium: autonomy is powerful but bounded.

## Evaluation prompt

Try to perform a risky action without approval and verify it is blocked or escalated.

## Evidence

- Added `docs/manual-approval-boundaries.md` and bundled `assets/system-files/docs/manual-approval-boundaries.md` with the seven-category approval matrix, must-ask/defaultable/defer state model, and post-approval procedure.
- Extended `.agents/task.mjs` so tasks/blockers can record `approval_policy`, `approval_category`, `approval_state`, `human_approval`, `blocked_by`, and `unlock_command`.
- Updated idea intake GAP SCAN output to include the full manual approval matrix without turning the matrix itself into immediate blocking questions.
- Updated long-session readiness so unresolved `must-ask` approvals keep readiness `NOT_READY`.
- Added regression coverage for a `secrets` must-ask blocker staying blocked while read-only `status`/`list` remain allowed.

## Task report

Implementer: devin
Evaluator: devin
Independence disclosed: same agent/session, not independent.

### First completion

The first complete implementation added approval-boundary docs, ledger approval fields, blocker display, readiness gating, and focused tests.

### Self-review

The implementer checked the constraints: all seven categories remain must-ask, read-only inspection stays unblocked, no runtime dependencies were added, and the docs explain how to proceed after approval.

### Evaluator feedback round 1

- Finding: The approval matrix should not pollute existing idea-intake blocker expectations by turning every category into an immediate `proceed-policy: must-ask` question.
- Finding: A must-ask blocker must preserve the original blocked reason in status output, not only the unlock command.

### Improvement 1

- Rendered the category matrix with `approval-policy` metadata instead of `proceed-policy`, preserving existing blocker semantics.
- Updated blocked task status output to include `blocked_by`, approval summary, and unlock guidance.

### Evaluator feedback round 2

- Finding: Readiness must treat `approval_policy: must-ask` without an approved `human_approval.approved_at` as unresolved even if the task is otherwise structurally ready.
- Finding: Defaultable/defer support must be represented in the task model, not only in docs.

### Improvement 2

- Added `must_ask_approvals_clear` to long-session readiness with an explicit unlock step.
- Added CLI update/open tests proving `defaultable` and `defer` approval states are stored as task state.

### Final signoff

Evaluator signoff: task 28 DoD is satisfied once validator, focused approval/readiness tests, and the full system-file suite pass.
