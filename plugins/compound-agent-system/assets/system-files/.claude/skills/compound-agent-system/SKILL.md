---
name: compound-agent-system
description: Operate an installed Compound Agent System workspace: ledger tasks, DoD checks, GAP SCAN, readiness, handoff checkpoints, and support bundles.
---

# Compound Agent System Workspace Skill

Use this skill when working inside a repository that has the Compound Agent System installed. It is for operating the installed harness, not for maintaining the package repository that publishes it.

## When to use

- Starting a new Claude/Codex session in an installed workspace.
- Opening, resuming, verifying, or completing a ledger task.
- Preparing a phase plan from `idea.md`.
- Checking readiness before unattended execution.
- Creating a handoff checkpoint or support bundle.

## Steps

1. Read `CLAUDE.md` and `.agents/PROTOCOL.md`.
2. Check status and health:
   ```bash
   node .agents/task.mjs status
   node .agents/task.mjs doctor
   ```
3. Sign in:
   ```bash
   node .agents/agent-activate.mjs --id <agent-id> --role <role>
   ```
4. Open or resume a task before state-changing work:
   ```bash
   node .agents/task.mjs open "<goal>" --dod "test:<command>" --skill compound-agent-system
   ```
5. Use the task lifecycle commands:
   ```bash
   node .agents/task.mjs verify <task-id>
   node .agents/task.mjs done <task-id>
   node .agents/task.mjs park <task-id> "<reason>"
   ```
6. Before unattended execution, run:
   ```bash
   node .agents/session-readiness.mjs
   ```
7. For handoff, create a checkpoint:
   ```bash
   node handoff-bridge.mjs checkpoint --task <task-id> --from-agent <agent-id> --summary "<state>" --pending "<next>" --out .agents/checkpoints/<task-id>.handoff.json
   ```

## Validation

- [ ] `task.mjs status` reflects the correct current task state.
- [ ] Implementation work has explicit DoD.
- [ ] `verify` runs before `done`.
- [ ] Blockers include concrete unlock paths.
- [ ] Support bundles, event logs, secrets, and local paths are not committed.
