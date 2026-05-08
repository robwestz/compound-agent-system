# 27 — Examples and fixture curation

## Metadata

- Status: DONE
- Placement: docs/test-only
- Suggested skill: compound-agent-system
- Dependencies: 15-idea-intake-realworld-benchmarks
- Parallel wave: 5
- Risk: low; examples can become stale.

## Objective

Curate examples and fixtures so they are realistic, non-sensitive, and tied to tests.

## DoD

- [x] Every fixture has a short purpose note.
- [x] Example commands are run by tests or release checklist.
- [x] Fixture-only product ideas are clearly marked as not-to-build.
- [x] Stale examples are removed or updated.
- [x] Two evaluator feedback rounds are completed and addressed.

## Constraints

- No proprietary data.
- No secrets or credentials.

## Quality bar

Premium: examples teach real usage and prevent regressions.

## Evaluation prompt

Pick a fixture at random and verify why it exists and what test covers it.

## Evidence

- Added short `Fixture purpose:` notes to every Markdown fixture under bundled `fixtures/`.
- Added a corpus-level purpose note to `fixtures/ideas/realworld-benchmarks.json`; each benchmark already keeps a per-case `why` field and expected planning traits.
- Marked all idea fixtures and the benchmark corpus as fixture-only/not-to-build product ideas.
- Updated `plugins/compound-agent-system/examples/activate-existing-repo/README.md` with a purpose note.
- Added the activate-existing-repo example command set to the release checklist in both compatibility matrix docs.
- Added regression coverage:
  - `package-integrity.test.mjs` verifies fixture purpose notes and fixture-only markings.
  - `idea-intake.test.mjs` verifies the benchmark corpus note while continuing to run all benchmark cases.
  - `compatibility-matrix.test.mjs` verifies the release checklist points at the example.
- Regenerated `manifest.json` byte metadata after bundled system-file changes.

## Task report

Implementer: devin
Evaluator: devin
Independence disclosed: same agent/session, not independent.

### First completion

The first complete implementation added purpose notes to fixtures, marked idea/product fixture material as not-to-build, linked the activate-existing-repo example into the release checklist, and added focused tests for those curation rules.

### Self-review

The implementer checked the task constraints: no proprietary data, no real credentials, no runtime dependencies, and no implementation of fixture-only products.

### Evaluator feedback round 1

- Finding: Updating fixture contents made `manifest.json` byte metadata stale, which would fail package validation.
- Finding: The JSON benchmark corpus needed an explicit corpus-level purpose/not-to-build note without changing the 12 benchmark cases counted by tests.

### Improvement 1

- Regenerated `manifest.json` byte counts from the current bundled system-files payload.
- Updated benchmark tests to ignore the `__corpus_note` metadata entry while still asserting exactly 12 executable benchmark cases.

### Evaluator feedback round 2

- Finding: The example command set must be connected to a release checklist, not just documented in the example README.
- Finding: Curation needs durable regression coverage so future fixtures cannot silently lose purpose notes or fixture-only markings.

### Improvement 2

- Added the activate-existing-repo smoke commands to the compatibility release checklist and asserted that checklist entry in tests.
- Added package-integrity coverage that scans all committed fixtures for purpose notes and idea fixtures for not-to-build markings.

### Final signoff

Evaluator signoff: task 27 DoD is satisfied once the eval-loop check, package validator, and full system-file suite all pass.
