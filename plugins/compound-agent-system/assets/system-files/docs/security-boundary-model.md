# Security Boundary Model

The Compound Agent System harness is default-deny: it only reads and writes local workspace files that are part of the installed harness, generated planning artifacts, or explicit operator-provided paths. Network-capable and credential-capable behavior is opt-in only.

## Trust boundaries

| Boundary | Trusted inputs | Default behavior | Explicit opt-in |
|---|---|---|---|
| Workspace files | Files under the target repo root | Read and write only harness-owned files or operator-named artifacts | `--overwrite`, `--rollback`, and explicit artifact paths |
| Installer and rollback | Bundled `assets/system-files/` plus install manifest | Refuse rollback/uninstall paths that escape the target root | Manual review of refused manifest entries |
| Hooks | `.claude/settings.json` and shared `.agents/task.mjs` commands | Merge Compound-owned hooks idempotently; preserve unrelated user hooks | Operator edits hook settings directly |
| Ledger | `.agents/TASKS.json` | Validate schema, duplicate IDs, DoD, and migration state before claims of readiness | `task.mjs migrate --apply` after grounding |
| Generated artifacts | `phase-0/`, handoff files, support docs | Deterministic local rendering and quality checks | User-approved import or handoff workflows |
| Fixtures and tests | Committed fixtures under `fixtures/` | Synthetic examples only; no real credentials | Replace with placeholders and document the source |
| Optional external AI | `assemble.mjs --ai` | Disabled; deterministic local ranking is always available | `--ai` plus `GROQ_API_KEY` or `OPENROUTER_API_KEY` |

## Default-deny rules

- The core harness must not discover, scrape, or search for credentials.
- The core harness must not call network services unless a command documents an explicit opt-in flag and the operator provides the provider key for that command.
- Tests must not require live provider access or private registries.
- Install, rollback, and uninstall paths must stay inside the target repo boundary.
- JSON outputs remain machine-readable; human-facing errors add recovery guidance without changing structured fields.

## Enforcement points

- `install-compound-system.mjs` refuses unsafe rollback/uninstall manifest paths outside the target root.
- `task.mjs doctor` reports security boundary health, docs presence, and fixture secret scan results.
- `assemble.mjs --ai` keeps deterministic local ranking when no provider key is present and states that no provider call was made.
- Package validation keeps required payload files present and rejects forbidden bundled artifacts.

## Fixture secret assertions

Fixtures are allowed to contain placeholders such as `<key>` or `example-token`, but not real-looking provider tokens, private keys, or API-key assignments. The doctor scan checks committed fixtures for common token shapes before enterprise use.

## Closing

Use this model during review: if a behavior reads secrets, reaches outside the workspace, calls a network provider, mutates hooks, or changes generated artifacts, it needs an explicit operator action and a deterministic non-network fallback.
