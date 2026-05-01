# 08 — Compliance mode policy hardening

## Metadata

- Status: NOT_STARTED
- Placement: core plugin
- Suggested skill: compound-agent-system
- Dependencies: 01-golden-path-e2e-suite
- Parallel wave: 1
- Risk: medium; incorrect enforcement blocks users.

## Objective

Make observe/warn/enforce policy consistent across hooks, CLI commands, status, doctor, and docs.

## DoD

- [ ] One policy table defines mode behavior for every state-changing command.
- [ ] Tests cover each mode for pre-edit, import, open, ack, done, and status.
- [ ] Status and doctor show current mode and recommended switch point.
- [ ] Legacy `COMPOUND_ENFORCE=1` behavior remains covered.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Do not weaken enforce mode.
- Warn mode must never silently pretend enforcement passed.

## Quality bar

Premium: mode behavior is predictable and explainable.

## Evaluation prompt

Try every state-changing command in all modes and compare to the policy table.
