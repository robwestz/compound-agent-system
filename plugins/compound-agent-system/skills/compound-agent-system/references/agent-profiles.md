# Agent Profiles

> **When to read this:** Read when assigning work to Codex sub-agents or translating the bundle into a multi-agent setup.

## Bundled Profiles

| Profile | File | Use |
|---|---|---|
| Explorer | `.codex/agents/explorer.toml` | Read-only evidence gathering |
| Reviewer | `.codex/agents/reviewer.toml` | Correctness, security, regression review |
| Docs Researcher | `.codex/agents/docs-researcher.toml` | API and release-note verification |

## Assignment Rules

| Work type | Assign to | Constraints |
|---|---|---|
| Understand code paths | Explorer | Read-only, cite files and symbols |
| Review changes | Reviewer | Findings first, severity ordered |
| Verify docs/API behavior | Docs Researcher | Use primary sources |
| Implement changes | Main or worker agent | Open/continue a task with DoD |

## Anti-Patterns

| Do NOT | Instead |
|---|---|
| Give write tasks to read-only profiles | Use worker/main agent |
| Spawn agents before opening or parking tasks | Keep ledger current first |
| Duplicate the same investigation across profiles | Split ownership by question |

