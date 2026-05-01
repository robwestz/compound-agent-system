# 03 — Diagnostics doctor CLI

## Metadata

- Status: NOT_STARTED
- Placement: core plugin
- Suggested skill: compound-agent-system
- Dependencies: 02-failure-recovery-suite
- Parallel wave: 1
- Risk: medium; scope creep can bloat the core.

## Objective

Introduce a small `doctor` diagnostic command that reports install health, hook health, ledger health, mode, Node version, package version, and next repair action.

## DoD

- [ ] `node .agents/task.mjs doctor` or equivalent prints structured JSON plus human summary.
- [ ] It detects missing hooks, invalid ledger JSON, unsupported Node, no current task, and mode mismatch.
- [ ] It never performs repairs unless explicitly invoked with a repair flag.
- [ ] Tests cover pass and fail states.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- No network calls.
- No dependency on Claude-only files unless a fallback exists.

## Quality bar

Premium: support can ask for one command and understand the machine state.

## Evaluation prompt

Run doctor in partially installed repos and verify it gives one safe next action.
