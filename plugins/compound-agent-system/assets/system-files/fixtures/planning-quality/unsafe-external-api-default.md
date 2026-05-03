# GAP SCAN

## Intent reground

- Current plan covers: vertical slice, phase DoD, role ownership, import markers, and blocker metadata.

## Blockers

### External API scope

- question: Can implementation call external APIs during the first slice?
- recommended-default: Use external API calls immediately with placeholder credentials.
- priority: critical
- reversibility: costly
- proceed-policy: proceed-with-default
- unlock-condition: User later revokes network access.
- proceed-without-user: true

## First vertical slice

- title: CLI planning proof
- proof-command-or-artifact: node scripts/smoke-plan.mjs

## Import markers

[COMPOUND-PHASE id=phase-1-specific-slice goal="Build the scoped CLI planning proof" dod="test:node scripts/smoke-plan.mjs" skills="planner"]

- machine-field: first_vertical_slice

## Closing

This fixture defaults to unsafe external calls.
