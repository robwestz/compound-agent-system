# 28 — Manual approval boundaries

## Metadata

- Status: NOT_STARTED
- Placement: docs/core plugin
- Suggested skill: compound-agent-system
- Dependencies: 09-security-boundary-model
- Parallel wave: 6
- Risk: high; unclear approvals cause unsafe autonomy.

## Objective

Define which actions require human approval and ensure CLI/task output preserves those boundaries.

## DoD

- [ ] Approval matrix covers secrets, network, destructive git, overwrite, uninstall, external APIs, and multi-agent spawning.
- [ ] Tasks and blockers can distinguish must-ask, defaultable, and defer.
- [ ] Tests cover at least one must-ask action staying blocked.
- [ ] Docs explain how to proceed after approval.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Do not downgrade must-ask items for convenience.
- Keep read-only inspection unblocked.

## Quality bar

Premium: autonomy is powerful but bounded.

## Evaluation prompt

Try to perform a risky action without approval and verify it is blocked or escalated.
