---
description: Install and activate the Compound Agent System workspace harness in a target repository.
argument-hint: "[target repo path]"
---

Use the `compound-agent-system` skill.

Target:
- If an argument was provided, use it as the target repository path.
- If no argument was provided, use the current working repository.

Prefer bootstrap from this plugin:

```bash
node "$CLAUDE_PLUGIN_ROOT/scripts/bootstrap-compound-system.mjs" --target "<target repo>" --agent-id "<agent id>"
```

If bootstrap was run with `--no-activate`, enter the target repository and run:

```bash
node .agents/activate.mjs
node .agents/agent-activate.mjs --id "<agent id>"
node .agents/task.mjs status
```

Do not mark the workspace harness as active until `.agents/PROTOCOL.md`, `.agents/DOD.md`, `.agents/TASKS.json`, `.claude/settings.json`, and `.codex/config.toml` are present in the target repository.
