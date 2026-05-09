# Codex baseline for Compound Agent System

This repository has the Compound Agent System installed. Follow the same ledger and DoD workflow as Claude.

## Start

```bash
node .agents/task.mjs status
node .agents/task.mjs doctor
node .agents/agent-activate.mjs --id <agent-id> --role <role>
```

## Rules

- Read `CLAUDE.md` and `.agents/PROTOCOL.md` before implementation work.
- Open or resume a ledger task before state-changing edits.
- Verify Definition of Done before marking work done.
- Keep user-specific credentials and private MCPs outside the repository.
- Do not commit support bundles, event logs, local settings, or generated artifacts.

## Useful commands

```bash
node .agents/task.mjs open "<goal>" --dod "test:<command>" --skill compound-agent-system
node .agents/session-readiness.mjs
node handoff-bridge.mjs checkpoint --task <task-id> --from-agent <agent-id> --summary "<state>" --pending "<next>"
```
