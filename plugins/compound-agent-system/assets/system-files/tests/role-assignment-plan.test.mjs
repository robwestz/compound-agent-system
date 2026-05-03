import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const IDEA = join(ROOT, ".agents", "idea-intake.mjs");
const EXPORTER = join(ROOT, ".agents", "role-assignment-plan.mjs");

function workspace() {
  const dir = mkdtempSync(join(tmpdir(), "role-assignment-"));
  cpSync(join(ROOT, ".agents"), join(dir, ".agents"), { recursive: true });
  cpSync(join(ROOT, "fixtures"), join(dir, "fixtures"), { recursive: true });
  writeFileSync(join(dir, ".agents", "TASKS.json"), JSON.stringify({ version: "1", schema_url: ".agents/PROTOCOL.md", current: null, tasks: [], agents_active: [], agent_profiles: {}, log: [] }, null, 2) + "\n");
  return dir;
}

function runNode(script, args, cwd) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, COMPOUND_TASKS_PATH: join(cwd, ".agents", "TASKS.json"), COMPOUND_NODE: process.execPath },
  });
}

test("exports generated role map as static batch assignment plan", () => {
  const dir = workspace();
  try {
    const intake = runNode(IDEA, ["--input", "fixtures/ideas/medium-feature-idea.md", "--apply"], dir);
    assert.equal(intake.status, 0, intake.stderr);

    const outPath = join(dir, "phase-0", "BATCH_ASSIGNMENT_PLAN.json");
    const exported = runNode(EXPORTER, ["--input", "phase-0/AGENT_ROLES.md", "--out", outPath], dir);
    assert.equal(exported.status, 0, exported.stderr);
    assert.equal(existsSync(outPath), true);

    const plan = JSON.parse(readFileSync(outPath, "utf-8"));
    assert.equal(plan.schema, "compound-role-assignment-plan.v1");
    assert.equal(plan.execution_mode, "static_plan_export");
    assert.equal(plan.core_behavior.automatic_subagent_spawning, false);
    assert.equal(plan.core_behavior.multi_agent_execution_requires_human_approval, true);
    assert.match(plan.audit.join("\n"), /Core exporter performed no agent spawning/);
    assert.ok(plan.assignments.length >= 8);

    for (const role of ["planner", "executor", "reviewer", "verifier"]) {
      const entry = plan.roles[role];
      assert.ok(entry, `missing ${role}`);
      assert.ok(entry.task_ids.length >= 2, `${role} has task IDs`);
      assert.ok(entry.artifacts.length >= 1, `${role} has artifacts`);
      assert.match(entry.autonomy_level, /autonomous-with-defaults|requires-user-approval|mixed/);
      assert.match(entry.handoff_condition, /task IDs:/);
      assert.ok(entry.assignments.every((id) => id.endsWith(`:${role}`)));
    }

    const verifier = plan.assignments.find((assignment) => assignment.role === "verifier");
    assert.ok(verifier.task_ids.length >= 1);
    assert.ok(verifier.artifacts.length >= 1);
    assert.ok(verifier.handoff_condition.includes(verifier.phase_id));
    assert.equal(verifier.approval_required_before_execution, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("fails when a role map is missing a required role", () => {
  const dir = workspace();
  try {
    writeFileSync(join(dir, "AGENT_ROLES.md"), [
      "# Agent Roles",
      "",
      "```json",
      JSON.stringify([
        {
          phase_id: "phase-1",
          planner: "planner",
          executor: "executor",
          reviewer: "reviewer",
          expected_artifacts: ["docs/plan.md"],
          handoff_condition: "phase-1 DoD is recorded",
          autonomy_level: "autonomous-with-defaults",
        },
      ], null, 2),
      "```",
      "",
    ].join("\n"));
    const exported = runNode(EXPORTER, ["--input", "AGENT_ROLES.md"], dir);
    assert.equal(exported.status, 1);
    assert.match(exported.stderr, /missing required role "verifier"/);
    assert.match(exported.stderr, /Next action: fix the role map/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
