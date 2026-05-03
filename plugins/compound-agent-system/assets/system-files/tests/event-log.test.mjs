import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { appendEvent, createEvent, readEvents } from "../.agents/event-log.mjs";
import { writeCheckpoint } from "../handoff-bridge.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const TASK = join(ROOT, ".agents", "task.mjs");
const AGENT_ACTIVATE = join(ROOT, ".agents", "agent-activate.mjs");
const READINESS = join(ROOT, ".agents", "session-readiness.mjs");
const INSTALL = resolve(ROOT, "..", "..", "scripts", "install-compound-system.mjs");

function workspace() {
  const dir = mkdtempSync(join(tmpdir(), "compound-event-log-"));
  const ledger = join(dir, ".agents", "TASKS.json");
  mkdirSync(join(dir, ".agents"), { recursive: true });
  writeFileSync(ledger, JSON.stringify({ version: "1", schema_url: ".agents/PROTOCOL.md", current: null, tasks: [], agents_active: [], agent_profiles: {}, log: [] }, null, 2) + "\n");
  writeFileSync(join(dir, ".agents", "wizard-state.json"), JSON.stringify({ skipped: true }, null, 2) + "\n");
  return { dir, ledger, events: join(dir, ".agents", "events.jsonl") };
}

function run(script, args, cwd, ledger, env = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, COMPOUND_NODE: process.execPath, COMPOUND_TASKS_PATH: ledger, COMPOUND_GROUNDED: "Task 22 event log test.", ...env },
  });
}

test("createEvent redacts sensitive context and command values", () => {
  const bearerScheme = ["Be", "arer"].join("");
  const authHeader = ["Author", "ization"].join("");
  const passwordAssignment = ["pass", "word=supersecret"].join("");
  const event = createEvent({
    event: "probe",
    command: `curl -H '${authHeader}: ${bearerScheme} ${"a".repeat(16)}'`,
    result: { status: "ok", token: `${["s", "k"].join("")}-${"a".repeat(16)}` },
    context: {
      api_key: `${["g", "sk"].join("")}_${"a".repeat(16)}`,
      nested: { password: passwordAssignment, file: "/home/alice/project/.env" },
      safe_count: 2,
    },
    timestamp: "2026-05-03T13:00:00.000Z",
  });

  const text = JSON.stringify(event);
  assert.equal(event.schema_version, "compound-event-log.v1");
  assert.equal(event.command.includes(`${bearerScheme} ${"a".repeat(16)}`), false);
  assert.equal(event.context.api_key, "[REDACTED]");
  assert.equal(event.context.nested.password, "[REDACTED]");
  assert.equal(text.includes("alice"), false);
  assert.equal(event.context.safe_count, 2);
});

test("appendEvent appends JSONL records without rewriting prior records", () => {
  const dir = mkdtempSync(join(tmpdir(), "compound-event-append-"));
  try {
    const log = join(dir, "events.jsonl");
    appendEvent({ logPath: log, event: "first", command: "test", result: { status: "ok" }, context: { n: 1 }, timestamp: "2026-05-03T13:00:00.000Z" });
    const before = readFileSync(log, "utf-8");
    appendEvent({ logPath: log, event: "second", command: "test", result: { status: "ok" }, context: { n: 2 }, timestamp: "2026-05-03T13:00:01.000Z" });
    const after = readFileSync(log, "utf-8");
    assert.equal(after.startsWith(before), true);
    assert.deepEqual(readEvents(log).map((event) => event.event), ["first", "second"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("task CLI logs representative task transitions and quality checks", () => {
  const { dir, ledger, events } = workspace();
  try {
    let r = run(TASK, ["ack", "devin-event-test"], dir, ledger);
    assert.equal(r.status, 0, r.stderr);
    const sensitiveGoal = `Need ${["pass", "word=hidden"].join("")} in raw goal`;
    r = run(TASK, ["open", sensitiveGoal, "--dod", "test:node -e \"process.exit(0)\"", "--skill", "compound-agent-system"], dir, ledger);
    assert.equal(r.status, 0, r.stderr);
    const data = JSON.parse(readFileSync(ledger, "utf-8"));
    const id = data.current;
    r = run(TASK, ["verify", id], dir, ledger);
    assert.equal(r.status, 0, r.stderr);
    r = run(TASK, ["done", id], dir, ledger);
    assert.equal(r.status, 0, r.stderr);

    const records = readEvents(events);
    assert.deepEqual(records.map((event) => event.event), ["ack", "task-open", "quality-check", "task-done"]);
    assert.ok(records.every((event) => event.timestamp && event.command && event.result && event.context));
    assert.equal(records[1].context.goal_present, true);
    assert.equal("goal" in records[1].context, false);
    assert.equal(JSON.stringify(records).includes(sensitiveGoal), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("agent activation, readiness, handoff, and install emit audit events", () => {
  const { dir, ledger, events } = workspace();
  try {
    let r = run(AGENT_ACTIVATE, ["--id", "claude-opus-4.7", "--role", "planner", "--skill", "compound-agent-system"], dir, ledger);
    assert.equal(r.status, 0, r.stderr);
    r = run(TASK, ["open", "handoff event", "--dod", "test:node -e \"process.exit(0)\"", "--skill", "compound-agent-system"], dir, ledger);
    assert.equal(r.status, 0, r.stderr);
    writeCheckpoint({ cwd: dir, ledgerPath: ledger, taskId: "t-001", from: "claude-opus-4.7", summary: "safe handoff summary", out: "handoffs/cp.json" });
    assert.equal(JSON.parse(readFileSync(ledger, "utf-8")).log.at(-1).event, "handoff-checkpoint");
    assert.match(readFileSync(events, "utf-8"), /handoff-checkpoint/);
    r = run(READINESS, [], dir, ledger, { COMPOUND_MODE: "warn" });
    assert.equal(r.status, 0, r.stderr);

    const target = mkdtempSync(join(tmpdir(), "compound-install-event-"));
    try {
      const install = spawnSync(process.execPath, [INSTALL, "--target", target], { encoding: "utf-8" });
      assert.equal(install.status, 0, install.stderr);
      const installEvents = readEvents(join(target, ".agents", "events.jsonl"));
      assert.equal(installEvents.at(-1).event, "install");
      assert.equal(installEvents.at(-1).result.status, "ok");
    } finally {
      rmSync(target, { recursive: true, force: true });
    }

    const names = readEvents(events).map((event) => event.event);
    assert.ok(names.includes("agent-activate"));
    assert.ok(names.includes("handoff-checkpoint"));
    assert.ok(names.includes("readiness-decision"));
    assert.equal(existsSync(events), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
