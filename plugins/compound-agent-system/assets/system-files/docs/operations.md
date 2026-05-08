# Operations

Use this when you are running an installed Compound Agent System workspace.

## Daily health check

```bash
node .agents/task.mjs status
node .agents/task.mjs doctor
node .agents/session-readiness.mjs
```

Use `status` for ledger state, `doctor` for environment and safety diagnostics, and `session-readiness` before unattended or multi-hour execution.

## Task workflow

```bash
node .agents/task.mjs open "Implement verified phase" --skill compound-agent-system --dod "test:node --test tests/*.test.mjs"
node .agents/task.mjs verify <task-id>
node .agents/task.mjs done <task-id>
```

If work is blocked:

```bash
node .agents/task.mjs block <task-id> "reason" --unlock-command "exact command or action"
```

If switching tasks:

```bash
node .agents/task.mjs park <task-id> "why this is parked"
node .agents/task.mjs resume <task-id>
```

## Readiness gate

```bash
node .agents/session-readiness.mjs
```

`NOT_READY` is actionable. Follow the listed unlock steps before running unattended. Readiness checks include active task/DoD, current phase, context refresh, compound register, blockers, pending questions, checkpoint, handoff contract, environment contract, workspace state, and enforce mode.

## Support bundle

```bash
node .agents/support-bundle.mjs
```

The command writes `.agents/support-bundles/support-bundle-<timestamp>/` locally and never uploads automatically. It includes `doctor.json`, `readiness.json`, redacted ledger/events, version/config summaries, and a review-before-share warning.

## Event log

`.agents/events.jsonl` is append-only local JSONL. It records safe diagnostic context for installs, activation, task transitions, quality checks, readiness decisions, and handoff checkpoints. See the Observability event log doc at `docs/event-log.md` in an installed workspace.

## Handoff checkpoints

```bash
node handoff-bridge.mjs checkpoint --task <task-id> --from-agent <agent-id> --summary "What changed" --pending "Next safe step" --out .agents/checkpoints/<task-id>.handoff.json
node handoff-bridge.mjs resume --from .agents/checkpoints/<task-id>.handoff.json --out RESUME.md
```

Handoff artifacts must be shareable and must not include API keys, passwords, or machine-local user paths.
