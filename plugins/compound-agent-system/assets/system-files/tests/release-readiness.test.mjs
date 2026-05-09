import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..", "..", "..", "..");

function read(rel) {
  return readFileSync(join(REPO_ROOT, rel), "utf-8");
}

function json(rel) {
  return JSON.parse(read(rel));
}

test("release checklist covers commercial release gates", () => {
  const doc = read("docs/marketplace-release-readiness.md");
  for (const required of [
    "Versioning and changelog",
    "Metadata review",
    "Validation and tests",
    "Dry-run package process",
    "Rollback and support notes",
    "Release decision",
  ]) {
    assert.match(doc, new RegExp(required));
  }
  assert.match(doc, /node plugins\/compound-agent-system\/scripts\/validate-package\.mjs/);
  assert.match(doc, /node --test plugins\/compound-agent-system\/assets\/system-files\/tests\/\*\.test\.mjs/);
  assert.match(doc, /does not publish anything/i);
});

test("Claude and Codex marketplace metadata stays consistent and scoped", () => {
  const claude = json("plugins/compound-agent-system/.claude-plugin/plugin.json");
  const codex = json("plugins/compound-agent-system/.codex-plugin/plugin.json");
  assert.equal(claude.name, "compound-agent-system");
  assert.equal(codex.name, claude.name);
  assert.equal(codex.version, claude.version);
  assert.equal(codex.license, claude.license);
  assert.match(claude.description, /Claude Code compatible/);
  assert.match(codex.description, /Codex compatible/);
  assert.doesNotMatch(claude.description, /Windows 10\/11.*Supported/);
  assert.doesNotMatch(codex.description, /macOS.*Supported/);
});

test("release docs include changelog rollback and compatibility review", () => {
  const release = read("docs/release.md");
  const changelog = read("CHANGELOG.md");
  assert.match(release, /Marketplace Release Readiness/);
  assert.match(release, /Backward Compatibility Contract/);
  assert.match(release, /rollback/i);
  assert.match(changelog, /Breaking changes/);
  assert.match(changelog, /Migration steps/);
  assert.match(changelog, /Verification/);
});
