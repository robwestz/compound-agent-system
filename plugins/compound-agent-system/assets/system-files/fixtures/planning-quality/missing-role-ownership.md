---
compound: active
phases:
  - id: phase-1-specific-slice
    goal: "Build the scoped CLI planning proof"
    dod:
      - check: test
        command: "node scripts/smoke-plan.mjs"
    skills:
      - "documentation"
---

# Phase Plan

## Slice definition

- title: CLI planning proof
- proof-command-or-artifact: node scripts/smoke-plan.mjs

## Import markers

[COMPOUND-PHASE id=phase-1-specific-slice goal="Build the scoped CLI planning proof" dod="test:node scripts/smoke-plan.mjs" skills="documentation"]

- machine-field: first_vertical_slice

## Closing

This fixture omits planner/executor/reviewer/verifier ownership.
