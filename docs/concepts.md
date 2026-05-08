# Concepts

Use this when you want the mental model before operating or extending the harness.

## Harness, not app

Compound Agent System installs a repo-local operating harness for agents. It is not the API Alchemy Engine. API Alchemy appears only as sanitized fixture material for idea-intake tests.

## Ledger

`.agents/TASKS.json` is the source of truth for task state, active agents, Definition of Done checks, blockers, and task transitions.

## Definition of Done

Tasks must have active verification. DoD checks are:

- `test`: command exits 0.
- `artifact`: file or directory exists and may satisfy content/size checks.
- `manual`: human-confirmed acceptance item.

`node .agents/task.mjs verify <task-id>` records passing checks. `node .agents/task.mjs done <task-id>` refuses unverified DoD.

## Compound mechanisms

- **GAP SCAN**: regrounds intent before a significant phase.
- **COMPOUND REGISTER**: records what was built, gained, enabled, reused, and learned after a unit of work.
- **CONTEXT REFRESH**: checks drift and current state at transitions.

## Fact-Forcing Gate

The first state-changing action in a session requires grounding in the user's exact instruction via `COMPOUND_GROUNDED`. This prevents agents from acting on stale or assumed context.

## Compliance modes

`COMPOUND_MODE=observe|warn|enforce` controls state-changing command behavior:

- `observe`: log guidance, never block.
- `warn`: warn but exit 0; default for first smoke tests.
- `enforce`: block invalid state-changing actions with exit code 2.

See the Compliance Mode Policy at `docs/compliance-mode-policy.md` in the package repository.

## Doctor, readiness, and support bundle

- `node .agents/task.mjs doctor`: environment, ledger, hooks, mode, docs, and security diagnostics.
- `node .agents/session-readiness.mjs`: premium preflight for unattended execution.
- `node .agents/support-bundle.mjs`: local, review-before-share diagnostic bundle with redacted ledger/events plus doctor/readiness output.

## Optional AI

The deterministic path is the baseline. Optional AI can improve ranking only when a command documents `--ai` and the operator provides `GROQ_API_KEY` or `OPENROUTER_API_KEY`. Tests and install must pass with no provider keys. See [Secrets and Optional AI Policy](secrets-and-ai-policy.md).
