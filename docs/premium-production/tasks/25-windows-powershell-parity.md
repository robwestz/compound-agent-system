# 25 — Windows PowerShell parity

## Metadata

- Status: NOT_STARTED
- Placement: test-only/core plugin
- Suggested skill: compound-agent-system
- Dependencies: 24-compatibility-matrix-node-os-clients
- Parallel wave: 5
- Risk: medium; Windows support has path and shell edge cases.

## Objective

Ensure bootstrap, install, validation, idea intake, and task commands are documented and tested for Windows/PowerShell parity.

## DoD

- [ ] README examples include PowerShell and POSIX equivalents where needed.
- [ ] Tests cover CRLF, path separators, spaces in paths, and PowerShell-safe commands.
- [ ] Installer avoids POSIX-only assumptions.
- [ ] Known Windows limitations are documented.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Do not require WSL for claimed Windows support.
- Preserve POSIX behavior.

## Quality bar

Premium: Windows users are first-class or clearly out-of-scope.

## Evaluation prompt

Run commands from a path containing spaces and verify no shell quoting failure.
