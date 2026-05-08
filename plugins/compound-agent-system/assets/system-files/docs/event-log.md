# Observability event log

Compound Agent System writes a local append-only JSONL audit log to `.agents/events.jsonl`. The log is for supportability and handoff debugging only: no telemetry is uploaded and no network call is made.

## Schema

Schema version: `compound-event-log.v1`
Schema path: `schemas/event-log.v1.json`

Each line is one JSON object:

```json
{
  "schema_version": "compound-event-log.v1",
  "schema_path": "schemas/event-log.v1.json",
  "timestamp": "2026-05-03T13:00:00.000Z",
  "event": "task-open",
  "command": "task.mjs open",
  "result": { "status": "ok" },
  "context": {
    "task_id": "t-001",
    "agent_id": "devin-example",
    "state": "in_progress",
    "dod_count": 2,
    "skill_count": 1,
    "goal_present": true,
    "goal_length": 38,
    "goal_sha256_12": "1c0b2a4d5e6f"
  }
}
```

Required fields:

- `timestamp`: ISO-8601 event creation time.
- `event`: stable event name.
- `command`: command or subsystem that produced the event.
- `result`: object with at least `status`.
- `context`: safe diagnostic context.

## Covered events

- Installs: `install`
- Activations: `activate`, `agent-activate`, `ack`
- Task transitions: `task-open`, `task-park`, `task-resume`, `task-block`, `task-abandon`, `task-done`, `task-import`, `task-update`
- Quality checks: `quality-check`
- Readiness decisions: `readiness-decision`
- Handoffs: `handoff-checkpoint`

## Safety rules

Sensitive fields are excluded or redacted before append. Keys matching secret-like names (`token`, `password`, `api_key`, `authorization`, `cookie`, private/access/refresh keys, and similar) become `[REDACTED]`. Secret-looking string values and user-specific absolute path segments are also redacted.

Context should contain only ids, counts, booleans, relative file names, short hashes, and text lengths. User prompts, raw ideas, command output, environment values, and file contents must not be logged. For useful correlation without disclosure, log `*_length` and `*_sha256_12` instead of the original text.

## Append-only policy

The event log is append-only. Normal commands must use append mode and must not rewrite, truncate, rotate, or delete existing event records. Repair is explicit operator work: copy the current file, document the reason, and write the repaired file as a separate maintenance action.

## Offline auditability

Audit uses local files only:

```bash
node -e "for (const line of require('node:fs').readFileSync('.agents/events.jsonl','utf8').trim().split(/\n/)) console.log(JSON.parse(line).event)"
```

No telemetry, analytics, metrics service, or upload endpoint is part of the event-log contract.
