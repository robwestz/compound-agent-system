import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYSTEM_ROOT = resolve(__dirname, "..");
const PLUGIN_ROOT = resolve(SYSTEM_ROOT, "..", "..");
const INSTALL = join(PLUGIN_ROOT, "scripts", "install-compound-system.mjs");

function runInstall(target, extra = []) {
  return spawnSync(process.execPath, [INSTALL, "--target", target, ...extra], { encoding: "utf-8" });
}

function readPlan(target) {
  return JSON.parse(readFileSync(join(target, "compound-install-plan.json"), "utf-8"));
}

test("apply writes rollback manifest before/with owned files", () => {
  const dir = mkdtempSync(join(tmpdir(), "compound-install-apply-"));
  try {
    const r = runInstall(dir);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Rollback manifest:/);
    assert.ok(existsSync(join(dir, ".agents", "install-manifest.json")));
    const manifest = JSON.parse(readFileSync(join(dir, ".agents", "install-manifest.json"), "utf-8"));
    assert.equal(manifest.owner, "compound-agent-system");
    assert.ok(manifest.files.some((file) => file.path === "CLAUDE.md" && file.action === "create"));
    assert.ok(existsSync(join(dir, ".agents", "task.mjs")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("rollback restores pre-install state", () => {
  const dir = mkdtempSync(join(tmpdir(), "compound-install-rollback-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "local contract\n");
    const install = runInstall(dir, ["--overwrite"]);
    assert.equal(install.status, 0, install.stderr);
    assert.notEqual(readFileSync(join(dir, "CLAUDE.md"), "utf-8"), "local contract\n");
    const manifest = join(dir, ".agents", "install-manifest.json");
    const rollback = runInstall(dir, ["--rollback", manifest]);
    assert.equal(rollback.status, 0, rollback.stderr);
    assert.equal(readFileSync(join(dir, "CLAUDE.md"), "utf-8"), "local contract\n");
    assert.equal(existsSync(join(dir, ".agents", "task.mjs")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("uninstall removes only unchanged owned files", () => {
  const dir = mkdtempSync(join(tmpdir(), "compound-install-uninstall-"));
  try {
    const install = runInstall(dir);
    assert.equal(install.status, 0, install.stderr);
    const dry = runInstall(dir, ["--uninstall", "--dry-run"]);
    assert.equal(dry.status, 0, dry.stderr);
    const plan = readPlan(dir);
    assert.ok(plan.files_to_remove.some((file) => file.path === ".agents/task.mjs"));
    const uninstall = runInstall(dir, ["--uninstall"]);
    assert.equal(uninstall.status, 0, uninstall.stderr);
    assert.equal(existsSync(join(dir, ".agents", "task.mjs")), false);
    assert.equal(existsSync(join(dir, ".agents", "events.jsonl")), true);
    assert.equal(existsSync(join(dir, ".agents", "install-manifest.json")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("uninstall refuses changed owned files", () => {
  const dir = mkdtempSync(join(tmpdir(), "compound-install-refuse-"));
  try {
    const install = runInstall(dir);
    assert.equal(install.status, 0, install.stderr);
    writeFileSync(join(dir, ".agents", "task.mjs"), "local changes\n");
    const uninstall = runInstall(dir, ["--uninstall"]);
    assert.notEqual(uninstall.status, 0);
    assert.match(uninstall.stderr, /Refusing uninstall; unsafe files require review/);
    assert.ok(existsSync(join(dir, ".agents", "task.mjs")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("uninstall refuses manifest paths outside target directory boundary", () => {
  const dir = mkdtempSync(join(tmpdir(), "compound-install-boundary-"));
  try {
    mkdirSync(join(dir, ".agents"), { recursive: true });
    const outside = `${dir}-data`;
    mkdirSync(outside, { recursive: true });
    writeFileSync(join(outside, "secret.txt"), "do not touch\n");
    writeFileSync(join(dir, ".agents", "install-manifest.json"), JSON.stringify({
      owner: "compound-agent-system",
      files: [{ path: "../" + outside.split("/").pop() + "/secret.txt", action: "create", before: { existed: false } }],
    }, null, 2));
    const uninstall = runInstall(dir, ["--uninstall"]);
    assert.notEqual(uninstall.status, 0);
    assert.match(uninstall.stderr, /Refusing uninstall; unsafe files require review/);
    assert.equal(readFileSync(join(outside, "secret.txt"), "utf-8"), "do not touch\n");
    rmSync(outside, { recursive: true, force: true });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("rollback refuses manifest paths outside target directory boundary", () => {
  const dir = mkdtempSync(join(tmpdir(), "compound-rollback-boundary-"));
  try {
    const outside = `${dir}-data`;
    mkdirSync(outside, { recursive: true });
    writeFileSync(join(outside, "secret.txt"), "do not touch\n");
    const manifest = join(dir, "rollback.json");
    writeFileSync(manifest, JSON.stringify({
      owner: "compound-agent-system",
      files: [{ path: "../" + outside.split("/").pop() + "/secret.txt", action: "create", before: { existed: false } }],
    }, null, 2));
    const rollback = runInstall(dir, ["--rollback", manifest]);
    assert.notEqual(rollback.status, 0);
    assert.match(rollback.stderr, /Refusing rollback outside target/);
    assert.equal(readFileSync(join(outside, "secret.txt"), "utf-8"), "do not touch\n");
    rmSync(outside, { recursive: true, force: true });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
