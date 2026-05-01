# 22 — Observability event log

## Metadata

- Status: NOT_STARTED
- Placement: core plugin
- Suggested skill: compound-agent-system
- Dependencies: 06-ledger-schema-migrations
- Parallel wave: 5
- Risk: medium; logs can expose sensitive data.

## Objective

Standardize an event log for installs, activations, task transitions, quality checks, readiness decisions, and handoffs.

## DoD

- [ ] Event schema is documented and versioned.
- [ ] Events include timestamp, command, result, and safe context.
- [ ] Sensitive fields are excluded or redacted.
- [ ] Tests cover event creation for representative actions.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- No secret logging.
- Keep log append-only unless repair is explicit.

## Quality bar

Premium: failures are auditable after the fact.

## Evaluation prompt

Trigger failures and verify logs explain what happened without leaking inputs.
