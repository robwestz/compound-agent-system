# Manual Approval Boundaries

The Compound Agent System is autonomous by default only inside reversible, local, read-only, or harness-owned work. The actions below are **must-ask** boundaries: they stay blocked until a human explicitly approves the exact scope. Agents may still inspect local files, run read-only status/doctor/list commands, prepare diffs, use fixtures, and document a safe default while waiting.

## Approval states for tasks and blockers

| State | Meaning | Agent behavior |
|---|---|---|
| `must-ask` | Human approval is required before the action can run. | Mark the task/blocker as blocked, record the category, ask only the required approval question, and keep read-only inspection unblocked. |
| `defaultable` | A documented safe default exists. | Proceed with that default, record it in the task report or GAP SCAN, and let the user override later. |
| `defer` | The decision is outside the current task. | Do not ask immediately; record why it is deferred and what event would reopen it. |

In the task ledger, use `approval_policy` (`must-ask`, `defaultable`, or `defer`), `approval_category`, `approval_state`, `blocked_by`, and `unlock_command` together. `blocked_by` explains the pending decision; `unlock_command` tells the next agent or human how to proceed after approval.

## Approval matrix

| Category | Default policy | Blocked action examples | Safe default while waiting | Required approval scope |
|---|---|---|---|---|
| `secrets` | `must-ask` | Requesting, reading, pasting, exporting, saving, or rotating credentials; opening `.env`-like private files; using provider keys. | Use placeholders, deterministic fixtures, and secret-manager references only. | Secret name, source/channel, session vs saved scope, exact command allowed to read it, storage lifetime, and revocation owner. |
| `network` | `must-ask` | Calls outside localhost/workspace: private registries, remote APIs, scraping, package downloads not already part of setup, telemetry, uploads. | Use committed fixtures, dry-runs, cached docs, or local mocks. | Destination, purpose, data sent, allowed methods, retry/rate limits, expected cost/quota, and stop condition. |
| `destructive-git` | `must-ask` | `reset --hard`, `clean -fd`, force-push, branch deletion, history rewrite, dropping stashes, checking out over user changes. | Use `git status`, `diff`, `log`, new commits on a feature branch, or a written recovery plan. | Exact command/ref, affected branches/files, backup/recovery plan, and confirmation that data loss risk is accepted. |
| `overwrite` | `must-ask` | Replacing existing user files, install overwrite, generated artifact overwrite, support bundle overwrite, config overwrite. | Refuse overwrite, write to a new path, produce a diff, or keep the current file. | Exact paths, diff or install plan reviewed, backup behavior, and whether overwrite is one-time or reusable. |
| `uninstall` | `must-ask` | Removing installed harness files, rollback that deletes files, cleanup scripts, dependency uninstall. | Inspect manifest and report what would be removed without removing anything. | Target workspace, manifest entries, changed-file handling, backup plan, and command to run. |
| `external-APIs` | `must-ask` | LLM provider calls, SaaS API calls, paid endpoints, authenticated data fetches, rate-limited integrations. | Use local ranking, mock responses, no-AI mode, or fixture responses. | Provider, endpoint scope, credential, request payload boundary, cost/rate limit, response retention, and fallback behavior. |
| `multi-agent-spawning` | `must-ask` | Starting child agents, parallel Devin/Codex/Claude sessions, autonomous reviewer/executor swarms. | Export a static role plan only; no agents are spawned. | Agent count, roles, task split, branch/worktree plan, merge owner, budget/stop condition, and reporting cadence. |

## How to proceed after approval

1. Record the approval in the task report or ledger with category, approver, timestamp, exact scope, and any limits.
2. Record approval with `task.mjs approve <id> --by "<approver>" --scope "<approved scope>"` only after the approval covers the pending action. If scope is partial, keep the unapproved portion blocked.
3. Run only the approved command or workflow. Do not generalize one approval to a different provider, path, branch, credential, or child-agent count.
4. Capture evidence: command, exit status, affected files/refs, and any rollback or cleanup notes.
5. Return to the safe default when the approved action finishes, the stop condition is reached, or the user revokes approval.

## Read-only inspection remains allowed

Read-only commands such as `task.mjs status`, `task.mjs list`, `task.mjs show`, `task.mjs doctor`, `git status`, `git diff`, and manifest inspection do not require approval by themselves. If inspection discovers a must-ask action is needed, the agent should block that action while continuing harmless analysis and documentation.
