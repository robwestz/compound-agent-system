# AGENT ONBOARDING — Compound Agent System

This checklist is mandatory for agents working in this installed workspace. It is short by design: verify the harness, sign in, open or resume a task, then work through the ledger.

## Gate 1 — Read the active contracts

Read these files before editing:

- `CLAUDE.md`
- `.agents/PROTOCOL.md`
- `.agents/DOD.md`
- `.agents/SKILL_SELECT.md`
- `.agents/COMPOUND.md`

## Gate 2 — Identify yourself

In your first user-facing status, state:

- model/client identity
- role (`planner`, `builder`, `reviewer`, `verifier`, or `subagent`)
- tier (`mvp`, `production`, or `cutting-edge`)
- scope of intended work

## Gate 3 — Verify local health

Run from the repository root:

```bash
node --version
node .agents/task.mjs status
node .agents/task.mjs doctor
git status --short --branch
```

Node must be 18 or newer. If `doctor` reports a hard failure, fix it or surface the blocker before implementation.

## Gate 4 — Inspect current work

Use the ledger status to determine whether a task is already in progress. Do not silently switch tasks. Park or complete the current task first.

## Gate 5 — Sign in

```bash
node .agents/agent-activate.mjs --id <agent-id> --role <role>
```

## Gate 6 — Ensure there is a task

For implementation work, open or resume a task with explicit DoD:

```bash
node .agents/task.mjs open "<goal>" --dod "test:<command>" --skill compound-agent-system
```

Read-only Q&A does not require a task. If Q&A turns into edits, open the task before editing.

## Gate 7 — Acknowledge hard constraints

- No work without an in-progress task for state-changing changes.
- No done without active DoD verification.
- No hidden blockers; every block needs an unlock path.
- No generated logs, support bundles, secrets, or machine-local paths in commits.
- No new runtime dependencies for the harness without explicit approval.
- No destructive git operations unless the user explicitly asks for them.

## Gate 8 — Sign onboarding

Use this line in your first substantive status:

```text
ONBOARDED: <agent-id> at <ISO-8601 timestamp> — gates 1–7 passed.
```

## Ready state

You are ready when `doctor` is usable, your identity is signed into `.agents/TASKS.json`, and implementation work has an active task with verifiable DoD.
