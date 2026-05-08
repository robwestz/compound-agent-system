# 19 — Subagent batch execution playbook

## Metadata

- Status: DONE
- Placement: docs/playbook
- Suggested skill: compound-agent-system
- Dependencies: 18-evaluator-feedback-loop-runner
- Parallel wave: 4
- Risk: medium; uncontrolled parallelism causes conflicts.

## Objective

Write a playbook for running up to 10 implementer/evaluator pairs against independent task files.

## DoD

- [x] Playbook defines eligibility for parallel execution.
- [x] It includes branch naming, PR naming, evidence, merge ordering, and conflict rules.
- [x] It includes how to stop a batch when shared foundation breaks.
- [x] It references the feedback-loop runner/report structure.
- [x] Two evaluator feedback rounds are completed and addressed.

## Constraints

- No implicit approval for destructive git operations.
- Do not parallelize dependent tasks.

## Quality bar

Premium: batch execution is faster without reducing quality or traceability.

## Evaluation prompt

Simulate two tasks editing the same file and verify the playbook prevents collision.

## Evidence

- Added `docs/subagent-batch-execution-playbook.md` and bundled copy `plugins/compound-agent-system/assets/system-files/docs/subagent-batch-execution-playbook.md`.
- Added `tests/subagent-batch-playbook.test.mjs` covering eligibility, branch/PR/evidence rules, merge ordering, stop-batch conditions, and same-file collision handling.
- Updated README and the premium operating model to route parallel waves through the playbook.
- Placement is docs/playbook with test-only verification; no runtime dependency and no automatic spawning behavior.

## Task report

Implementer: devin
Evaluator: devin
Independence disclosed: same agent/session, not independent.

### First completion

The first complete implementation added the batch playbook, docs links, and deterministic tests for the collision and traceability rules.

### Self-review

The implementer checked the task constraints: no implicit destructive git approval, no dependent-task parallelism, and no runtime code or external spawning API.

### Evaluator feedback round 1

- Finding: The playbook must explicitly reject two tasks editing the same primary file instead of treating all conflicts as clerical.
- Finding: Evidence requirements should name the exact feedback-loop report headings so PR reviewers can audit task completion consistently.

### Improvement 1

- Added a collision simulation section for two tasks editing `README.md`.
- Added tests asserting same-file collisions are semantic and task reports contain both evaluator rounds.

### Evaluator feedback round 2

- Finding: Merge ordering must be dependency-based rather than first-green PR order.
- Finding: Manifest conflicts should be resolved by recalculating payload bytes, not by selecting either side of the diff.

### Improvement 2

- Added merge-order categories and explicit post-merge branch refresh guidance.
- Documented generated metadata conflict handling for `manifest.json`.

### Final signoff

Evaluator signoff: task 19 DoD is satisfied once `subagent-batch-playbook`, `eval-loop`, validator, and full suite all pass.
