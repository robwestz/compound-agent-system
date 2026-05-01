# 15 — Real-world idea benchmark corpus

## Metadata

- Status: NOT_STARTED
- Placement: test-only
- Suggested skill: compound-agent-system
- Dependencies: 01-golden-path-e2e-suite
- Parallel wave: 3
- Risk: medium; fixtures can become overfit.

## Objective

Expand idea-intake benchmarks across CLI tools, browser apps, data workflows, libraries, migrations, and ambiguous product briefs.

## DoD

- [ ] At least 12 benchmark ideas exist with expected planning traits.
- [ ] Tests compare phase counts, first slices, blockers, and role maps without brittle full-snapshot matching.
- [ ] Fixtures avoid real secrets and proprietary data.
- [ ] Benchmark docs explain why each idea exists.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Do not build products described by fixtures.
- Keep fixtures concise enough for maintainers to review.

## Quality bar

Premium: planning quality is measured against varied real use cases.

## Evaluation prompt

Add a new plausible idea and check whether expectations are clear without editing code.
