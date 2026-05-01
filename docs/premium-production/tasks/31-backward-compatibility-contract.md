# 31 — Backward compatibility contract

## Metadata

- Status: NOT_STARTED
- Placement: test-only/docs
- Suggested skill: compound-agent-system
- Dependencies: 06-ledger-schema-migrations
- Parallel wave: 6
- Risk: high; users will have existing installed harnesses.

## Objective

Define what compatibility is guaranteed for installed files, ledger schema, command syntax, templates, and generated artifacts.

## DoD

- [ ] Compatibility policy states stable, deprecated, and internal surfaces.
- [ ] Tests cover representative old installed harness states.
- [ ] Deprecation messages include migration path and timeline.
- [ ] Release checklist includes backward-compatibility review.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Do not break PR #1-#4 generated artifacts without migration.
- Internal files must not be accidentally promised as public API.

## Quality bar

Premium: upgrades are predictable for existing users.

## Evaluation prompt

Install an older fixture and upgrade it; verify no user task state is lost.
