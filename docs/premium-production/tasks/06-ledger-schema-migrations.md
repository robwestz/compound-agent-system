# 06 — Ledger schema migrations

## Metadata

- Status: NOT_STARTED
- Placement: core plugin
- Suggested skill: compound-agent-system
- Dependencies: 02-failure-recovery-suite
- Parallel wave: 1
- Risk: high; ledger is core state.

## Objective

Define and implement safe versioned migrations for `.agents/TASKS.json`.

## DoD

- [ ] Ledger schema versions and migration rules are documented.
- [ ] Migrations create a backup before writing.
- [ ] Tests cover current schema, old schema, malformed schema, and downgrade refusal.
- [ ] Doctor reports migration need without silently changing state.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- No destructive migration.
- Do not break existing ledgers from PR #1-#4.

## Quality bar

Premium: users can upgrade without losing task history.

## Evaluation prompt

Feed old and corrupted ledgers and verify no data loss.
