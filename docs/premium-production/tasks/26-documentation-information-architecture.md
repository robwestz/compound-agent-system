# 26 — Documentation information architecture

## Metadata

- Status: DONE
- Placement: docs
- Suggested skill: compound-agent-system
- Dependencies: 13-error-message-ux-pass
- Parallel wave: 5
- Risk: low; docs can sprawl.

## Objective

Organize docs into install, first run, concepts, operations, troubleshooting, development, and release sections.

## DoD

- [x] README points to the right doc for each user intent.
- [x] Redundant or stale docs are merged or marked legacy.
- [x] Troubleshooting docs map errors to doctor/readiness/support-bundle commands.
- [x] Docs preserve API Alchemy fixture-only warning.
- [x] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Do not rewrite docs into marketing copy at the expense of operational clarity.
- Keep links relative and valid.

## Quality bar

Premium: docs reduce support load.

## Evaluation prompt

Ask where to start for install, debugging, contributing, and release; docs should answer directly.

## Evidence

### Deliverables

| Artifact | Path | Placement |
|---|---|---|
| User-intent routing table | `README.md` and bundled `README.md` | docs |
| Install guide | `docs/install.md` and bundled mirror | docs |
| First-run guide | `docs/first-run.md` and bundled mirror | docs |
| Concepts guide | `docs/concepts.md` and bundled mirror | docs |
| Operations guide | `docs/operations.md` and bundled mirror | docs |
| Development guide | `docs/development.md` and bundled mirror | docs |
| Release guide | `docs/release.md` and bundled mirror | docs |
| Troubleshooting recovery table | `docs/troubleshooting.md` and bundled mirror | docs |
| Docs IA tests | `plugins/compound-agent-system/assets/system-files/tests/docs-ia.test.mjs` | test-only |

### Legacy / stale handling

- `SESSION.md` is marked in `README.md` as a historical packaging-session handoff; current install, first-run, and operations guidance now lives in docs.
- `upgrade_package_2.md` is marked in `README.md` as a historical upgrade prompt; current status remains in `UPGRADE_TRACKER.md` and premium task files.
- Troubleshooting content was merged into a command-oriented recovery table instead of leaving a thin generic table.

### Test coverage

- `docs-ia.test.mjs` asserts README routes install, first run, concepts, operations, troubleshooting, development, and release intents.
- `docs-ia.test.mjs` asserts root and bundled IA docs remain mirrored.
- `docs-ia.test.mjs` asserts troubleshooting maps failures to `doctor`, `session-readiness`, and `support-bundle`.
- `docs-ia.test.mjs` asserts API Alchemy remains documented as fixture-only.
- `docs-ia.test.mjs` asserts relative Markdown links in IA entrypoints resolve.

## Task report

Implementer: devin
Evaluator: devin
Independence disclosed: same agent/session, not independent.

### First completion

The first complete implementation added README user-intent routing, six new IA section docs, expanded troubleshooting, bundled mirrors, package-validator coverage, and docs IA tests.

### Self-review

The implementer checked the task constraints: operational clarity over marketing copy, relative links, preserved API Alchemy fixture-only warning, and no runtime dependencies.

### Evaluator feedback round 1

- Finding: README routing should answer the evaluation prompt directly for install, debugging, contributing, and release without requiring users to scan the whole README.
- Finding: Stale docs should not be deleted when they still contain useful historical context.

### Improvement 1

- Added the `Start here by intent` and `Documentation map` tables to root and bundled README.
- Marked `SESSION.md` and `upgrade_package_2.md` as historical/legacy entrypoints instead of deleting them.

### Evaluator feedback round 2

- Finding: Troubleshooting must explicitly route failures to `doctor`, `session-readiness`, and `support-bundle`, not only mention them in closing prose.
- Finding: Relative links need automated coverage because the new IA adds multiple entrypoints and bundled mirrors.

### Improvement 2

- Reworked troubleshooting into an error-to-command recovery table that starts with `node .agents/task.mjs doctor`, `node .agents/session-readiness.mjs`, and `node .agents/support-bundle.mjs`.
- Added `docs-ia.test.mjs` coverage for user-intent routing, mirrored docs, command mapping, API Alchemy fixture-only warning, and relative link resolution.

### Final signoff

Evaluator signoff: task 26 DoD is satisfied once package validation and the full system-file suite pass.
