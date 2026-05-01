import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, cpSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CLI = join(ROOT, ".agents", "idea-intake.mjs");
const TASK = join(ROOT, ".agents", "task.mjs");
const REQUIRED_ARTIFACTS = ["PROJECT_BRIEF.md", "GAP_SCAN.md", "DECISIONS.md", "PHASE_PLAN.md", "OPEN_QUESTIONS.md", "AGENT_ROLES.md", "DOD_MATRIX.md"];
const normalize = (text) => text.replace(/\r\n/g, "\n");

function workspace() {
  const dir = mkdtempSync(join(tmpdir(), "idea-intake-"));
  cpSync(join(ROOT, ".agents"), join(dir, ".agents"), { recursive: true });
  cpSync(join(ROOT, "fixtures"), join(dir, "fixtures"), { recursive: true });
  const ledgerPath = join(dir, ".agents", "TASKS.json");
  writeFileSync(ledgerPath, JSON.stringify({ version: "1", schema_url: ".agents/PROTOCOL.md", current: null, tasks: [], agents_active: [], agent_profiles: {}, log: [] }, null, 2) + "\n");
  return dir;
}

function runIdea(cwd, args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, COMPOUND_TASKS_PATH: join(cwd, ".agents", "TASKS.json"), COMPOUND_NODE: process.execPath },
  });
}

function runTask(cwd, args) {
  return spawnSync(process.execPath, [TASK, ...args], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, COMPOUND_TASKS_PATH: join(cwd, ".agents", "TASKS.json"), COMPOUND_NODE: process.execPath },
  });
}

const readLedger = (cwd) => JSON.parse(readFileSync(join(cwd, ".agents", "TASKS.json"), "utf-8"));

function writeIdea(dir, benchmark) {
  const rel = `fixtures/ideas/realworld-${benchmark.id}.md`;
  writeFileSync(join(dir, rel), `# ${benchmark.id}\n\n${benchmark.idea}\n`);
  return rel;
}

function parseRoleMap(roles) {
  const match = /```json\n([\s\S]+?)\n```/.exec(roles);
  assert.ok(match, "role map JSON block exists");
  return JSON.parse(match[1]);
}

function generatedTraits(dir) {
  const plan = readFileSync(join(dir, "phase-0", "PHASE_PLAN.md"), "utf-8");
  const brief = readFileSync(join(dir, "phase-0", "PROJECT_BRIEF.md"), "utf-8");
  const gap = readFileSync(join(dir, "phase-0", "GAP_SCAN.md"), "utf-8");
  const roles = readFileSync(join(dir, "phase-0", "AGENT_ROLES.md"), "utf-8");
  const phases = [...plan.matchAll(/^- phase_id: (.+)$/gm)].map((match) => match[1]);
  const blocking = gap.split(/\n(?=### Decision: )/).filter((block) => /^- proceed-policy: must-ask$/m.test(block)).map((block) => {
    const question = /^- question: (.+)$/m.exec(block);
    assert.ok(question, "must-ask blocker has question");
    return question[1];
  });
  return {
    phaseCount: phases.length,
    firstSlice: (/^- title: (.+)$/m.exec(brief) || [])[1],
    blockers: blocking,
    roleText: roles,
    roleMap: parseRoleMap(roles),
  };
}

test("short idea dry-run previews an intake task without writing", () => {
  const dir = workspace();
  try {
    const before = readLedger(dir).tasks.length;
    const r = runIdea(dir, ["--input", "fixtures/ideas/simple-idea.md", "--dry-run"]);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.task.state, "in_progress");
    assert.match(out.task.goal, /Idea intake/);
    assert.ok(out.task.dod.length >= 1);
    assert.ok(out.blockers.every((b) => b["recommended-default"] && typeof b["proceed-without-user"] === "boolean"));
    assert.equal(readLedger(dir).tasks.length, before, "dry-run must not write TASKS.json");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("long idea apply writes only intake/planning task and preserves blockers", () => {
  const dir = workspace();
  try {
    const r = runIdea(dir, ["--input", "fixtures/ideas/long-idea-api-alchemy.md", "--apply"]);
    assert.equal(r.status, 0, r.stderr);
    const ledger = readLedger(dir);
    const intake = ledger.tasks.find((task) => /Idea intake/.test(task.goal));
    assert.ok(intake, "intake task exists");
    assert.equal(ledger.tasks.length, 1, "implementation tasks are not opened");
    assert.ok(intake.blocked_by.length >= 1, "intake opens even with unresolved blockers");
    assert.match(intake.context.original_idea, /API Alchemy Engine/);
    assert.ok(intake.dod.length >= 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("apply writes Phase 0 artifacts with roles and markers", () => {
  const dir = workspace();
  try {
    const r = runIdea(dir, ["--input", "fixtures/ideas/simple-idea.md", "--apply"]);
    assert.equal(r.status, 0, r.stderr);
    for (const name of REQUIRED_ARTIFACTS) assert.ok(existsSync(join(dir, "phase-0", name)), `missing ${name}`);
    const plan = readFileSync(join(dir, "phase-0", "PHASE_PLAN.md"), "utf-8");
    assert.match(normalize(plan), /^---\ncompound: active/m);
    assert.match(plan, /\[COMPOUND-PHASE/);
    for (const role of ["planner", "executor", "reviewer", "verifier"]) assert.match(plan, new RegExp(role));
    const quality = runTask(dir, ["import", "phase-0/PHASE_PLAN.md", "--apply"]);
    assert.equal(quality.status, 0, quality.stderr);
    assert.match(quality.stdout, /Imported/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("short and long ideas produce meaningfully different phase plans", () => {
  const shortDir = workspace();
  const longDir = workspace();
  try {
    assert.equal(runIdea(shortDir, ["--input", "fixtures/ideas/simple-idea.md", "--apply"]).status, 0);
    assert.equal(runIdea(longDir, ["--input", "fixtures/ideas/long-idea-api-alchemy.md", "--apply"]).status, 0);
    const shortPlan = readFileSync(join(shortDir, "phase-0", "PHASE_PLAN.md"), "utf-8");
    const longPlan = readFileSync(join(longDir, "phase-0", "PHASE_PLAN.md"), "utf-8");
    assert.notEqual(shortPlan, longPlan);
    assert.match(shortPlan, /CLI data-source planning proof/);
    assert.match(longPlan, /local source-to-dataset manifest proof/);
    assert.match(longPlan, /adapter registry and provenance model/);
    assert.doesNotMatch(shortPlan, /phase-1-foundation/);
    assert.doesNotMatch(longPlan, /phase-2-verification/);
  } finally {
    rmSync(shortDir, { recursive: true, force: true });
    rmSync(longDir, { recursive: true, force: true });
  }
});

test("generated artifacts include first vertical slice and upgraded decisions", () => {
  const dir = workspace();
  try {
    const apply = runIdea(dir, ["--input", "fixtures/ideas/long-idea-api-alchemy.md", "--apply"]);
    assert.equal(apply.status, 0, apply.stderr);
    const brief = readFileSync(join(dir, "phase-0", "PROJECT_BRIEF.md"), "utf-8");
    const gap = readFileSync(join(dir, "phase-0", "GAP_SCAN.md"), "utf-8");
    const questions = readFileSync(join(dir, "phase-0", "OPEN_QUESTIONS.md"), "utf-8");
    const dod = readFileSync(join(dir, "phase-0", "DOD_MATRIX.md"), "utf-8");
    assert.match(brief, /First vertical slice/);
    assert.match(brief, /local source-to-dataset manifest proof/);
    assert.match(gap, /priority: critical/);
    assert.match(gap, /reversibility: costly/);
    assert.match(gap, /proceed-policy: must-ask/);
    assert.match(gap, /unlock-condition:/);
    assert.match(questions, /## blocking_now/);
    assert.match(questions, /## can_default/);
    assert.match(questions, /## defer/);
    const blocking = questions.split("## can_default")[0].split("\n").filter((line) => line.startsWith("- ") && !line.includes("None"));
    assert.ok(blocking.length <= 5);
    assert.match(dod, /First vertical slice is verified by:/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("agent role map is project-specific and phase-linked", () => {
  const simpleDir = workspace();
  const mediumDir = workspace();
  try {
    assert.equal(runIdea(simpleDir, ["--input", "fixtures/ideas/simple-idea.md", "--apply"]).status, 0);
    assert.equal(runIdea(mediumDir, ["--input", "fixtures/ideas/medium-feature-idea.md", "--apply"]).status, 0);
    const simpleRoles = readFileSync(join(simpleDir, "phase-0", "AGENT_ROLES.md"), "utf-8");
    const mediumRoles = readFileSync(join(mediumDir, "phase-0", "AGENT_ROLES.md"), "utf-8");
    assert.notEqual(simpleRoles, mediumRoles);
    for (const role of ["planner", "executor", "reviewer", "verifier"]) assert.match(mediumRoles, new RegExp(`"${role}"`));
    assert.match(mediumRoles, /"phase_id"/);
    assert.match(mediumRoles, /"autonomy_level"/);
  } finally {
    rmSync(simpleDir, { recursive: true, force: true });
    rmSync(mediumDir, { recursive: true, force: true });
  }
});

test("short medium and long benchmark fixtures produce complete planning artifacts", () => {
  const fixtures = ["simple-idea.md", "medium-feature-idea.md", "long-idea-api-alchemy.md"];
  const plans = [];
  for (const fixture of fixtures) {
    const dir = workspace();
    try {
      const apply = runIdea(dir, ["--input", `fixtures/ideas/${fixture}`, "--apply"]);
      assert.equal(apply.status, 0, apply.stderr);
      const ledger = readLedger(dir);
      assert.equal(ledger.tasks.length, 1);
      const gap = readFileSync(join(dir, "phase-0", "GAP_SCAN.md"), "utf-8");
      const plan = readFileSync(join(dir, "phase-0", "PHASE_PLAN.md"), "utf-8");
      const roles = readFileSync(join(dir, "phase-0", "AGENT_ROLES.md"), "utf-8");
      const dod = readFileSync(join(dir, "phase-0", "DOD_MATRIX.md"), "utf-8");
      assert.match(gap, /recommended-default/);
      assert.match(plan, /first_vertical_slice/);
      assert.match(plan, /\[COMPOUND-PHASE/);
      assert.match(roles, /"phase_id"/);
      assert.match(dod, /First vertical slice is verified by:/);
      assert.equal(runTask(dir, ["import", "phase-0/PHASE_PLAN.md", "--apply"]).status, 0);
      plans.push(plan);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  assert.equal(new Set(plans).size, fixtures.length);
});

test("task status proves intake task exists after apply", () => {
  const dir = workspace();
  try {
    const apply = runIdea(dir, ["--input", "fixtures/ideas/simple-idea.md", "--apply"]);
    assert.equal(apply.status, 0, apply.stderr);
    const status = runTask(dir, ["status"]);
    assert.equal(status.status, 0, status.stderr);
    assert.match(status.stdout, /Idea intake and Phase 0 planning/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("generated output passes check-output-quality", () => {
  const dir = workspace();
  try {
    const apply = runIdea(dir, ["--input", "fixtures/ideas/long-idea-api-alchemy.md", "--apply"]);
    assert.equal(apply.status, 0, apply.stderr);
    const quality = spawnSync(process.execPath, [join(dir, ".agents", "check-output-quality.mjs"), "phase-0/GAP_SCAN.md", "phase-0/PHASE_PLAN.md"], { cwd: dir, encoding: "utf-8" });
    assert.equal(quality.status, 0, quality.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});


test("real-world benchmark corpus covers categories and expected planning traits", () => {
  const benchmarks = JSON.parse(readFileSync(join(ROOT, "fixtures", "ideas", "realworld-benchmarks.json"), "utf-8"));
  assert.equal(benchmarks.length, 12);
  assert.deepEqual(new Set(benchmarks.map((b) => b.category)), new Set(["CLI tool", "browser app", "data workflow", "library", "migration", "ambiguous product brief"]));
  for (const benchmark of benchmarks) {
    assert.match(benchmark.id, /^[a-z0-9-]+$/);
    assert.ok(benchmark.why.length >= 30, `${benchmark.id} explains why it exists`);
    assert.ok(benchmark.idea.length >= 80, `${benchmark.id} has a concise but meaningful idea`);
    assert.equal(benchmark.expected.role_map_traits.length, 3, `${benchmark.id} role traits stay focused`);
  }
});

test("real-world benchmark ideas produce expected phase counts first slices blockers and role maps", () => {
  const benchmarks = JSON.parse(readFileSync(join(ROOT, "fixtures", "ideas", "realworld-benchmarks.json"), "utf-8"));
  for (const benchmark of benchmarks) {
    const dir = workspace();
    try {
      const ideaRel = writeIdea(dir, benchmark);
      const apply = runIdea(dir, ["--input", ideaRel, "--apply"]);
      assert.equal(apply.status, 0, `${benchmark.id}: ${apply.stderr}`);
      const traits = generatedTraits(dir);
      assert.equal(traits.phaseCount, benchmark.expected.phase_count, `${benchmark.id}: phase count`);
      assert.equal(traits.firstSlice, benchmark.expected.first_slice_title, `${benchmark.id}: first slice`);
      assert.deepEqual(new Set(traits.blockers), new Set(benchmark.expected.blocking_decisions), `${benchmark.id}: blockers`);
      assert.equal(traits.roleMap.length, traits.phaseCount, `${benchmark.id}: role map phase count`);
      for (const roleTrait of benchmark.expected.role_map_traits) {
        assert.match(traits.roleText, new RegExp(roleTrait.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${benchmark.id}: missing role trait ${roleTrait}`);
      }
      assert.equal(runTask(dir, ["import", "phase-0/PHASE_PLAN.md", "--apply"]).status, 0, `${benchmark.id}: import markers`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});
