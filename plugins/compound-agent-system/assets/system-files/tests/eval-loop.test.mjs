import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const RUNNER = join(ROOT, ".agents", "eval-loop.mjs");

function withReport(content, fn) {
  const dir = mkdtempSync(join(tmpdir(), "eval-loop-"));
  const report = join(dir, "task-report.md");
  try {
    writeFileSync(report, content);
    return fn(report);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function run(content) {
  return withReport(content, (report) => spawnSync(process.execPath, [RUNNER, report], { encoding: "utf-8" }));
}

function issues(result) {
  return JSON.parse((result.stdout || result.stderr).trim()).issues;
}

test("eval loop runner accepts a complete disclosed same-session report", () => {
  const result = run(`
# Task 18 report

Implementer: devin
Evaluator: devin
Independence disclosed: same agent, not independent.

## First completion
Initial implementation is complete.

## Self-review
The implementer checked the CLI contract and test shape.

## Evaluator feedback round 1
Finding: the first draft allowed one-pass completion.

## Improvement 1
Round 1 fix: added a missing-round regression.

## Evaluator feedback round 2
Finding: the first draft could imply independent review.

## Improvement 2
Round 2 fix: require disclosure when implementer and evaluator match.

## Final signoff
Evaluator signoff: all DoD checks pass.
`);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).issues, []);
});

test("eval loop runner rejects missing feedback rounds and signoff", () => {
  const result = run(`
# Incomplete task report

Implementer: devin
Evaluator: reviewer-bot

## First completion
Initial implementation is complete.

## Self-review
Looks good.
`);
  assert.equal(result.status, 1);
  const types = issues(result).map((issue) => issue.type);
  assert.ok(types.includes("missing-eval-round-1"));
  assert.ok(types.includes("missing-improvement-1"));
  assert.ok(types.includes("missing-eval-round-2"));
  assert.ok(types.includes("missing-improvement-2"));
  assert.ok(types.includes("missing-final-signoff"));
});

test("eval loop runner rejects false independent self-evaluation claims", () => {
  const result = run(`
# Misleading task report

Implementer: devin
Evaluator: devin

## First completion
Initial implementation is complete.

## Self-review
The implementer checked the work.

## Evaluator feedback round 1
Independent review found a gap.

## Improvement 1
Round 1 fix: addressed it.

## Evaluator feedback round 2
Independent review found no blockers.

## Improvement 2
Round 2 fix: final polish.

## Final signoff
Evaluator signoff: accepted.
`);
  assert.equal(result.status, 1);
  const types = issues(result).map((issue) => issue.type);
  assert.ok(types.includes("false-independent-review"));
  assert.ok(types.includes("evaluator-independence-undisclosed"));
});

test("eval loop runner orders milestones by headings, not incidental text", () => {
  const result = run(`
# Task report

Implementer: devin
Evaluator: reviewer-bot

## First completion
Initial implementation is complete.

## Self-review
The implementer checked the work.

## Evaluator feedback round 1
Finding: cannot give final signoff until gaps are closed.

## Improvement 1
Round 1 fix: addressed it.

## Evaluator feedback round 2
Finding: no blockers.

## Improvement 2
Round 2 fix: final polish.

## Final signoff
Evaluator signoff: accepted.
`);
  assert.equal(result.status, 0, result.stderr);
});

test("eval loop runner rejects self-review after final signoff", () => {
  const result = run(`
# Task report

Implementer: devin
Evaluator: reviewer-bot

## First completion
Initial implementation is complete.

## Evaluator feedback round 1
Finding: add a regression.

## Improvement 1
Round 1 fix: added it.

## Evaluator feedback round 2
Finding: no blockers.

## Improvement 2
Round 2 fix: final polish.

## Final signoff
Evaluator signoff: accepted.

## Self-review
The implementer checked the work too late.
`);
  assert.equal(result.status, 1);
  assert.ok(issues(result).some((issue) => issue.type === "out-of-order-feedback-loop"));
});
