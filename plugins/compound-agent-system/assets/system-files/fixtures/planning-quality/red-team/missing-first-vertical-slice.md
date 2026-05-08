---
compound: active
phases:
  - id: phase-1-local-proof
    goal: "Create deterministic local proof artifact"
    dod:
      - check: artifact
        path: "docs/local-proof.md"
    skills:
      - "planner"
      - "executor"
      - "reviewer"
      - "verifier"
---

# Phase Plan

[COMPOUND-PHASE id=phase-1-local-proof goal="Create deterministic local proof artifact" dod="artifact:docs/local-proof.md" skills="planner,executor,reviewer,verifier"]

recommended-default: Use local fixtures.
priority: high
reversibility: reversible
proceed-policy: can_default
unlock-condition: Local proof exists.
blocking_now: none
can_default: local fixture
defer: production source
