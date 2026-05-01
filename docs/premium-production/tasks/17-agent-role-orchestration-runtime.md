# 17 — Agent role orchestration runtime

## Metadata

- Status: NOT_STARTED
- Placement: core plugin/optional skill
- Suggested skill: SkiLLBuilDr
- Dependencies: 15-idea-intake-realworld-benchmarks
- Parallel wave: 3
- Risk: high; orchestration can bloat core.

## Objective

Turn generated planner/executor/reviewer/verifier role maps into an assignable, auditable execution plan without automatically spawning agents.

## DoD

- [ ] Role maps can be exported as a batch assignment plan.
- [ ] Each role has task IDs, artifacts, autonomy level, and handoff condition.
- [ ] Core only handles static plan export unless spawning is explicitly approved.
- [ ] Tests cover export shape and missing-role failures.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- No automatic subagent spawning in core.
- Preserve human approval for multi-agent execution.

## Quality bar

Premium: role plans are operational, not decorative.

## Evaluation prompt

Check whether a coordinator can assign tasks directly from the generated output.
