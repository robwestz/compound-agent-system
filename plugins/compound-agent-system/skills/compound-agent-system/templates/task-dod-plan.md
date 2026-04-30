<!-- [FIXED] Use this template when opening a Compound task. -->
# [VARIABLE: Task Goal]

<!-- [VARIABLE] Replace placeholders with concrete values. -->
Task id: `[VARIABLE: t-### or auto]`
Owner: `[VARIABLE: agent-id]`
Skills: `[VARIABLE: skill list]`

## Definition of Done

| Check | Value | Why it proves done |
|---|---|---|
| test | `[VARIABLE: node --test ...]` | `[VARIABLE: behavior verified]` |
| artifact | `[VARIABLE: path]` | `[VARIABLE: required output exists]` |
| manual | `[VARIABLE: user-visible condition]` | `[VARIABLE: cannot be verified by agent alone]` |

## Open Command

```bash
node .agents/task.mjs open "[VARIABLE: goal]" \
  --skill "[VARIABLE: skill]" \
  --dod "test:[VARIABLE: command]" \
  --dod "artifact:[VARIABLE: path]"
```

<!-- [FIXED] Do not close the task until every DoD row has evidence. -->

