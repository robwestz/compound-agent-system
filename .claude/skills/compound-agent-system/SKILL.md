# compound-agent-system Development Patterns

## Overview

This repository ships a zero-runtime-dependency Node.js Compound Agent System harness. Most feature work is local CLI behavior under `plugins/compound-agent-system/assets/system-files/`, plus package validation via `plugins/compound-agent-system/scripts/validate-package.mjs`.

## Devin Secrets Needed

No secrets are needed for normal local CLI development and testing. Do not use real secrets in fixtures; seed fake secret-looking values when validating redaction behavior.

## Required Commands

Run from the repository root:

```bash
node plugins/compound-agent-system/scripts/validate-package.mjs
node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs
```

Run focused tests directly while iterating, for example:

```bash
node --test plugins/compound-agent-system/assets/system-files/tests/support-bundle.test.mjs
node --test plugins/compound-agent-system/assets/system-files/tests/event-log.test.mjs
node --test plugins/compound-agent-system/assets/system-files/tests/session-readiness.test.mjs
```

The package validator checks required system files, payload size, forbidden bundled files, and `manifest.json` byte metadata. If system files change, regenerate `manifest.json` from actual files before running the validator.

## CLI Testing Pattern

Use shell-only tests for local CLI features. Browser recordings are unnecessary unless the feature has a visible UI.

1. Create a temp workspace with `.agents/TASKS.json` and any needed fixture files.
2. Invoke the CLI with explicit paths such as `--ledger <tmp>/.agents/TASKS.json` and `--out <tmp>/bundle`.
3. Assert exact exit codes, stdout/stderr substrings, generated file names, and parsed JSON fields.
4. For safety features, assert negative cases too: refused overwrites, refused paths outside workspace, malformed JSON, missing logs, or invalid arguments.
5. Remove transient `.agents/events.jsonl` generated in the repository fixture before committing.

## Commercial Acceptance Testing Pattern

For final premium-production or release-candidate work, use shell-only testing and post one PR comment with the result summary.

Run:

```bash
node --test plugins/compound-agent-system/assets/system-files/tests/commercial-acceptance.test.mjs
node --test \
  plugins/compound-agent-system/assets/system-files/tests/performance-scale.test.mjs \
  plugins/compound-agent-system/assets/system-files/tests/release-readiness.test.mjs \
  plugins/compound-agent-system/assets/system-files/tests/backward-compatibility.test.mjs \
  plugins/compound-agent-system/assets/system-files/tests/commercial-acceptance.test.mjs
for f in docs/premium-production/tasks/{29..32}-*.md; do
  node plugins/compound-agent-system/assets/system-files/.agents/eval-loop.mjs "$f"
done
node plugins/compound-agent-system/scripts/validate-package.mjs
node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs
```

Expected release-candidate signals:

- commercial acceptance: `tests 4`, `pass 4`, `fail 0`
- focused final-wave suites: `tests 14`, `pass 14`, `fail 0`
- eval-loop JSON for tasks 29–32: `"ok": true` and `"issues": []`
- validator: `compound-agent-system package: valid`
- full suite: all tests pass with `fail 0`

Do not record the browser for this flow; the evidence is command output.

## Support Bundle Testing Pattern

For `.agents/support-bundle.mjs`, test a temp workspace rather than the real repo ledger:

- Seed fake values like `sk-aaaaaaaaaaaaaaaaaaaa`, `gsk_bbbbbbbbbbbbbbbbbbbb`, `password=hidden`, `Authorization: Bearer cccccccccccccccccccc`, and `/home/alice/repo/.env`.
- Run `node .agents/support-bundle.mjs --ledger <tmp>/.agents/TASKS.json --out <tmp>/bundle --events 1`.
- Confirm stdout includes `Review before sharing. No upload was performed.`.
- Confirm the bundle contains `manifest.json`, `README.md`, `versions.json`, `config-summary.json`, `ledger-redacted.json`, `events-recent-redacted.json`, `doctor.json`, and `readiness.json`.
- Confirm seeded fake secret strings and user names are absent from exported JSON.
- Confirm raw task goals are summarized (for example `goal_present: true`) rather than copied verbatim.
- Confirm an existing output directory fails, an output path outside the workspace fails, and malformed `TASKS.json` still exports doctor diagnostics.

## Manifest Maintenance

Parallel PRs often conflict in `manifest.json`. Prefer regenerating it from `plugins/compound-agent-system/assets/system-files/` file byte counts rather than hand-editing entries. Always run the package validator afterward.

## Commit and PR Notes

Use conventional commit messages. Do not push directly to `main`; use a feature branch and PR. Include local verification commands in the PR body.
