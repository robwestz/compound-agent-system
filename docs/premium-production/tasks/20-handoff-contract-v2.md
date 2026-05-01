# 20 — Handoff contract v2

## Metadata

- Status: NOT_STARTED
- Placement: core plugin/docs
- Suggested skill: compound-agent-system
- Dependencies: 06-ledger-schema-migrations
- Parallel wave: 4
- Risk: high; handoff is long-session critical.

## Objective

Define a stronger handoff schema for task state, completed chunks, pending decisions, artifacts, risks, and resume commands.

## DoD

- [ ] Schema is versioned and documented.
- [ ] Handoff export validates required fields.
- [ ] Resume prompt points to exact files, commands, and open decisions.
- [ ] Tests cover valid, missing-field, and incompatible-version handoffs.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Do not break existing handoff files without migration.
- Avoid embedding secrets in handoff artifacts.

## Quality bar

Premium: a fresh agent can resume without relying on chat history.

## Evaluation prompt

Hand the artifact to a new session and see if it can identify the next safe action.
