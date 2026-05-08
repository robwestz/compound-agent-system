---
compound: active
phases:
  - id: phase-1-placeholder-proof
    goal: "Create {{PRODUCT}} proof artifact"
    dod:
      - check: artifact
        path: "docs/proof.md"
    skills:
      - "planner"
      - "executor"
      - "reviewer"
      - "verifier"
---

# Phase Plan

first_vertical_slice: produce {{PRODUCT}} proof from one local fixture.

[COMPOUND-PHASE id=phase-1-placeholder-proof goal="Create {{PRODUCT}} proof artifact" dod="artifact:docs/proof.md" skills="planner,executor,reviewer,verifier"]

recommended-default: Use local fixtures.
priority: high
reversibility: reversible
proceed-policy: can_default
unlock-condition: Local proof exists.
blocking_now: none
can_default: local fixture
defer: production source
