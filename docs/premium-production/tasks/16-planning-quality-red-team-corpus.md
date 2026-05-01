# 16 — Planning-quality red-team corpus

## Metadata

- Status: NOT_STARTED
- Placement: test-only
- Suggested skill: compound-agent-system
- Dependencies: 15-idea-intake-realworld-benchmarks
- Parallel wave: 3
- Risk: medium; quality gates can become superficial.

## Objective

Create failing planning fixtures for generic phases, missing DoD, role mismatch, repeated sections, missing blocker metadata, unsafe defaults, and unimportable markers.

## DoD

- [ ] Red-team corpus covers at least 10 distinct failure types.
- [ ] Each failure has a specific issue type.
- [ ] Good generated outputs still pass.
- [ ] Docs explain how to add new quality checks without overfitting.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Do not require LLM evaluation.
- Avoid fragile prose-only assertions where structure can be checked.

## Quality bar

Premium: bad plans fail for named, actionable reasons.

## Evaluation prompt

Try to sneak a polished but generic plan through the checker.
