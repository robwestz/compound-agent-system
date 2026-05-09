import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYSTEM_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(SYSTEM_ROOT, "..", "..", "..", "..");
const TASKS_DIR = join(REPO_ROOT, "docs", "premium-production", "tasks");
const REPORT = join(REPO_ROOT, "docs", "premium-production", "FINAL_ACCEPTANCE_REPORT.md");
const MATRIX = join(REPO_ROOT, "docs", "premium-production", "TASK_EVIDENCE_MATRIX.md");
const VALIDATOR = join(REPO_ROOT, "plugins", "compound-agent-system", "scripts", "validate-package.mjs");
const EVAL_LOOP = join(SYSTEM_ROOT, ".agents", "eval-loop.mjs");

function run(args, options = {}) {
  return spawnSync(process.execPath, args, { cwd: REPO_ROOT, encoding: "utf-8", ...options });
}

function assertPass(args, label) {
  const r = run(args);
  assert.equal(r.status, 0, `${label} failed\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`);
  return r;
}

test("commercial metatest runs core acceptance suites", () => {
  assertPass([VALIDATOR], "package validator");
  for (const file of [
    "golden-path-e2e.test.mjs",
    "doctor-recovery.test.mjs",
    "session-readiness.test.mjs",
    "support-bundle.test.mjs",
    "backward-compatibility.test.mjs",
    "release-readiness.test.mjs",
    "performance-scale.test.mjs",
  ]) {
    assertPass(["--test", join(SYSTEM_ROOT, "tests", file)], file);
  }
});

test("commercial metatest fails if required premium-task evidence is absent", () => {
  const required = Array.from({ length: 32 }, (_, index) => index + 1);
  const missing = [];
  const matrix = readFileSync(MATRIX, "utf-8");
  const taskNames = readdirSync(TASKS_DIR);
  for (const n of required) {
    const prefix = `${String(n).padStart(2, "0")}-`;
    const name = taskNames.find((candidate) => candidate.startsWith(prefix));
    if (!name) {
      missing.push(prefix);
      continue;
    }
    const task = readFileSync(join(TASKS_DIR, name), "utf-8");
    const hasTaskReport = /## Task report/.test(task);
    const result = hasTaskReport ? run([EVAL_LOOP, join(TASKS_DIR, name)]) : { status: 0 };
    if (result.status !== 0 || !new RegExp(`\\| ${String(n).padStart(2, "0")} \\| DONE \\|`).test(matrix)) missing.push(name);
  }
  assert.deepEqual(missing, []);
});

test("commercial report records manual scorecard residual risk and decision", () => {
  assert.equal(existsSync(REPORT), true);
  const report = readFileSync(REPORT, "utf-8");
  for (const dimension of [
    "Installability",
    "Determinism",
    "Recovery",
    "Security",
    "Modularity",
    "Cross-client support",
    "UX clarity",
    "Observability",
    "Compatibility",
    "Release discipline",
  ]) {
    assert.match(report, new RegExp(`\\| ${dimension} \\| PASS \\|`));
  }
  assert.match(report, /Decision: release candidate/);
  assert.match(report, /Residual risks/);
  assert.match(report, /No-release triggers/);
});

test("commercial no-release trigger detects broken prior evidence in a copy", () => {
  const dir = mkdtempSync(join(tmpdir(), "commercial-evidence-"));
  try {
    const broken = join(dir, "broken-task.md");
    writeFileSync(broken, [
      "# Broken task",
      "",
      "Implementer: devin",
      "Evaluator: devin",
      "",
      "## First completion",
      "Implementation exists.",
    ].join("\n"));
    const r = run([EVAL_LOOP, broken]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /missing-eval-round-1/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
