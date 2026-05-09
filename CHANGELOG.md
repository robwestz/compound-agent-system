# Changelog

## Unreleased

### Added

- Premium-production performance and scale limits.
- Marketplace release-readiness checklist.
- Backward-compatibility contract for installed harness upgrades.
- Commercial acceptance metatest and final readiness report.

### Breaking changes

- None in this release candidate.

### Migration steps

- Legacy ledgers without a `version` field should run `node .agents/task.mjs migrate --apply`.
- Existing installations should run `node .agents/task.mjs doctor` after upgrade.

### Verification

- `node plugins/compound-agent-system/scripts/validate-package.mjs`
- `node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs`
