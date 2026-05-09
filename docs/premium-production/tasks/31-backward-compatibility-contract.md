# 31 — Backward compatibility contract

## Metadata

- Status: DONE
- Placement: test-only/docs
- Suggested skill: compound-agent-system
- Dependencies: 06-ledger-schema-migrations
- Parallel wave: 6
- Risk: high; users will have existing installed harnesses.

## Objective

Define what compatibility is guaranteed for installed files, ledger schema, command syntax, templates, and generated artifacts.

## DoD

- [x] Compatibility policy states stable, deprecated, and internal surfaces.
- [x] Tests cover representative old installed harness states.
- [x] Deprecation messages include migration path and timeline.
- [x] Release checklist includes backward-compatibility review.
- [x] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Do not freeze internal implementation details as public API.
- Migration must preserve user task state.

## Quality bar

Premium: existing users can upgrade without losing work.

## Evaluation prompt

Install older fixture + upgrade; verify no user task state lost.

## Evidence

- Added `docs/backward-compatibility-contract.md` and bundled docs defining stable, deprecated, and internal surfaces.
- Added migration-only schema v0 deprecation messaging with migration command and `2.0.0` removal floor.
- Added `tests/backward-compatibility.test.mjs` covering legacy ledger migration and existing installed harness upgrade preservation.
- Updated release and install docs to require backward-compatibility review.

## Task report

Implementer: devin
Evaluator: devin
Independence disclosed: same agent/session, not independent.

### First completion

The first complete implementation added the compatibility contract, migration deprecation message, upgrade smoke tests, and release checklist hooks.

### Self-review

The implementer checked that existing ledgers are preserved by bootstrap/activation and migration writes a backup before replacing legacy state.

### Evaluator feedback round 1

- Finding: Deprecated surfaces need both a migration path and a timeline, not just a status label.
- Finding: Upgrade tests must prove user task state survives install, not only migrate.

### Improvement 1

- Added `LEDGER_V0_DEPRECATION` with `migrate --apply` and no-removal-before-`2.0.0`.
- Added a bootstrap upgrade test that keeps current task, goal, and agent state.

### Evaluator feedback round 2

- Finding: Release docs should make compatibility review an explicit gate.
- Finding: The contract should identify internal surfaces so maintainers do not over-freeze implementation details.

### Improvement 2

- Updated release docs with compatibility-review checklist items.
- Added internal-surface and upgrade-rule sections to the compatibility contract.

### Final signoff

Evaluator signoff: task 31 DoD is satisfied when backward-compatibility tests, validator, and full system-file suite pass.
