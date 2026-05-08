# 22 — Observability event log

## Metadata

- Status: COMPLETE
- Placement: core plugin
- Suggested skill: compound-agent-system
- Dependencies: 06-ledger-schema-migrations
- Parallel wave: 5
- Risk: medium; logs can expose sensitive data.

## Objective

Standardize an event log for installs, activations, task transitions, quality checks, readiness decisions, and handoffs.

## DoD

- [x] Event schema is documented and versioned.
- [x] Events include timestamp, command, result, and safe context.
- [x] Sensitive fields are excluded or redacted.
- [x] Tests cover event creation for representative actions.
- [x] Two evaluator feedback rounds are completed and addressed.

## Constraints

- No secret logging.
- Keep log append-only unless repair is explicit.

## Quality bar

Premium: failures are auditable after the fact.

## Evaluation prompt

Trigger failures and verify logs explain what happened without leaking inputs.

## Evidence

### Deliverables

- Added `compound-event-log.v1` schema at `plugins/compound-agent-system/assets/system-files/schemas/event-log.v1.json`.
- Added event-log operator docs at `plugins/compound-agent-system/assets/system-files/docs/event-log.md`.
- Added zero-dependency event creation/redaction helpers at `plugins/compound-agent-system/assets/system-files/.agents/event-log.mjs`.
- Wired local append-only `.agents/events.jsonl` events for install, activation, agent activation, task transitions, quality checks, readiness decisions, and handoff checkpoints.
- Kept telemetry/upload out of scope; all audit records are local JSONL only.

### Verification

- `node --test plugins/compound-agent-system/assets/system-files/tests/event-log.test.mjs` — pass 4, fail 0.
- `node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs` — pass 171, fail 0.
- `node plugins/compound-agent-system/scripts/validate-package.mjs` — package valid.

### Evaluator/self-review feedback rounds

#### Round 1 — safety and append-only semantics

- Finding: The first implementation logged safe JSONL events, but legacy `ledger.log` extras could still include raw task goals/reasons.
  - Addressed: `appendLog` now sanitizes extras via the event-log redaction/summarization path before writing ledger metadata.
- Finding: Install/uninstall tests treated the generated audit log as an owned payload file, which conflicted with append-only audit evidence.
  - Addressed: Uninstall planning ignores `.agents/events.jsonl`; uninstall leaves local audit history intact.

#### Round 2 — portability and manifest integrity

- Finding: The copied handoff CLI test imported `handoff-bridge.mjs` without its new `.agents/event-log.mjs` dependency.
  - Addressed: The test now copies `event-log.mjs` beside the CLI, matching installed payload layout.
- Finding: New schema/docs/tests needed manifest and validator coverage to avoid payload drift.
  - Addressed: `manifest.json` byte metadata and `validate-package.mjs` required-file checks include the event-log schema, docs, helper, and tests.

### Known risks

- Event records are best-effort local audit artifacts. Commands still complete if event logging fails during install recovery paths.
- Existing historical `TASKS.json` entries may predate the sanitized event schema; new writes use `compound-event-log.v1`.
