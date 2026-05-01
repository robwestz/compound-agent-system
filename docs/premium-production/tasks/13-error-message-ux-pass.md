# 13 — Error-message UX pass

## Metadata

- Status: NOT_STARTED
- Placement: core plugin/docs
- Suggested skill: compound-agent-system
- Dependencies: 03-diagnostics-doctor-cli
- Parallel wave: 2
- Risk: medium; internal jargon reduces trust.

## Objective

Rewrite high-frequency CLI errors and warnings so each includes what happened, why it matters, and the exact next action.

## DoD

- [ ] Inventory covers installer, activation, task CLI, idea intake, quality gates, and readiness.
- [ ] Tests assert representative messages include unlock paths.
- [ ] Internal jargon is either removed or defined inline.
- [ ] Docs include a troubleshooting table.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Do not weaken safety warnings.
- Keep structured JSON outputs machine-readable.

## Quality bar

Premium: users trust the tool when something fails.

## Evaluation prompt

Trigger each known failure and judge whether a new user can recover without source inspection.
