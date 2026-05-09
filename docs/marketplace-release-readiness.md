# Marketplace Release Readiness

This checklist is a dry-run release gate for Claude/Codex package handoff. It does not publish anything.

## Versioning and changelog

- Confirm `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` use the same plugin `name` and `version`.
- Update `CHANGELOG.md` with release date, breaking changes, migration steps, security notes, and verification commands.
- If a public surface is removed or renamed, update the backward-compatibility contract first.

## Metadata review

- Claude metadata must describe the Claude package surface only.
- Codex metadata must describe the Codex package surface only.
- Do not claim support beyond the compatibility matrix.
- Confirm author, homepage, repository, license, category, and keywords are accurate.

## Validation and tests

Run from the repository root:

```bash
node plugins/compound-agent-system/scripts/validate-package.mjs
node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs
```

Both commands must pass before release. Package integrity failures are release blockers.

## Dry-run package process

1. Review `manifest.json` for expected bundled file drift.
2. Run the validator and full system-file suite.
3. Review `docs/compatibility-matrix.md`.
4. Review `docs/backward-compatibility-contract.md`.
5. Install into a clean temporary repository with `node bootstrap.mjs --target <repo> --dry-run`.
6. Install into a clean temporary repository without `--dry-run`.
7. Run `node .agents/task.mjs doctor`, `node .agents/session-readiness.mjs`, and `node .agents/support-bundle.mjs` in the target repository.
8. Save command output in the release record.

## Rollback and support notes

- Confirm rollback and uninstall commands in `docs/install.md` still match the installer.
- Confirm troubleshooting maps failures to doctor, readiness, and support-bundle output.
- Create a local support bundle for failed release candidates; review before sharing.

## Release decision

Release only when validation, tests, compatibility review, rollback review, and supportability review are all complete. If any check is partial, classify the release as no-release.
