# 21 — Session readiness premium gate

## Metadata

- Status: IN_PROGRESS
- Placement: core plugin
- Suggested skill: compound-agent-system
- Dependencies: 20-handoff-contract-v2
- Parallel wave: 4
- Risk: high; readiness must not give false confidence.

## Objective

Upgrade session readiness into a premium preflight gate for unattended work.

## DoD

- [ ] Readiness checks active task, DoD, mode, checkpoint, blockers, questions, handoff, env contract, and clean/known-dirty state.
- [ ] It reports READY only when every required condition is met.
- [ ] It prints structured unlock steps for NOT_READY.
- [ ] Tests cover ready, partially ready, and unsafe false-ready scenarios.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Avoid blocking read-only inspection.
- Do not mark manual checks passed automatically.

## Quality bar

Premium: unattended execution starts only from a safe, resumable state.

## Evaluation prompt

Create missing checkpoint and unresolved blocker states; readiness must refuse READY.

## Implementation notes

- `session-readiness.mjs` now acts as a premium preflight gate for unattended work.
- READY requires all checks to pass: active in-progress task, defined DoD, explicit manual DoD resolution, current phase, context refresh, compound register, no blockers, no pending blocking questions, checkpoint, valid shareable handoff contract for the active task, environment contract, clean or documented known-dirty workspace state, and `COMPOUND_MODE=enforce`.
- NOT_READY prints structured unlock steps with stable check ids, human-readable titles, and concrete commands/actions.
- The gate remains read-only: it inspects ledger, handoff files, optional Phase 0 questions, optional env/workspace metadata, and git status without mutating task state or passing manual checks.

## Verification

- `node plugins/compound-agent-system/scripts/validate-package.mjs`
- `node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs`

## Evaluator feedback rounds

### Round 1 — false-ready safety

- Finding: The first pass could still let a generic checkpoint file satisfy readiness even if no valid handoff contract existed for the active task.
  - Addressed: Readiness now separates checkpoint presence from `handoff_contract_valid` and requires a shareable structurally complete `handoff-contract.*` file whose task id matches the current task.
- Finding: Manual DoD checks must not be treated as ready simply because a task has DoD entries.
  - Addressed: `manual_dod_resolved` is a separate readiness check; unresolved manual checks produce a NOT_READY unlock step and are never auto-passed.
- Finding: Golden-path tests still assumed the old readiness threshold.
  - Addressed: The E2E fixture now supplies a valid handoff, env contract, cleared blocking questions, and documented workspace state before expecting READY.

### Round 2 — stale metadata and workspace state

- Finding: A structurally incomplete v2 handoff fixture could still look valid if readiness only checked schema name and task id.
  - Addressed: `handoff_contract_valid` now requires the v1/v2 fields enforced by the bridge contract, including v2 schema path, trigger, agents, task state, arrays, and at least one resume command.
- Finding: Ledger `workspace_state: clean` could be stale when the actual git worktree is dirty.
  - Addressed: Git status is authoritative when the workspace is a git worktree; clean/known-dirty ledger metadata is only fallback when git is unavailable, and a regression test proves dirty git state refuses READY.
- Finding: Session-local onboarding state accidentally changed the bundled ledger.
  - Addressed: Bundled `.agents/TASKS.json` is restored to `current: null` with no task-21 active session records before final validation.
