import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYSTEM_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(SYSTEM_ROOT, "..", "..", "..", "..");
const BOOTSTRAP = join(REPO_ROOT, "bootstrap.mjs");
const REQUIRED_ARTIFACTS = ["PROJECT_BRIEF.md", "GAP_SCAN.md", "DECISIONS.md", "PHASE_PLAN.md", "OPEN_QUESTIONS.md", "AGENT_ROLES.md", "DOD_MATRIX.md"];

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf-8",
    env: { ...process.env, COMPOUND_NODE: process.execPath, ...options.env },
    cwd: options.cwd,
  });
}

function runNode(args, options = {}) {
  return run(process.execPath, args, options);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

test("premium golden path bootstraps, plans, imports, readies, and checkpoints", () => {
  const dir = mkdtempSync(join(tmpdir(), "compound-golden-"));
  try {
    const dry = runNode([BOOTSTRAP, "--target", dir, "--dry-run"]);
    assert.equal(dry.status, 0, dry.stderr);
    const plan = readJson(join(dir, "compound-install-plan.json"));
    assert.equal(plan.hook_mutations.length, 3);
    assert.ok(plan.warnings.some((warning) => warning.type === "high_impact_root_write" && warning.path === "CLAUDE.md"));

    const boot = runNode([BOOTSTRAP, "--target", dir, "--agent-id", "devin-golden", "--role", "planner", "--skill", "compound-agent-system"], {
      env: { COMPOUND_GROUNDED: "User approved wave 1 golden-path E2E testing." },
    });
    assert.equal(boot.status, 0, boot.stderr);
    assert.ok(existsSync(join(dir, ".agents", "TASKS.json")));
    assert.ok(existsSync(join(dir, ".claude", "settings.json")));

    cpSync(join(SYSTEM_ROOT, "fixtures"), join(dir, "fixtures"), { recursive: true });
    const idea = runNode([".agents/idea-intake.mjs", "--input", "fixtures/ideas/long-idea-api-alchemy.md", "--apply"], { cwd: dir });
    assert.equal(idea.status, 0, idea.stderr);
    for (const artifact of REQUIRED_ARTIFACTS) assert.ok(existsSync(join(dir, "phase-0", artifact)), `missing ${artifact}`);

    const quality = runNode([".agents/check-planning-quality.mjs", "phase-0/PHASE_PLAN.md", "phase-0/GAP_SCAN.md"], { cwd: dir });
    assert.equal(quality.status, 0, quality.stderr);

    const importPlan = runNode([".agents/task.mjs", "import", "phase-0/PHASE_PLAN.md", "--apply"], {
      cwd: dir,
      env: { COMPOUND_MODE: "enforce", COMPOUND_GROUNDED: "User approved importing the generated phase plan." },
    });
    assert.equal(importPlan.status, 0, importPlan.stderr);
    assert.match(importPlan.stdout, /Imported 6 task\(s\)\./);

    const ledger = readJson(join(dir, ".agents", "TASKS.json"));
    const ids = ledger.tasks.map((task) => task.id);
    assert.equal(new Set(ids).size, ids.length);
    const importedIds = ids.filter((id) => id.startsWith("phase-"));
    assert.equal(importedIds.length, 6);
    for (const id of [
      "phase-1-scope-decisions",
      "phase-2-local-source-to-dataset-slice",
      "phase-3-adapter-registry-provenance",
      "phase-4-integration-risk-boundary",
      "phase-5-quality-verification",
      "phase-final-handoff-readiness",
    ]) {
      assert.ok(ids.includes(id), `missing imported task ${id}`);
    }
    const intake = ledger.tasks.find((task) => /Idea intake/.test(task.goal));
    assert.ok(intake);
    assert.equal(ledger.current, intake.id);

    const notReady = runNode([".agents/session-readiness.mjs"], { cwd: dir, env: { COMPOUND_MODE: "warn" } });
    assert.equal(notReady.status, 0, notReady.stderr);
    assert.match(notReady.stdout, /Long-session readiness: NOT_READY/);

    mkdirSync(join(dir, ".omc", "state", "checkpoints"), { recursive: true });
    writeFileSync(join(dir, ".omc", "state", "checkpoints", "cp-golden.json"), "{}\n");
    const ledgerReady = readJson(join(dir, ".agents", "TASKS.json"));
    const active = ledgerReady.tasks.find((task) => task.id === ledgerReady.current);
    active.blocked_by = [];
    active.handoffs = [{ checkpoint_id: "cp-golden", path: ".omc/state/checkpoints/cp-golden.json" }];
    active.env_contract = { status: "ready", node: ">=18", runtime_dependencies: "zero" };
    active.worktree_state = { status: "known-dirty", files: [".agents/TASKS.json"], reason: "Golden path test intentionally mutates fixture ledger." };
    ledgerReady.log.push({ event: "context-refresh", ts: "2026-05-01T00:00:00.000Z", task: active.id });
    ledgerReady.log.push({ event: "compound-register", ts: "2026-05-01T00:01:00.000Z", task: active.id });
    writeFileSync(join(dir, ".agents", "TASKS.json"), JSON.stringify(ledgerReady, null, 2) + "\n");

    const ready = runNode([".agents/session-readiness.mjs"], { cwd: dir, env: { COMPOUND_MODE: "enforce" } });
    assert.equal(ready.status, 0, ready.stderr);
    assert.match(ready.stdout, /Long-session readiness: READY/);

    const handoff = runNode([
      "handoff-bridge.mjs",
      "checkpoint",
      "--task",
      active.id,
      "--from",
      "devin-golden",
      "--summary",
      "Golden path validated.",
      "--pending",
      "Continue premium wave 1.",
      "--out",
      ".agents/checkpoints/golden.handoff.json",
    ], { cwd: dir });
    assert.equal(handoff.status, 0, handoff.stderr);
    assert.ok(existsSync(join(dir, ".agents", "checkpoints", "golden.handoff.json")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
