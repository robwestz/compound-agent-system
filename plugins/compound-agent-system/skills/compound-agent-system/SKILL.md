---
name: compound-agent-system
description: Activate and operate the Compound Agent System in a repository. Use when the user asks to install, enable, copy, package, or run the agent system with skills, task ledger, Definition of Done gates, Codex/Claude agent profiles, handoff checkpoints, resume prompts, token-budget triggers, or multi-agent workflow rules. Trigger on "activate our agent system", "install Compound Protocol", "copy the DoD rules", "set up agent handoff", "package the skills", or "make this repo use the task ledger".
---

# Compound Agent System

Use this skill to install and operate the bundled Compound Agent System workspace harness in a target repository. The package is Claude- and Codex-compatible; the runtime payload lives under `../../assets/system-files/` and is installed the same way from either client.

## Quick Start

| Step | Command | Pass condition |
|---|---|---|
| Bootstrap repo | `node bootstrap.mjs --target [PROJECT_ROOT] --agent-id [AGENT_ID]` | Target repo has harness files, hooks, ledger, and active agent |
| Install bundle | `node plugins/compound-agent-system/scripts/install-compound-system.mjs --target [PROJECT_ROOT]` | Target repo has `.agents/`, `.claude/`, `.codex/`, `.github/`, and `.omc/` files |
| Activate hooks | `cd [PROJECT_ROOT] && node .agents/activate.mjs` | `.claude/settings.json` contains `compound-protocol` hooks |
| Activate agent | `node .agents/agent-activate.mjs --id [AGENT_ID]` | Agent id appears in `.agents/TASKS.json` |
| Check ledger | `node .agents/task.mjs status` | Current task/open/parked counts are shown |
| Acknowledge agent | `node .agents/task.mjs ack [agent-id]` | Agent id appears in `.agents/TASKS.json` log |

Do not edit project files before the activation checklist in `.agents/PROTOCOL.md` is complete.

## Meaning of Bootstrapped

Bootstrapped means the target repository has the harness files installed, hooks activated, ledger initialized, and at least one agent identity signed in if `--agent-id` was supplied. From that point, project work should start by opening a task with explicit Definition of Done checks:

```bash
node .agents/task.mjs open "<project goal>" --dod "manual:<first acceptance gate>" --skill <skill-id>
```

Use `.agents/agent-activate.mjs` whenever another agent joins later.

## Client Compatibility

| Client | Plugin surface | Install difference |
|---|---|---|
| Claude Code | `.claude-plugin/plugin.json`, `skills/`, `commands/` | Use `claude --plugin-dir ...` for local development or install from a local Claude marketplace |
| Codex | `.codex-plugin/plugin.json`, `skills/` | Copy plugin to the local plugin home and register it in the Agents marketplace metadata |

The target repository installer is shared by both clients.

## Workflows

| If the user wants... | Do this | Read more |
|---|---|---|
| Repo activation | Install assets, run activation, ack identity | `references/activation.md` |
| DoD-controlled work | Open a task with test/artifact/manual checks | `references/dod-rules.md` |
| Agent handoff | Generate or verify a handoff contract | `references/handoff-bridge.md` |
| Multi-agent roles | Load explorer/reviewer/docs-researcher profiles | `references/agent-profiles.md` |
| Package inspection | Compare copied assets against manifest | `references/file-manifest.md` |

## Operating Rules

| Rule | Required behavior | Anti-pattern |
|---|---|---|
| Task first | Open or resume a task before edits | Editing with no `in_progress` task |
| DoD first | Define pass/fail checks when opening the task | Adding vague checks after the work is done |
| Verify before done | Run `node .agents/task.mjs verify [task-id]` | Saying "done" from inspection only |
| Park before switch | Park active work before unrelated work | Silent task-switching |
| Portable commands | Keep ledger commands as `node ...` | Hardcoding host-specific Node paths |

## Output Contract

When this skill is used, produce one of these outcomes:

| Outcome | Required files or proof |
|---|---|
| Installed repo | `.agents/PROTOCOL.md`, `.agents/DOD.md`, `.agents/task.mjs`, `.claude/settings.json`, `.agents/TASKS.json` |
| Open task | Ledger has an `in_progress` task with at least one DoD check |
| Verified task | Each DoD item has `passed_at` or a logged failure/unlock path |
| Handoff package | A valid `*.handoff.json` plus matching `*.RESUME.md` |

## Do Not

| Do NOT | Instead |
|---|---|
| Copy `.claude/worktrees/` into new repos | Use only the curated `assets/system-files` bundle |
| Copy `settings.local.json` into shared repos | Keep local permissions outside the package |
| Mark manual gates as passed for the user | Leave `check: manual` pending until the user confirms |
| Treat `.omc` replay state as authoritative source code | Use it as continuity evidence only |
