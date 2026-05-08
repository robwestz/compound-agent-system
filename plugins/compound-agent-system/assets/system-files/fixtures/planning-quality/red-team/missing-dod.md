---
compound: active
phases:
  - id: phase-1-specific-scope
    goal: "Specific scope lock for the migration pilot"
    skills:
      - "planner"
      - "executor"
      - "reviewer"
      - "verifier"
---

# Phase Plan

first_vertical_slice: migrate one representative record through a local dry-run proof.

[COMPOUND-PHASE id=phase-1-specific-scope goal="Specific scope lock for the migration pilot" skills="planner,executor,reviewer,verifier"]

recommended-default: Use local dry-run fixtures.
priority: high
reversibility: reversible
proceed-policy: can_default
unlock-condition: Fixture dry-run passes.
blocking_now: none
can_default: local fixture
defer: production data
