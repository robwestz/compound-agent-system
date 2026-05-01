# 18 — Evaluator feedback loop runner

## Metadata

- Status: NOT_STARTED
- Placement: optional skill/test-only
- Suggested skill: skill-development
- Dependencies: 17-agent-role-orchestration-runtime
- Parallel wave: 4
- Risk: high; eval loops must not fake independent review.

## Objective

Define and optionally implement a runner/checklist that enforces implementer/evaluator round 1 and round 2 before task completion.

## DoD

- [ ] Task reports must record first completion, eval round 1, improvement 1, eval round 2, improvement 2, and final signoff.
- [ ] The process distinguishes self-review from evaluator review.
- [ ] Tests or document checks fail missing feedback rounds.
- [ ] Optional automation stays outside core unless approved.
- [ ] Two evaluator feedback rounds are completed and addressed for this task itself.

## Constraints

- Do not claim true independence if the same agent performs both roles.
- No mandatory external agent API.

## Quality bar

Premium: every task has evidence of adversarial iteration.

## Evaluation prompt

Try to mark a task done after one pass and verify the gate catches it.
