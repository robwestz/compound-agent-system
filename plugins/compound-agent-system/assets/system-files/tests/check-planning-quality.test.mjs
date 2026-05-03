import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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

function runFixture(rel) {
  return spawnSync(process.execPath, [CHECKER, rel], { cwd: ROOT, encoding: "utf-8" });
}

function issues(result) {
  return JSON.parse((result.stdout || result.stderr).trim()).issues;
}

test("generic two-phase plans fail planning quality", () => {
  const r = runFixture("fixtures/planning-quality/generic-two-phase-plan.md");
  assert.equal(r.status, 1);
  const out = JSON.parse(r.stderr);
  assert.ok(out.issues.some((issue) => issue.type === "missing-first-vertical-slice"));
  assert.ok(out.issues.some((issue) => issue.type === "generic-phase-plan"));
});

test("red-team corpus covers named planning failure types", () => {
  const cases = {
    "generic-two-phase-plan.md": ["missing-first-vertical-slice", "generic-phase-plan", "generic-only-phase-names"],
    "missing-dod.md": ["missing-phase-dod"],
    "role-mismatch.md": ["role-mismatch"],
    "missing-blocker-metadata.md": ["missing-blocker-defaults"],
    "unsafe-default.md": ["unsafe-default"],
    "unimportable-markers.md": ["missing-importable-markers"],
    "missing-first-vertical-slice.md": ["missing-first-vertical-slice"],
    "unresolved-placeholder.md": ["unresolved-placeholder"],
    "missing-question-buckets.md": ["missing-question-buckets"],
    "thin-phase-goal.md": ["thin-phase-goal"],
  };
  const seen = new Set();
  const fixtureDir = join(ROOT, "fixtures", "planning-quality", "red-team");
  assert.equal(readdirSync(fixtureDir).filter((name) => name.endsWith(".md")).length, Object.keys(cases).length);
  for (const [fixture, expectedTypes] of Object.entries(cases)) {
    const r = runFixture(`fixtures/planning-quality/red-team/${fixture}`);
    assert.equal(r.status, 1, `${fixture} should fail`);
    const types = issues(r).map((issue) => issue.type);
    if (fixture === "missing-blocker-metadata.md") assert.ok(!types.includes("unsafe-default"), `${fixture} should not fail on can_default: none`);
    for (const expectedType of expectedTypes) {
      assert.ok(types.includes(expectedType), `${fixture} missing ${expectedType}; got ${types.join(", ")}`);
      seen.add(expectedType);
    }
  }
  assert.ok(seen.size >= 10, `expected at least 10 distinct issue types, got ${seen.size}`);
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
