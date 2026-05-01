# File Manifest

> **When to read this:** Read when auditing what was copied into the package or deciding what to install into a target repository.

## Included Groups

| Group | Included | Excluded |
|---|---|---|
| `.agents` | Protocol, DoD, task CLI, runtime resolver, SkiLLBuilDr skill, ledger snapshot | Nothing from this group |
| `.claude` | Commands, skills, hooks settings, identity, ECC tools, homunculus instincts | `settings.local.json`, `worktrees/` |
| `.codex` | Agent profiles, AGENTS.md, config.toml | None |
| `.github` | Workflows, CODEOWNERS, PR template | None |
| `.omc` | Project memory, sessions, state JSON/JSONL, top-level handoff/resume checkpoints | ZIP test artifacts and checkpoint subdirectories |
| Root runtime | `handoff-bridge.mjs`, `assemble.mjs`, `lib/token-budget.mjs`, v1/v2 handoff schemas, focused tests, package files | Browser UI data/build artifacts |

## Why Some Files Are Excluded

| Exclusion | Reason |
|---|---|
| `.claude/worktrees/` | Duplicated prototype worktrees, not activation material |
| `.claude/settings.local.json` | Local permissions and machine-specific commands |
| `.omc/**/*.zip` | Generated verification artifacts, reproducible and not required |
| `node_modules/` | Install dependency tree, not source package material |

## Verification

Run:

```powershell
node plugins/compound-agent-system/scripts/validate-package.mjs
```
