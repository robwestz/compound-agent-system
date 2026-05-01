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
- print ledger status and the first idea-intake next action

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


## Security, AI, integrity, and troubleshooting

Premium hardening docs:

- `docs/security-boundary-model.md` defines trust boundaries, default-deny behavior, fixture secret assertions, and optional external-AI rules.
- `docs/secrets-and-ai-policy.md` documents the deterministic non-AI path and `GROQ_API_KEY` / `OPENROUTER_API_KEY` expectations.
- `docs/plugin-size-budget.md` classifies core plugin, optional skill, docs/playbook, external workbench, and test-only placement.
- `docs/troubleshooting.md` maps common failures to exact recovery actions.

`node .agents/task.mjs doctor` reports security-boundary health after install. The package validator reports payload size, fails missing required files, and fails stale `manifest.json` payload metadata before release.

## Compliance modes: observe, warn, enforce

The installed harness reads `COMPOUND_MODE=observe|warn|enforce`. `observe` logs structured guidance and never blocks. `warn` is the default: it warns but exits 0. `enforce` blocks invalid state-changing actions with exit code 2. The legacy `COMPOUND_ENFORCE=1` still maps to enforce. Switch to enforce after the first smoke test passes and before unattended multi-hour execution.

See `docs/compliance-mode-policy.md` for the command-by-command policy table. `node .agents/task.mjs status` and `node .agents/task.mjs doctor` report the active mode and recommended switch point.

## Identity model

Agent identity separates client, model, role, ledger id, session id, and display name. For example, `claude-opus-4.7` normalizes to client `claude` and model `opus-4.7`; role remains a separate field such as `planner`, `executor`, `reviewer`, or `verifier`. Status output displays these fields separately for auditability.

## Idea intake

After installation, use idea intake instead of opening implementation work directly:

```powershell
node .agents\idea-intake.mjs --input fixtures\ideas\simple-idea.md --apply
node .agents\task.mjs status
```

Idea intake immediately creates an intake/planning task, records the original idea text, runs deterministic GAP SCAN, proposes recommended defaults, assigns planner/executor/reviewer/verifier roles, and writes Phase 0 artifacts. Blocker questions do not prevent the intake task from opening; implementation tasks wait for accepted scope.

Generated planning output must pass `.agents/check-output-quality.mjs` and `.agents/check-planning-quality.mjs` before it is treated as an artifact. The planning quality gate rejects generic foundation/verification-only plans, missing `first_vertical_slice`, missing phase DoD, missing role ownership, missing blocker defaults, and missing import markers.

## Phase 0 plan artifacts

Idea intake writes these standard artifacts under `phase-0/`:

- `PROJECT_BRIEF.md`
- `GAP_SCAN.md`
- `DECISIONS.md`
- `PHASE_PLAN.md`
- `OPEN_QUESTIONS.md`
- `AGENT_ROLES.md`
- `DOD_MATRIX.md`

`PHASE_PLAN.md` contains `compound: active` frontmatter and `[COMPOUND-PHASE]` markers so it can be imported with:

```powershell
node .agents\task.mjs import phase-0\PHASE_PLAN.md --apply
```

## Environment workbench boundary

Environment-file generation is owned outside this plugin by `robwestz/devin_workbench`; this repo consumes generated environment handoff files as project inputs. The plugin core must stay portable and dependency-free, so project-specific `.env`, cloud, SSO, VPN, or IDE setup belongs in the workbench or target repo, not in `.agents/` runtime code. See `docs/environment-workbench-contract.md` for inputs, outputs, failure modes, and the minimal handoff example.

The generated plan is idea-derived: short, medium, and long idea fixtures should produce different 3–6 phase plans. Each plan includes a `first_vertical_slice`, expected artifacts, DoD checks, proceed-without-user status, and phase-linked planner/executor/reviewer/verifier role ownership.

## Premium production roadmap

The premium-production hardening catalog lives in `docs/premium-production/`. It breaks the remaining commercial-readiness work into small task files with DoD, constraints, quality bar, dependencies, skill guidance, and implementer/evaluator feedback-loop expectations. Use that catalog before starting broad hardening work so the core plugin stays focused and optional workflows can remain skills, docs/playbooks, external workbench work, or test-only assets.

## Fact-Forcing Gate

The first state-changing action in a session requires grounding in the user's exact instruction. Set `COMPOUND_GROUNDED` to a verbatim quote before retrying. This prevents agents from acting on stale or assumed context. Read-only commands such as `status`, `list`, `show`, and `current` do not require grounding.

## Long-session readiness

Before unattended execution, run:

```powershell
node .agents\session-readiness.mjs
```

The command reports READY or NOT_READY, checks active task/DoD/current phase/context refresh/compound register/blockers/pending questions/handoff checkpoint/compliance mode, and prints unlock steps when the session is not safe to continue unattended.

## Curation Notes

The bundle includes `.agents`, `.codex`, `.github`, curated `.claude`, curated `.omc`, handoff bridge files, token-budget adapter, schemas, and focused tests.

Excluded on purpose:

- `.claude/worktrees/`
- `.claude/settings.local.json`
- generated `.omc` ZIP artifacts
- `node_modules/`
- browser build data files
