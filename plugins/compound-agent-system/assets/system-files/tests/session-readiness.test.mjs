import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CLI = join(ROOT, ".agents", "session-readiness.mjs");

function makeLedger(dir, overrides = {}) {
  const ledger = {
    version: "1",
    schema_url: ".agents/PROTOCOL.md",
    current: "t-001",
    tasks: [
      { id: "t-001", goal: "Phase 1", state: "in_progress", dod: [{ check: "test", command: "echo ok", passed_at: null }], blocked_by: [], handoffs: [{ checkpoint_id: "cp-1", path: ".omc/state/checkpoints/cp-1.json" }] },
    ],
    log: [
      { event: "context-refresh", ts: "2026-04-30T00:00:00.000Z" },
      { event: "compound-register", ts: "2026-04-30T00:01:00.000Z" },
    ],
    ...overrides,
  };
  const path = join(dir, "TASKS.json");
  writeFileSync(path, JSON.stringify(ledger, null, 2));
  return path;
}

function run(path, mode = "enforce") {
  return spawnSync(process.execPath, [CLI], { encoding: "utf-8", env: { ...process.env, COMPOUND_TASKS_PATH: path, COMPOUND_MODE: mode } });
}

test("ready scenario reports READY", () => {
  const dir = mkdtempSync(join(tmpdir(), "readiness-ready-"));
  try {
    mkdirSync(join(dir, ".omc", "state", "checkpoints"), { recursive: true });
    writeFileSync(join(dir, ".omc", "state", "checkpoints", "cp-1.json"), "{}");
    const path = makeLedger(dir);
    const r = run(path, "enforce");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Long-session readiness: READY/);
    assert.match(r.stdout, /unattended safe: yes/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("empty checkpoint directory does not satisfy readiness", () => {
  const dir = mkdtempSync(join(tmpdir(), "readiness-empty-checkpoint-"));
  try {
    mkdirSync(join(dir, ".omc", "state", "checkpoints"), { recursive: true });
    const path = makeLedger(dir, { tasks: [{ id: "t-001", goal: "Phase 1", state: "in_progress", dod: [{ check: "test", command: "echo ok" }], blocked_by: [], handoffs: [] }] });
    const r = run(path, "enforce");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Long-session readiness: NOT_READY/);
    assert.match(r.stdout, /handoff checkpoint: missing/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("not-ready scenario reports missing enforce mode and checkpoint", () => {
  const dir = mkdtempSync(join(tmpdir(), "readiness-not-"));
  try {
    const path = makeLedger(dir, { tasks: [{ id: "t-001", goal: "Phase 1", state: "in_progress", dod: [{ check: "test", command: "echo ok" }], blocked_by: [] }], log: [] });
    const r = run(path, "warn");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Long-session readiness: NOT_READY/);
    assert.match(r.stdout, /Set COMPOUND_MODE=enforce/);
    assert.match(r.stdout, /handoff checkpoint/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("partially ready scenario reports blockers", () => {
  const dir = mkdtempSync(join(tmpdir(), "readiness-partial-"));
  try {
    const path = makeLedger(dir, { tasks: [{ id: "t-001", goal: "Phase 1", state: "in_progress", dod: [{ check: "test", command: "echo ok" }], blocked_by: ["Choose API scope"], handoffs: [{ checkpoint_id: "cp-1" }] }] });
    const r = run(path, "enforce");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /known blockers: 1/);
    assert.match(r.stdout, /Resolve blockers/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
