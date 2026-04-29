<!-- [FIXED] Use this template before creating a handoff checkpoint. -->
# Handoff Request

Task: `[VARIABLE: task-id]`
From: `[VARIABLE: agent-id]`
To: `[VARIABLE: claude|codex]`
Trigger: `[VARIABLE: manual|token|stop-mid-task]`

## Summary

[VARIABLE: concise current-state summary]

## Completed

- [VARIABLE: completed item]

## Pending

- [VARIABLE: next action]

## Verification

- [VARIABLE: commands run and results]

## Command

```bash
node handoff-bridge.mjs checkpoint \
  --from "[VARIABLE: agent-id]" \
  --to "[VARIABLE: claude|codex]" \
  --task "[VARIABLE: task-id]" \
  --trigger "[VARIABLE: trigger]" \
  --summary "[VARIABLE: summary]"
```

<!-- [FIXED] Run verify before sharing the generated handoff JSON. -->

