import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, cpSync, rmSync, unlinkSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..", "..", "..", "..");
const VALIDATOR = join(REPO_ROOT, "plugins", "compound-agent-system", "scripts", "validate-package.mjs");
const SYSTEM_ROOT = join(REPO_ROOT, "plugins", "compound-agent-system", "assets", "system-files");

function runValidator(cwd = REPO_ROOT) {
  return spawnSync(process.execPath, [VALIDATOR], { cwd, encoding: "utf-8" });
}

function cloneRepo() {
  const dir = mkdtempSync(join(tmpdir(), "compound-integrity-"));
  cpSync(REPO_ROOT, dir, {
    recursive: true,
    dereference: true,
    filter: (src) => !src.includes(`${join(REPO_ROOT, ".git")}`),
  });
  return dir;
}

test("package validator reports payload size and passes current manifest", () => {
  const r = runValidator();
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Payload size: \d+ bytes across \d+ files/);
  assert.match(r.stdout, /compound-agent-system package: valid/);
});

test("package validator fails when a required payload file is missing", () => {
  const dir = cloneRepo();
  try {
    unlinkSync(join(dir, "plugins", "compound-agent-system", "assets", "system-files", ".agents", "task.mjs"));
    const r = spawnSync(process.execPath, [join(dir, "plugins", "compound-agent-system", "scripts", "validate-package.mjs")], { cwd: dir, encoding: "utf-8" });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /Package integrity failed: required files are missing/);
    assert.match(r.stderr, /Next action: restore each path/);
    assert.match(r.stderr, /assets\/system-files\/\.agents\/task\.mjs/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("package validator fails on stale manifest byte metadata", () => {
  const dir = cloneRepo();
  try {
    const manifestPath = join(dir, "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    const entry = manifest.system_files.find((item) => item.path === ".agents/task.mjs");
    assert.ok(entry);
    entry.bytes += 1;
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    const r = spawnSync(process.execPath, [join(dir, "plugins", "compound-agent-system", "scripts", "validate-package.mjs")], { cwd: dir, encoding: "utf-8" });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /manifest\.json has stale system_files metadata/);
    assert.match(r.stderr, /\.agents\/task\.mjs/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("committed fixtures contain no real-looking secrets", () => {
  const r = spawnSync(process.execPath, [join(SYSTEM_ROOT, ".agents", "task.mjs"), "doctor"], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    env: { ...process.env, COMPOUND_TASKS_PATH: join(SYSTEM_ROOT, ".agents", "TASKS.json") },
  });
  assert.equal(r.status, 0, r.stderr);
  const jsonStart = r.stdout.indexOf("{");
  assert.notEqual(jsonStart, -1, r.stdout);
  const report = JSON.parse(r.stdout.slice(jsonStart));
  assert.equal(report.checks.security.fixture_secrets.ok, true);
  assert.equal(report.checks.security.fixture_secrets.findings.length, 0);
});
