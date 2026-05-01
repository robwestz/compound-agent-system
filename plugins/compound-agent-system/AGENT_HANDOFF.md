# Agent handoff — Compound Agent System package

This repository upgrades the Compound Agent System plugin/package. Use `compound-agent-system-product-upgrade-spec.md` at the package root as the source of upgrade priorities and `UPGRADE_TRACKER.md` for current progress.

Do not build the API Alchemy Engine. That project appears only as sanitized fixture text for idea-intake tests.

Before broad edits, produce a short plan and identify the phase you are changing. Keep every unit of work tied to a task ledger entry and a Definition of Done. Preserve bootstrap, hooks, ledger, DoD verification, Fact-Forcing Gate, observe/warn/enforce modes, GAP SCAN, CONTEXT REFRESH, COMPOUND REGISTER, and Claude/Codex portability.

Verification expectations:

- Run the phase-specific test for the phase you changed.
- Run `node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs` for full regression coverage.
- Run `node plugins/compound-agent-system/scripts/validate-package.mjs` before handoff.
- For idea-intake changes, run `node --test plugins/compound-agent-system/assets/system-files/tests/idea-intake.test.mjs plugins/compound-agent-system/assets/system-files/tests/check-planning-quality.test.mjs`.
- Document pre-existing failures separately from new regressions in `UPGRADE_TRACKER.md`.
- Do not add runtime dependencies; scripts must run on Node 18+ built-ins.
