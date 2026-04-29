# Activation

> **When to read this:** Read when installing the system files into a new repository or checking whether Compound Protocol is active.

## Procedure

| Step | Action | Verification |
|---|---|---|
| Copy bundle | Run `node [PLUGIN]/scripts/install-compound-system.mjs --target [PROJECT_ROOT]` | `[PROJECT_ROOT]/.agents/PROTOCOL.md` exists |
| Install hooks | Run `node .agents/activate.mjs` from target repo | `.claude/settings.json` includes `_compound: compound-protocol` |
| Inspect status | Run `node .agents/task.mjs status` | Ledger status prints current/open/parked counts |
| Acknowledge | Run `node .agents/task.mjs ack [agent-id]` | Log contains an `ack` event |

## Required Files

| Path | Why it matters |
|---|---|
| `.agents/PROTOCOL.md` | Activation contract and hard rules |
| `.agents/DOD.md` | Definition of Done contract |
| `.agents/task.mjs` | Task ledger CLI and hook engine |
| `.agents/activate.mjs` | Idempotent hook installer |
| `.agents/node-runtime.mjs` | Portable Node resolver for DoD commands |
| `.claude/settings.json` | Claude hook config target |
| `.codex/config.toml` | Codex multi-agent baseline |

## Anti-Patterns

| Do NOT | Use instead |
|---|---|
| Copy only the skill without `.agents` runtime files | Install `assets/system-files` first |
| Install hooks before inspecting existing settings | Let `activate.mjs` merge idempotently |
| Copy local permission files | Keep `settings.local.json` out of shared bundles |

