#!/usr/bin/env node
// Usage: node scripts/validate-package.mjs
// Validates the plugin structure and bundled Compound system file set.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const systemRoot = join(pluginRoot, "assets", "system-files");

const required = [
  ".codex-plugin/plugin.json",
  ".claude-plugin/plugin.json",
  "commands/activate-compound-system.md",
  "scripts/bootstrap-compound-system.mjs",
  "skills/compound-agent-system/SKILL.md",
  "skills/compound-agent-system/README.md",
  "skills/compound-agent-system/metadata.json",
  "assets/system-files/.agents/PROTOCOL.md",
  "assets/system-files/.agents/DOD.md",
  "assets/system-files/.agents/task.mjs",
  "assets/system-files/.agents/activate.mjs",
  "assets/system-files/.agents/agent-activate.mjs",
  "assets/system-files/.codex/config.toml",
  "assets/system-files/handoff-bridge.mjs",
  "assets/system-files/lib/token-budget.mjs",
  "assets/system-files/schemas/handoff-contract.v1.json",
  "assets/system-files/tests/handoff-bridge.test.mjs",
  "assets/system-files/tests/token-budget.test.mjs"
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile()) out.push(p);
  }
  return out;
}

const missing = required.filter((p) => !existsSync(join(pluginRoot, p)));
if (missing.length) {
  console.error("Missing required files:");
  for (const p of missing) console.error(`- ${p}`);
  process.exit(1);
}

JSON.parse(readFileSync(join(pluginRoot, ".codex-plugin", "plugin.json"), "utf-8"));
JSON.parse(readFileSync(join(pluginRoot, ".claude-plugin", "plugin.json"), "utf-8"));
JSON.parse(readFileSync(join(pluginRoot, "skills", "compound-agent-system", "metadata.json"), "utf-8"));

const forbidden = [];
if (existsSync(systemRoot)) {
  for (const file of walk(systemRoot)) {
    const rel = file.slice(systemRoot.length + 1).replaceAll("\\", "/");
    if (rel.includes(".claude/settings.local.json") || rel.includes(".claude/worktrees/")) forbidden.push(rel);
    if (rel.endsWith(".zip")) forbidden.push(rel);
  }
}

if (forbidden.length) {
  console.error("Forbidden bundled files:");
  for (const p of forbidden) console.error(`- ${p}`);
  process.exit(1);
}

console.log("compound-agent-system package: valid");
