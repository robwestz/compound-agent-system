import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYSTEM_ROOT = resolve(__dirname, "..");
const PLUGIN_ROOT = resolve(SYSTEM_ROOT, "..", "..");
const INSTALL = join(PLUGIN_ROOT, "scripts", "install-compound-system.mjs");

function runInstall(target, extra = []) {
  return spawnSync(process.execPath, [INSTALL, "--target", target, "--dry-run", ...extra], { encoding: "utf-8" });
}

function readPlan(target) {
  return JSON.parse(readFileSync(join(target, "compound-install-plan.json"), "utf-8"));
}

test("dry-run on new target produces valid install plan", () => {
  const dir = mkdtempSync(join(tmpdir(), "compound-install-new-"));
  try {
    const r = runInstall(dir);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(existsSync(join(dir, "compound-install-plan.json")));
    const plan = readPlan(dir);
    assert.ok(plan.files_to_create.length > 0);
    assert.equal(plan.files_to_modify.length, 0);
    assert.match(plan.apply_command, /install-compound-system\.mjs/);
    assert.match(plan.apply_command_powershell, /install-compound-system\.mjs/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("dry-run commands quote spaces in target paths for POSIX and PowerShell", () => {
  const parent = mkdtempSync(join(tmpdir(), "compound install parent "));
  const dir = join(parent, "repo with spaces");
  try {
    const r = runInstall(dir, ["--overwrite"]);
    assert.equal(r.status, 0, r.stderr);
    const plan = readPlan(dir);
    assert.match(plan.apply_command, /--target '.+repo with spaces' --overwrite$/);
    assert.match(plan.apply_command_powershell, /--target '.+repo with spaces' --overwrite$/);
    assert.match(plan.uninstall_command, /--target '.+repo with spaces' --uninstall$/);
    assert.match(plan.uninstall_command_powershell, /--target '.+repo with spaces' --uninstall$/);
    assert.doesNotMatch(plan.apply_command, /"/);
    assert.doesNotMatch(plan.apply_command_powershell, /"/);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("existing conflicting target records overwrites and skips without overwrite", () => {
  const dir = mkdtempSync(join(tmpdir(), "compound-install-conflict-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "custom local contract\n");
    const r = runInstall(dir);
    assert.equal(r.status, 0, r.stderr);
    const plan = readPlan(dir);
    assert.ok(plan.overwrites.some((entry) => entry.path === "CLAUDE.md"));
    assert.ok(plan.files_to_skip.some((entry) => entry.path === "CLAUDE.md"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("root writes are classified high_impact", () => {
  const dir = mkdtempSync(join(tmpdir(), "compound-install-root-"));
  try {
    const r = runInstall(dir);
    assert.equal(r.status, 0, r.stderr);
    const plan = readPlan(dir);
    const root = plan.root_level_writes.find((entry) => entry.path === "CLAUDE.md");
    assert.ok(root);
    assert.equal(root.high_impact, true);
    assert.ok(plan.warnings.some((warning) => warning.path === "CLAUDE.md"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("dry-run with overwrite marks conflicting target as modify", () => {
  const dir = mkdtempSync(join(tmpdir(), "compound-install-overwrite-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "custom local contract\n");
    const r = runInstall(dir, ["--overwrite"]);
    assert.equal(r.status, 0, r.stderr);
    const plan = readPlan(dir);
    assert.ok(plan.files_to_modify.some((entry) => entry.path === "CLAUDE.md"));
    assert.ok(plan.overwrites.some((entry) => entry.path === "CLAUDE.md"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
