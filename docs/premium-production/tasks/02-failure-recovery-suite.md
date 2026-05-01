# 02 — Failure recovery suite

## Metadata

- Status: NOT_STARTED
- Placement: test-only/core plugin
- Suggested skill: compound-agent-system
- Dependencies: 01-golden-path-e2e-suite
- Parallel wave: 1
- Risk: high; recovery is a commercial support requirement.

## Objective

Add deterministic tests and repair guidance for corrupted ledger, missing hooks, invalid plan, missing artifact, and blocked import states.

## DoD

- [ ] Fixtures cover malformed `TASKS.json`, missing `.claude/settings.json`, duplicate task IDs, invalid plan frontmatter, and absent phase artifacts.
- [ ] Each failure returns a concrete unlock or repair path.
- [ ] Tests prove no failure mode silently succeeds.
- [ ] Recovery docs distinguish safe auto-repair from manual escalation.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Repair must never delete user data without explicit approval.
- Keep diagnostics local and dependency-free.

## Quality bar

Premium: a user can recover without reading source code.

## Evaluation prompt

Try to make recovery overwrite real user tasks or hide a corrupt state.
