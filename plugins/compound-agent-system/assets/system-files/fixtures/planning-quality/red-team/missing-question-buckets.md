---
compound: active
phases:
  - id: phase-1-question-proof
    goal: "Resolve source questions before local proof"
    dod:
      - check: artifact
        path: "docs/question-proof.md"
    skills:
      - "planner"
      - "executor"
      - "reviewer"
      - "verifier"
---

# Phase Plan

first_vertical_slice: resolve one source question and produce a local proof.

[COMPOUND-PHASE id=phase-1-question-proof goal="Resolve source questions before local proof" dod="artifact:docs/question-proof.md" skills="planner,executor,reviewer,verifier"]

recommended-default: Use the safest local fixture.
priority: high
reversibility: reversible
proceed-policy: can_default
unlock-condition: Question owner accepts default.
