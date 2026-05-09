import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CLI = join(ROOT, ".agents", "task.mjs");

function freshLedger() {
  const dir = mkdtempSync(join(tmpdir(), "compound-mode-"));
  const ledger = join(dir, ".agents", "TASKS.json");
  mkdirSync(dirname(ledger), { recursive: true });
  writeFileSync(ledger, JSON.stringify({ version: "1", schema_url: ".agents/PROTOCOL.md", current: null, tasks: [], agents_active: [], log: [] }, null, 2));
  return { dir, ledger };
}

function run(ledger, args, env = {}) {
  const fullEnv = { ...process.env, COMPOUND_TASKS_PATH: ledger, ...env };
  if (!("COMPOUND_GROUNDED" in env)) delete fullEnv.COMPOUND_GROUNDED;
  return spawnSync(process.execPath, [CLI, ...args], { encoding: "utf-8", env: fullEnv });
}

test("state-changing commands follow observe, warn, enforce, and legacy modes", () => {
  const commands = [
    ["ack", "devin-mode"],
    ["open", "mode task", "--dod", "test:echo ok"],
    ["update", "t-001", "--skill", "mode-policy"],
    ["verify", "t-001"],
    ["park", "t-001", "--reason", "mode"],
    ["resume", "t-001"],
    ["block", "t-001", "--reason", "mode", "--unlock", "retry"],
    ["abandon", "t-001", "--reason", "mode"],
  ];
  for (const mode of ["observe", "warn"]) {
    const { dir, ledger } = freshLedger();
    try {
      for (const args of commands) assert.equal(run(ledger, args, { COMPOUND_MODE: mode }).status, 0, `${mode}: ${args.join(" ")}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  for (const env of [{ COMPOUND_MODE: "enforce" }, { COMPOUND_ENFORCE: "1" }]) {
    const { dir, ledger } = freshLedger();
    try {
      assert.equal(run(ledger, ["ack", "devin-mode"], env).status, 2);
      assert.equal(run(ledger, ["ack", "devin-mode"], { ...env, COMPOUND_GROUNDED: "User approved mode-policy test." }).status, 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("import and migrate obey enforce grounding", () => {
  const { dir, ledger } = freshLedger();
  try {
    const plan = join(dir, "plan.md");
    writeFileSync(plan, "<!-- COMPOUND: active -->\n[COMPOUND-PHASE id=mode-import goal=\"mode\" dod=\"test:echo ok\"]\n");
    assert.equal(run(ledger, ["import", plan, "--apply"], { COMPOUND_MODE: "enforce" }).status, 2);
    assert.equal(run(ledger, ["import", plan, "--apply"], { COMPOUND_MODE: "enforce", COMPOUND_GROUNDED: "User approved import." }).status, 0);
    rmSync(join(dir, ".grounded"), { force: true });
    const old = join(dir, "old.json");
    writeFileSync(old, JSON.stringify({ current: null, tasks: [] }, null, 2));
    assert.equal(run(old, ["migrate", "--apply"], { COMPOUND_MODE: "enforce" }).status, 2);
    assert.equal(run(old, ["migrate", "--apply"], { COMPOUND_MODE: "enforce", COMPOUND_GROUNDED: "User approved migration." }).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("hook pre-edit and status/doctor expose mode policy", () => {
  const { dir, ledger } = freshLedger();
  try {
    const preEdit = run(ledger, ["hook", "pre-edit"], { COMPOUND_MODE: "enforce" });
    assert.equal(preEdit.status, 2);
    assert.match(preEdit.stderr, /No in_progress task/);
    const status = run(ledger, ["status"], { COMPOUND_MODE: "observe" });
    assert.equal(status.status, 0, status.stderr);
    assert.match(status.stdout, /mode: observe/);
    assert.match(status.stdout, /Switch after the first smoke test passes/);
    assert.match(status.stdout, /switch: export COMPOUND_MODE=enforce/);
    assert.match(status.stdout, /PowerShell switch: \$env:COMPOUND_MODE = 'enforce'/);
    const doctor = run(ledger, ["doctor"], { COMPOUND_MODE: "enforce" });
    assert.equal(doctor.status, 0, doctor.stderr);
    const report = JSON.parse(doctor.stdout.slice(doctor.stdout.indexOf("{")));
    assert.equal(report.checks.mode.current, "enforce");
    assert.equal(report.checks.mode.policy.exit_code, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
