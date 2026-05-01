# Handoff Bridge

> **When to read this:** Read when context is filling, ownership changes between agents, or a task needs a resume artifact.

## Core Files

| Path | Role |
|---|---|
| `handoff-bridge.mjs` | CLI and library for checkpoint, resume, and verify |
| `schemas/handoff-contract.v2.json` | Default JSON schema for new `*.handoff.json` |
| `schemas/handoff-contract.v1.json` | Legacy schema; existing files migrate in memory |
| `lib/token-budget.mjs` | Heuristic token-budget detector and command suggestion adapter |
| `.omc/state/checkpoints/*.handoff.json` | Handoff snapshots |
| `.omc/state/checkpoints/*.RESUME.md` | Copy-pasteable target-agent resume prompts |

## Commands

| Need | Command |
|---|---|
| Create manual checkpoint | `node handoff-bridge.mjs checkpoint --task [id] --to claude --summary "..."` |
| Create token-trigger checkpoint | `node handoff-bridge.mjs checkpoint --trigger token --task [id] --to claude --summary "..."` |
| Write resume prompt | `node handoff-bridge.mjs resume --from [handoff.json] --out [RESUME.md]` |
| Verify handoff | `node handoff-bridge.mjs verify --from [handoff.json]` |

## Safety Rules

| Rule | Why |
|---|---|
| Prefer explicit `--from [agent-id]` in multi-agent runs | Avoids wrong sender attribution |
| Validate before sharing | Detects schema errors, secrets, and unsafe paths |
| Use v2/v3/v4 checkpoint names over stale proof files | Avoids earlier wrong-agent proof artifacts |
| Resume from generated prompts | Prompts include exact files, commands, and open decisions |

## Anti-Patterns

| Do NOT | Instead |
|---|---|
| Treat a checkpoint as task completion | Verify DoD separately |
| Share unverified handoff JSON | Run `verify` first |
| Auto-fire token handoff | Emit suggestion, let operator decide |
| Rewrite old v1 handoff files in place | Create a new v2 checkpoint or use in-memory migration |
