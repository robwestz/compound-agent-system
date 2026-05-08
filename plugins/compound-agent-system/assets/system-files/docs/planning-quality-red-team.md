# Planning quality red-team corpus

The planning-quality gate is deterministic and intentionally structural. It
should reject plans that look polished but are unsafe to import into execution.

## Adding a red-team fixture

1. Add a fixture under `fixtures/planning-quality/red-team/`.
2. Name the expected issue type in `tests/check-planning-quality.test.mjs`.
3. Prefer structural assertions over exact prose snapshots.
4. Keep one primary failure per fixture when possible.
5. Add a positive fixture or generated-output assertion when a new rule could
   accidentally reject good idea-intake output.

## Current failure types

- `missing-first-vertical-slice`
- `generic-phase-plan`
- `generic-only-phase-names`
- `missing-phase-dod`
- `role-mismatch`
- `missing-role-ownership`
- `missing-blocker-defaults`
- `unsafe-default`
- `missing-importable-markers`
- `unresolved-placeholder`
- `missing-question-buckets`
- `thin-phase-goal`

Do not add LLM judging to this gate. If a rule cannot be checked
deterministically, document it as a human review criterion instead.
