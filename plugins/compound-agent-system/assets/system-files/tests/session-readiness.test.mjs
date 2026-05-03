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

function baseTask(overrides = {}) {
  return {
    id: "t-001",
    goal: "Phase 1",
    state: "in_progress",
    dod: [{ check: "test", command: "echo ok", passed_at: null }],
    blocked_by: [],
    handoffs: [{ checkpoint_id: "cp-1", path: ".omc/state/checkpoints/cp-1.json" }],
    env_contract: { status: "ready", node: ">=18", runtime_dependencies: "zero" },
    worktree_state: { status: "clean" },
    ...overrides,
  };
}

function makeLedger(dir, overrides = {}) {
  const ledger = {
    version: "1",
    schema_url: ".agents/PROTOCOL.md",
    current: "t-001",
    tasks: [baseTask()],
    log: [
      { event: "context-refresh", ts: "2026-04-30T00:00:00.000Z", task: "t-001" },
      { event: "compound-register", ts: "2026-04-30T00:01:00.000Z", task: "t-001" },
    ],
    ...overrides,
  };
  const path = join(dir, "TASKS.json");
  writeFileSync(path, JSON.stringify(ledger, null, 2));
  return path;
}

function writeCheckpoint(dir, name = "cp-1.json") {
  mkdirSync(join(dir, ".agents"), { recursive: true });
  mkdirSync(join(dir, ".omc", "state", "checkpoints"), { recursive: true });
  writeFileSync(join(dir, ".omc", "state", "checkpoints", name), "{}");
}

function run(path, mode = "enforce") {
  return spawnSync(process.execPath, [CLI], { encoding: "utf-8", env: { ...process.env, COMPOUND_TASKS_PATH: path, COMPOUND_MODE: mode } });
}

function jsonFrom(stdout) {
  return JSON.parse(stdout.split("\nJSON:\n").at(-1));
}

test("ready scenario reports READY only when every premium condition is met", () => {
  const dir = mkdtempSync(join(tmpdir(), "readiness-ready-"));
  try {
    writeCheckpoint(dir);
    const path = makeLedger(dir);
    const r = run(path, "enforce");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Long-session readiness: READY/);
    assert.match(r.stdout, /handoff contract: yes/);
    assert.match(r.stdout, /env contract: ready/);
    assert.match(r.stdout, /worktree state: clean/);
    assert.match(r.stdout, /unattended safe: yes/);
    assert.deepEqual(jsonFrom(r.stdout).unlock_steps, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("empty checkpoint directory does not satisfy readiness", () => {
  const dir = mkdtempSync(join(tmpdir(), "readiness-empty-checkpoint-"));
  try {
    mkdirSync(join(dir, ".omc", "state", "checkpoints"), { recursive: true });
    const path = makeLedger(dir, { tasks: [baseTask({ handoffs: [] })] });
    const r = run(path, "enforce");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Long-session readiness: NOT_READY/);
    assert.match(r.stdout, /handoff checkpoint: missing/);
    assert.match(r.stdout, /\[handoff_checkpoint\]/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("not-ready scenario prints structured unlock steps", () => {
  const dir = mkdtempSync(join(tmpdir(), "readiness-not-"));
  try {
    const path = makeLedger(dir, {
      tasks: [baseTask({ handoffs: [], env_contract: null, worktree_state: { status: "dirty", files: ["src/a.mjs"] } })],
      log: [],
    });
    const r = run(path, "warn");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Long-session readiness: NOT_READY/);
    assert.match(r.stdout, /\[last_context_refresh\]/);
    assert.match(r.stdout, /command: Append a context-refresh ledger event/);
    assert.match(r.stdout, /\[env_contract\]/);
    assert.match(r.stdout, /\[clean_or_known_dirty\]/);
    assert.match(r.stdout, /command: export COMPOUND_MODE=enforce/);
    assert.equal(jsonFrom(r.stdout).status, "NOT_READY");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("partially ready scenario reports blockers and questions", () => {
  const dir = mkdtempSync(join(tmpdir(), "readiness-partial-"));
  try {
    writeCheckpoint(dir);
    const path = makeLedger(dir, {
      tasks: [baseTask({ blocked_by: ["Choose API scope"], open_questions: ["Which API scope?"] })],
    });
    const r = run(path, "enforce");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /known blockers: 1/);
    assert.match(r.stdout, /pending questions: 2/);
    assert.match(r.stdout, /\[known_blockers_clear\]/);
    assert.match(r.stdout, /\[pending_questions_clear\]/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("unsafe false-ready scenario refuses unresolved blockers without checkpoint", () => {
  const dir = mkdtempSync(join(tmpdir(), "readiness-false-ready-"));
  try {
    const path = makeLedger(dir, {
      tasks: [baseTask({ blocked_by: "Need operator decision", handoffs: [{ checkpoint_id: "cp-missing", path: ".omc/state/checkpoints/missing.json" }] })],
    });
    const r = run(path, "enforce");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Long-session readiness: NOT_READY/);
    assert.match(r.stdout, /unattended safe: no/);
    const result = jsonFrom(r.stdout);
    assert.equal(result.ready, false);
    assert.equal(result.checks.handoff_checkpoint, false);
    assert.equal(result.checks.handoff_contract, false);
    assert.equal(result.checks.known_blockers_clear, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("unsafe false-ready scenario refuses auto-passed manual DoD and undocumented dirty worktree", () => {
  const dir = mkdtempSync(join(tmpdir(), "readiness-manual-dirty-"));
  try {
    writeCheckpoint(dir);
    const path = makeLedger(dir, {
      tasks: [
        baseTask({
          dod: [{ check: "manual", description: "Robin confirms production behavior", passed_at: "2026-04-30T00:02:00.000Z" }],
          worktree_state: { status: "dirty", files: ["SESSION.md"] },
        }),
      ],
    });
    const r = run(path, "enforce");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Long-session readiness: NOT_READY/);
    assert.match(r.stdout, /manual DoD safe: no/);
    assert.match(r.stdout, /worktree state: unsafe/);
    const result = jsonFrom(r.stdout);
    assert.equal(result.checks.manual_dod_safe, false);
    assert.equal(result.checks.clean_or_known_dirty, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
