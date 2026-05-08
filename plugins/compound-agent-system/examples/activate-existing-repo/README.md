# Example: Activate Existing Repo

Purpose: Release-checklist example for manually smoke-checking install, activation, status, ack, and DoD-backed task creation in an existing target repository.

POSIX:

```bash
node plugins/compound-agent-system/scripts/install-compound-system.mjs --target "/work/my repo"
cd "/work/my repo"
node .agents/activate.mjs
node .agents/task.mjs status
node .agents/task.mjs ack codex-gpt-5-codex
node .agents/task.mjs open "Add smoke test" --dod "test:node --test tests/smoke.test.mjs"
```

PowerShell:

```powershell
node plugins\compound-agent-system\scripts\install-compound-system.mjs --target 'C:\work\my repo'
Set-Location 'C:\work\my repo'
node .agents\activate.mjs
node .agents\task.mjs status
node .agents\task.mjs ack codex-gpt-5-codex
node .agents\task.mjs open "Add smoke test" --dod "test:node --test tests/smoke.test.mjs"
```

Expected result:

- `.agents/TASKS.json` exists.
- `.claude/settings.json` contains `compound-protocol` hooks.
- The ledger has an `ack` event and an `in_progress` task with DoD.
