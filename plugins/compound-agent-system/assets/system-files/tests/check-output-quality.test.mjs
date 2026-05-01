import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CLI = join(ROOT, ".agents", "check-output-quality.mjs");

function runFixture(rel) {
  return spawnSync(process.execPath, [CLI, join(ROOT, rel)], { encoding: "utf-8" });
}

function jsonOutput(result) {
  return JSON.parse((result.stdout || result.stderr).trim());
}

test("clean output-quality fixture passes", () => {
  const r = runFixture("fixtures/output-quality/clean-gap-scan.md");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(jsonOutput(r).ok, true);
});

test("duplicated sections fixture fails with duplicate-top-level-heading", () => {
  const r = runFixture("fixtures/output-quality/duplicated-sections.md");
  assert.equal(r.status, 1);
  const data = jsonOutput(r);
  assert.equal(data.ok, false);
  assert.ok(data.issues.some((issue) => issue.type === "duplicate-top-level-heading"));
});

test("repeated blocker fixture fails with repeated-text-block", () => {
  const r = runFixture("fixtures/output-quality/repeated-blockers.md");
  assert.equal(r.status, 1);
  const data = jsonOutput(r);
  assert.ok(data.issues.some((issue) => issue.type === "repeated-text-block"));
});

test("idea fixtures pass through checker", () => {
  for (const rel of ["fixtures/ideas/simple-idea.md", "fixtures/ideas/long-idea-api-alchemy.md"]) {
    const r = runFixture(rel);
    assert.equal(r.status, 0, `${rel}: ${r.stderr}`);
  }
});

test("wave 2 policy docs pass through checker", () => {
  for (const rel of [
    "docs/security-boundary-model.md",
    "docs/secrets-and-ai-policy.md",
    "docs/plugin-size-budget.md",
    "docs/troubleshooting.md",
  ]) {
    const r = runFixture(rel);
    assert.equal(r.status, 0, `${rel}: ${r.stderr}`);
  }
});
