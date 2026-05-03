#!/usr/bin/env node
// Usage: node scripts/validate-package.mjs
// Validates the plugin structure and bundled Compound system file set.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const systemRoot = join(pluginRoot, "assets", "system-files");

const SIZE_WARNING_BYTES = 750 * 1024;
const FILE_COUNT_WARNING = 175;

function fileSize(path) {
  return readFileSync(path).byteLength;
}

function warn(message) {
  console.warn(`Warning: ${message}`);
}

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
  "assets/system-files/.agents/first-session-wizard.mjs",
  "assets/system-files/.codex/config.toml",
  "assets/system-files/handoff-bridge.mjs",
  "assets/system-files/lib/token-budget.mjs",
  "assets/system-files/schemas/handoff-contract.v1.json",
  "assets/system-files/schemas/handoff-contract.v2.json",
  "assets/system-files/tests/handoff-bridge.test.mjs",
  "assets/system-files/tests/token-budget.test.mjs",
  "assets/system-files/factory/v2-personas/debate.mjs",
  "assets/system-files/frameworks/QUALITY_GATE.md",
  "assets/system-files/frameworks/COMPOUND.md",
  "assets/system-files/data.public.js",
  "assets/system-files/kickoff-template.mjs",
  "assets/system-files/llm-client.mjs",
  "assets/system-files/zip-builder.mjs",
  "assets/system-files/.agents/check-output-quality.mjs",
  "assets/system-files/.agents/check-planning-quality.mjs",
  "assets/system-files/.agents/idea-intake.mjs",
  "assets/system-files/.agents/role-assignment-plan.mjs",
  "assets/system-files/.agents/session-readiness.mjs",
  "assets/system-files/.agents/templates/PROJECT_BRIEF.md",
  "assets/system-files/.agents/templates/GAP_SCAN.md",
  "assets/system-files/.agents/templates/DECISIONS.md",
  "assets/system-files/.agents/templates/PHASE_PLAN.md",
  "assets/system-files/.agents/templates/OPEN_QUESTIONS.md",
  "assets/system-files/.agents/templates/AGENT_ROLES.md",
  "assets/system-files/.agents/templates/DOD_MATRIX.md",
  "assets/system-files/fixtures/ideas/simple-idea.md",
  "assets/system-files/fixtures/ideas/medium-feature-idea.md",
  "assets/system-files/fixtures/ideas/long-idea-api-alchemy.md",
  "assets/system-files/fixtures/output-quality/clean-gap-scan.md",
  "assets/system-files/fixtures/output-quality/duplicated-sections.md",
  "assets/system-files/fixtures/output-quality/repeated-blockers.md",
  "assets/system-files/fixtures/planning-quality/generic-two-phase-plan.md",
  "assets/system-files/tests/check-output-quality.test.mjs",
  "assets/system-files/tests/check-planning-quality.test.mjs",
  "assets/system-files/tests/idea-intake.test.mjs",
  "assets/system-files/tests/role-assignment-plan.test.mjs",
  "assets/system-files/tests/golden-path-e2e.test.mjs",
  "assets/system-files/tests/doctor-recovery.test.mjs",
  "assets/system-files/tests/install-rollback-uninstall.test.mjs",
  "assets/system-files/tests/hook-idempotency.test.mjs",
  "assets/system-files/tests/mode-policy.test.mjs",
  "assets/system-files/tests/bootstrap-install-plan.test.mjs",
  "assets/system-files/tests/first-session-output.test.mjs",
  "assets/system-files/tests/session-readiness.test.mjs",
  "assets/system-files/tests/package-integrity.test.mjs",
  "assets/system-files/docs/security-boundary-model.md",
  "assets/system-files/docs/secrets-and-ai-policy.md",
  "assets/system-files/docs/plugin-size-budget.md",
  "assets/system-files/docs/troubleshooting.md",
  "AGENT_HANDOFF.md"
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
  console.error("Package integrity failed: required files are missing.");
  console.error("Why it matters: users may install an incomplete Compound Agent System payload.");
  console.error("Next action: restore each path or remove stale manifest entries in the same PR.");
  for (const p of missing) console.error(`- ${p}`);
  process.exit(1);
}

const repoManifestPath = resolve(pluginRoot, "..", "..", "manifest.json");
if (existsSync(repoManifestPath)) {
  const manifest = JSON.parse(readFileSync(repoManifestPath, "utf-8"));
  const stale = [];
  for (const entry of manifest.system_files || []) {
    const file = join(systemRoot, entry.path);
    if (!existsSync(file)) {
      stale.push({ path: entry.path, reason: "missing" });
      continue;
    }
    const actual = fileSize(file);
    if (entry.bytes !== actual) stale.push({ path: entry.path, expected_bytes: entry.bytes, actual_bytes: actual });
  }
  if (stale.length) {
    console.error("Package integrity failed: manifest.json has stale system_files metadata.");
    console.error("Why it matters: package reviewers cannot trust payload drift checks.");
    console.error("Next action: update manifest.json bytes for changed files or remove stale entries.");
    for (const entry of stale) {
      if (entry.reason) console.error(`- ${entry.path}: ${entry.reason}`);
      else console.error(`- ${entry.path}: expected ${entry.expected_bytes} bytes, got ${entry.actual_bytes}`);
    }
    process.exit(1);
  }
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

if (existsSync(systemRoot)) {
  const systemFiles = walk(systemRoot);
  const totalBytes = systemFiles.reduce((sum, file) => sum + fileSize(file), 0);
  if (totalBytes > SIZE_WARNING_BYTES) warn(`system-files payload is ${totalBytes} bytes; review docs/plugin-size-budget.md placement rules.`);
  if (systemFiles.length > FILE_COUNT_WARNING) warn(`system-files payload has ${systemFiles.length} files; review docs/plugin-size-budget.md placement rules.`);
  console.log(`Payload size: ${totalBytes} bytes across ${systemFiles.length} files`);
}

console.log("compound-agent-system package: valid");
