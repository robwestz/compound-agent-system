# 29 — Performance and scale limits

## Metadata

- Status: DONE
- Placement: test-only/docs
- Suggested skill: compound-agent-system
- Dependencies: 01-golden-path-e2e-suite
- Parallel wave: 6
- Risk: medium; slow tooling reduces adoption.

## Objective

Measure and document expected performance for install, validation, idea intake, import, readiness, and large ledgers.

## DoD

- [x] Benchmarks run locally without network.
- [x] Large-ledger fixture tests task status/import/readiness behavior.
- [x] Docs state expected ranges and known limits.
- [x] Performance regressions have thresholds or warnings.
- [x] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Benchmarks must not be flaky in CI.
- Avoid optimizing before measuring.

## Quality bar

Premium: users know scale limits and regressions are visible.

## Evaluation prompt

Run with a 1,000-task ledger and verify status remains usable.

## Evidence

- Added `tests/performance-scale.test.mjs` with deterministic offline 1,000-task ledger coverage for `task.mjs status` and `session-readiness.mjs`.
- Added 250-phase import dry-run coverage to catch slow plan import behavior.
- Added `docs/performance-and-scale-limits.md` and bundled docs with expected ranges, known limits, and regression response steps.
- The benchmark enforces conservative 2,500 ms warning thresholds for status, readiness, import dry-run, and package validation.

## Task report

Implementer: devin
Evaluator: devin
Independence disclosed: same agent/session, not independent.

### First completion

The first complete implementation added deterministic large-ledger benchmark tests and performance-limit docs with explicit warning thresholds.

### Self-review

The implementer checked that all benchmark paths run offline, use temp workspaces, avoid package ledger mutation, and cover status/import/readiness behavior.

### Evaluator feedback round 1

- Finding: Documentation should state a concrete threshold rather than only describing expected behavior.
- Finding: Import coverage should use enough phase markers to detect algorithmic regressions without making CI flaky.

### Improvement 1

- Added the 2,500 ms threshold table to root and bundled docs.
- Added 250-marker import dry-run coverage with exact stdout and duration assertions.

### Evaluator feedback round 2

- Finding: The performance test should also include package validation because stale manifests are a common release-time regression.
- Finding: Known limits should distinguish release warnings from automatic optimization mandates.

### Improvement 2

- Added package validator timing under the same threshold.
- Added regression-response guidance that treats threshold crossings as release warnings requiring investigation.

### Final signoff

Evaluator signoff: task 29 DoD is satisfied when performance-scale tests, validator, and full system-file suite pass.
