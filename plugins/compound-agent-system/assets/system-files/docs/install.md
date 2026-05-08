# Install

Use this when you want to install the Compound Agent System harness into a target repository.

## Preconditions

- Node.js 18 or newer. Confirm with `node --version`.
- A target repository path that you are allowed to modify.
- No API Alchemy Engine work. That idea is fixture-only for idea-intake tests.

## Validate this package first

From this repository root:

```bash
node plugins/compound-agent-system/scripts/validate-package.mjs
```

The validator checks required plugin files, forbidden bundled files, payload size warnings, and stale `manifest.json` byte metadata.

## Dry-run the install

```bash
node bootstrap.mjs --target /path/to/repo --agent-id <agent-id> --dry-run
```

Review the generated install plan before write mode. Treat high-impact root files such as `CLAUDE.md` as approval-sensitive.

## Install and activate

```bash
node bootstrap.mjs --target /path/to/repo --agent-id <agent-id>
```

Bootstrap copies `plugins/compound-agent-system/assets/system-files/` into the target repo, runs `.agents/activate.mjs`, optionally signs in the agent, prints ledger status, and shows the first guided-wizard action.

## Split install from activation

```bash
node bootstrap.mjs --target /path/to/repo --no-activate
cd /path/to/repo
node .agents/activate.mjs
node .agents/agent-activate.mjs --id <agent-id>
```

## Plugin registration

For Claude development without marketplace registration:

```bash
claude --plugin-dir ./plugins/compound-agent-system
```

For local Claude marketplace installation, stage the plugin and then run in Claude Code:

```text
/plugin marketplace add /path/to/local/marketplace/compound-agent-system
/plugin install compound-agent-system@compound-agent-system
```

For Codex or PowerShell registration, use `install-global-plugin.ps1` from a Windows/PowerShell environment.

## Rollback and uninstall

The installer writes `.agents/install-manifest.json` in the target repo. Use installer rollback/uninstall modes from this package when recovery is needed:

```bash
node plugins/compound-agent-system/scripts/install-compound-system.mjs --target /path/to/repo --rollback /path/to/repo/.agents/install-manifest.json
node plugins/compound-agent-system/scripts/install-compound-system.mjs --target /path/to/repo --uninstall
```

Rollback and uninstall refuse manifest paths outside the target repo boundary.

## After install

Continue with [First run](first-run.md).
