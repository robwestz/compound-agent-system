# Troubleshooting

Use this when install, first run, operations, readiness, or release validation fails. Start with the local diagnostic commands; they produce the safest next action without uploading anything.

```bash
node .agents/task.mjs doctor
node .agents/session-readiness.mjs
node .agents/support-bundle.mjs
```

`doctor` explains environment, ledger, hooks, mode, docs, and security failures. `session-readiness` explains why unattended work is not safe yet. `support-bundle` creates a local review-before-share folder with `doctor.json` and `readiness.json` for support.

| Error or symptom | What happened | Why it matters | Recovery command |
|---|---|---|---|
| `Install Node 18 or newer.` | `doctor` detected Node 16 or older. | The harness only supports Node 18+. | Install/select Node 18+, then rerun `node .agents/task.mjs doctor`. |
| Root files such as `CLAUDE.md` are high impact in the install plan. | Dry-run found target files that may be overwritten. | Local project instructions can be lost. | Review `compound-install-plan.json`; rerun install with `--overwrite` only after approval. |
| `Refusing rollback outside target` or unsafe uninstall refusal. | Rollback/uninstall manifest points outside the target repo. | Recovery could affect sibling directories. | Inspect `.agents/install-manifest.json`; correct/remove unsafe entries, then rerun the rollback/uninstall command. |
| Doctor reports missing or duplicate hooks. | `.claude/settings.json` does not contain the expected Compound hooks exactly once. | Agents may miss task, DoD, or checkpoint gates. | Run `node .agents/activate.mjs`, then rerun `node .agents/task.mjs doctor`. |
| Doctor reports malformed `TASKS.json`. | The ledger is not parseable JSON. | The harness cannot prove task state or DoD. | Restore a known-good `.agents/TASKS.json` backup or fix JSON syntax; rerun `node .agents/task.mjs doctor`. |
| Doctor reports `migration_needed`. | Ledger schema is older than the current CLI expects. | Long-running agents may disagree on task state. | Set `COMPOUND_GROUNDED` to the exact current instruction, then run `node .agents/task.mjs migrate --apply`. |
| `Fact-Forcing Gate` or state-changing command exits 2 in enforce mode. | The session has not grounded the first state-changing action. | Prevents actions based on stale user instructions. | Quote the current instruction in `COMPOUND_GROUNDED`, then retry the original command. |
| `--ai set but no GROQ_API_KEY / OPENROUTER_API_KEY in env.` | Optional AI was requested without provider credentials. | No network call was made; deterministic ranking remains available. | Continue without `--ai`, or intentionally set `GROQ_API_KEY` / `OPENROUTER_API_KEY` for that command. |
| Output-quality or planning-quality JSON reports issues. | Generated planning output is generic, incomplete, or unsafe to import. | Bad plans create poor tasks and handoffs. | Fix the source idea/template output, then rerun `.agents/check-output-quality.mjs` or `.agents/check-planning-quality.mjs`. |
| `Long-session readiness: NOT_READY`. | Premium preflight conditions are missing. | Unattended execution lacks required safety proof. | Follow each unlock step from `node .agents/session-readiness.mjs`; use `node .agents/support-bundle.mjs` if support needs evidence. |
| Support requests diagnostics. | Support needs context but not a full repo dump. | Raw ledgers/events may contain private context. | Run `node .agents/support-bundle.mjs`; review the generated folder before sharing. |
| Package validator reports missing required files. | Required plugin or payload files are absent. | Users may install an incomplete harness. | Restore each file listed by `node plugins/compound-agent-system/scripts/validate-package.mjs`. |
| Package validator reports stale `manifest.json` byte metadata. | Bundled system files changed without manifest byte updates. | Reviewers cannot trust payload drift checks. | Update `manifest.json` bytes for changed files, then rerun `node plugins/compound-agent-system/scripts/validate-package.mjs`. |

## If you are still blocked

Run `node .agents/support-bundle.mjs`, review the generated bundle, and share only the redacted files needed for support. The bundle is local-only and does not upload automatically.
