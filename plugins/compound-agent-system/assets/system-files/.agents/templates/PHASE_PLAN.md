---
compound: active
phases:
  - id: phase-1-foundation
    goal: "Establish project foundation from accepted Phase 0 plan"
    dod:
      - check: artifact
        path: "README.md"
      - check: test
        command: "node --test tests/*.test.mjs"
    skills:
      - "planner"
      - "executor"
  - id: phase-2-verification
    goal: "Verify generated implementation path against DoD"
    dod:
      - check: manual
        description: "Verifier confirms generated plan is actionable"
    skills:
      - "reviewer"
      - "verifier"
---

# Phase Plan

[COMPOUND-PHASE id=phase-1-foundation goal="Establish project foundation from accepted Phase 0 plan" dod="artifact:README.md;test:node --test tests/*.test.mjs" skills="planner;executor"]
[COMPOUND-PHASE id=phase-2-verification goal="Verify generated implementation path against DoD" dod="manual:Verifier confirms generated plan is actionable" skills="reviewer;verifier"]

## Role assignments

{{ROLES}}

## Closing

Import this file with `node .agents/task.mjs import phase-0/PHASE_PLAN.md --apply` after Phase 0 is accepted.
