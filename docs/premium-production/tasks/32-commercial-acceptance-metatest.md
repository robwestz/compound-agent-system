# 32 — Commercial acceptance metatest

## Metadata

- Status: NOT_STARTED
- Placement: test-only/docs
- Suggested skill: compound-agent-system
- Dependencies: 01-31
- Parallel wave: 6
- Risk: high; this is the final release gate.

## Objective

Create the final acceptance process that proves all premium-production tasks compose into one commercial-grade harness.

## DoD

- [ ] Metatest runs golden path, failure recovery, doctor, readiness, support bundle, compatibility, and release checklist checks.
- [ ] It fails if any prior premium task lacks evidence.
- [ ] It includes a manual commercial-readiness review using the scorecard.
- [ ] Final report classifies residual risks and release/no-release decision.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- No false green: missing evidence is a failure.
- Manual review cannot replace machine checks where machine checks exist.

## Quality bar

Premium: this is the bar we would require from an external commercial vendor.

## Evaluation prompt

Assume the vendor wants to ship now; find any reason the harness should not be sold or relied on.
