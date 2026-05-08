# First run

Use this after installing the harness into a target repository.

## 1. Confirm activation

From the target repository:

```bash
node .agents/task.mjs status
node .agents/task.mjs doctor
```

`status` shows the current ledger state and compliance mode. `doctor` checks Node version, ledger integrity, hooks, compliance mode, docs presence, and security boundary health.

## 2. Sign in the agent

```bash
node .agents/agent-activate.mjs --id <agent-id> --role planner --skill compound-agent-system
```

Agent identity separates client, model, role, ledger id, session id, and display name.

## 3. Follow the guided wizard

Activation prints one primary next action at a time. You can re-run the wizard:

```bash
node .agents/first-session-wizard.mjs
```

To skip only the guide, not the underlying commands:

```bash
node .agents/first-session-wizard.mjs skip
```

## 4. Capture the idea

Create `idea.md`, then run:

```bash
node .agents/idea-intake.mjs --input idea.md --apply
node .agents/task.mjs status
```

Idea intake creates an intake/planning task, runs deterministic GAP SCAN, proposes recommended defaults, assigns planner/executor/reviewer/verifier roles, and writes Phase 0 artifacts.

## 5. Import the phase plan

```bash
node .agents/task.mjs import phase-0/PHASE_PLAN.md --apply
```

`PHASE_PLAN.md` contains `compound: active` frontmatter and `[COMPOUND-PHASE]` markers so the task ledger can import phases.

## 6. Check readiness before unattended work

```bash
node .agents/session-readiness.mjs
```

Readiness reports `READY` only when premium preflight conditions pass. `NOT_READY` output includes stable unlock steps with commands or actions.

If anything fails, go to [Troubleshooting](troubleshooting.md).
