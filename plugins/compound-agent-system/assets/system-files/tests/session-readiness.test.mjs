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

function checkpointContract(taskId = "t-001") {
  return {
    schema_version: "handoff-contract.v2",
    schema_path: "schemas/handoff-contract.v2.json",
    checkpoint_id: `cp-20260503T160000Z-${taskId}`,
    created_at: "2026-05-03T16:00:00.000Z",
    trigger: { type: "manual" },
    from_agent: { id: "devin-test" },
    to_agent: { target: "codex" },
    task_state: {
      id: taskId,
      goal: "Phase 1",
      state: "in_progress",
      skills: ["compound-agent-system"],
      dod: [{ check: "test", command: "echo ok", passed_at: null }],
      ledger_path: ".agents/TASKS.json",
      ledger_current: taskId,
      updated_at: "2026-05-03T16:00:00.000Z",
      pending_steps: [],
    },
    context_summary: "Ready fixture checkpoint.",
    completed_chunks: [],
    pending_decisions: [],
    artifacts: [],
    risks: [],
    resume_commands: [],
    commands_run: [],
    verification: [],
    safety: { shareable: true, redactions: [] },
  };
}

function readyCheckpointContract(taskId = "t-001") {
  const contract = checkpointContract(taskId);
  contract.resume_commands = [{
    label: "Inspect Compound ledger state",
    command: "node .agents/task.mjs status",
    cwd: ".",
    reason: "Confirms current task pointer before edits.",
  }];
  return contract;
}

function baseTask(overrides = {}) {
  return {
    id: "t-001",
    goal: "Phase 1",
    state: "in_progress",
    dod: [{ check: "test", command: "echo ok", passed_at: null }],
    blocked_by: [],
    handoffs: [{ checkpoint_id: "cp-20260503T160000Z-t-001", path: ".agents/checkpoints/t-001.handoff.json" }],
    env_contract: { node: ">=18", network: "none", runtime_dependencies: "none" },
    ...overrides,
  };
}

function makeLedger(dir, overrides = {}) {
  const ledger = {
    version: "1",
    schema_url: ".agents/PROTOCOL.md",
    current: "t-001",
    workspace_state: { state: "clean" },
    tasks: [baseTask()],
    log: [
      { event: "context-refresh", task: "t-001", ts: "2026-04-30T00:00:00.000Z" },
      { event: "compound-register", task: "t-001", ts: "2026-04-30T00:01:00.000Z" },
    ],
    ...overrides,
  };
  const path = join(dir, "TASKS.json");
  writeFileSync(path, JSON.stringify(ledger, null, 2));
  return path;
}

function writeCheckpoint(dir, contract = readyCheckpointContract()) {
  mkdirSync(join(dir, ".agents", "checkpoints"), { recursive: true });
  writeFileSync(join(dir, ".agents", "checkpoints", "t-001.handoff.json"), JSON.stringify(contract, null, 2));
}

function run(path, mode = "enforce") {
  return spawnSync(process.execPath, [CLI], {
    encoding: "utf-8",
    env: {
      ...process.env,
      COMPOUND_TASKS_PATH: path,
      COMPOUND_MODE: mode,
      NO_COLOR: "1",
    },
  });
}

function git(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf-8" });
  assert.equal(result.status, 0, result.stderr);
}

function parseResult(stdout) {
  return JSON.parse(stdout.split("\nJSON:\n")[1]);
}

test("ready scenario reports READY only when every premium condition is met", () => {
  const dir = mkdtempSync(join(tmpdir(), "readiness-ready-"));
  try {
    writeCheckpoint(dir);
    const path = makeLedger(dir);
    const r = run(path, "enforce");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Long-session readiness: READY/);
    assert.match(r.stdout, /handoff contract: valid/);
    assert.match(r.stdout, /env contract: yes/);
    assert.match(r.stdout, /workspace state: clean/);
    assert.match(r.stdout, /unattended safe: yes/);

    const result = parseResult(r.stdout);
    assert.equal(result.ready, true);
    assert.equal(Object.values(result.checks).every(Boolean), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("partially ready scenario prints structured unlock steps", () => {
  const dir = mkdtempSync(join(tmpdir(), "readiness-partial-"));
  try {
    const path = makeLedger(dir, {
      workspace_state: { state: "known-dirty", reason: "Task fixture intentionally edits generated docs." },
      tasks: [baseTask({
        blocked_by: ["Choose API scope"],
        open_questions: ["Confirm export format"],
        handoffs: [],
        env_contract: null,
      })],
    });
    const r = run(path, "warn");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Long-session readiness: NOT_READY/);
    assert.match(r.stdout, /\[known_blockers_clear\]/);
    assert.match(r.stdout, /\[pending_questions_clear\]/);
    assert.match(r.stdout, /\[checkpoint_present\]/);
    assert.match(r.stdout, /\[env_contract_present\]/);
    assert.match(r.stdout, /\[compliance_mode_enforce\]/);
    assert.match(r.stdout, /command: export COMPOUND_MODE=enforce/);

    const result = parseResult(r.stdout);
    assert.equal(result.ready, false);
    assert.deepEqual(result.pending_questions, ["Choose API scope", "Confirm export format"]);
    assert.deepEqual(
      result.unlock_steps.map((step) => step.id),
      [
        "known_blockers_clear",
        "pending_questions_clear",
        "checkpoint_present",
        "env_contract_present",
        "compliance_mode_enforce",
      ]
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("must-ask approval policy blocks long-session readiness until approved", () => {
  const dir = mkdtempSync(join(tmpdir(), "readiness-approval-"));
  try {
    writeCheckpoint(dir);
    const path = makeLedger(dir, {
      tasks: [baseTask({
        approval_policy: "must-ask",
        approval_category: "external-apis",
        approval_state: "pending-human-approval",
        human_approval: { required: true, approved_at: null, approver: null },
      })],
    });
    const r = run(path, "enforce");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Long-session readiness: NOT_READY/);
    assert.match(r.stdout, /\[must_ask_approvals_clear\]/);

    const result = parseResult(r.stdout);
    assert.equal(result.ready, false);
    assert.equal(result.checks.must_ask_approvals_clear, false);
    assert.ok(result.unlock_steps.some((step) => step.id === "must_ask_approvals_clear"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("resolved must-ask approval policy allows readiness check to pass approval gate", () => {
  const dir = mkdtempSync(join(tmpdir(), "readiness-approval-resolved-"));
  try {
    writeCheckpoint(dir);
    const path = makeLedger(dir, {
      tasks: [baseTask({
        approval_policy: "must-ask",
        approval_category: "external-apis",
        approval_state: "approved",
        human_approval: { required: true, approved_at: "2026-05-03T16:00:00.000Z", approver: "operator" },
      })],
    });
    const r = run(path, "enforce");
    assert.equal(r.status, 0, r.stderr);
    const result = parseResult(r.stdout);
    assert.equal(result.checks.must_ask_approvals_clear, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("unsafe false-ready scenario refuses malformed handoff and unresolved manual DoD", () => {
  const dir = mkdtempSync(join(tmpdir(), "readiness-unsafe-"));
  try {
    writeCheckpoint(dir, {
      checkpoint_id: "cp-legacy",
      task_state: { id: "other-task" },
      safety: { shareable: false },
    });
    const path = makeLedger(dir, {
      tasks: [baseTask({
        dod: [
          { check: "test", command: "echo ok", passed_at: "2026-05-03T16:00:00.000Z" },
          { check: "manual", description: "Operator confirms production credentials are scoped.", passed_at: null },
        ],
      })],
    });
    const r = run(path, "enforce");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Long-session readiness: NOT_READY/);
    assert.match(r.stdout, /manual DoD: requires explicit confirmation/);
    assert.match(r.stdout, /handoff contract: missing\/invalid/);
    assert.match(r.stdout, /\[manual_dod_resolved\]/);
    assert.match(r.stdout, /\[handoff_contract_valid\]/);

    const result = parseResult(r.stdout);
    assert.equal(result.ready, false);
    assert.equal(result.checks.checkpoint_present, true);
    assert.equal(result.checks.handoff_contract_valid, false);
    assert.equal(result.checks.manual_dod_resolved, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("unsafe false-ready scenario refuses incomplete v2 handoff contracts", () => {
  const dir = mkdtempSync(join(tmpdir(), "readiness-incomplete-handoff-"));
  try {
    const incomplete = checkpointContract();
    writeCheckpoint(dir, incomplete);
    const path = makeLedger(dir);
    const r = run(path, "enforce");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Long-session readiness: NOT_READY/);
    assert.match(r.stdout, /handoff contract: missing\/invalid/);
    assert.match(r.stdout, /\[handoff_contract_valid\]/);

    const result = parseResult(r.stdout);
    assert.equal(result.checks.checkpoint_present, true);
    assert.equal(result.checks.handoff_contract_valid, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("dirty workspace without known reason does not satisfy readiness", () => {
  const dir = mkdtempSync(join(tmpdir(), "readiness-dirty-"));
  try {
    writeCheckpoint(dir);
    const path = makeLedger(dir, { workspace_state: { state: "dirty" } });
    const r = run(path, "enforce");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Long-session readiness: NOT_READY/);
    assert.match(r.stdout, /workspace state: dirty/);
    assert.match(r.stdout, /\[workspace_clean_or_known_dirty\]/);

    const result = parseResult(r.stdout);
    assert.equal(result.checks.workspace_clean_or_known_dirty, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("git dirty workspace overrides stale clean ledger metadata", () => {
  const dir = mkdtempSync(join(tmpdir(), "readiness-git-dirty-"));
  try {
    writeCheckpoint(dir);
    const path = makeLedger(dir, { workspace_state: { state: "clean" } });
    git(["init"], dir);
    git(["config", "user.email", "test@example.com"], dir);
    git(["config", "user.name", "Test Agent"], dir);
    git(["add", "."], dir);
    git(["commit", "-m", "fixture"], dir);
    writeFileSync(join(dir, "unexpected.txt"), "dirty\n");

    const r = run(path, "enforce");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Long-session readiness: NOT_READY/);
    assert.match(r.stdout, /workspace state: dirty/);

    const result = parseResult(r.stdout);
    assert.equal(result.checks.workspace_clean_or_known_dirty, false);
    assert.equal(result.workspace_state.source, "git");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
