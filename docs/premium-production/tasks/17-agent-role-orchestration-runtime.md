# 17 — Agent role orchestration runtime

## Metadata

- Status: DONE
- Placement: core plugin/optional skill
- Suggested skill: SkiLLBuilDr
- Dependencies: 15-idea-intake-realworld-benchmarks
- Parallel wave: 3
- Risk: high; orchestration can bloat core.

## Objective

Turn generated planner/executor/reviewer/verifier role maps into an assignable, auditable execution plan without automatically spawning agents.

## DoD

- [x] Role maps can be exported as a batch assignment plan.
- [x] Each role has task IDs, artifacts, autonomy level, and handoff condition.
- [x] Core only handles static plan export unless spawning is explicitly approved.
- [x] Tests cover export shape and missing-role failures.
- [x] Two evaluator feedback rounds are completed and addressed.

## Constraints

- No automatic subagent spawning in core.
- Preserve human approval for multi-agent execution.

## Quality bar

Premium: role plans are operational, not decorative.

## Evaluation prompt

Check whether a coordinator can assign tasks directly from the generated output.

## Evidence

- Added `.agents/role-plan.mjs` to export `phase-0/AGENT_ROLES.md` as `compound-role-assignment-plan.v1`.
- Generated role maps now include per-role `task_ids`, `artifacts`, `autonomy_level`, `handoff_condition`, and `spawn_policy: static-export-only`.
- `role-plan.mjs` validates missing-role failures and never spawns agents.
- Added `tests/role-plan.test.mjs` and extended `idea-intake.test.mjs` role assertions.

## Evaluator feedback rounds

### Round 1

- Finding: Embedding the full JSON role map into `PHASE_PLAN.md` made output-quality flag repeated blocks and bloated the plan.
- Fix: Kept `PHASE_PLAN.md` to a concise role summary and made `AGENT_ROLES.md` the machine-readable source of truth.

### Round 2

- Finding: Per-role objects repeated enough structural JSON that the markdown output-quality scanner rejected `AGENT_ROLES.md` before export.
- Fix: Excluded the machine-readable `AGENT_ROLES.md` artifact from prose repeated-block scanning and added direct schema/export tests instead.
