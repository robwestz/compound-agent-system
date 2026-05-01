# 24 — Compatibility matrix

## Metadata

- Status: DONE
- Placement: test-only/docs
- Suggested skill: compound-agent-system
- Dependencies: 01-golden-path-e2e-suite
- Parallel wave: 5
- Risk: medium; unsupported environments must be honest.

## Objective

Define and test the supported Node, OS, shell, Claude, and Codex matrix.

## DoD

- [x] Compatibility matrix states supported, best-effort, and unsupported environments.
- [x] Tests cover Linux and Windows path/line-ending assumptions where feasible.
- [x] CLI reports unsupported Node versions clearly.
- [x] Release checklist includes matrix verification.
- [x] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Do not claim untested environments as supported.
- Keep Windows tests deterministic.

## Quality bar

Premium: users know whether their environment is supported before install.

## Evaluation prompt

Find every place docs imply broader support than tests prove.

## Evidence

### Deliverables

| Artifact | Path | Placement |
|---|---|---|
| Compatibility matrix | `docs/compatibility-matrix.md` | docs |
| Compatibility tests | `tests/compatibility-matrix.test.mjs` | test-only |
| Release checklist | Embedded in `docs/compatibility-matrix.md` | docs |

### CLI unsupported Node reporting

`node .agents/task.mjs doctor` with `COMPOUND_DOCTOR_NODE_VERSION=v16.20.0` outputs:
```
checks.node.ok = false
checks.node.next_action = "Install Node 18 or newer."
```

This is tested in `doctor-recovery.test.mjs` ("doctor reports unsupported Node with one safe next action").

### Test coverage

- `compatibility-matrix.test.mjs`: deterministic tests for Linux path/line-ending assumptions, manifest forward-slash consistency, `\n` line endings in generated files, Node version boundary detection, and forward-slash normalization in the validator.
- `doctor-recovery.test.mjs`: existing tests for unsupported Node detection and doctor pass state including Node support.
- `node-runtime.test.mjs`: existing tests for portable Node resolution and command parsing.

### Honest limitations documented

The matrix explicitly states:
- Windows CI is not automated (best-effort until task 25)
- macOS is not in CI
- Odd Node releases are not tested
- Shell detection is not implemented
- Docker/container environments are not tested


## Evaluator feedback rounds

### Round 1 — honesty of environment support

- Finding: The first matrix draft called broad "Linux" supported even though CI only proves Ubuntu Linux on GitHub Actions.
  - Addressed: The OS row now supports only "Ubuntu Linux on GitHub Actions" and downgrades other Linux distributions to best-effort.
- Finding: Root docs and bundled docs could drift.
  - Addressed: `compatibility-matrix.test.mjs` asserts the root and bundled compatibility matrices are byte-identical.
- Finding: Required-list changes in the package validator would be core-plugin scope creep for this task.
  - Addressed: Validator source was left unchanged; the new docs/tests are tracked via manifest metadata and system-file tests.

### Round 2 — client and Windows claims

- Finding: "Claude" and "Codex" support could be read as tested external marketplace/client behavior.
  - Addressed: The matrix now says "Claude Code package surface" and "Codex package surface" and documents external marketplace installs as manual release-check scope.
- Finding: Windows path/line-ending coverage is deterministic but not equivalent to Windows CI.
  - Addressed: Windows remains best-effort, the matrix states Windows CI is not automated, and tests are limited to portable manifest paths, LF line endings, and bundled/root doc parity.
- Finding: Odd Node versions were not explicitly bounded.
  - Addressed: Odd releases are best-effort only; CI-supported Node versions remain 18, 20, and 22.
