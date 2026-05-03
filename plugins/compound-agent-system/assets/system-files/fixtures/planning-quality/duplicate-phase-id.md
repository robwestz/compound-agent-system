---
compound: active
phases:
  - id: phase-1-specific-slice
    goal: "Build the scoped CLI planning proof"
    dod:
      - check: test
        command: "node scripts/smoke-plan.mjs"
    skills:
      - "planner"
---

# Phase Plan

## Slice definition

- title: CLI planning proof
- proof-command-or-artifact: node scripts/smoke-plan.mjs

## Import markers

[COMPOUND-PHASE id=phase-1-specific-slice goal="Build the scoped CLI planning proof" dod="test:node scripts/smoke-plan.mjs" skills="planner"]
[COMPOUND-PHASE id=phase-1-specific-slice goal="Verify the scoped CLI planning proof" dod="test:node --test tests/planning.test.mjs" skills="verifier"]

- machine-field: first_vertical_slice

## Closing

This fixture repeats a phase id.
