---
compound: active
phases:
  - id: phase-1-foundation
    goal: "Establish project foundation"
    dod:
      - check: artifact
        path: "README.md"
    skills:
      - "planner"
  - id: phase-2-verification
    goal: "Verify generated implementation path"
    dod:
      - check: manual
        description: "Verifier confirms generated plan is actionable"
    skills:
      - "verifier"
---

# Phase Plan

[COMPOUND-PHASE id=phase-1-foundation goal="Establish project foundation" dod="artifact:README.md" skills="planner"]
[COMPOUND-PHASE id=phase-2-verification goal="Verify generated implementation path" dod="manual:Verifier confirms generated plan is actionable" skills="verifier"]

## Closing

This fixture is intentionally generic.
