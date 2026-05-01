import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CHECKER = join(ROOT, ".agents", "check-planning-quality.mjs");
const IDEA = join(ROOT, ".agents", "idea-intake.mjs");

function workspace() {
  const dir = mkdtempSync(join(tmpdir(), "planning-quality-"));
  cpSync(join(ROOT, ".agents"), join(dir, ".agents"), { recursive: true });
  cpSync(join(ROOT, "fixtures"), join(dir, "fixtures"), { recursive: true });
  writeFileSync(join(dir, ".agents", "TASKS.json"), JSON.stringify({ version: "1", schema_url: ".agents/PROTOCOL.md", current: null, tasks: [], agents_active: [], agent_profiles: {}, log: [] }, null, 2) + "\n");
  return dir;
}

test("generic two-phase plans fail planning quality", () => {
  const r = spawnSync(process.execPath, [CHECKER, "fixtures/planning-quality/generic-two-phase-plan.md"], { cwd: ROOT, encoding: "utf-8" });
  assert.equal(r.status, 1);
  const out = JSON.parse(r.stderr);
  assert.ok(out.issues.some((issue) => issue.type === "missing-first-vertical-slice"));
  assert.ok(out.issues.some((issue) => issue.type === "generic-phase-plan"));
});

test("idea-intake output passes planning quality", () => {
  const dir = workspace();
  try {
    const intake = spawnSync(process.execPath, [IDEA, "--input", "fixtures/ideas/medium-feature-idea.md", "--apply"], { cwd: dir, encoding: "utf-8", env: { ...process.env, COMPOUND_TASKS_PATH: join(dir, ".agents", "TASKS.json") } });
    assert.equal(intake.status, 0, intake.stderr);
    const r = spawnSync(process.execPath, [join(dir, ".agents", "check-planning-quality.mjs"), "phase-0/PHASE_PLAN.md", "phase-0/GAP_SCAN.md"], { cwd: dir, encoding: "utf-8" });
    assert.equal(r.status, 0, r.stderr);
    const plan = readFileSync(join(dir, "phase-0", "PHASE_PLAN.md"), "utf-8");
    assert.match(plan, /first_vertical_slice/);
    assert.doesNotMatch(plan, /phase-1-foundation/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
