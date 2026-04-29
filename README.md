# Compound Agent System Workspace Harness

This folder contains a Claude- and Codex-compatible plugin package plus a curated repo bundle for the Compound Agent System. The payload is the same for both clients; only plugin registration differs.

## Layout

| Path | Purpose |
|---|---|
| `plugins/compound-agent-system/` | Shared Claude/Codex plugin root |
| `plugins/compound-agent-system/.claude-plugin/plugin.json` | Claude Code plugin manifest |
| `plugins/compound-agent-system/.codex-plugin/plugin.json` | Codex plugin manifest |
| `plugins/compound-agent-system/skills/compound-agent-system/` | Skill package |
| `plugins/compound-agent-system/commands/activate-compound-system.md` | Claude Code command wrapper |
| `plugins/compound-agent-system/assets/system-files/` | Files to copy into a target repo |
| `plugins/compound-agent-system/scripts/install-compound-system.mjs` | Target-repo installer |
| `plugins/compound-agent-system/scripts/bootstrap-compound-system.mjs` | One-command install + activation entrypoint |
| `plugins/compound-agent-system/scripts/validate-package.mjs` | Package validator |
| `bootstrap.mjs` | Package-root shortcut for bootstrap |
| `install-global-plugin.ps1` | Stages/registers the plugin for Codex, Claude, or both |
| `claude-marketplace.json` | Local Claude marketplace template |
| `SESSION.md` | Separate harness session notes and handoff prompt |

## Use

Validate package:

```powershell
node .\plugins\compound-agent-system\scripts\validate-package.mjs
```

Install system files into a target repo:

```powershell
node .\plugins\compound-agent-system\scripts\install-compound-system.mjs --target C:\path\to\repo
```

Bootstrap a target repo in one step:

```powershell
node .\bootstrap.mjs --target C:\path\to\repo --agent-id codex
```

Bootstrap means:

- copy the harness files into the target repo
- run `.agents/activate.mjs` to install hooks and initialize the ledger
- optionally run `.agents/agent-activate.mjs --id <agent-id>`
- print ledger status and the first project task command

If activation should be separate:

```powershell
node .\bootstrap.mjs --target C:\path\to\repo --no-activate
cd C:\path\to\repo
node .agents\activate.mjs
node .agents\agent-activate.mjs --id codex
```

Stage/register as a home-local plugin:

```powershell
.\install-global-plugin.ps1
```

Codex-only:

```powershell
.\install-global-plugin.ps1 -Client codex
```

Claude-only:

```powershell
.\install-global-plugin.ps1 -Client claude
```

For Claude development without marketplace registration:

```powershell
claude --plugin-dir .\plugins\compound-agent-system
```

For Claude marketplace installation, stage it first and then run in Claude Code:

```text
/plugin marketplace add C:\Users\<you>\.claude\plugins\marketplaces\compound-agent-system
/plugin install compound-agent-system@compound-agent-system
```

## Curation Notes

The bundle includes `.agents`, `.codex`, `.github`, curated `.claude`, curated `.omc`, handoff bridge files, token-budget adapter, schema, and focused tests.

Excluded on purpose:

- `.claude/worktrees/`
- `.claude/settings.local.json`
- generated `.omc` ZIP artifacts
- `node_modules/`
- browser build data files
