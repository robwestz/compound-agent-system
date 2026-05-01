import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname as pathDirname } from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CLI = join(ROOT, ".agents", "task.mjs");

function workspace() {
  const dir = mkdtempSync(join(tmpdir(), "compound-doctor-"));
  const agents = join(dir, ".agents");
  mkdirSync(agents, { recursive: true });
  const ledger = join(agents, "TASKS.json");
  return { dir, ledger };
}

function run(ledger, args, extraEnv = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf-8",
    env: { ...process.env, COMPOUND_NODE: process.execPath, COMPOUND_TASKS_PATH: ledger, ...extraEnv },
  });
}

function writeLedger(path, data) {
  mkdirSync(pathDirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

function parseDoctor(stdout) {
  const jsonStart = stdout.indexOf("{");
  assert.notEqual(jsonStart, -1, stdout);
  return JSON.parse(stdout.slice(jsonStart));
}

test("doctor reports malformed TASKS.json without overwriting it", () => {
  const { dir, ledger } = workspace();
  try {
    writeFileSync(ledger, "{ bad json");
    const r = run(ledger, ["doctor"]);
    assert.equal(r.status, 0, r.stderr);
    const report = parseDoctor(r.stdout);
    assert.equal(report.status, "FAIL");
    assert.equal(report.checks.ledger.status, "invalid");
    assert.match(report.checks.ledger.next_action, /Restore from a known-good TASKS\.json backup/);
    assert.equal(readFileSync(ledger, "utf-8"), "{ bad json");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("doctor reports missing hooks with a safe activation command", () => {
  const { dir, ledger } = workspace();
  try {
    writeLedger(ledger, { version: "1", schema_url: ".agents/PROTOCOL.md", current: null, tasks: [], agents_active: [], log: [] });
    const r = run(ledger, ["doctor"]);
    assert.equal(r.status, 0, r.stderr);
    const report = parseDoctor(r.stdout);
    assert.equal(report.checks.hooks.status, "missing");
    assert.match(report.checks.hooks.next_action, /activate\.mjs/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("doctor reports security boundary docs and fixture secret scan", () => {
  const { dir, ledger } = workspace();
  try {
    mkdirSync(join(dir, "docs"), { recursive: true });
    mkdirSync(join(dir, "fixtures"), { recursive: true });
    writeFileSync(join(dir, "docs", "security-boundary-model.md"), "# Security Boundary Model\n");
    writeFileSync(join(dir, "docs", "secrets-and-ai-policy.md"), "# Secrets and Optional AI Policy\n");
    writeFileSync(join(dir, "fixtures", "example.md"), "placeholder token: <key>\n");
    writeLedger(ledger, { version: "1", schema_url: ".agents/PROTOCOL.md", current: null, tasks: [], agents_active: [], log: [] });
    const r = run(ledger, ["doctor"]);
    assert.equal(r.status, 0, r.stderr);
    const report = parseDoctor(r.stdout);
    assert.equal(report.checks.security.ok, true);
    assert.equal(report.checks.security.docs.security_model, true);
    assert.equal(report.checks.security.docs.secrets_ai_policy, true);
    assert.equal(report.checks.security.fixture_secrets.ok, true);
    assert.deepEqual(report.checks.security.fixture_secrets.findings, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("doctor reports fixture secret findings with a recovery action", () => {
  const { dir, ledger } = workspace();
  try {
    mkdirSync(join(dir, "docs"), { recursive: true });
    mkdirSync(join(dir, "fixtures"), { recursive: true });
    writeFileSync(join(dir, "docs", "security-boundary-model.md"), "# Security Boundary Model\n");
    writeFileSync(join(dir, "docs", "secrets-and-ai-policy.md"), "# Secrets and Optional AI Policy\n");
    writeFileSync(join(dir, "fixtures", "bad.md"), "GROQ_API_KEY=gsk_abcdefghijklmnopqrstuvwxyz123456\n");
    writeLedger(ledger, { version: "1", schema_url: ".agents/PROTOCOL.md", current: null, tasks: [], agents_active: [], log: [] });
    const r = run(ledger, ["doctor"]);
    assert.equal(r.status, 0, r.stderr);
    const report = parseDoctor(r.stdout);
    assert.equal(report.checks.security.ok, false);
    assert.equal(report.checks.security.next_action, "Remove real-looking secrets from fixtures or replace them with documented placeholders.");
    assert.match(report.checks.security.fixture_secrets.next_action, /Remove real-looking secrets/);
    assert.equal(report.checks.security.fixture_secrets.findings[0].type, "groq-key");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("doctor security next_action only names missing docs", () => {
  const { dir, ledger } = workspace();
  try {
    mkdirSync(join(dir, "docs"), { recursive: true });
    writeFileSync(join(dir, "docs", "security-boundary-model.md"), "# Security Boundary Model\n");
    writeLedger(ledger, { version: "1", schema_url: ".agents/PROTOCOL.md", current: null, tasks: [], agents_active: [], log: [] });
    const r = run(ledger, ["doctor"]);
    assert.equal(r.status, 0, r.stderr);
    const report = parseDoctor(r.stdout);
    assert.equal(report.checks.security.ok, false);
    assert.equal(report.checks.security.next_action, "Add docs/secrets-and-ai-policy.md.");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("doctor reports pass state with hooks, current task, mode, and Node support", () => {
  const { dir, ledger } = workspace();
  try {
    mkdirSync(join(dir, "docs"), { recursive: true });
    mkdirSync(join(dir, "fixtures"), { recursive: true });
    writeFileSync(join(dir, "docs", "security-boundary-model.md"), "# Security Boundary Model\n");
    writeFileSync(join(dir, "docs", "secrets-and-ai-policy.md"), "# Secrets and Optional AI Policy\n");
    writeFileSync(join(dir, "fixtures", "example.md"), "placeholder token: <key>\n");
    writeLedger(ledger, {
      version: "1",
      schema_url: ".agents/PROTOCOL.md",
      current: "t-001",
      tasks: [{ id: "t-001", goal: "active", state: "in_progress", dod: [{ check: "test", command: "echo ok" }] }],
      agents_active: [],
      log: [],
    });
    mkdirSync(join(dir, ".claude"), { recursive: true });
    writeFileSync(join(dir, ".claude", "settings.json"), JSON.stringify({
      hooks: {
        SessionStart: [{ hooks: [{ type: "command", command: "node .agents/task.mjs hook session-start" }] }],
        PreToolUse: [{ matcher: "Edit|Write", hooks: [{ type: "command", command: "node .agents/task.mjs hook pre-edit" }] }],
        Stop: [{ hooks: [{ type: "command", command: "node .agents/task.mjs hook stop" }] }],
      },
    }, null, 2));
    const r = run(ledger, ["doctor"], { COMPOUND_MODE: "enforce" });
    assert.equal(r.status, 0, r.stderr);
    const report = parseDoctor(r.stdout);
    assert.equal(report.status, "PASS");
    assert.equal(report.checks.ledger.current_task, "t-001");
    assert.equal(report.checks.hooks.status, "ok");
    assert.equal(report.checks.mode.current, "enforce");
    assert.equal(report.checks.node.ok, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("doctor reports unsupported Node with one safe next action", () => {
  const { dir, ledger } = workspace();
  try {
    writeLedger(ledger, { version: "1", schema_url: ".agents/PROTOCOL.md", current: null, tasks: [], agents_active: [], log: [] });
    const r = run(ledger, ["doctor"], { COMPOUND_DOCTOR_NODE_VERSION: "v16.20.0" });
    assert.equal(r.status, 0, r.stderr);
    const report = parseDoctor(r.stdout);
    assert.equal(report.checks.node.ok, false);
    assert.equal(report.checks.node.next_action, "Install Node 18 or newer.");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("doctor detects duplicate task ids and does not silently pass", () => {
  const { dir, ledger } = workspace();
  try {
    writeLedger(ledger, {
      version: "1",
      schema_url: ".agents/PROTOCOL.md",
      current: "dup",
      tasks: [
        { id: "dup", goal: "first", state: "open", dod: [] },
        { id: "dup", goal: "second", state: "open", dod: [] },
      ],
      agents_active: [],
      log: [],
    });
    const r = run(ledger, ["doctor"]);
    assert.equal(r.status, 0, r.stderr);
    const report = parseDoctor(r.stdout);
    assert.equal(report.checks.ledger.status, "duplicate_task_ids");
    assert.deepEqual(report.checks.ledger.duplicate_task_ids, ["dup"]);
    assert.match(report.checks.ledger.next_action, /Resolve duplicate task ids manually/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("migrate dry-run reports old schema without writing", () => {
  const { dir, ledger } = workspace();
  try {
    writeLedger(ledger, { current: null, tasks: [{ id: "legacy", goal: "old", state: "open", dod: [] }] });
    const r = run(ledger, ["migrate"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Ledger migration: 0 -> 1/);
    assert.match(r.stdout, /Dry-run/);
    assert.equal(JSON.parse(readFileSync(ledger, "utf-8")).version, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("migrate --apply backs up and writes current schema", () => {
  const { dir, ledger } = workspace();
  try {
    writeLedger(ledger, { current: null, tasks: [{ id: "legacy", goal: "old", state: "open", dod: [] }] });
    const r = run(ledger, ["migrate", "--apply"], { COMPOUND_GROUNDED: "User approved safe ledger migration." });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Backup:/);
    const migrated = JSON.parse(readFileSync(ledger, "utf-8"));
    assert.equal(migrated.version, "1");
    assert.equal(migrated.tasks[0].id, "legacy");
    assert.ok(existsSync(r.stdout.match(/Backup: (.+)/)[1].trim()));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("migrate refuses unsupported future schema", () => {
  const { dir, ledger } = workspace();
  try {
    writeLedger(ledger, { version: "99", current: null, tasks: [] });
    const r = run(ledger, ["migrate", "--apply"], { COMPOUND_GROUNDED: "User approved safe ledger migration." });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /Refusing to downgrade unsupported ledger version 99/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
