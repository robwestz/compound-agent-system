# Premium Production Operating Model

## Agent pairing

Each task is assigned to:

- **Implementer**: owns the first complete implementation.
- **Evaluator**: runs adversarial review, writes findings, and refuses weak acceptance.

The evaluator is not a rubber stamp. It must try to break the task outcome against the task DoD, plugin-size guardrail, and commercial-readiness scorecard.

## Required loop per task

1. Implementer completes the task as if it were final.
2. Evaluator runs feedback round 1.
3. Implementer improves the work.
4. Evaluator runs feedback round 2.
5. Implementer performs final hardening.
6. Evaluator signs off only if all DoD checks pass.

No task may be marked complete after a first pass.

## Batch policy

Run up to 10 implementer/evaluator pairs at once, but only for tasks with no unresolved dependencies in earlier waves.

If a task discovers missing foundation, it must open a blocker against the dependency instead of silently expanding scope.

## Branching policy

Use one branch per task unless a wave is intentionally bundled. Avoid long-lived mega-branches. Each PR must reference the task file it completes.

## Quality gate

All PRs must include:

- Link to the task file.
- What was classified as core plugin vs optional/docs/test-only.
- Test commands and outputs.
- Evaluator round 1 findings and fixes.
- Evaluator round 2 findings and fixes.
- Known residual risks.

## Stop conditions

Stop and escalate when:

- A task requires a new runtime dependency.
- Plugin payload size grows materially without an explicit placement decision.
- A security boundary changes.
- A task cannot be tested deterministically.
- Two feedback rounds still leave critical findings.
