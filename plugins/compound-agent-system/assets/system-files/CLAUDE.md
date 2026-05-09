# CLAUDE.md — Compound Agent System session entrypoint

> Claude Code reads this file at the start of every session in this repository.
> Read it before making changes.

---

## What this repository has installed

This repository uses the **Compound Agent System** workspace harness. The harness is local-only and zero-runtime-dependency: it adds a task ledger, Definition of Done checks, GAP SCAN / CONTEXT REFRESH / COMPOUND REGISTER routines, handoff checkpoints, readiness checks, and Claude/Codex hook configuration.

The harness lives in `.agents/` and is operated from the target repository root.

---

## Start-of-session checklist

Before editing files or running non-trivial shell commands:

1. Read `.agents/PROTOCOL.md`.
2. Read `AGENT_ONBOARDING.md`.
3. Check local health:

   ```bash
   node --version
   node .agents/task.mjs status
   node .agents/task.mjs doctor
   git status --short --branch
   ```

4. Sign in to the ledger:

   ```bash
   node .agents/agent-activate.mjs --id <agent-id> --role <role>
   ```

5. Work only from an explicit ledger task:

   ```bash
   node .agents/task.mjs open "<goal>" --dod "manual:<acceptance gate>" --skill compound-agent-system
   ```

If the user is only asking a read-only question, answer it without opening a task. If the question becomes implementation work, open a task first.

---

## Core commands

| Intent | Command |
|---|---|
| Show current task state | `node .agents/task.mjs status` |
| Open a tracked task | `node .agents/task.mjs open "<goal>" --dod "test:<command>"` |
| Verify DoD checks | `node .agents/task.mjs verify <task-id>` |
| Mark task done | `node .agents/task.mjs done <task-id>` |
| Generate diagnostics | `node .agents/task.mjs doctor` |
| Export support bundle | `node .agents/support-bundle.mjs` |
| Check unattended readiness | `node .agents/session-readiness.mjs` |
| Create checkpoint | `node handoff-bridge.mjs checkpoint --task <id> --from-agent <agent> --summary "<summary>" --pending "<next>"` |

PowerShell forms use backslashes, for example `node .agents\task.mjs status`.

---

## Non-negotiable rules

- Do not skip `.agents/PROTOCOL.md` or `AGENT_ONBOARDING.md`.
- Do not edit without an in-progress task unless the work is strictly read-only.
- Do not mark work done until every DoD item is actively verified.
- Do not hide blockers; every blocker needs an unlock path.
- Do not add runtime dependencies to the harness without explicit approval.
- Do not commit secrets, generated event logs, local settings, support bundles, or machine-local paths.

---

## What this is not

This installed workspace is not the package repository that builds or publishes the Compound Agent System plugin. Package-maintenance commands such as:

```bash
node plugins/compound-agent-system/scripts/validate-package.mjs
node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs
```

belong in the package repository, not in a normal target repository after installation.

Do not build the API Alchemy Engine. It appears only as sanitized fixture material in the package repository.

---

## First useful flow

```bash
node .agents/agent-activate.mjs --id <agent-id> --role planner
printf '%s\n' "<raw project idea>" > idea.md
node .agents/idea-intake.mjs --input idea.md --apply
node .agents/check-planning-quality.mjs phase-0/PHASE_PLAN.md phase-0/GAP_SCAN.md
node .agents/task.mjs import phase-0/PHASE_PLAN.md --apply
node .agents/session-readiness.mjs
```

Switch to enforce mode only after a first smoke test passes:

```bash
export COMPOUND_MODE=enforce
```
