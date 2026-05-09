import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYSTEM_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(SYSTEM_ROOT, "..", "..", "..", "..");
const TASK = join(SYSTEM_ROOT, ".agents", "task.mjs");
const READINESS = join(SYSTEM_ROOT, ".agents", "session-readiness.mjs");
const VALIDATOR = join(REPO_ROOT, "plugins", "compound-agent-system", "scripts", "validate-package.mjs");
const DOC = join(REPO_ROOT, "docs", "performance-and-scale-limits.md");
const LIMIT_MS = 2500;

function largeLedger(taskCount = 1000) {
  return {
    version: "1",
    schema_url: ".agents/PROTOCOL.md",
    current: "t-0001",
    workspace_state: { state: "known-dirty", reason: "performance fixture" },
    tasks: Array.from({ length: taskCount }, (_, index) => {
      const id = `t-${String(index + 1).padStart(4, "0")}`;
      return {
        id,
        goal: `Performance fixture task ${index + 1}`,
        state: index === 0 ? "in_progress" : index % 7 === 0 ? "blocked" : "open",
        dod: [{ check: "test", command: "echo ok", passed_at: index % 3 === 0 ? "2026-05-08T00:00:00.000Z" : null }],
        skills: ["compound-agent-system"],
        blocked_by: index % 7 === 0 ? ["fixture blocker"] : [],
      };
    }),
    log: [{ event: "context-refresh", task: "t-0001", ts: "2026-05-08T00:00:00.000Z" }],
  };
}

function run(command, args, options = {}) {
  const started = process.hrtime.bigint();
  const result = spawnSync(command, args, { encoding: "utf-8", ...options });
  const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000;
  return { ...result, durationMs };
}

function workspace() {
  const dir = mkdtempSync(join(tmpdir(), "compound-scale-"));
  const ledger = join(dir, "TASKS.json");
  writeFileSync(ledger, JSON.stringify(largeLedger(), null, 2) + "\n");
  return { dir, ledger };
}

test("status remains usable with a 1000-task ledger", () => {
  const ws = workspace();
  try {
    const r = run(process.execPath, [TASK, "status"], {
      env: { ...process.env, COMPOUND_TASKS_PATH: ws.ledger, NO_COLOR: "1" },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Current: t-0001/);
    assert.match(r.stdout, /Total: 1000/);
    assert.ok(r.durationMs < LIMIT_MS, `status took ${r.durationMs} ms`);
  } finally {
    rmSync(ws.dir, { recursive: true, force: true });
  }
});

test("readiness remains bounded with a 1000-task ledger", () => {
  const ws = workspace();
  try {
    const r = run(process.execPath, [READINESS], {
      env: { ...process.env, COMPOUND_TASKS_PATH: ws.ledger, COMPOUND_MODE: "warn", NO_COLOR: "1" },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Long-session readiness: NOT_READY/);
    assert.ok(r.durationMs < LIMIT_MS, `readiness took ${r.durationMs} ms`);
  } finally {
    rmSync(ws.dir, { recursive: true, force: true });
  }
});

test("large phase-plan import dry-run remains bounded", () => {
  const ws = workspace();
  try {
    const plan = join(ws.dir, "PHASE_PLAN.md");
    const markers = Array.from({ length: 250 }, (_, index) => {
      const n = String(index + 1).padStart(3, "0");
      return `[COMPOUND-PHASE id=phase-${n} goal="Scale phase ${n}" dod="test:node .agents/task.mjs status" skills="compound-agent-system"]`;
    });
    writeFileSync(plan, ["<!-- COMPOUND: active -->", "# Scale plan", ...markers].join("\n"));
    const r = run(process.execPath, [TASK, "import", plan], {
      env: { ...process.env, COMPOUND_TASKS_PATH: ws.ledger, NO_COLOR: "1" },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /\+ 250 new task/);
    assert.ok(r.durationMs < LIMIT_MS, `import dry-run took ${r.durationMs} ms`);
  } finally {
    rmSync(ws.dir, { recursive: true, force: true });
  }
});

test("performance documentation states thresholds and known limits", () => {
  const doc = readFileSync(DOC, "utf-8");
  assert.match(doc, /1,000-task ledger/);
  assert.match(doc, /2,500 ms/);
  assert.match(doc, /Known limits/);
  const r = run(process.execPath, [VALIDATOR], { cwd: REPO_ROOT });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.durationMs < LIMIT_MS, `validator took ${r.durationMs} ms`);
});
