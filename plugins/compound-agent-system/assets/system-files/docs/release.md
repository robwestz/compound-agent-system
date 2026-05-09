# Release

Use this before publishing or handing the plugin package to another operator.

## Release gates

Run from the repository root:

```bash
node plugins/compound-agent-system/scripts/validate-package.mjs
node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs
```

Both must pass. The validator rejects missing required files, forbidden bundled artifacts, and stale `manifest.json` byte metadata.

## Marketplace release readiness

Before packaging for Claude/Codex handoff, run the dry-run checklist in [Marketplace Release Readiness](marketplace-release-readiness.md). It covers versioning, changelog, metadata scope, validation, package integrity, rollback, and support notes. This repository does not publish automatically.

## Compatibility gate

Review [Compatibility Matrix](compatibility-matrix.md) before release. Do not claim support beyond tested environments.
Review [Backward Compatibility Contract](backward-compatibility-contract.md) before release. Public command, ledger, generated-artifact, or schema changes require migration notes and deprecation messaging.

Minimum release checklist:

- CI passes on Node 18, 20, and 22.
- `node .agents/task.mjs doctor` reports PASS on a clean install.
- The compatibility matrix matches the package repository CI matrix and documented supported Node versions.
- README and docs do not claim broader support than the matrix.
- Legacy ledger migration still preserves user task state.
- Deprecation messages include migration path and timeline.

## Package contents

The package must include the Claude/Codex plugin manifests, scripts, skills, and curated `assets/system-files/` payload. It must exclude local worktrees, local settings, generated ZIPs, `node_modules`, browser build data files, and real credentials.

## Marketplace / client handoff

External Claude/Codex marketplace behavior is manual release-check scope. This repository validates the package surface, manifests, hooks, and shared CLI files.

## Final supportability check

In a clean target repo, install the harness, then run:

```bash
node .agents/task.mjs doctor
node .agents/session-readiness.mjs
node .agents/support-bundle.mjs
```

The troubleshooting doc must explain how to recover from any failure those commands report.
