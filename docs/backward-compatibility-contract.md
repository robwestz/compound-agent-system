# Backward Compatibility Contract

This contract defines what existing users can rely on when upgrading an installed Compound Agent System harness.

## Stable surfaces

- `.agents/TASKS.json` ledger schema version `1`.
- `node .agents/task.mjs status`, `doctor`, `migrate`, `open`, `update`, `verify`, `done`, `block`, `park`, `resume`, and `import`.
- `node .agents/session-readiness.mjs`.
- `node .agents/support-bundle.mjs`.
- `node bootstrap.mjs --target <repo> --dry-run`.
- Handoff contract schemas under `schemas/`.
- Generated phase-0 artifact names: `PROJECT_BRIEF.md`, `GAP_SCAN.md`, `DECISIONS.md`, `PHASE_PLAN.md`, `OPEN_QUESTIONS.md`, `AGENT_ROLES.md`, and `DOD_MATRIX.md`.

Stable surfaces require migration notes before incompatible changes.

## Deprecated surfaces

- Missing or legacy ledger version values are treated as schema `0` and are migration-only.
- The migration path is `node .agents/task.mjs migrate --apply`.
- Schema `0` compatibility will not be removed before `2.0.0`.
- Deprecation messages must include the migration command and removal timeline.

## Internal surfaces

- Implementation details inside `.agents/*.mjs` other than documented commands.
- Event-log field ordering beyond the documented schema.
- Test fixture contents.
- Generated support-bundle directory names.
- Manifest byte counts and package-internal file ordering.

Internal surfaces may change when tests, docs, and migration behavior remain correct.

## Upgrade rule

An upgrade must preserve user task state. Existing ledgers are not overwritten by install or activation. If migration is required, a backup is written before the migrated ledger replaces the old file.

## Release review

Every release checklist must include:

1. Ledger migration smoke test.
2. Existing install upgrade smoke test.
3. Compatibility matrix review.
4. Deprecation message review.
5. Support bundle review for redacted upgrade diagnostics.
