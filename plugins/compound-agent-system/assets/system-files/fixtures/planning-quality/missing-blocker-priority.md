# GAP SCAN

## Intent reground

- Current plan covers: vertical slice, phase DoD, role ownership, import markers, and blocker metadata.

## Blockers

### Surface decision

- question: Which interface should ship first?
- recommended-default: CLI-only proof before browser UI.
- reversibility: reversible
- proceed-policy: proceed-with-default
- unlock-condition: User accepts the CLI-first slice.

## First vertical slice

- title: CLI planning proof
- proof-command-or-artifact: node scripts/smoke-plan.mjs

## Import markers

[COMPOUND-PHASE id=phase-1-specific-slice goal="Build the scoped CLI planning proof" dod="test:node scripts/smoke-plan.mjs" skills="planner"]

- machine-field: first_vertical_slice

## Closing

This fixture excludes one required blocker metadata field.
