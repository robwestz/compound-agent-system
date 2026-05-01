# Troubleshooting

High-frequency failures should explain what happened, why it matters, and the exact next action.

| Area | Symptom | Why it matters | Next action |
|---|---|---|---|
| Install dry-run | Root files such as `CLAUDE.md` are listed as high impact | The installer may overwrite local project instructions | Review `compound-install-plan.json`; rerun with `--overwrite` only after approval |
| Rollback/uninstall | `Refusing rollback outside target` or unsafe uninstall refusals | Manifest paths could otherwise affect sibling directories | Inspect the manifest and remove or correct paths outside the target repo |
| Hooks | Doctor reports missing or duplicate hooks | Agents may miss task, DoD, or checkpoint gates | Run `node .agents/activate.mjs`; inspect duplicates before editing user hooks |
| Ledger | Doctor reports malformed JSON | The harness cannot prove task state or DoD | Restore a known-good `TASKS.json` backup or fix JSON syntax; doctor will not overwrite it |
| Ledger migration | `migration_needed` | Long-running agents may disagree on schema | Run `node .agents/task.mjs migrate --apply` after grounding |
| Fact-Forcing Gate | State-changing command exits 2 in enforce mode | Prevents action on stale user instructions | Quote the current user instruction in `COMPOUND_GROUNDED`, then retry |
| Optional AI | `--ai` has no provider key | AI is optional and no network call was made | Continue with local ranking or set `GROQ_API_KEY` / `OPENROUTER_API_KEY` intentionally |
| Idea intake | Output-quality JSON reports issues | Generated plans may be generic or incomplete | Fix the source idea/template output and rerun the quality checker |
| Readiness | `Long-session readiness: NOT_READY` | Unattended execution lacks a required safety proof | Follow each listed unlock step before multi-hour execution |
| Package validation | Missing required file or stale manifest warning | Users may install an incomplete or drifted payload | Restore the file or update manifest metadata in the same PR |

## Closing

When in doubt, run `node .agents/task.mjs doctor` in the installed workspace, then follow the first listed `next_action` before attempting implementation work.
