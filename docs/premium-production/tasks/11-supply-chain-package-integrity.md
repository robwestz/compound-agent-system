# 11 — Supply-chain and package integrity

## Metadata

- Status: NOT_STARTED
- Placement: core plugin/test-only
- Suggested skill: compound-agent-system
- Dependencies: 05-install-rollback-uninstall
- Parallel wave: 2
- Risk: medium; package drift breaks installs.

## Objective

Add integrity checks that prove the manifest, plugin metadata, system-files payload, tests, and docs remain in sync.

## DoD

- [ ] Validator detects missing required files and stale manifest entries.
- [ ] Tests cover package payload integrity and marketplace metadata consistency.
- [ ] Release docs state how integrity is verified.
- [ ] No generated or local-only files are required for validation.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Keep validation deterministic and dependency-free.
- Do not require external registries.

## Quality bar

Premium: packaging errors are caught before users install.

## Evaluation prompt

Remove a required payload file and ensure validation fails with a clear path.
