# Plugin Size Budget and Modularity

Premium hardening must not turn the core plugin into a massive, unfocused bundle. New work must declare where it belongs before it is merged.

## Placement classes

| Class | Belongs in core plugin? | Examples |
|---|---:|---|
| Core plugin | Yes | installer, bootstrap, task ledger, hooks, doctor, deterministic validators |
| Optional skill | Only as a skill payload | specialized workflows, agent playbooks, evaluator prompts |
| Docs/playbook | No runtime code | operating model, troubleshooting, environment contracts |
| External workbench | No | generated environment files and cross-repo orchestration |
| Test-only | No runtime path | fixtures, red-team corpora, benchmark suites |

## Current budget

| Metric | Warning threshold | Blocking threshold |
|---|---:|---:|
| `assets/system-files` total bytes | 750 KB | Not enforced yet |
| `assets/system-files` file count | 175 files | Not enforced yet |
| Single core runtime file | 80 KB | Not enforced yet |

Warnings are advisory until thresholds are approved. They should prompt a placement review, not deletion of required runtime files.

## PR placement checklist

Every PR should state:

- Core plugin changes:
- Optional skill changes:
- Docs/playbook changes:
- External workbench changes:
- Test-only changes:
- Payload size impact and whether any warning threshold changed:

## Validator behavior

`validate-package.mjs` reports payload size and file count. It warns when advisory thresholds are exceeded, while still passing until the project approves blocking limits.

## Existing file classification

- Core plugin: `scripts/*.mjs`, `.agents/*.mjs`, `bootstrap.mjs`, plugin manifests, system hook/config files.
- Docs/playbook: `README.md`, `docs/**`, `AGENT_ONBOARDING.md`, `HANDOFF.md`, `FUTURE_WORK.md`, framework markdown.
- Test-only: `tests/**`, `fixtures/**`.
- Optional skill: `.agents/skills/**`, `.claude/skills/**`, `skills/**`.
- External workbench: documented contracts only; implementation belongs outside this plugin unless explicitly approved.

## Archive and root hygiene

Keep the repository root limited to package entrypoints and marketplace metadata. Move historical prompts, superseded handoffs, and one-off operator notes into `docs/archive/` when they are still useful; delete scratch files that have no product or evidence value. Never bundle generated runtime logs such as `.agents/events.jsonl`.

## Closing

If a proposed addition is large, provider-specific, or only useful for one workflow, default it out of core and into an optional skill, docs/playbook, external workbench, or test-only fixture.
