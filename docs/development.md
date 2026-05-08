# Development

Use this when contributing to the package or bundled system files.

## Required context

Read:

- [`CLAUDE.md`](../CLAUDE.md)
- The relevant task file under `docs/premium-production/tasks/`
- [`docs/plugin-size-budget.md`](plugin-size-budget.md)

Do not build the API Alchemy Engine. It is fixture-only.

## Required verification

From the repository root:

```bash
node plugins/compound-agent-system/scripts/validate-package.mjs
node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs
```

The system-file suite is the full local test suite for the bundled harness. The validator must pass before release or PR handoff.

## Docs mirroring rule

Some docs exist at the repository root and inside `plugins/compound-agent-system/assets/system-files/docs/` so installed target repos receive the same guidance. When editing mirrored docs, keep root and bundled copies byte-identical unless a test or task explicitly documents why they differ.

Currently mirrored:

- `docs/compatibility-matrix.md`
- `docs/plugin-size-budget.md`
- `docs/secrets-and-ai-policy.md`
- `docs/security-boundary-model.md`
- `docs/troubleshooting.md`

## Manifest maintenance

When bundled system files change, update `manifest.json` byte counts for files under `plugins/compound-agent-system/assets/system-files/`, then run the package validator.

## Dependency rule

Runtime code must remain zero-dependency Node.js 18+ using built-in modules unless the operator explicitly approves otherwise. Dev dependencies are acceptable only for existing test tooling.

## Placement rule

Before adding files, classify them as:

- core plugin
- optional skill
- docs/playbook
- external workbench
- test-only

Large, provider-specific, or workflow-specific additions default out of core.
