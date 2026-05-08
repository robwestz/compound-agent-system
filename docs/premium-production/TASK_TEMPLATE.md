# Task Template

Copy this format for new premium-production tasks.

## Metadata

- ID:
- Title:
- Status: NOT_STARTED
- Placement: core plugin / optional skill / docs-playbook / external workbench / test-only
- Suggested skill:
- Dependencies:
- Parallel wave:
- Risk:

## Objective

One concrete outcome.

## DoD

- [ ] Machine-verifiable check.
- [ ] Documentation or UX check.
- [ ] Regression check.
- [ ] Task report records first completion, self-review, evaluator round 1, improvement 1, evaluator round 2, improvement 2, and final signoff.
- [ ] If implementer and evaluator are the same agent/session, the report explicitly discloses that the review is not independent.
- [ ] `node .agents/eval-loop.mjs <task-report.md>` passes for the completed task report.

## Constraints

- Zero runtime dependencies unless explicitly approved.
- Preserve bootstrap, hooks, ledger, DoD, Fact-Forcing Gate, modes, GAP SCAN, CONTEXT REFRESH, and COMPOUND REGISTER.
- Keep API Alchemy Engine as fixture-only.
- Classify plugin-size impact.

## Quality bar

Premium commercial production only. No skeletons, placeholders, or "good enough for now" outcomes.

## Evaluation prompt

What should the evaluator try to break?
