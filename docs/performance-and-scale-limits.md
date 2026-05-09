# Performance and Scale Limits

Use this before claiming the harness is ready for large or unattended work. The core warning target is a 1,000-task ledger that remains usable under 2,500 ms.

## Local benchmark command

```bash
node --test plugins/compound-agent-system/assets/system-files/tests/performance-scale.test.mjs
```

The benchmark is deterministic and offline. It builds temporary ledgers and plans, then measures CLI usability with representative large inputs.

## Expected ranges

These ranges are intentionally conservative so CI does not become flaky.

| Flow | Fixture size | Warning threshold |
|---|---:|---:|
| `task.mjs status` | 1,000 tasks | 2,500 ms |
| `session-readiness.mjs` | 1,000 tasks | 2,500 ms |
| `task.mjs import` dry-run | 250 phase markers | 2,500 ms |
| Package validator | current payload | 2,500 ms |

Crossing a threshold is a release warning, not an automatic optimization request. First inspect whether the environment is slow, then profile the affected command.

## Known limits

- The ledger is a local JSON file; keep active task lists below a few thousand tasks.
- `status` is intended for quick operator feedback, not analytics over historical logs.
- Readiness checks inspect the current task and handoff evidence; they should stay usable even when the ledger contains many completed or parked tasks.
- Import is designed for phase plans, not bulk project-management migration.
- No network, database, worker, cache, or runtime dependency is required for these benchmarks.

## Regression response

1. Re-run the benchmark on a quiet machine.
2. Run `node .agents/task.mjs doctor` to exclude environment problems.
3. Compare changed files against the compatibility and plugin-size docs.
4. If the regression is real, either reduce algorithmic work or document a new limit before release.
