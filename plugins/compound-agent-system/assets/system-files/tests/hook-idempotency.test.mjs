import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYSTEM_ROOT = resolve(__dirname, "..");
function workspace() {
  const dir = mkdtempSync(join(tmpdir(), "compound-hooks-"));
  cpSync(join(SYSTEM_ROOT, ".agents"), join(dir, ".agents"), { recursive: true });
  return dir;
}

function runNode(cwd, script, args = [], env = {}) {
  return spawnSync(process.execPath, [script, ...args], { cwd, encoding: "utf-8", env: { ...process.env, ...env } });
}

test("activation is idempotent across repeated runs and preserves user hooks", () => {
  const dir = workspace();
  try {
    mkdirSync(join(dir, ".claude"), { recursive: true });
    writeFileSync(join(dir, ".claude", "settings.json"), JSON.stringify({
      hooks: {
        PreToolUse: [{ matcher: "Edit|Write", hooks: [{ type: "command", command: "echo user-hook" }] }],
      },
    }, null, 2));
    for (let i = 0; i < 3; i += 1) {
      const r = runNode(dir, ".agents/activate.mjs");
      assert.equal(r.status, 0, r.stderr);
    }
    const settings = JSON.parse(readFileSync(join(dir, ".claude", "settings.json"), "utf-8"));
    const allCommands = Object.values(settings.hooks).flatMap((entries) => entries.flatMap((entry) => entry.hooks.map((hook) => hook.command)));
    assert.equal(allCommands.filter((command) => command === "node .agents/task.mjs hook session-start").length, 1);
    assert.equal(allCommands.filter((command) => command === "node .agents/task.mjs hook pre-edit").length, 1);
    assert.equal(allCommands.filter((command) => command === "node .agents/task.mjs hook stop").length, 1);
    assert.ok(allCommands.includes("echo user-hook"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("activation handles missing settings file gracefully", () => {
  const dir = workspace();
  try {
    const r = runNode(dir, ".agents/activate.mjs");
    assert.equal(r.status, 0, r.stderr);
    assert.ok(existsSync(join(dir, ".claude", "settings.json")));
    assert.ok(existsSync(join(dir, ".agents", "TASKS.json")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("doctor reports hook ownership and client support", () => {
  const dir = workspace();
  try {
    const activate = runNode(dir, ".agents/activate.mjs");
    assert.equal(activate.status, 0, activate.stderr);
    const doctor = runNode(dir, ".agents/task.mjs", ["doctor"], { COMPOUND_TASKS_PATH: join(dir, ".agents", "TASKS.json") });
    assert.equal(doctor.status, 0, doctor.stderr);
    const report = JSON.parse(doctor.stdout.slice(doctor.stdout.indexOf("{")));
    assert.equal(report.checks.hooks.status, "ok");
    assert.match(report.checks.hooks.client_support.claude, /hooks/);
    assert.match(report.checks.hooks.client_support.codex, /shared CLI/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
