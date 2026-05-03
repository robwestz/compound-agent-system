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

## Phase details

### CLI planning proof

- phase_id: phase-1-specific-slice
- role_owner_planner: test executor
- role_owner_executor: planning executor
- role_owner_reviewer: quality reviewer
- role_owner_verifier: smoke verifier

- machine-field: first_vertical_slice

## Closing

This fixture assigns a planner field to an executor.
