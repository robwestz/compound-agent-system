# 30 — Marketplace release readiness

## Metadata

- Status: NOT_STARTED
- Placement: docs/packaging
- Suggested skill: compound-agent-system
- Dependencies: 11-supply-chain-package-integrity
- Parallel wave: 6
- Risk: medium; release metadata affects trust.

## Objective

Create a release checklist for Claude/Codex plugin packaging, marketplace metadata, changelog, validation, rollback, and support notes.

## DoD

- [ ] Checklist includes versioning, changelog, validation, tests, package integrity, docs, and rollback.
- [ ] Marketplace metadata is reviewed for accuracy and scope.
- [ ] Release notes include breaking changes and migration steps.
- [ ] Dry-run release process is documented.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Do not publish automatically.
- Do not claim unsupported clients or environments.

## Quality bar

Premium: releases are repeatable and auditable.

## Evaluation prompt

Pretend you are releasing today; every required action should be explicit.
