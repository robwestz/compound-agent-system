import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CHECKER = join(ROOT, ".agents", "check-planning-quality.mjs");
const IDEA = join(ROOT, ".agents", "idea-intake.mjs");
const QUALITY_FIXTURES = join(ROOT, "fixtures", "planning-quality");

const RED_TEAM_CASES = [
  ["generic-two-phase-plan.md", ["missing-first-vertical-slice", "generic-phase-plan", "generic-only-phase-names"]],
  ["missing-phase-dod.md", ["missing-phase-dod"]],
  ["missing-role-ownership.md", ["missing-role-ownership"]],
  ["duplicate-phase-id.md", ["duplicate-phase-id"]],
  ["duplicate-phase-goal.md", ["duplicate-phase-goal"]],
  ["duplicate-planning-section.md", ["duplicate-planning-section"]],
  ["missing-blocker-recommended-default.md", ["missing-blocker-recommended-default"]],
  ["missing-blocker-priority.md", ["missing-blocker-priority"]],
  ["missing-blocker-reversibility.md", ["missing-blocker-reversibility"]],
  ["missing-blocker-proceed-policy.md", ["missing-blocker-proceed-policy"]],
  ["missing-blocker-unlock-condition.md", ["missing-blocker-unlock-condition"]],
  ["unimportable-phase-marker.md", ["unimportable-phase-marker", "missing-importable-markers"]],
  ["frontmatter-marker-mismatch.md", ["phase-frontmatter-marker-mismatch"]],
  ["role-owner-mismatch.md", ["role-owner-mismatch"]],
  ["unsafe-external-api-default.md", ["unsafe-external-api-default"]],
];

function workspace() {
  const dir = mkdtempSync(join(tmpdir(), "planning-quality-"));
  cpSync(join(ROOT, ".agents"), join(dir, ".agents"), { recursive: true });
  cpSync(join(ROOT, "fixtures"), join(dir, "fixtures"), { recursive: true });
  writeFileSync(join(dir, ".agents", "TASKS.json"), JSON.stringify({ version: "1", schema_url: ".agents/PROTOCOL.md", current: null, tasks: [], agents_active: [], agent_profiles: {}, log: [] }, null, 2) + "\n");
  return dir;
}

test("red-team planning corpus maps each fixture to specific issue types", () => {
  const fixtureNames = new Set(readdirSync(QUALITY_FIXTURES).filter((name) => name.endsWith(".md")));
  assert.equal(fixtureNames.size, RED_TEAM_CASES.length);
  const distinctIssueTypes = new Set(RED_TEAM_CASES.flatMap(([, issueTypes]) => issueTypes));
  assert.ok(distinctIssueTypes.size >= 10);

  for (const [fixture, issueTypes] of RED_TEAM_CASES) {
    const r = spawnSync(process.execPath, [CHECKER, join("fixtures", "planning-quality", fixture)], { cwd: ROOT, encoding: "utf-8" });
    assert.equal(r.status, 1, `${fixture} should fail`);
    const out = JSON.parse(r.stderr);
    for (const issueType of issueTypes) {
      assert.ok(out.issues.some((issue) => issue.type === issueType), `${fixture} should report ${issueType}`);
    }
  }
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
