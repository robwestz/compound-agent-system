---
name: agent-onboarding
description: Mandatory start-of-session checklist for a repository with the Compound Agent System installed. Use before implementation work to verify local health, sign in to the ledger, and confirm an active task with DoD.
---

# Agent Onboarding

Use this skill at the start of every Claude session in a repository with the Compound Agent System installed.

## Steps

1. Read `CLAUDE.md`, `.agents/PROTOCOL.md`, `.agents/DOD.md`, `.agents/SKILL_SELECT.md`, and `.agents/COMPOUND.md`.
2. Identify yourself: model/client, role, tier, and scope.
3. Verify local health:
   ```bash
   node --version
   node .agents/task.mjs status
   node .agents/task.mjs doctor
   git status --short --branch
   ```
4. Inspect whether a task is already in progress. Do not silently switch tasks.
5. Sign in:
   ```bash
   node .agents/agent-activate.mjs --id <agent-id> --role <role>
   ```
6. For implementation work, open or resume a task with explicit DoD:
   ```bash
   node .agents/task.mjs open "<goal>" --dod "test:<command>" --skill compound-agent-system
   ```
7. Acknowledge hard constraints: no work without task, no done without verification, no hidden blockers, no secrets/logs/support bundles committed, no new runtime dependencies without approval.
8. Sign onboarding:
   ```text
   ONBOARDED: <agent-id> at <ISO-8601 timestamp> — gates 1–7 passed.
   ```

Read-only Q&A does not require a task. If Q&A turns into edits, open a task before editing.
