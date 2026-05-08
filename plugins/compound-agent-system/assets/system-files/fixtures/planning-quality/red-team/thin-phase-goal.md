---
compound: active
phases:
  - id: phase-1-thin
    goal: "Do it"
    dod:
      - check: artifact
        path: "docs/thin.md"
    skills:
      - "planner"
      - "executor"
      - "reviewer"
      - "verifier"
---

# Phase Plan

first_vertical_slice: produce one local artifact from one fixture.

[COMPOUND-PHASE id=phase-1-thin goal="Do it" dod="artifact:docs/thin.md" skills="planner,executor,reviewer,verifier"]

recommended-default: Use local fixtures.
priority: high
reversibility: reversible
proceed-policy: can_default
unlock-condition: Local proof exists.
blocking_now: none
can_default: local fixture
defer: production source
