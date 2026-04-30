# Compound Agent System Architecture

## Layer diagram

```text
compound-agent-system-package/
├─ bootstrap.mjs
├─ manifest.json
└─ plugins/compound-agent-system/
   ├─ scripts/
   │  ├─ install-compound-system.mjs
   │  ├─ bootstrap-compound-system.mjs
   │  └─ validate-package.mjs
   └─ assets/system-files/
      ├─ .agents/
      │  ├─ activate.mjs
      │  ├─ agent-activate.mjs
      │  ├─ task.mjs
      │  ├─ node-runtime.mjs
      │  └─ protocol docs and skills
      ├─ .claude/
      ├─ .codex/
      ├─ .omc/
      ├─ lib/
      ├─ schemas/
      └─ tests/
```

The package root exposes the one-command bootstrap and metadata. The plugin shell contains Claude/Codex manifests, command wrappers, scripts, and the system-files payload copied into target repositories. The payload contains the actual harness runtime.

## Data flow

```text
bootstrap.mjs
  → plugins/compound-agent-system/scripts/bootstrap-compound-system.mjs
  → plugins/compound-agent-system/scripts/install-compound-system.mjs
  → target .agents/activate.mjs
  → target .agents/agent-activate.mjs
  → target .agents/task.mjs
```

1. `bootstrap.mjs` delegates to the plugin bootstrap script.
2. `bootstrap-compound-system.mjs` runs the installer, optionally activates hooks, signs in an agent, and prints status.
3. `install-compound-system.mjs` copies `assets/system-files/` into a target repository.
4. `.agents/activate.mjs` initializes `TASKS.json` and installs Claude hook configuration.
5. `.agents/agent-activate.mjs` records the active agent identity.
6. `.agents/task.mjs` owns ledger commands, DoD verification, plan import, and hook handlers.

## Key files and roles

| File | Role |
|---|---|
| `bootstrap.mjs` | Package-root shortcut for target bootstrap. |
| `manifest.json` | Package metadata for marketplace/install flows. |
| `plugins/compound-agent-system/scripts/install-compound-system.mjs` | Deterministic file copy installer and dry-run surface. |
| `plugins/compound-agent-system/scripts/bootstrap-compound-system.mjs` | End-to-end install + activate + optional agent sign-in. |
| `plugins/compound-agent-system/scripts/validate-package.mjs` | Structural validator for plugin and payload files. |
| `assets/system-files/.agents/activate.mjs` | Hook and ledger activation. |
| `assets/system-files/.agents/agent-activate.mjs` | Agent profile registration. |
| `assets/system-files/.agents/task.mjs` | Task ledger CLI, DoD runner, import parser, and hooks. |
| `assets/system-files/handoff-bridge.mjs` | Handoff checkpoint and resume-prompt helpers. |
| `assets/system-files/lib/token-budget.mjs` | Token budget estimation support. |
| `assets/system-files/tests/*.test.mjs` | Node test suite for payload behavior. |

## Hook installation model

Activation writes `.claude/settings.json` hooks tagged with `_compound: compound-protocol` so repeated activation can update the same entries idempotently.

- `SessionStart`: runs `node .agents/task.mjs hook session-start` and injects ledger context.
- `PreToolUse`: currently targets state-changing edit/write hooks through `node .agents/task.mjs hook pre-edit`.
- `Stop`: runs `node .agents/task.mjs hook stop` to checkpoint task timestamps.

## Ledger format

`TASKS.json` is a JSON document with this shape:

```json
{
  "version": "1",
  "schema_url": ".agents/PROTOCOL.md",
  "current": "t-001",
  "tasks": [
    {
      "id": "t-001",
      "goal": "Implement a verified phase",
      "state": "in_progress",
      "dod": [
        { "check": "test", "command": "node --test tests/*.test.mjs", "passed_at": null },
        { "check": "artifact", "path": "phase-0/PHASE_PLAN.md", "passed_at": null },
        { "check": "manual", "description": "Operator confirms UX", "passed_at": null }
      ],
      "skills": ["SkiLLBuilDr"],
      "blocked_by": null,
      "unlock_command": null,
      "park_reason": null,
      "parent": null,
      "agent": "devin",
      "started_at": "2026-04-30T00:00:00.000Z",
      "updated_at": "2026-04-30T00:00:00.000Z"
    }
  ],
  "agents_active": [],
  "agent_profiles": {},
  "log": []
}
```

DoD checks are active verification records. Task state may be `open`, `in_progress`, `blocked`, `parked`, `done`, `abandoned`, or `q-and-a`.

## WARN/ENFORCE mode mechanism

The harness reads compliance mode from environment variables. The legacy flag `COMPOUND_ENFORCE=1` means enforce. The upgraded mode model is `COMPOUND_MODE=observe|warn|enforce`, defaulting to `warn`.

- `observe`: emit structured context only; never block.
- `warn`: emit warnings; exit 0.
- `enforce`: block invalid state-changing actions with exit code 2.

Status and activation output should always explain the current mode, what it blocks, what it does not block, and when to switch to enforce.
