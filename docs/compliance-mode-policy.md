# Compliance Mode Policy

This table is the source of truth for state-changing Compound Agent System commands.

| Command | State-changing | Observe | Warn | Enforce | Legacy `COMPOUND_ENFORCE=1` |
|---|---:|---|---|---|---|
| `ack` | yes | Logs fact-forcing guidance, records agent | Warns, records agent | Blocks without grounding, records with grounding | Same as enforce |
| `open` | yes | Logs guidance, opens task | Warns, opens task | Blocks without grounding, opens with grounding | Same as enforce |
| `park` | yes | Logs guidance, parks task | Warns, parks task | Blocks without grounding, parks with grounding | Same as enforce |
| `resume` | yes | Logs guidance, resumes task | Warns, resumes task | Blocks without grounding, resumes with grounding | Same as enforce |
| `block` | yes | Logs guidance, blocks task | Warns, blocks task | Blocks without grounding, blocks with grounding | Same as enforce |
| `abandon` | yes | Logs guidance, abandons task | Warns, abandons task | Blocks without grounding, abandons with grounding | Same as enforce |
| `update` | yes | Logs guidance, updates task | Warns, updates task | Blocks without grounding, updates with grounding | Same as enforce |
| `verify` | yes | Logs guidance, writes passed DoD stamps | Warns, writes passed DoD stamps | Blocks without grounding, verifies with grounding | Same as enforce |
| `done` | yes | Logs guidance, closes task after DoD | Warns, closes task after DoD | Blocks without grounding, closes with grounding | Same as enforce |
| `import` | yes | Logs guidance, imports with `--apply` | Warns, imports with `--apply` | Blocks without grounding, imports with grounding | Same as enforce |
| `migrate` | yes | Logs guidance, migrates only with `--apply` | Warns, migrates only with `--apply` | Blocks without grounding, migrates with grounding | Same as enforce |
| `status` | no | Read-only | Read-only | Read-only | Read-only |
| `doctor` | no | Read-only diagnostics | Read-only diagnostics | Read-only diagnostics | Read-only diagnostics |
| `list`/`show`/`current` | no | Read-only | Read-only | Read-only | Read-only |
| `hook pre-edit` | hook gate | Emits JSON guidance, exit 0 | Emits JSON warning, exit 0 | Blocks invalid edit state, exit 2 | Same as enforce |
| `hook session-start`/`hook stop` | hook maintenance | Reset/update session context | Reset/update session context | Reset/update session context | Same as enforce |

Recommended switch point: stay in `warn` for first smoke tests, then switch to `enforce` before unattended multi-hour execution. `doctor` and `status` both report the current mode and the recommended switch point.
