import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYSTEM_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(SYSTEM_ROOT, "..", "..", "..", "..");
const TASK = join(SYSTEM_ROOT, ".agents", "task.mjs");
const BOOTSTRAP = join(REPO_ROOT, "bootstrap.mjs");

function workspace() {
  const dir = mkdtempSync(join(tmpdir(), "compound-compat-"));
  const agents = join(dir, ".agents");
  mkdirSync(agents, { recursive: true });
  return { dir, agents, ledger: join(agents, "TASKS.json") };
}

function runTask(ledger, args, extraEnv = {}) {
  return spawnSync(process.execPath, [TASK, ...args], {
    encoding: "utf-8",
    env: { ...process.env, COMPOUND_TASKS_PATH: ledger, NO_COLOR: "1", ...extraEnv },
  });
}

test("legacy ledger migration preserves user task state and writes a backup", () => {
  const ws = workspace();
  try {
    writeFileSync(ws.ledger, JSON.stringify({
      schema_url: ".agents/PROTOCOL.md",
      current: "legacy-1",
      tasks: [{
        id: "legacy-1",
        goal: "Preserve existing user task",
        state: "in_progress",
        dod: [{ check: "manual", description: "user confirms", passed_at: null }],
        custom_field: "keep-me",
      }],
      agents_active: ["legacy-agent"],
      log: [{ event: "legacy", task: "legacy-1" }],
      workspace_state: { state: "clean" },
    }, null, 2) + "\n");
    const status = runTask(ws.ledger, ["status"]);
    assert.equal(status.status, 0, status.stderr);
    assert.match(status.stdout, /migration_needed/);
    assert.match(status.stdout, /Deprecated ledger schema v0/);
    assert.match(status.stdout, /migrate --apply/);

    const migrated = runTask(ws.ledger, ["migrate", "--apply"], { COMPOUND_GROUNDED: "compatibility migration test" });
    assert.equal(migrated.status, 0, migrated.stderr);
    assert.match(migrated.stdout, /Deprecated ledger schema v0/);
    assert.match(migrated.stdout, /Backup:/);
    const ledger = JSON.parse(readFileSync(ws.ledger, "utf-8"));
    assert.equal(ledger.version, "1");
    assert.equal(ledger.current, "legacy-1");
    assert.equal(ledger.tasks[0].goal, "Preserve existing user task");
    assert.equal(ledger.tasks[0].custom_field, "keep-me");
    assert.equal(ledger.workspace_state.state, "clean");
  } finally {
    rmSync(ws.dir, { recursive: true, force: true });
  }
});

test("bootstrap upgrade preserves an existing installed ledger", () => {
  const ws = workspace();
  try {
    writeFileSync(ws.ledger, JSON.stringify({
      version: "1",
      schema_url: ".agents/PROTOCOL.md",
      current: "existing-1",
      tasks: [{
        id: "existing-1",
        goal: "Existing installed harness task",
        state: "in_progress",
        dod: [{ check: "test", command: "echo ok", passed_at: null }],
        skills: ["compound-agent-system"],
      }],
      agents_active: ["existing-agent"],
      log: [],
    }, null, 2) + "\n");
    const bootstrap = spawnSync(process.execPath, [BOOTSTRAP, "--target", ws.dir], { encoding: "utf-8" });
    assert.equal(bootstrap.status, 0, bootstrap.stderr);
    const ledger = JSON.parse(readFileSync(ws.ledger, "utf-8"));
    assert.equal(ledger.current, "existing-1");
    assert.equal(ledger.tasks[0].goal, "Existing installed harness task");
    assert.equal(ledger.agents_active[0], "existing-agent");
  } finally {
    rmSync(ws.dir, { recursive: true, force: true });
  }
});

test("compatibility contract defines stable deprecated and internal surfaces", () => {
  const doc = readFileSync(join(REPO_ROOT, "docs", "backward-compatibility-contract.md"), "utf-8");
  assert.match(doc, /Stable surfaces/);
  assert.match(doc, /Deprecated surfaces/);
  assert.match(doc, /Internal surfaces/);
  assert.match(doc, /node \.agents\/task\.mjs migrate --apply/);
  assert.match(doc, /2\.0\.0/);
  assert.match(doc, /Existing ledgers are not overwritten/);
});
