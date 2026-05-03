# 16 — Planning-quality red-team corpus

## Metadata

- Status: DONE
- Placement: test-only
- Suggested skill: compound-agent-system
- Dependencies: 15-idea-intake-realworld-benchmarks
- Parallel wave: 3
- Risk: medium; quality gates can become superficial.

## Objective

Create failing planning fixtures for generic phases, missing DoD, role mismatch, repeated sections, missing blocker metadata, unsafe defaults, and unimportable markers.

## DoD

- [x] Red-team corpus covers at least 10 distinct failure types.
- [x] Each failure has a specific issue type.
- [x] Good generated outputs still pass.
- [x] Docs explain how to add new quality checks without overfitting.
- [x] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Do not require LLM evaluation.
- Avoid fragile prose-only assertions where structure can be checked.

## Quality bar

Premium: bad plans fail for named, actionable reasons.

## Evaluation prompt

Try to sneak a polished but generic plan through the checker.

## Evidence

- Added `fixtures/planning-quality/red-team/` with 10 failing fixtures covering 12 named issue types: `missing-first-vertical-slice`, `generic-phase-plan`, `generic-only-phase-names`, `missing-phase-dod`, `role-mismatch`, `missing-role-ownership`, `missing-blocker-defaults`, `unsafe-default`, `missing-importable-markers`, `unresolved-placeholder`, `missing-question-buckets`, and `thin-phase-goal`.
- Extended `.agents/check-planning-quality.mjs` with deterministic structural checks for unsafe defaults, unresolved placeholders, role/frontmatter marker mismatch, question buckets, and thin phase goals.
- Added `docs/planning-quality-red-team.md` with the rule for adding checks without overfitting or adding LLM judging.
- Preserved good output behavior with `idea-intake output passes planning quality`.

## Evaluator feedback rounds

### Round 1

- Finding: New role checks initially over-required every phase to list all four roles, which incorrectly rejected valid role-specialized generated phases.
- Fix: Changed the check to require at least one valid role and added a separate frontmatter-vs-marker mismatch assertion.

### Round 2

- Finding: `missing-question-buckets` initially only required any bucket name and could pass a plan that omitted `can_default` and `defer`.
- Fix: Require all three buckets (`blocking_now`, `can_default`, `defer`) and updated generated `PHASE_PLAN.md` output so good idea-intake plans still pass.
