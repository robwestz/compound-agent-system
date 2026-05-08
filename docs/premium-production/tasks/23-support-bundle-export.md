# 23 — Support bundle export

## Metadata

- Status: DONE
- Placement: core plugin
- Suggested skill: compound-agent-system
- Dependencies: 22-observability-event-log
- Parallel wave: 5
- Risk: medium; support bundles can leak private content.

## Objective

Create a safe support bundle export that collects diagnostics, versions, config summaries, recent events, and redacted ledger state.

## DoD

- [x] Export command creates a local archive or folder with documented contents.
- [x] Redaction rules are explicit and tested.
- [x] Bundle includes doctor output and readiness state.
- [x] User gets a review-before-share warning.
- [x] Two evaluator feedback rounds are completed and addressed.

## Constraints

- No automatic upload.
- No raw secrets, tokens, or full idea text unless user opts in.

## Quality bar

Premium: support can diagnose without asking for a full repo dump.

## Evaluation prompt

Seed fake secrets and verify they are not present in the bundle.

## Evidence

- Added `.agents/support-bundle.mjs`, a zero-dependency local support bundle exporter.
- The exporter writes a local folder only; it never uploads automatically.
- Bundle contents include `manifest.json`, `README.md`, `versions.json`, `config-summary.json`, `ledger-redacted.json`, `events-recent-redacted.json`, `doctor.json`, and `readiness.json`.
- Redaction summarizes task goals/reasons/source-like fields, redacts secret-looking keys and values, and redacts user path segments via the shared event-log redaction helpers.
- Added `tests/support-bundle.test.mjs` covering documented contents, review-before-share warning, event limiting, overwrite refusal, and seeded fake secret absence.
- Updated bundled README and package validator coverage.

## Task report

Implementer: devin
Evaluator: devin
Independence disclosed: same agent/session, not independent.

### First completion

The first complete implementation added the local support bundle CLI, package validator entries, README docs, and tests.

### Self-review

The implementer checked the task constraints: no automatic upload, no new runtime dependencies, and no raw secrets or full task goal text in exported support artifacts.

### Evaluator feedback round 1

- Finding: A useful support bundle must include both doctor output and readiness state, not just copied ledger/event files.
- Finding: The support bundle must be reviewable before sharing and must refuse accidental overwrites.

### Improvement 1

- Added `doctor.json` and `readiness.json` command captures to the bundle.
- Added `README.md` and manifest warnings plus overwrite refusal.

### Evaluator feedback round 2

- Finding: Redaction must cover both secret-looking keys and secret-looking values seeded into ledgers/events.
- Finding: Long task text such as goals should be summarized, not copied verbatim.

### Improvement 2

- Added key/value redaction and goal/reason/source summarization in `support-bundle.mjs`.
- Added tests that seed fake keys, bearer tokens, password assignments, and user paths and verify they are absent from the exported files.

### Final signoff

Evaluator signoff: task 23 DoD is satisfied once support-bundle tests, validator, and the full suite pass.
