# 18 — Evaluator feedback loop runner

## Metadata

- Status: DONE
- Placement: optional skill/test-only
- Suggested skill: skill-development
- Dependencies: 17-agent-role-orchestration-runtime
- Parallel wave: 4
- Risk: high; eval loops must not fake independent review.

## Objective

Define and optionally implement a runner/checklist that enforces implementer/evaluator round 1 and round 2 before task completion.

## DoD

- [x] Task reports must record first completion, eval round 1, improvement 1, eval round 2, improvement 2, and final signoff.
- [x] The process distinguishes self-review from evaluator review.
- [x] Tests or document checks fail missing feedback rounds.
- [x] Optional automation stays outside core unless approved.
- [x] Two evaluator feedback rounds are completed and addressed for this task itself.

## Constraints

- Do not claim true independence if the same agent performs both roles.
- No mandatory external agent API.

## Quality bar

Premium: every task has evidence of adversarial iteration.

## Evaluation prompt

Try to mark a task done after one pass and verify the gate catches it.

## Evidence

- Added `.agents/eval-loop.mjs`, a zero-dependency local evidence checker for task reports.
- Added `tests/eval-loop.test.mjs` covering complete reports, missing feedback rounds, and false independent-review claims when implementer and evaluator match.
- Updated `TASK_TEMPLATE.md`, `OPERATING_MODEL.md`, and bundled `README.md` so future tasks use the runner before being marked done.
- Placement is optional skill/test-only style automation: the runner is a local check and does not call external agent APIs or spawn reviewers.

## Task report

Implementer: devin
Evaluator: devin
Independence disclosed: same agent/session, not independent.

### First completion

The first complete implementation added the local runner, tests, and docs updates.

### Self-review

The implementer checked the task constraints: zero runtime dependencies, no external agent API, and no claim of true independent review.

### Evaluator feedback round 1

- Finding: The runner must fail attempts to mark a task done after only first completion plus self-review.
- Finding: The docs should make the required sequence easy to copy into future reports.

### Improvement 1

- Added a regression test for missing eval/improvement/signoff milestones.
- Updated the task template and operating model with the exact required sequence and runner command.

### Evaluator feedback round 2

- Finding: Same-session review is acceptable only if the report explicitly says it is not independent.
- Finding: The automation should stay local/test-only and avoid any mandatory external reviewer API.

### Improvement 2

- Added implementer/evaluator identity checks and false-independent-review detection.
- Documented that the runner does not spawn reviewers or call external APIs.

### Final signoff

Evaluator signoff: task 18 DoD is satisfied once `eval-loop`, validator, and full suite all pass.
