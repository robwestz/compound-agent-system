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

- Added `.agents/role-assignment-plan.mjs` as a zero-dependency static exporter from generated `AGENT_ROLES.md` JSON role maps to `BATCH_ASSIGNMENT_PLAN.json`.
- Exported plans include per-role `task_ids`, `artifacts`, `autonomy_level`, `handoff_condition`, and assignment IDs, plus per-task role assignments.
- Exported plans explicitly set `automatic_subagent_spawning: false`, `multi_agent_execution_requires_human_approval: true`, and `export_only: true`.
- Added `tests/role-assignment-plan.test.mjs` coverage for exported plan shape and missing required role failures.

## Feedback rounds

### Round 1 — evaluator/self-review

- Finding: The exporter must be discoverable and package-validated, not just present as a loose script.
  - Addressed: Added validator required-file coverage for `.agents/role-assignment-plan.mjs` and `tests/role-assignment-plan.test.mjs`.
- Finding: Static export must preserve human approval and make no-spawn behavior auditable.
  - Addressed: Added explicit core behavior fields in the plan JSON plus README/template guidance that no agents are spawned.

### Round 2 — evaluator/self-review

- Finding: The generated assignment output must be assignable by role and by task.
  - Addressed: The plan now includes role-level summaries and per-task role assignments with stable `assignment_id` values.
- Finding: Onboarding/ledger state and manifest metadata should not create unrelated package drift.
  - Addressed: Removed session-only ledger artifacts from the diff and refreshed manifest bytes for changed bundled README content.

## Verification

- `node --test tests/role-assignment-plan.test.mjs`
- `node --test tests/idea-intake.test.mjs tests/role-assignment-plan.test.mjs`
- `node plugins/compound-agent-system/scripts/validate-package.mjs`
