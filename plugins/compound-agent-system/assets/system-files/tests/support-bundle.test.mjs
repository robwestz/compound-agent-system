import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CLI = join(ROOT, ".agents", "support-bundle.mjs");

function workspace() {
  const dir = mkdtempSync(join(tmpdir(), "support-bundle-"));
  const agents = join(dir, ".agents");
  mkdirSync(agents, { recursive: true });
  return { dir, agents, ledger: join(agents, "TASKS.json"), events: join(agents, "events.jsonl"), out: join(dir, "bundle") };
}

function writeFixture({ ledger, events }) {
  const token = "sk-" + "a".repeat(20);
  const password = "password=hidden";
  writeFileSync(ledger, JSON.stringify({
    version: "1",
    schema_url: ".agents/PROTOCOL.md",
    current: "t-001",
    api_key: "gsk_" + "b".repeat(20),
    workspace_state: { state: "known-dirty", reason: "Support bundle fixture edits files." },
    tasks: [{
      id: "t-001",
      goal: `Investigate outage with ${password}`,
      state: "in_progress",
      dod: [{ check: "test", command: "echo ok", passed_at: "2026-05-08T10:00:00.000Z" }],
      skills: ["compound-agent-system"],
      blocked_by: [],
      env_contract: { node: ">=18", secret_token: token },
    }],
    log: [{ event: "context-refresh", task: "t-001", ts: "2026-05-08T10:00:00.000Z" }],
  }, null, 2) + "\n");
  writeFileSync(events, [
    JSON.stringify({ schema_version: "compound-event-log.v1", timestamp: "2026-05-08T10:00:00.000Z", event: "task-open", command: `curl -H 'Authorization: Bearer ${"c".repeat(20)}'`, result: { status: "ok" }, context: { password, file: "/home/alice/repo/.env" } }),
    JSON.stringify({ schema_version: "compound-event-log.v1", timestamp: "2026-05-08T10:01:00.000Z", event: "task-done", command: "node .agents/task.mjs done t-001", result: { status: "ok" }, context: { n: 2 } }),
  ].join("\n") + "\n");
}

function run({ ledger, out }, extra = []) {
  return spawnSync(process.execPath, [CLI, "--ledger", ledger, "--out", out, ...extra], {
    encoding: "utf-8",
    env: { ...process.env, COMPOUND_TASKS_PATH: ledger, NO_COLOR: "1" },
  });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

test("support bundle exports documented local files with redacted ledger and events", () => {
  const ws = workspace();
  try {
    writeFixture(ws);
    const r = run(ws, ["--events", "1"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Review before sharing/);
    assert.equal(existsSync(join(ws.out, "manifest.json")), true);
    assert.equal(existsSync(join(ws.out, "README.md")), true);
    assert.equal(existsSync(join(ws.out, "ledger-redacted.json")), true);
    assert.equal(existsSync(join(ws.out, "events-recent-redacted.json")), true);
    assert.equal(existsSync(join(ws.out, "doctor.json")), true);
    assert.equal(existsSync(join(ws.out, "readiness.json")), true);

    const manifest = readJson(join(ws.out, "manifest.json"));
    assert.equal(manifest.schema_version, "compound-support-bundle.v1");
    assert.match(manifest.warning, /Review before sharing/);
    assert.ok(manifest.files.includes("doctor.json"));
    assert.ok(manifest.files.includes("readiness.json"));

    const ledgerText = readFileSync(join(ws.out, "ledger-redacted.json"), "utf-8");
    assert.equal(ledgerText.includes("sk-" + "a".repeat(20)), false);
    assert.equal(ledgerText.includes("gsk_" + "b".repeat(20)), false);
    assert.equal(ledgerText.includes("password=hidden"), false);
    const ledger = JSON.parse(ledgerText);
    assert.equal(ledger.api_key, "[REDACTED]");
    assert.equal(ledger.tasks[0].goal_present, true);
    assert.equal("goal" in ledger.tasks[0], false);
    assert.equal(ledger.tasks[0].env_contract.secret_token, "[REDACTED]");

    const events = readJson(join(ws.out, "events-recent-redacted.json"));
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "task-done");
    const eventText = JSON.stringify(events);
    assert.equal(eventText.includes("Bearer " + "c".repeat(20)), false);
    assert.equal(eventText.includes("alice"), false);
  } finally {
    rmSync(ws.dir, { recursive: true, force: true });
  }
});

test("support bundle refuses to overwrite an existing output directory", () => {
  const ws = workspace();
  try {
    writeFixture(ws);
    mkdirSync(ws.out, { recursive: true });
    const r = run(ws);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Refusing to overwrite existing support bundle directory/);
  } finally {
    rmSync(ws.dir, { recursive: true, force: true });
  }
});

test("support bundle refuses output outside the workspace", () => {
  const ws = workspace();
  try {
    writeFixture(ws);
    const outside = join(tmpdir(), `support-bundle-outside-${Date.now()}`);
    const r = run({ ledger: ws.ledger, out: outside });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /output must be inside the workspace/);
    assert.equal(existsSync(outside), false);
  } finally {
    rmSync(ws.dir, { recursive: true, force: true });
  }
});

test("support bundle still exports diagnostics when the ledger is malformed", () => {
  const ws = workspace();
  try {
    writeFileSync(ws.ledger, "{ bad json");
    const r = run(ws);
    assert.equal(r.status, 0, r.stderr);
    const ledger = readJson(join(ws.out, "ledger-redacted.json"));
    assert.match(ledger.error, /JSON/);
    const doctor = readJson(join(ws.out, "doctor.json"));
    assert.equal(doctor.ok, true);
    assert.equal(doctor.report.status, "FAIL");
    assert.equal(doctor.report.checks.ledger.status, "invalid");
  } finally {
    rmSync(ws.dir, { recursive: true, force: true });
  }
});
