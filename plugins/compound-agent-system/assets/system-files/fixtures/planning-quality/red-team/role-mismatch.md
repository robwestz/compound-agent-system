---
compound: active
phases:
  - id: phase-1-data-prototype
    goal: "Create local data prototype for reviewer handoff"
    dod:
      - check: artifact
        path: "docs/prototype.md"
    skills:
      - "executor"
      - "reviewer"
---

# Phase Plan

first_vertical_slice: transform one local source fixture into a reviewed prototype artifact.

[COMPOUND-PHASE id=phase-1-data-prototype goal="Create local data prototype for reviewer handoff" dod="artifact:docs/prototype.md" skills="executor"]

recommended-default: Use a local source fixture.
priority: high
reversibility: reversible
proceed-policy: can_default
unlock-condition: Prototype artifact exists.
blocking_now: none
can_default: local fixture
defer: production source
