# 21 — Session readiness premium gate

## Metadata

- Status: DONE
- Placement: core plugin
- Suggested skill: compound-agent-system
- Dependencies: 20-handoff-contract-v2
- Parallel wave: 4
- Risk: high; readiness must not give false confidence.

## Objective

Upgrade session readiness into a premium preflight gate for unattended work.

## DoD

- [x] Readiness checks active task, DoD, mode, checkpoint, blockers, questions, handoff, env contract, and clean/known-dirty state.
- [x] It reports READY only when every required condition is met.
- [x] It prints structured unlock steps for NOT_READY.
- [x] Tests cover ready, partially ready, and unsafe false-ready scenarios.
- [x] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Avoid blocking read-only inspection.
- Do not mark manual checks passed automatically.

## Quality bar

Premium: unattended execution starts only from a safe, resumable state.

## Evaluation prompt

Create missing checkpoint and unresolved blocker states; readiness must refuse READY.

## Evidence

- Implemented in `.agents/session-readiness.mjs`.
- Focused tests: `node --test tests/session-readiness.test.mjs` (`pass 6`, `fail 0`).
- Integration tests: `node --test tests/golden-path-e2e.test.mjs tests/session-readiness.test.mjs` (`pass 7`, `fail 0`).
- Full system-file tests: `node --test tests/*.test.mjs` (`pass 169`, `fail 0`).

## Evaluator / self-review feedback rounds

### Round 1

- Finding: temp-ledger workspace detection could miss checkpoint files and falsely report missing handoff evidence.
  - Addressed by resolving ledger-backed workspaces through `.agents` / `.omc` markers.
- Finding: structured unlock steps needed stable machine-readable IDs, not only prose.
  - Addressed by returning `{ id, requirement, command }` unlock step objects and printing command lines.

### Round 2

- Finding: readiness could accept global context-refresh / compound-register events unrelated to the active task.
  - Addressed by scoping those log checks to the current task.
- Finding: manual checks and dirty worktrees needed explicit false-ready coverage.
  - Addressed with tests that reject auto-passed manual DoD and undocumented dirty state.
