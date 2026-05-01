# 24 — Compatibility matrix

## Metadata

- Status: NOT_STARTED
- Placement: test-only/docs
- Suggested skill: compound-agent-system
- Dependencies: 01-golden-path-e2e-suite
- Parallel wave: 5
- Risk: medium; unsupported environments must be honest.

## Objective

Define and test the supported Node, OS, shell, Claude, and Codex matrix.

## DoD

- [ ] Compatibility matrix states supported, best-effort, and unsupported environments.
- [ ] Tests cover Linux and Windows path/line-ending assumptions where feasible.
- [ ] CLI reports unsupported Node versions clearly.
- [ ] Release checklist includes matrix verification.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Do not claim untested environments as supported.
- Keep Windows tests deterministic.

## Quality bar

Premium: users know whether their environment is supported before install.

## Evaluation prompt

Find every place docs imply broader support than tests prove.
