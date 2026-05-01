# 12 — Plugin size budget and modularity

## Metadata

- Status: NOT_STARTED
- Placement: docs/test-only
- Suggested skill: SkiLLBuilDr
- Dependencies: 11-supply-chain-package-integrity
- Parallel wave: 2
- Risk: medium; premium hardening can make the plugin too large.

## Objective

Create explicit size and placement rules so new functionality lands in core, optional skill, docs/playbook, external workbench, or test-only intentionally.

## DoD

- [ ] Size budget and placement rules are documented.
- [ ] PR template or release checklist asks for placement classification.
- [ ] Validator or test reports payload size and warns above thresholds.
- [ ] Existing files are classified at a useful granularity.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Do not remove essential runtime files to hit size targets.
- Warnings must not block until thresholds are approved.

## Quality bar

Premium: the plugin remains focused and maintainable as capabilities grow.

## Evaluation prompt

Try adding a large optional workflow and verify the process pushes it out of core.
