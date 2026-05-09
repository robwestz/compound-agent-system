# 30 — Marketplace release readiness

## Metadata

- Status: DONE
- Placement: docs/packaging
- Suggested skill: compound-agent-system
- Dependencies: 11-supply-chain-package-integrity
- Parallel wave: 6
- Risk: medium; release metadata affects trust.

## Objective

Create a release checklist for Claude/Codex plugin packaging, marketplace metadata, changelog, validation, rollback, and support notes.

## DoD

- [x] Checklist includes versioning, changelog, validation, tests, package integrity, docs, and rollback.
- [x] Marketplace metadata is reviewed for accuracy and scope.
- [x] Release notes include breaking changes and migration steps.
- [x] Dry-run release process is documented.
- [x] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Do not publish anything.
- Do not add external release tooling unless justified.

## Quality bar

Premium: a maintainer can release or rollback with confidence.

## Evaluation prompt

Pretend releasing today; every required action should be explicit.

## Evidence

- Added `docs/marketplace-release-readiness.md` and bundled docs covering versioning, changelog, validation, tests, integrity, docs, rollback, support notes, and release decision.
- Added `CHANGELOG.md` with breaking-change, migration, and verification sections.
- Updated release docs to reference marketplace readiness and compatibility review.
- Added `tests/release-readiness.test.mjs` to verify checklist coverage and Claude/Codex metadata consistency.

## Task report

Implementer: devin
Evaluator: devin
Independence disclosed: same agent/session, not independent.

### First completion

The first complete implementation added the release checklist, changelog skeleton, release-doc links, and metadata/readiness tests.

### Self-review

The implementer checked that the process is dry-run only, includes rollback/support notes, and does not claim unsupported marketplace publication automation.

### Evaluator feedback round 1

- Finding: Release notes must explicitly include breaking changes and migration steps, even when there are no breaking changes.
- Finding: Marketplace metadata checks should prove Claude and Codex manifests stay aligned without overclaiming platform support.

### Improvement 1

- Added `CHANGELOG.md` sections for breaking changes, migration steps, and verification.
- Added metadata assertions for name/version/license consistency and scoped descriptions.

### Evaluator feedback round 2

- Finding: The dry-run process should name package integrity and rollback/support review as release blockers.
- Finding: Release docs should link this checklist so maintainers can find it before packaging.

### Improvement 2

- Added explicit package-integrity, rollback, and support-bundle review steps.
- Updated `docs/release.md` and bundled release docs with marketplace readiness and compatibility gates.

### Final signoff

Evaluator signoff: task 30 DoD is satisfied when release-readiness tests, validator, and full system-file suite pass.
