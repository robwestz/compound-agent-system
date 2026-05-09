# CLAUDE.md — Compound Agent System package entrypoint

This package is a Claude/Codex plugin for autonomous project-start. It installs a portable Compound Agent System harness into target repositories so raw ideas become ledger tasks, GAP SCAN output, role assignments, DoD checks, phase plans, and resumable agent state.

## Directory layout

```text
repo root/
├─ bootstrap.mjs
├─ manifest.json
├─ compound-agent-system-product-upgrade-spec.md
├─ UPGRADE_TRACKER.md
└─ plugins/compound-agent-system/
   ├─ .claude-plugin/
   ├─ .codex-plugin/
   ├─ scripts/
   │  ├─ install-compound-system.mjs
   │  ├─ bootstrap-compound-system.mjs
   │  └─ validate-package.mjs
   └─ assets/system-files/
      ├─ .agents/
      ├─ .claude/
      ├─ .codex/
      ├─ fixtures/
      └─ tests/
```

## Tests

Run package system-file tests from the repository root:

```bash
node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs
```

Phase-specific tests may be run directly, for example:

```bash
node --test plugins/compound-agent-system/assets/system-files/tests/check-output-quality.test.mjs
```

## Do not build

Do not build the API Alchemy Engine. That idea appears only as sanitized fixture material for idea-intake tests. The product being upgraded is the plugin/harness.

## Preserve

Do not remove or weaken:

- bootstrap with dry-run before write mode
- hooks
- `.agents/TASKS.json` ledger
- Definition of Done checks
- Fact-Forcing Gate
- WARN/ENFORCE behavior and new observe mode
- GAP SCAN
- CONTEXT REFRESH
- COMPOUND REGISTER
- Claude/Codex portability

## Upgrade priorities

Use `compound-agent-system-product-upgrade-spec.md` as the source of upgrade priorities and acceptance criteria. Use `UPGRADE_TRACKER.md` for current phase progress, phase DoD, verification commands, and known regressions.

## Runtime dependency rule

Zero runtime dependencies. New scripts must run on Node 18+ using built-in modules only unless the operator explicitly approves otherwise. Dev dependencies are acceptable only for tests already covered by the package.

## Progress convention

After completing each phase, update `UPGRADE_TRACKER.md`: set the phase status, mark or preserve the DoD checklist, record verification commands, and document pre-existing failures separately from new failures.
