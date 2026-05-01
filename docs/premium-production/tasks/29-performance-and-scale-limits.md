# 29 — Performance and scale limits

## Metadata

- Status: NOT_STARTED
- Placement: test-only/docs
- Suggested skill: compound-agent-system
- Dependencies: 01-golden-path-e2e-suite
- Parallel wave: 6
- Risk: medium; slow tooling reduces adoption.

## Objective

Measure and document expected performance for install, validation, idea intake, import, readiness, and large ledgers.

## DoD

- [ ] Benchmarks run locally without network.
- [ ] Large-ledger fixture tests task status/import/readiness behavior.
- [ ] Docs state expected ranges and known limits.
- [ ] Performance regressions have thresholds or warnings.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Benchmarks must not be flaky in CI.
- Avoid optimizing before measuring.

## Quality bar

Premium: users know scale limits and regressions are visible.

## Evaluation prompt

Run with a 1,000-task ledger and verify status remains usable.
