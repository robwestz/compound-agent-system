# Compound Agent System

Install and operate a repo-portable agent system with task ledger, Definition of Done gates, handoff checkpoints, token-budget adapter, and Codex/Claude agent profiles.

## What It Does

This skill turns a repository into a Compound Protocol workspace. Agents must acknowledge the protocol, work through explicit tasks, define DoD checks, verify before closing work, and produce handoff artifacts when context or agent ownership changes.

## Supported Clients

| Client | Support |
|---|---|
| Codex | Primary plugin + skill target |
| Claude Code | Supported through bundled `.claude` hooks and skills |
| Other agents | Can use the copied markdown contracts and Node CLI |

## Prerequisites

- Node.js 18 or newer in the target repository.
- A writable target repository.
- Optional Codex local plugin registration for global discovery.

## Installation

Install the plugin globally by copying `plugins/compound-agent-system` into a local plugin directory and registering it in `~/.agents/plugins/marketplace.json`.

Install the system files into a repo:

```powershell
node plugins/compound-agent-system/scripts/install-compound-system.mjs --target C:\path\to\repo
cd C:\path\to\repo
node .agents/activate.mjs
node .agents/task.mjs status
```

## Trigger Conditions

- "Activate our agent system in this repo"
- "Install the DoD rules and task ledger"
- "Set up Codex/Claude handoff"
- "Package this system as a global plugin"
- "Open a Compound task with verification gates"

## Expected Outcome

The target repository receives the complete Compound runtime bundle and an agent can immediately read `.agents/PROTOCOL.md`, acknowledge identity, open tasks with DoD checks, and verify or hand off work.

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | Core agent instructions |
| `references/activation.md` | Install and activation procedure |
| `references/dod-rules.md` | DoD contract and task lifecycle |
| `references/handoff-bridge.md` | Handoff/resume contract usage |
| `references/agent-profiles.md` | Codex agent role profiles |
| `references/file-manifest.md` | Curated package manifest |
| `scripts/install-compound-system.mjs` | Copies bundled system files into a target repo |
| `scripts/validate-package.mjs` | Checks package structure and key assets |
| `assets/system-files/` | Repo-ready runtime/configuration bundle |

## Troubleshooting

| Symptom | Fix |
|---|---|
| `node` crashes on the host | Keep ledger DoD commands portable as `node ...`; use `.agents/node-runtime.mjs` locally to resolve a working runtime |
| Hooks are installed but no task is active | Run `node .agents/task.mjs status`, then open or ack a task before edits |
| Existing files would be overwritten | Re-run installer without `--overwrite` to skip, or inspect conflicts and intentionally pass `--overwrite` |
| Handoff verification fails | Run `node handoff-bridge.mjs verify --from [file]` and fix the listed schema/safety errors |

