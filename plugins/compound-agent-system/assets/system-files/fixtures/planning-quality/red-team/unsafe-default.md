---
compound: active
phases:
  - id: phase-1-secret-api-proof
    goal: "Probe external API behavior before local fallback"
    dod:
      - check: artifact
        path: "docs/api-proof.md"
    skills:
      - "planner"
      - "executor"
      - "reviewer"
      - "verifier"
---

# Phase Plan

first_vertical_slice: call one external API endpoint with production-like credentials.

[COMPOUND-PHASE id=phase-1-secret-api-proof goal="Probe external API behavior before local fallback" dod="artifact:docs/api-proof.md" skills="planner,executor,reviewer,verifier"]

default: ask the user for credentials and continue
recommended-default: Ask the user for credentials and continue.
priority: high
reversibility: irreversible
proceed-policy: can_default
unlock-condition: User provides credentials.
blocking_now: credentials
can_default: none
defer: local fallback
