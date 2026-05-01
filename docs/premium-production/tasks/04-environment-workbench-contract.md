# 04 — Environment workbench contract

## Metadata

- Status: NOT_STARTED
- Placement: external workbench/docs
- Suggested skill: skill-development if no existing workbench skill fits
- Dependencies: none
- Parallel wave: 1
- Risk: high; environment automation crosses repo boundaries.

## Objective

Define the contract between `compound-agent-system` and `robwestz/devin_workbench` for generating and applying environment files.

## DoD

- [ ] Contract specifies inputs, outputs, ownership, and failure modes for environment files.
- [ ] It states which repo owns generation logic and which repo consumes output.
- [ ] It includes a minimal example environment file for this harness.
- [ ] It defines what must remain out of the plugin core.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Do not vendor the workbench into the plugin.
- No secrets in docs; use placeholders and secret-manager references.

## Quality bar

Premium: environment setup is reproducible without bloating the plugin.

## Evaluation prompt

Check whether a new Devin session can infer setup from the contract alone.
