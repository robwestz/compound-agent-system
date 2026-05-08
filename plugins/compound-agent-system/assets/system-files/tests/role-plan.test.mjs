import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const IDEA = join(ROOT, ".agents", "idea-intake.mjs");
const ROLE_PLAN = join(ROOT, ".agents", "role-plan.mjs");

function workspace() {
  const dir = mkdtempSync(join(tmpdir(), "role-plan-"));
  cpSync(join(ROOT, ".agents"), join(dir, ".agents"), { recursive: true });
  cpSync(join(ROOT, "fixtures"), join(dir, "fixtures"), { recursive: true });
  writeFileSync(join(dir, ".agents", "TASKS.json"), JSON.stringify({ version: "1", schema_url: ".agents/PROTOCOL.md", current: null, tasks: [], agents_active: [], agent_profiles: {}, log: [] }, null, 2));
  return dir;
}

function run(command, args, cwd) {
  return spawnSync(process.execPath, [command, ...args], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, COMPOUND_TASKS_PATH: join(cwd, ".agents", "TASKS.json"), COMPOUND_NODE: process.execPath },
  });
}

test("role plan exports static batch assignments from generated agent roles", () => {
  const dir = workspace();
  try {
    const intake = run(IDEA, ["--input", "fixtures/ideas/long-idea-api-alchemy.md", "--apply"], dir);
    assert.equal(intake.status, 0, intake.stderr);
    const exportPlan = run(ROLE_PLAN, ["phase-0/AGENT_ROLES.md", "--json"], dir);
    assert.equal(exportPlan.status, 0, exportPlan.stderr);
    const plan = JSON.parse(exportPlan.stdout);
    assert.equal(plan.schema, "compound-role-assignment-plan.v1");
    assert.equal(plan.spawn_policy, "static-export-only");
    assert.equal(plan.assignment_count, 24);
    for (const assignment of plan.assignments) {
      assert.match(assignment.phase_id, /^phase-/);
      assert.ok(["planner", "executor", "reviewer", "verifier"].includes(assignment.role));
      assert.ok(assignment.task_ids.length);
      assert.ok(assignment.artifacts.length);
      assert.ok(assignment.autonomy_level);
      assert.ok(assignment.handoff_condition);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("role plan rejects missing role assignments", () => {
  const dir = workspace();
  try {
    writeFileSync(join(dir, "AGENT_ROLES.md"), [
      "# Agent Roles",
      "",
      "```json",
      JSON.stringify([{ phase_id: "phase-1", task_ids: ["phase-1"], expected_artifacts: ["out.md"], autonomy_level: "autonomous-with-defaults", handoff_condition: "done", roles: [{ role: "planner", task_ids: ["phase-1"], artifacts: ["out.md"], autonomy_level: "autonomous-with-defaults", handoff_condition: "done" }] }], null, 2),
      "```",
      "",
    ].join("\n"));
    const exportPlan = run(ROLE_PLAN, ["AGENT_ROLES.md", "--json"], dir);
    assert.equal(exportPlan.status, 1);
    assert.match(exportPlan.stderr, /missing executor assignment object/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("role plan can be imported without running the CLI", () => {
  const importCheck = spawnSync(process.execPath, ["--input-type=module", "--eval", `import { exportRolePlan } from ${JSON.stringify(pathToFileURL(ROLE_PLAN).href)}; console.log(typeof exportRolePlan);`], {
    encoding: "utf-8",
  });
  assert.equal(importCheck.status, 0, importCheck.stderr);
  assert.equal(importCheck.stdout, "function\n");
});

test("generated AGENT_ROLES.md remains phase-linked and static", () => {
  const dir = workspace();
  try {
    const intake = run(IDEA, ["--input", "fixtures/ideas/medium-feature-idea.md", "--apply"], dir);
    assert.equal(intake.status, 0, intake.stderr);
    const roles = readFileSync(join(dir, "phase-0", "AGENT_ROLES.md"), "utf-8");
    assert.match(roles, /static-export-only/);
    for (const key of ["task_ids", "artifacts", "autonomy_level", "handoff_condition"]) assert.match(roles, new RegExp(`"${key}"`));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
