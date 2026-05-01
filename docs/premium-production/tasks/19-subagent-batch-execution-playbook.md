# 19 — Subagent batch execution playbook

## Metadata

- Status: NOT_STARTED
- Placement: docs/playbook
- Suggested skill: compound-agent-system
- Dependencies: 18-evaluator-feedback-loop-runner
- Parallel wave: 4
- Risk: medium; uncontrolled parallelism causes conflicts.

## Objective

Write a playbook for running up to 10 implementer/evaluator pairs against independent task files.

## DoD

- [ ] Playbook defines eligibility for parallel execution.
- [ ] It includes branch naming, PR naming, evidence, merge ordering, and conflict rules.
- [ ] It includes how to stop a batch when shared foundation breaks.
- [ ] It references the feedback-loop runner/report structure.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- No implicit approval for destructive git operations.
- Do not parallelize dependent tasks.

## Quality bar

Premium: batch execution is faster without reducing quality or traceability.

## Evaluation prompt

Simulate two tasks editing the same file and verify the playbook prevents collision.
