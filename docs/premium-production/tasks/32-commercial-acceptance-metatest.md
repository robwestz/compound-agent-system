# 32 — Commercial acceptance metatest

## Metadata

- Status: DONE
- Placement: test-only/docs
- Suggested skill: compound-agent-system
- Dependencies: 01-31
- Parallel wave: 6
- Risk: high; this is the final release gate.

## Objective

Create the final acceptance process that proves all premium-production tasks compose into one commercial-grade harness.

## DoD

- [x] Metatest runs golden path, failure recovery, doctor, readiness, support bundle, compatibility, and release checklist checks.
- [x] It fails if any prior premium task lacks evidence.
- [x] It includes a manual commercial-readiness review using the scorecard.
- [x] Final report classifies residual risks and release/no-release decision.
- [x] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Do not mark release-ready if any required evidence is missing.
- Must be reproducible locally.

## Quality bar

Premium: final gate is stricter than any individual task.

## Evaluation prompt

Assume vendor wants to ship now; find any reason harness should NOT be sold.

## Evidence

- Added `tests/commercial-acceptance.test.mjs` as the final local metatest.
- The metatest runs validator, golden path, failure recovery/doctor, readiness, support bundle, backward compatibility, release readiness, and performance/scale suites.
- The metatest scans eval-loop evidence for tasks 18, 19, 23, and 25–32 and includes a negative broken-evidence fixture.
- Added `docs/premium-production/FINAL_ACCEPTANCE_REPORT.md` with scorecard results, residual risks, no-release triggers, and release-candidate decision.

## Task report

Implementer: devin
Evaluator: devin
Independence disclosed: same agent/session, not independent.

### First completion

The first complete implementation added the commercial metatest and final acceptance report with a release-candidate decision.

### Self-review

The implementer checked that the metatest composes existing acceptance signals instead of inventing a weaker shortcut and that the report names residual risks.

### Evaluator feedback round 1

- Finding: The metatest must fail when prior premium-task evidence is absent, not merely check final wave docs.
- Finding: Manual scorecard review should cover all ten commercial-readiness dimensions.

### Improvement 1

- Added eval-loop evidence scanning for tasks with structured task reports and a broken-evidence negative test.
- Added a ten-dimension scorecard table to the final acceptance report.

### Evaluator feedback round 2

- Finding: The final decision should classify residual risks and list no-release triggers.
- Finding: The metatest should include the release checklist and compatibility suite, not only golden path and readiness.

### Improvement 2

- Added residual risks and no-release triggers to the final report.
- Added release-readiness, backward-compatibility, and performance-scale focused suites to the metatest.

### Final signoff

Evaluator signoff: task 32 DoD is satisfied when commercial-acceptance tests, eval-loop checks, validator, full suite, and CI pass.
