# 25 — Windows PowerShell parity

## Metadata

- Status: DONE
- Placement: test-only/core plugin
- Suggested skill: compound-agent-system
- Dependencies: 24-compatibility-matrix-node-os-clients
- Parallel wave: 5
- Risk: medium; Windows support has path and shell edge cases.

## Objective

Ensure bootstrap, install, validation, idea intake, and task commands are documented and tested for Windows/PowerShell parity.

## DoD

- [x] README examples include PowerShell and POSIX equivalents where needed.
- [x] Tests cover CRLF, path separators, spaces in paths, and PowerShell-safe commands.
- [x] Installer avoids POSIX-only assumptions.
- [x] Known Windows limitations are documented.
- [x] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Do not require WSL for claimed Windows support.
- Preserve POSIX behavior.

## Quality bar

Premium: Windows users are first-class or clearly out-of-scope.

## Evaluation prompt

Run commands from a path containing spaces and verify no shell quoting failure.

## Evidence

### Deliverables

| Artifact | Path | Placement |
|---|---|---|
| PowerShell/POSIX docs and known limitations | `README.md`, `plugins/compound-agent-system/assets/system-files/README.md`, `docs/compatibility-matrix.md` | docs |
| Installer command quoting | `plugins/compound-agent-system/scripts/install-compound-system.mjs` | core plugin |
| PowerShell-safe wizard/readiness/mode output | `.agents/activate.mjs`, `.agents/first-session-wizard.mjs`, `.agents/session-readiness.mjs`, `.agents/task.mjs` | core plugin |
| Regression coverage | `tests/bootstrap-install-plan.test.mjs`, `tests/agents-task.test.mjs`, `tests/idea-intake.test.mjs`, `tests/compatibility-matrix.test.mjs`, `tests/first-session-output.test.mjs`, `tests/mode-policy.test.mjs`, `tests/session-readiness.test.mjs` | test-only |

### Verification

- Focused parity suite: `node --test plugins/compound-agent-system/assets/system-files/tests/compatibility-matrix.test.mjs plugins/compound-agent-system/assets/system-files/tests/bootstrap-install-plan.test.mjs plugins/compound-agent-system/assets/system-files/tests/first-session-output.test.mjs plugins/compound-agent-system/assets/system-files/tests/mode-policy.test.mjs plugins/compound-agent-system/assets/system-files/tests/session-readiness.test.mjs` — 26 pass / 0 fail.
- Focused CRLF/path suite: `node --test plugins/compound-agent-system/assets/system-files/tests/agents-task.test.mjs plugins/compound-agent-system/assets/system-files/tests/idea-intake.test.mjs` — 46 pass / 0 fail.
- Evaluation prompt coverage: install and idea-intake tests create workspaces with spaces in the path and invoke Node entrypoints with argument arrays, verifying no shell quoting failure; installer dry-run emits quoted POSIX and PowerShell command variants for `--target` paths containing spaces.

## Task report

Implementer: devin
Evaluator: devin
Independence disclosed: same agent/session, not independent.

### First completion

The first complete implementation added POSIX/PowerShell README examples, PowerShell-safe environment switch output, installer command quoting, CRLF frontmatter import, and tests for paths with spaces, path separators, CRLF inputs, and PowerShell-safe command strings.

### Self-review

The implementer checked the constraints: zero runtime dependencies, no WSL requirement, existing POSIX commands preserved, Windows limitations documented as best-effort because Windows CI is not automated.

### Evaluator feedback round 1

- Finding: The initial implementation updated command output and tests but left README examples uneven: root docs had key command pairs, while bundled/example docs still had PowerShell-only snippets for several workflows.
- Finding: The compatibility matrix still said Windows parity was "tracked by task 25" instead of describing the new deterministic parity coverage.

### Improvement 1

- Added POSIX and PowerShell examples for bootstrap/install/validation, idea intake, task import, first-session skip, support bundle, role-plan, evaluator loop, readiness, handoff checkpoint/resume, and the activate-existing-repo example.
- Updated the root and bundled compatibility matrices to document deterministic CRLF, spaces-in-path, path separator, and command-string coverage while keeping Windows best-effort without CI.

### Evaluator feedback round 2

- Finding: Task import accepted LF frontmatter but CRLF frontmatter could fail the frontmatter parser on Windows-authored plans.
- Finding: Session readiness and status surfaced POSIX-only `export COMPOUND_MODE=enforce` commands, which is not PowerShell-safe guidance.

### Improvement 2

- Updated task import parsing to accept CRLF frontmatter and normalize CRLF YAML lines before parsing.
- Added PowerShell command variants for compliance mode output and readiness unlock steps, plus regression tests asserting `$env:COMPOUND_MODE = 'enforce'`.

### Final signoff

Evaluator signoff: task 25 DoD is satisfied once the package validator, full system-file test suite, and CI pass with the manifest metadata updated for changed payload files.
