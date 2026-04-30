# DoD Rules

> **When to read this:** Read before opening or closing any task that must be verified.

## Check Types

| Type | Input | Pass condition |
|---|---|---|
| `test` | Command string | Command exits 0 |
| `artifact` | File or directory path | Artifact exists and optional conditions match |
| `manual` | Human-confirmed statement | User confirms the external or visual condition |

## Lifecycle

| Phase | Command | Gate |
|---|---|---|
| Open | `node .agents/task.mjs open "Goal" --dod "test:node --test tests/foo.test.mjs"` | At least one DoD check exists |
| Verify | `node .agents/task.mjs verify [task-id]` | Each check records pass/fail evidence |
| Done | `node .agents/task.mjs done [task-id]` | All checks have `passed_at` timestamps |
| Park | `node .agents/task.mjs park [task-id] "reason"` | Reason is recorded before switching work |

## Rules

| Rule | Rationale |
|---|---|
| Define DoD at task open | Prevents moving goalposts after implementation |
| Keep commands portable | Allows local runtime resolver to handle host-specific Node paths |
| Do not fake `passed_at` | `task verify` must generate evidence |
| Keep manual checks manual | The agent must not confirm user-only observations |

## Anti-Patterns

| Do NOT | Instead |
|---|---|
| Use `test:echo ok` for real work | Use a command that exercises the changed behavior |
| Remove failing DoD silently | Use update/remove with a logged reason |
| Mark a task done after reading files only | Run `verify` and report evidence |

