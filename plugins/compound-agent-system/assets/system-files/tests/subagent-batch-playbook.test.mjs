import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..", "..", "..", "..");
const ROOT_PLAYBOOK = join(REPO_ROOT, "docs", "subagent-batch-execution-playbook.md");
const BUNDLED_PLAYBOOK = join(REPO_ROOT, "plugins", "compound-agent-system", "assets", "system-files", "docs", "subagent-batch-execution-playbook.md");

function playbook() {
  return readFileSync(ROOT_PLAYBOOK, "utf-8");
}

test("subagent batch playbook is bundled from the root docs copy", () => {
  assert.equal(readFileSync(BUNDLED_PLAYBOOK, "utf-8"), playbook());
});

test("subagent batch playbook prevents dependent and colliding tasks from parallel execution", () => {
  const doc = playbook();

  assert.match(doc, /Dependencies:` line is already `DONE`/);
  assert.match(doc, /expected edits do not overlap another batch task's primary files/);
  assert.match(doc, /Do not batch dependent tasks/);
  assert.match(doc, /If two tasks plan to edit the same primary file/);
  assert.match(doc, /Treat the collision as semantic, not clerical/);
});

test("subagent batch playbook defines traceable branch, PR, evidence, and merge rules", () => {
  const doc = playbook();

  assert.match(doc, /devin\/<timestamp>-task-<nn>-<short-slug>/);
  assert.match(doc, /one branch and one PR per task/);
  assert.match(doc, /Each PR body must link the task file/);
  assert.match(doc, /Merge in dependency order, not completion order/);
  assert.match(doc, /regenerate `manifest\.json` from actual system-file byte counts/);
});

test("subagent batch playbook requires eval-loop evidence and stop-batch conditions", () => {
  const doc = playbook();

  assert.match(doc, /\.agents\/eval-loop\.mjs/);
  assert.match(doc, /Evaluator feedback round 1/);
  assert.match(doc, /Evaluator feedback round 2/);
  assert.match(doc, /Stop launching new tasks/);
  assert.match(doc, /Baseline validator or full suite fails on fresh `main`/);
  assert.match(doc, /A security boundary changes without an approval matrix update/);
});
