# Session: Compound Agent System Workspace Harness

## Purpose
Package the Compound Agent System as a repo-portable workspace harness for repositories outside `ecc-browser`.

This is not part of the ECC Browser main build plan. It is a separate session artifact that can be copied, installed, or handed to another agent when a target repo needs the same operating system: skills, DoD rules, task ledger, handoff bridge, agent profiles, and verification assets.

## Status
- Package folder: `out/compound-agent-system-package`
- Plugin root: `plugins/compound-agent-system`
- Codex manifest: `plugins/compound-agent-system/.codex-plugin/plugin.json`
- Claude manifest: `plugins/compound-agent-system/.claude-plugin/plugin.json`
- Shared harness payload: `plugins/compound-agent-system/assets/system-files`

## Install Model
The plugin payload is the same for Claude and Codex. Only registration differs.

Codex:
- Copy `plugins/compound-agent-system` to the configured local plugin home.
- Register `compound-agent-system` in the local Codex/Agents marketplace metadata.

Claude:
- Use the same plugin root.
- Either start Claude Code with `claude --plugin-dir <path-to-plugins/compound-agent-system>` for local development, or stage the package as a local Claude marketplace and install it with `/plugin install compound-agent-system@compound-agent-system`.

Target repository:
- Preferred: run `node bootstrap.mjs --target <repo> --agent-id <agent-id>` from the package root.
- Bootstrap copies the harness, runs `.agents/activate.mjs`, optionally signs in the current agent, and prints ledger status.
- If needed, split the steps with `--no-activate`, then run `node .agents/activate.mjs` and `node .agents/agent-activate.mjs --id <agent-id>` inside the target repo.

## Scope
Included:
- `.agents` protocol, DoD, ledger, activation and runtime files
- `.claude` commands/settings/skills that are safe to distribute
- `.codex` agents/config/AGENTS instructions
- `.github` workflows and PR template
- curated `.omc` continuity state
- handoff bridge, schema, token-budget adapter, focused tests

Excluded:
- `.claude/worktrees`
- `.claude/settings.local.json`
- generated `.omc` zip artifacts
- `node_modules`
- browser build data files

## Verification Gates
- [ ] `quick_validate.py plugins/compound-agent-system/skills/compound-agent-system` passes.
- [ ] `node plugins/compound-agent-system/scripts/validate-package.mjs` passes.
- [ ] Bootstrap dry-run plans the expected bundled file set.
- [ ] Target repo activation creates or preserves the ledger without overwriting user-local secrets.
- [ ] A new agent can run `.agents/agent-activate.mjs --id <agent-id>` and appear in `.agents/TASKS.json`.
- [ ] Claude and Codex manifests both parse as JSON.

## Handoff Prompt
Use this when starting a new session for an external repo:

```text
You are activating the Compound Agent System workspace harness in this repository.

Read first:
- AGENTS.md or CLAUDE.md in the target repo, if present
- plugins/compound-agent-system/skills/compound-agent-system/SKILL.md
- plugins/compound-agent-system/README.md
- plugins/compound-agent-system/assets/system-files/.agents/PROTOCOL.md
- plugins/compound-agent-system/assets/system-files/.agents/DOD.md

Load skill:
- /compound-agent-system

Run:
- node bootstrap.mjs --target <target repo> --agent-id <agent-id> --dry-run
- node bootstrap.mjs --target <target repo> --agent-id <agent-id>
- cd <target repo>
- node .agents/task.mjs status
- node .agents/task.mjs open "<project goal>" --dod "manual:<first acceptance gate>" --skill <skill-id>

Quality gates:
- [ ] Target repo has .agents, .claude, .codex and required DoD files.
- [ ] Ledger status can be read.
- [ ] Current agent is listed in agents_active or agent_profiles.
- [ ] No local secrets or worktrees were copied.
- [ ] A first task can be opened with explicit Definition of Done checks.
```
