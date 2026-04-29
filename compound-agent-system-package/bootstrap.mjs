#!/usr/bin/env node
// Convenience entrypoint from the package root.
// Usage: node bootstrap.mjs --target <repo> [--agent-id <id>] [--overwrite] [--dry-run] [--no-activate]

import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const script = join(root, "plugins", "compound-agent-system", "scripts", "bootstrap-compound-system.mjs");
const result = spawnSync(process.execPath, [script, ...process.argv.slice(2)], { stdio: "inherit" });
process.exit(result.status ?? 1);
