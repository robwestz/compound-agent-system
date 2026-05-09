# Compound Agent System Workspace Harness

This repository has the Compound Agent System installed. The harness is a local, zero-runtime-dependency operating layer for Claude/Codex-style agents: task ledger, Definition of Done checks, GAP SCAN, CONTEXT REFRESH, COMPOUND REGISTER, handoff checkpoints, support bundles, and readiness gates.

## Start here

1. Read `CLAUDE.md`.
2. Read `.agents/PROTOCOL.md`.
3. Run:

```bash
node --version
node .agents/task.mjs status
node .agents/task.mjs doctor
```

4. Sign in:

```bash
node .agents/agent-activate.mjs --id <agent-id> --role <role>
```

5. Open a real task before editing:

```bash
node .agents/task.mjs open "<goal>" --dod "manual:<acceptance gate>" --skill compound-agent-system
```

PowerShell uses backslashes, for example `node .agents\task.mjs status`.

## Common commands

| Intent | Command |
|---|---|
| Status | `node .agents/task.mjs status` |
| Doctor diagnostics | `node .agents/task.mjs doctor` |
| Open task | `node .agents/task.mjs open "<goal>" --dod "test:<command>"` |
| Verify DoD | `node .agents/task.mjs verify <task-id>` |
| Complete task | `node .agents/task.mjs done <task-id>` |
| Park task | `node .agents/task.mjs park <task-id> "<reason>"` |
| Resume task | `node .agents/task.mjs resume <task-id>` |
| Generate idea plan | `node .agents/idea-intake.mjs --input idea.md --apply` |
| Check plan quality | `node .agents/check-planning-quality.mjs phase-0/PHASE_PLAN.md phase-0/GAP_SCAN.md` |
| Import phase plan | `node .agents/task.mjs import phase-0/PHASE_PLAN.md --apply` |
| Readiness gate | `node .agents/session-readiness.mjs` |
| Support bundle | `node .agents/support-bundle.mjs` |

## First useful flow

```bash
node .agents/agent-activate.mjs --id <agent-id> --role planner
printf '%s\n' "<raw project idea>" > idea.md
node .agents/idea-intake.mjs --input idea.md --apply
node .agents/check-planning-quality.mjs phase-0/PHASE_PLAN.md phase-0/GAP_SCAN.md
node .agents/task.mjs import phase-0/PHASE_PLAN.md --apply
node .agents/session-readiness.mjs
```

## Compliance modes

Default mode is `warn`: hooks guide but do not block. Switch to enforce mode after the first smoke test passes and before unattended execution:

```bash
export COMPOUND_MODE=enforce
```

PowerShell:

```powershell
$env:COMPOUND_MODE = 'enforce'
```

## Support bundle export

When support needs local diagnostics, run:

```bash
node .agents/support-bundle.mjs
```

The command writes a local `.agents/support-bundles/support-bundle-<timestamp>/` directory, redacts secret-looking values, summarizes task goals, and never uploads anything. Review the bundle before sharing.

## Handoff checkpoints

Create a resumable checkpoint:

```bash
node handoff-bridge.mjs checkpoint --task <task-id> --from-agent <agent-id> --summary "What changed" --pending "Next safe step" --out .agents/checkpoints/<task-id>.handoff.json
```

Generate a resume prompt:

```bash
node handoff-bridge.mjs resume --from .agents/checkpoints/<task-id>.handoff.json --out RESUME.md
```

## Installed layout

| Path | Purpose |
|---|---|
| `CLAUDE.md` | Claude Code session entrypoint for this installed workspace |
| `AGENT_ONBOARDING.md` | Session-level startup checklist |
| `.agents/` | Ledger, hooks, DoD, planning, diagnostics, and readiness CLIs |
| `.claude/settings.json` | Claude hook configuration |
| `.claude/skills/` | Claude-facing helper skills shipped with the harness |
| `.codex/` | Codex-compatible baseline files |
| `docs/` | Operator docs for install, operations, troubleshooting, release, security, compatibility |
| `schemas/` | Handoff and event-log schemas |
| `lib/token-budget.mjs` | Local token-budget helper |
| `handoff-bridge.mjs` | Checkpoint and resume-prompt bridge |

## What is intentionally not installed

The package repository contains validators, test fixtures, marketplace metadata, release evidence, and package-maintenance scripts. Those are not copied into a normal target repository. If you need to validate or release the package itself, work in the package repository and run:

```bash
node plugins/compound-agent-system/scripts/validate-package.mjs
node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs
```

Do not build the API Alchemy Engine. It appears only as sanitized fixture material in the package repository.
