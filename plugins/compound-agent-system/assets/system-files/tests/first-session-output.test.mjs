import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYSTEM_ROOT = resolve(__dirname, "..");
const PLUGIN_ROOT = resolve(SYSTEM_ROOT, "..", "..");
const ACTIVATE = join(SYSTEM_ROOT, ".agents", "activate.mjs");
const AGENT_ACTIVATE = join(SYSTEM_ROOT, ".agents", "agent-activate.mjs");
const WIZARD = join(SYSTEM_ROOT, ".agents", "first-session-wizard.mjs");
const BOOTSTRAP = join(PLUGIN_ROOT, "scripts", "bootstrap-compound-system.mjs");

function assertTemplate(stdout) {
  const wizardStart = stdout.indexOf("First-session guided wizard");
  assert.notEqual(wizardStart, -1, stdout);
  const wizard = stdout.slice(wizardStart);
  assert.match(stdout, /installed/i);
  assert.match(stdout, /signed in|not signed in/i);
  assert.match(stdout, /mode/i);
  assert.match(wizard, /Next:/);
  assert.doesNotMatch(stdout, /Role:\s*.*\nRole:/i);
  const proseLines = wizard
    .split("\n")
    .filter((line) => !/^(Next|Skip):/.test(line))
    .join("\n");
  assert.doesNotMatch(proseLines, /GAP SCAN|DoD|COMPOUND REGISTER|Phase 0|jargon|ledger/i);
  const nextLines = wizard.split("\n").filter((line) => /^Next:/.test(line));
  assert.equal(nextLines.length, 1, "one clear next action");
  assert.match(nextLines[0], /node .agents\/agent-activate\.mjs --id <agent-id>|create idea\.md|node .agents\/idea-intake\.mjs --input idea\.md --apply|node .agents\/task\.mjs import phase-0\/PHASE_PLAN\.md --apply|node .agents\/session-readiness\.mjs/);
  const stepLines = wizard.split("\n").filter((line) => /^Step \d of 5:/.test(line));
  assert.equal(stepLines.length, 1, "one guided step");
  assert.match(wizard, /Skip: node .agents\/first-session-wizard\.mjs skip/);
}

function runWizard(dir, extraEnv = {}) {
  return spawnSync(process.execPath, [WIZARD], {
    cwd: dir,
    encoding: "utf-8",
    env: { ...process.env, COMPOUND_TASKS_PATH: join(dir, ".agents", "TASKS.json"), COMPOUND_WIZARD_STATE_PATH: join(dir, ".agents", "first-session-wizard.json"), ...extraEnv },
  });
}

function writeLedger(dir, ledger) {
  mkdirSync(join(dir, ".agents"), { recursive: true });
  writeFileSync(join(dir, ".agents", "TASKS.json"), JSON.stringify({ version: "1", schema_url: ".agents/PROTOCOL.md", current: null, tasks: [], agents_active: [], agent_profiles: {}, log: [], ...ledger }, null, 2) + "\n");
}

test("activate output uses first-session template", () => {
  const dir = mkdtempSync(join(tmpdir(), "compound-activate-"));
  try {
    const r = spawnSync(process.execPath, [ACTIVATE], { cwd: dir, encoding: "utf-8", env: { ...process.env, COMPOUND_MODE: "warn" } });
    assert.equal(r.status, 0, r.stderr);
    assertTemplate(r.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("activate wizard normalizes uppercase compliance mode", () => {
  const dir = mkdtempSync(join(tmpdir(), "compound-activate-mode-"));
  try {
    const r = spawnSync(process.execPath, [ACTIVATE], { cwd: dir, encoding: "utf-8", env: { ...process.env, COMPOUND_MODE: "ENFORCE" } });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Compliance level: ENFORCE/);
    assert.match(r.stdout, /System: installed; mode ENFORCE \(blocks unsafe changes\)\./);
    assert.doesNotMatch(r.stdout, /mode WARN \(guides without blocking\)/);
    assertTemplate(r.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("agent activation output uses first-session template", () => {
  const dir = mkdtempSync(join(tmpdir(), "compound-agent-activate-"));
  try {
    const r = spawnSync(process.execPath, [AGENT_ACTIVATE, "--id", "claude-opus-4.7", "--role", "planner"], { cwd: dir, encoding: "utf-8", env: { ...process.env, COMPOUND_TASKS_PATH: join(dir, "TASKS.json") } });
    assert.equal(r.status, 0, r.stderr);
    assertTemplate(r.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("bootstrap dry-run points to plan and avoids raw project-start command", () => {
  const dir = mkdtempSync(join(tmpdir(), "compound-bootstrap-"));
  try {
    const r = spawnSync(process.execPath, [BOOTSTRAP, "--target", dir, "--dry-run"], { encoding: "utf-8" });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Review install plan/);
    assert.doesNotMatch(r.stdout, /Next project-start command/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("wizard advances one primary next action at a time", () => {
  const dir = mkdtempSync(join(tmpdir(), "compound-wizard-steps-"));
  try {
    writeLedger(dir, {});
    let r = runWizard(dir);
    assert.equal(r.status, 0, r.stderr);
    assertTemplate(r.stdout);
    assert.match(r.stdout, /Step 1 of 5/);
    assert.match(r.stdout, /Next: node .agents\/agent-activate\.mjs --id <agent-id>/);

    writeLedger(dir, { agents_active: ["devin-demo"], agent_profiles: { "devin-demo": { id: "devin-demo", role: "planner" } } });
    r = runWizard(dir);
    assert.equal(r.status, 0, r.stderr);
    assertTemplate(r.stdout);
    assert.match(r.stdout, /Step 2 of 5/);
    assert.match(r.stdout, /Next: create idea\.md/);

    writeFileSync(join(dir, "idea.md"), "Build a small CLI helper.\n");
    r = runWizard(dir);
    assert.equal(r.status, 0, r.stderr);
    assertTemplate(r.stdout);
    assert.match(r.stdout, /Step 3 of 5/);
    assert.match(r.stdout, /Next: node .agents\/idea-intake\.mjs --input idea\.md --apply/);

    mkdirSync(join(dir, "phase-0"), { recursive: true });
    writeFileSync(join(dir, "phase-0", "PHASE_PLAN.md"), "---\ncompound: active\nphases: []\n---\n");
    r = runWizard(dir);
    assert.equal(r.status, 0, r.stderr);
    assertTemplate(r.stdout);
    assert.match(r.stdout, /Step 4 of 5/);
    assert.match(r.stdout, /Next: node .agents\/task\.mjs import phase-0\/PHASE_PLAN\.md --apply/);

    writeLedger(dir, {
      agents_active: ["devin-demo"],
      agent_profiles: { "devin-demo": { id: "devin-demo", role: "planner" } },
      tasks: [{ id: "phase-1", goal: "First phase", state: "open", dod: [] }],
    });
    r = runWizard(dir);
    assert.equal(r.status, 0, r.stderr);
    assertTemplate(r.stdout);
    assert.match(r.stdout, /Step 5 of 5/);
    assert.match(r.stdout, /Next: node .agents\/session-readiness\.mjs/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("wizard can be skipped without disabling underlying CLI", () => {
  const dir = mkdtempSync(join(tmpdir(), "compound-wizard-skip-"));
  try {
    writeLedger(dir, {});
    const skip = spawnSync(process.execPath, [WIZARD, "skip"], {
      cwd: dir,
      encoding: "utf-8",
      env: { ...process.env, COMPOUND_TASKS_PATH: join(dir, ".agents", "TASKS.json"), COMPOUND_WIZARD_STATE_PATH: join(dir, ".agents", "first-session-wizard.json") },
    });
    assert.equal(skip.status, 0, skip.stderr);
    assert.match(skip.stdout, /skipped/i);
    assert.match(skip.stdout, /task\.mjs status/);

    const status = spawnSync(process.execPath, [join(SYSTEM_ROOT, ".agents", "task.mjs"), "status"], {
      cwd: dir,
      encoding: "utf-8",
      env: { ...process.env, COMPOUND_TASKS_PATH: join(dir, ".agents", "TASKS.json") },
    });
    assert.equal(status.status, 0, status.stderr);
    assert.match(status.stdout, /Compound Protocol Ledger/);

    const r = runWizard(dir);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /First-session guided wizard: skipped\./);
    assert.doesNotMatch(r.stdout, /^Next:/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
