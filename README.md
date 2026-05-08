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

POSIX:

```bash
node plugins/compound-agent-system/scripts/validate-package.mjs
```

PowerShell:

```powershell
node .\plugins\compound-agent-system\scripts\validate-package.mjs
```

Install system files into a target repo:

POSIX:

```bash
node plugins/compound-agent-system/scripts/install-compound-system.mjs --target "/path/to/repo with spaces"
```

PowerShell:

```powershell
node .\plugins\compound-agent-system\scripts\install-compound-system.mjs --target 'C:\path\to\repo with spaces'
```

Bootstrap a target repo in one step:

POSIX:

```bash
node bootstrap.mjs --target "/path/to/repo with spaces" --agent-id codex
```

PowerShell:

```powershell
node .\bootstrap.mjs --target 'C:\path\to\repo with spaces' --agent-id codex
```

Bootstrap means:

- copy the harness files into the target repo
- run `.agents/activate.mjs` to install hooks and initialize the ledger
- optionally run `.agents/agent-activate.mjs --id <agent-id>`
- print ledger status and the guided first-session wizard's one next action

If activation should be separate:

POSIX:

```bash
node bootstrap.mjs --target "/path/to/repo with spaces" --no-activate
cd "/path/to/repo with spaces"
node .agents/activate.mjs
node .agents/agent-activate.mjs --id codex
```

PowerShell:

```powershell
node .\bootstrap.mjs --target 'C:\path\to\repo with spaces' --no-activate
Set-Location 'C:\path\to\repo with spaces'
node .agents\activate.mjs
node .agents\agent-activate.mjs --id codex
```

## First-session guided wizard

After bootstrap, activation prints one primary next action at a time. The wizard is deterministic and can be skipped; skipping only hides the guide and does not disable any CLI command.

Successful first run transcript:

```text
$ node bootstrap.mjs --target /tmp/demo-repo --agent-id devin-demo --role planner --skill compound-agent-system
Compound workspace harness bootstrap
Target: /tmp/demo-repo
Mode: write
Activate: yes
Agent: devin-demo

> /usr/bin/node plugins/compound-agent-system/scripts/install-compound-system.mjs --target /tmp/demo-repo
Compound Agent System install
Target: /tmp/demo-repo
Mode: write
Rollback manifest: /tmp/demo-repo/.agents/install-manifest.json
Install complete.

> /usr/bin/node /tmp/demo-repo/.agents/activate.mjs
Compound Protocol — activation
  Settings: /tmp/demo-repo/.claude/settings.json
  Tasks ledger: /tmp/demo-repo/.agents/TASKS.json (already present)
  Hooks: installed/updated

Installed hooks:
  - SessionStart: node .agents/task.mjs hook ...
  - PreToolUse: node .agents/task.mjs hook ...
  - Stop: node .agents/task.mjs hook ...

Compliance level: WARN
Observe: log only; Warn: warn but do not block; Enforce: block invalid state-changing actions.
To enable enforcement (POSIX): export COMPOUND_MODE=enforce
To enable enforcement (PowerShell): $env:COMPOUND_MODE = 'enforce'
Recommended switch point: after the first smoke test passes, before unattended execution.

First-session guided wizard
Step 1 of 5: sign in the agent.
System: installed; mode WARN (guides without blocking).
Agent: not signed in.
Next: node .agents/agent-activate.mjs --id <agent-id>
Next (PowerShell): node .agents\agent-activate.mjs --id <agent-id>
Skip: node .agents/first-session-wizard.mjs skip
Skip (PowerShell): node .agents\first-session-wizard.mjs skip

> /usr/bin/node /tmp/demo-repo/.agents/agent-activate.mjs --id devin-demo --role planner --skill compound-agent-system
First-session guided wizard
Step 2 of 5: capture your idea.
System: installed; mode WARN (guides without blocking).
Agent: devin-demo signed in as planner.
Next: create idea.md with your raw idea
Skip: node .agents/first-session-wizard.mjs skip
Skip (PowerShell): node .agents\first-session-wizard.mjs skip

Identity: id=devin-demo client=devin model=demo role=planner session_id=2026-05-01T16-45-00-000Z-demo00
Skills: compound-agent-system

```

After creating `idea.md`, run `node .agents/first-session-wizard.mjs` and follow its next line. The later steps are:

1. `node .agents/idea-intake.mjs --input idea.md --apply`
2. `node .agents/task.mjs import phase-0/PHASE_PLAN.md --apply`
3. `node .agents/session-readiness.mjs`

## Support bundle export

When support needs local diagnostics, create a reviewable bundle without uploading anything:

POSIX:

```bash
node .agents/support-bundle.mjs
```

PowerShell:

```powershell
node .agents\support-bundle.mjs
```

The command writes `.agents/support-bundles/support-bundle-<timestamp>/` with:

- `manifest.json` and `README.md` with a review-before-share warning
- `versions.json` and `config-summary.json`
- redacted `ledger-redacted.json`
- recent redacted `events-recent-redacted.json`
- `doctor.json` from `node .agents/task.mjs doctor`
- `readiness.json` from `node .agents/session-readiness.mjs`

It redacts secret-looking keys/values, summarizes task goals/reasons instead of copying raw text, and never performs an automatic upload.

To skip the guide:

POSIX:

```bash
node .agents/first-session-wizard.mjs skip
```

PowerShell:

```powershell
node .agents\first-session-wizard.mjs skip
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

POSIX:

```bash
export COMPOUND_MODE=enforce
```

PowerShell:

```powershell
$env:COMPOUND_MODE = 'enforce'
```

See `docs/compliance-mode-policy.md` for the command-by-command policy table. `node .agents/task.mjs status` and `node .agents/task.mjs doctor` report the active mode and recommended switch point.

## Identity model

Agent identity separates client, model, role, ledger id, session id, and display name. For example, `claude-opus-4.7` normalizes to client `claude` and model `opus-4.7`; role remains a separate field such as `planner`, `executor`, `reviewer`, or `verifier`. Status output displays these fields separately for auditability.

## Idea intake

After installation, use idea intake instead of opening implementation work directly:

POSIX:

```bash
node .agents/idea-intake.mjs --input fixtures/ideas/simple-idea.md --apply
node .agents/task.mjs status
```

PowerShell:

```powershell
node .agents\idea-intake.mjs --input fixtures\ideas\simple-idea.md --apply
node .agents\task.mjs status
```

Idea intake immediately creates an intake/planning task, records the original idea text, runs deterministic GAP SCAN, proposes recommended defaults, assigns planner/executor/reviewer/verifier roles, and writes Phase 0 artifacts. Blocker questions do not prevent the intake task from opening; implementation tasks wait for accepted scope.

Generated planning output must pass `.agents/check-output-quality.mjs` and `.agents/check-planning-quality.mjs` before it is treated as an artifact. The planning quality gate rejects generic foundation/verification-only plans, missing `first_vertical_slice`, missing phase DoD, role mismatch, missing blocker defaults, unsafe defaults, unresolved placeholders, missing question buckets, thin phase goals, and missing import markers. Add new deterministic checks through the red-team corpus documented in `docs/planning-quality-red-team.md`; do not add LLM judging to this gate.

`AGENT_ROLES.md` is operational, not decorative. It contains a static JSON role map with task IDs, artifacts, autonomy level, handoff condition, and `spawn_policy: static-export-only` for each planner/executor/reviewer/verifier assignment. Export it without spawning agents:

POSIX:

```bash
node .agents/role-plan.mjs phase-0/AGENT_ROLES.md --json
```

PowerShell:

```powershell
node .agents\role-plan.mjs phase-0\AGENT_ROLES.md --json
```

## Evaluator feedback loop

Premium-production tasks must not be accepted after a single implementation pass. Record the task report with:

1. first completion,
2. self-review,
3. evaluator feedback round 1,
4. improvement 1,
5. evaluator feedback round 2,
6. improvement 2,
7. final signoff.

Validate the evidence before marking a task done:

POSIX:

```bash
node .agents/eval-loop.mjs docs/premium-production/tasks/18-evaluator-feedback-loop-runner.md
```

PowerShell:

```powershell
node .agents\eval-loop.mjs docs\premium-production\tasks\18-evaluator-feedback-loop-runner.md
```

The runner checks for the two feedback rounds, both improvement rounds, final signoff, implementer/evaluator identity, and disclosure when one agent performs both roles. It does not call external agent APIs and must not claim independent review for same-session self-evaluation.

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

POSIX:

```bash
node .agents/task.mjs import phase-0/PHASE_PLAN.md --apply
```

PowerShell:

```powershell
node .agents\task.mjs import phase-0\PHASE_PLAN.md --apply
```

## Windows / PowerShell parity notes

Windows 10/11 with PowerShell 5.1+ or PowerShell 7+ is best-effort, not CI-supported. The harness is dependency-free and does not require WSL. Commands are designed to be invoked through `node` with arguments rather than shell-specific wrappers; quote paths containing spaces with single quotes in PowerShell and double quotes in POSIX shells. Known limitations:

- Windows CI is not automated; automated CI still runs on Ubuntu only. Windows behavior is covered by deterministic path, CRLF, quoting, and command-string tests.
- Claude hook command strings are shared (`node .agents/task.mjs ...`) and rely on the client executing them from the target repo with Node on `PATH`.
- Shell-specific environment assignment differs: use `export COMPOUND_MODE=enforce` on POSIX and `$env:COMPOUND_MODE = 'enforce'` in PowerShell.
- Native Windows paths are supported for documented commands, but external Claude/Codex marketplace install behavior remains a manual release-check item.

## Environment workbench boundary

Environment-file generation is owned outside this plugin by `robwestz/devin_workbench`; this repo consumes generated environment handoff files as project inputs. The plugin core must stay portable and dependency-free, so project-specific `.env`, cloud, SSO, VPN, or IDE setup belongs in the workbench or target repo, not in `.agents/` runtime code. See `docs/environment-workbench-contract.md` for inputs, outputs, failure modes, and the minimal handoff example.

The generated plan is idea-derived: short, medium, and long idea fixtures should produce different 3–6 phase plans. Each plan includes a `first_vertical_slice`, expected artifacts, DoD checks, proceed-without-user status, and phase-linked planner/executor/reviewer/verifier role ownership.

## Premium production roadmap

The premium-production hardening catalog lives in `docs/premium-production/`. It breaks the remaining commercial-readiness work into small task files with DoD, constraints, quality bar, dependencies, skill guidance, and implementer/evaluator feedback-loop expectations. Use that catalog before starting broad hardening work so the core plugin stays focused and optional workflows can remain skills, docs/playbooks, external workbench work, or test-only assets.

## Fact-Forcing Gate

The first state-changing action in a session requires grounding in the user's exact instruction. Set `COMPOUND_GROUNDED` to a verbatim quote before retrying. This prevents agents from acting on stale or assumed context. Read-only commands such as `status`, `list`, `show`, and `current` do not require grounding.

## Long-session readiness

Before unattended execution, run:

POSIX:

```bash
node .agents/session-readiness.mjs
```

PowerShell:

```powershell
node .agents\session-readiness.mjs
```

The command reports READY or NOT_READY and only reports READY when all premium preflight conditions pass: active in-progress task, defined DoD, unresolved manual checks explicitly confirmed, current phase, context refresh, compound register, no blockers, no pending blocking questions, checkpoint, valid handoff contract, environment contract, clean or documented known-dirty workspace state, and `COMPOUND_MODE=enforce`. NOT_READY output includes structured unlock steps with a stable check id, explanation, and concrete command or action.

## Handoff contract v2

`handoff-bridge.mjs` exports `handoff-contract.v2` checkpoints by default and validates them before writing. The versioned schema lives at `schemas/handoff-contract.v2.json` and requires explicit `task_state`, `completed_chunks`, `pending_decisions`, `artifacts`, `risks`, and `resume_commands` fields. The bridge still accepts existing `handoff-contract.v1` files by migrating them in memory; do not rewrite older handoff artifacts unless you are intentionally creating a new checkpoint.

Checkpoint export:

POSIX:

```bash
node handoff-bridge.mjs checkpoint --task t-001 --from-agent codex-gpt-5-codex --summary "What changed" --pending "Next safe step" --file handoff-bridge.mjs --decision "Open decision for next agent" --out .agents/checkpoints/t-001.handoff.json
```

PowerShell:

```powershell
node handoff-bridge.mjs checkpoint --task t-001 --from-agent codex-gpt-5-codex --summary "What changed" --pending "Next safe step" --file handoff-bridge.mjs --decision "Open decision for next agent" --out .agents\checkpoints\t-001.handoff.json
```

Resume prompt export:

POSIX:

```bash
node handoff-bridge.mjs resume --from .agents/checkpoints/t-001.handoff.json --out RESUME.md
```

PowerShell:

```powershell
node handoff-bridge.mjs resume --from .agents\checkpoints\t-001.handoff.json --out RESUME.md
```

The generated resume prompt points the next agent to exact files, the ledger path, validation schema, concrete resume commands, and open decisions. Handoff artifacts must be shareable and must not include API keys, passwords, or machine-local user paths.

## Curation Notes

The bundle includes `.agents`, `.codex`, `.github`, curated `.claude`, curated `.omc`, handoff bridge files, token-budget adapter, schemas, and focused tests.

Excluded on purpose:

- `.claude/worktrees/`
- `.claude/settings.local.json`
- generated `.omc` ZIP artifacts
- `node_modules/`
- browser build data files
