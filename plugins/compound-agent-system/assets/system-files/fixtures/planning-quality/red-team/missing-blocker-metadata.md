---
compound: active
phases:
  - id: phase-1-local-proof
    goal: "Prove local import with fixture provenance"
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

Fixture purpose: Red-team planning fixture proving incomplete blocker metadata is rejected.

first_vertical_slice: import one fixture and record provenance locally.

[COMPOUND-PHASE id=phase-1-local-proof goal="Prove local import with fixture provenance" dod="artifact:docs/local-proof.md" skills="planner,executor,reviewer,verifier"]

## Blockers

- Which source should be imported first?
blocking_now: source selection
can_default: none
defer: production source
