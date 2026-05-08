# GAP SCAN

Fixture purpose: Positive output-quality fixture proving a clean GAP SCAN passes the markdown checker.

## Intent reground

The user wants the harness to turn a raw idea into a tracked planning task.

## Blockers

### Decision: registry scope

- question: Should the registry be local or global?
- why-it-matters: The scope affects reuse and isolation.
- recommended-default: Start local and make global export explicit.
- consequence-of-default: Safer first project with clear ownership.
- consequence-of-alternative: More reuse but more migration risk.
- proceed-without-user: true

## Role assignments

- planner: Create Phase 0 artifacts.
- executor: Implement only after planning is accepted.
- reviewer: Check output quality and scope discipline.
- verifier: Run tests and import checks.

## Closing

The plan is ready for import after verification.
