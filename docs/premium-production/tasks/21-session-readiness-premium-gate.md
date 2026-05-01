# 21 — Session readiness premium gate

## Metadata

- Status: NOT_STARTED
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
