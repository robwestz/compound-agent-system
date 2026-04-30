import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYSTEM_ROOT = resolve(__dirname, "..");
const PLUGIN_ROOT = resolve(SYSTEM_ROOT, "..", "..");
const ACTIVATE = join(SYSTEM_ROOT, ".agents", "activate.mjs");
const AGENT_ACTIVATE = join(SYSTEM_ROOT, ".agents", "agent-activate.mjs");
const BOOTSTRAP = join(PLUGIN_ROOT, "scripts", "bootstrap-compound-system.mjs");

function assertTemplate(stdout) {
  assert.match(stdout, /installed/i);
  assert.match(stdout, /signed in|not signed in/i);
  assert.match(stdout, /mode/i);
  assert.match(stdout, /Next:/);
  assert.match(stdout, /raw idea|project brief/);
  assert.doesNotMatch(stdout, /Role:\s*.*\nRole:/i);
  assert.doesNotMatch(stdout, /GAP SCAN(?!, propose defaults)/);
  const nextLines = stdout.split("\n").filter((line) => /^Next:/.test(line));
  assert.equal(nextLines.length, 1, "one clear next action");
}

test("activate output uses first-session template", () => {
  const dir = mkdtempSync(join(tmpdir(), "compound-activate-"));
  try {
    const r = spawnSync(process.execPath, [ACTIVATE], { cwd: dir, encoding: "utf-8", env: { ...process.env, COMPOUND_MODE: "warn" } });
    assert.equal(r.status, 0, r.stderr);
    assertTemplate(r.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("agent activation output uses first-session template", () => {
  const dir = mkdtempSync(join(tmpdir(), "compound-agent-activate-"));
  try {
    const r = spawnSync(process.execPath, [AGENT_ACTIVATE, "--id", "claude-opus-4.7", "--role", "planner"], { cwd: dir, encoding: "utf-8", env: { ...process.env, COMPOUND_TASKS_PATH: join(dir, "TASKS.json") } });
    assert.equal(r.status, 0, r.stderr);
    assertTemplate(r.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("bootstrap dry-run points to plan and avoids raw project-start command", () => {
  const dir = mkdtempSync(join(tmpdir(), "compound-bootstrap-"));
  try {
    const r = spawnSync(process.execPath, [BOOTSTRAP, "--target", dir, "--dry-run"], { encoding: "utf-8" });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Review install plan/);
    assert.doesNotMatch(r.stdout, /Next project-start command/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
