# 05 — Install, rollback, uninstall

## Metadata

- Status: NOT_STARTED
- Placement: core plugin
- Suggested skill: compound-agent-system
- Dependencies: 03-diagnostics-doctor-cli
- Parallel wave: 1
- Risk: high; destructive operations are sensitive.

## Objective

Provide commercial-grade install lifecycle support: dry-run, apply, rollback plan, and safe uninstall.

## DoD

- [ ] Dry-run reports exact files to create, modify, skip, or remove.
- [ ] Apply writes a rollback manifest before mutating files.
- [ ] Uninstall removes only files the installer owns or clearly marks for review.
- [ ] Tests cover clean install, conflicted install, rollback, and uninstall refusal on unknown files.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Never delete user files without explicit ownership evidence.
- Preserve existing dry-run behavior.

## Quality bar

Premium: install lifecycle is reversible and auditable.

## Evaluation prompt

Create conflicting root files and verify uninstall refuses unsafe deletion.
