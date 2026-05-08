# Compatibility Matrix

Defines which Node, OS, shell, and agent-client combinations the Compound Agent System supports. Use this matrix before installing to confirm your environment is supported. The `doctor` CLI validates Node version at runtime.

## Node.js versions

| Version | Status | Notes |
|---|---|---|
| 22.x LTS | **Supported** | Tested in CI and development |
| 20.x LTS | **Supported** | Tested in CI |
| 18.x LTS | **Supported** | Minimum required; tested in CI |
| 16.x and older | **Unsupported** | `doctor` reports "Install Node 18 or newer." |
| 23.x / odd releases | Best-effort | Not tested in CI; may work but no guarantee |

## Operating systems

| OS | Status | Notes |
|---|---|---|
| Ubuntu Linux on GitHub Actions | **Supported** | Primary CI and development platform |
| Other Linux distributions | Best-effort | Expected to behave like Ubuntu when Node ≥ 18 is available; not tested separately |
| macOS (12+) | Best-effort | May work; not tested in CI |
| Windows 10/11 | Best-effort | PowerShell and Git Bash may work; parity tracked by task 25. `node-runtime.mjs` includes Windows-specific fallbacks |
| WSL2 | Best-effort | Expected to behave like Ubuntu when running inside WSL; not tested separately |
| FreeBSD, other POSIX | Unsupported | Not tested; no support commitment |

## Shells

| Shell | Status | Notes |
|---|---|---|
| Bash (4+) | **Supported** | Default for CI and documented commands |
| PowerShell (5.1+ / 7+) | Best-effort | Install scripts and bootstrap support PowerShell; full parity tracked by task 25 |
| Zsh | Best-effort | Expected to work via POSIX compatibility; not tested separately |
| Fish, Nushell, etc. | Unsupported | Not tested |

## Agent clients

| Client | Status | Notes |
|---|---|---|
| Claude Code package surface | **Supported** | Hooks in `.claude/settings.json`; plugin manifest at `.claude-plugin/plugin.json`; package files validated, external marketplace behavior is manual release-check scope |
| Codex package surface | **Supported** | Plugin manifest at `.codex-plugin/plugin.json`; shared task CLI validated, external client behavior is manual release-check scope |
| Devin (Cognition) | Best-effort | Can operate via task CLI; no plugin manifest |
| Other LLM agents | Unsupported | Task CLI is portable but hooks/plugin integration is not validated |

## Path and line-ending assumptions

| Assumption | Scope | Tested |
|---|---|---|
| Forward-slash paths in manifest and installer | All platforms | Yes — manifest uses `/` unconditionally |
| `\n` line endings in generated files | All platforms | Yes — `writeFileSync` uses `\n`; no `\r\n` normalization |
| `path.join` / `path.resolve` for local filesystem | Runtime scripts | Yes — deterministic on Linux; Windows uses `\` which `replaceAll("\\", "/")` normalizes in the validator |
| Case-sensitive filenames | Linux CI | Yes — tests create and assert exact filenames |
| Paths with spaces | Windows fallbacks only | Partial — `node-runtime.mjs` passes Windows fallback paths as executable arguments |

## What "supported" means

- **Supported**: Tested in CI, covered by automated tests, and bugs are treated as regressions.
- **Best-effort**: Expected to work based on portable design, but not validated in CI. Bug reports welcome; fixes are accepted but not guaranteed.
- **Unsupported**: Not tested and not designed for. May work accidentally. No bug reports accepted.

## How to verify your environment

```bash
node .agents/task.mjs doctor
```

The `doctor` command checks:
- Node version (≥ 18 required)
- Ledger integrity
- Hook installation
- Compliance mode
- Security boundary docs

If `doctor` reports `FAIL`, follow the `next_action` for each failing check.

## Honest limitations

- **Windows CI is not yet automated.** Windows support is best-effort until task 25 adds CI parity.
- **macOS is not in CI.** macOS is expected to work but no automated verification exists.
- **Odd Node releases (19.x, 21.x, 23.x) are not tested.** They may work but are not regression-tracked.
- **The harness does not detect or warn about unsupported shells.** Shell compatibility is the user's responsibility.
- **Docker/container environments are not tested.** They should work if Node ≥ 18 is available, but no assertions exist.
- **External Claude/Codex marketplace installs are not automated in this task.** Supported client status covers packaged manifests, bundled hooks, and shared CLI files.

## Release checklist — matrix verification

Before any release, verify:

- [ ] CI passes on Node 18, 20, and 22.
- [ ] `node .agents/task.mjs doctor` reports PASS on a clean install.
- [ ] `node plugins/compound-agent-system/scripts/validate-package.mjs` passes.
- [ ] The compatibility matrix doc matches the actual CI matrix in `.github/workflows/test.yml`.
- [ ] No docs or README claim support for environments not listed as "Supported" in this matrix.
- [ ] `doctor` correctly reports unsupported Node versions (test with `COMPOUND_DOCTOR_NODE_VERSION=v16.20.0`).
- [ ] Path assumptions are validated by the `compatibility-matrix.test.mjs` test suite.
- [ ] Run `plugins/compound-agent-system/examples/activate-existing-repo/README.md` commands against a disposable target repo; confirm the documented expected result.
- [ ] External Claude/Codex marketplace install behavior is manually smoke-checked before publishing.
