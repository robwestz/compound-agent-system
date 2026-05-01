# 01 — Golden-path E2E suite

## Metadata

- Status: NOT_STARTED
- Placement: test-only
- Suggested skill: compound-agent-system
- Dependencies: none
- Parallel wave: 1
- Risk: high; this becomes the canonical acceptance signal.

## Objective

Create one deterministic command that proves bootstrap → activation → idea intake → planning quality → phase import → readiness → handoff checkpoint in a fresh temp repo.

## DoD

- [ ] A single test command runs the full golden path without network or secrets.
- [ ] The command fails if any required artifact, ledger task, phase import, readiness state, or checkpoint is missing.
- [ ] The test asserts exact task counts and representative task IDs.
- [ ] The README or test docs explain when to run it.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- No runtime dependencies.
- Must not mutate the package repo ledger.
- Must run on Node 18+.

## Quality bar

Premium: one command a maintainer can trust before release.

## Evaluation prompt

Break it by removing one generated artifact, duplicating phase IDs, and running in a fresh workspace with no ambient state.
