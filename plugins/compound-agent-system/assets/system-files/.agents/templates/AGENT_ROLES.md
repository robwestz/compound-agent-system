# Agent Roles

## Role assignments

{{ROLES}}

## Closing

Roles are project-specific planning defaults linked to phase IDs. They may be reassigned during implementation, but handoff should preserve planner/executor/reviewer/verifier coverage.

Export a static batch assignment plan after Phase 0 is accepted:

```bash
node .agents/role-assignment-plan.mjs --input phase-0/AGENT_ROLES.md --out phase-0/BATCH_ASSIGNMENT_PLAN.json
```

The exporter only writes an auditable JSON plan. It never spawns agents; coordinators must obtain explicit human approval before multi-agent execution.
