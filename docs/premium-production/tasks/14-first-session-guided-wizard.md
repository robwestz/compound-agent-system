# 14 — First-session guided wizard

## Metadata

- Status: NOT_STARTED
- Placement: core plugin
- Suggested skill: compound-agent-system
- Dependencies: 13-error-message-ux-pass
- Parallel wave: 3
- Risk: medium; wizard must not hide protocol rules.

## Objective

Provide a concise guided first-run experience after bootstrap that leads users through mode, agent sign-in, idea intake, import, and readiness.

## DoD

- [ ] First-run output gives one primary next action at a time.
- [ ] Wizard can be skipped and all underlying CLI commands still work.
- [ ] Tests assert no duplicated role lines, unexplained jargon, or missing next action.
- [ ] Docs include the exact transcript for a successful first run.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Do not add an interactive dependency.
- Keep output concise for automation logs.

## Quality bar

Premium: a new user can reach a valid first plan without coaching.

## Evaluation prompt

Start from an empty target repo and follow only wizard output.
