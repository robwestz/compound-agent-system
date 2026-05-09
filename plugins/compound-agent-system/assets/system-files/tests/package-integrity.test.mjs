import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, cpSync, rmSync, unlinkSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve, sep } from "node:path";
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
    filter: (src) => {
      const gitDir = join(REPO_ROOT, ".git");
      return !(src === gitDir || src.startsWith(gitDir + sep));
    },
  });
  return dir;
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile()) out.push(p);
  }
  return out;
}

test("cloneRepo preserves root dot-git-prefixed metadata files", () => {
  const clone = cloneRepo();
  try {
    assert.equal(existsSync(join(clone, ".gitignore")), existsSync(join(REPO_ROOT, ".gitignore")));
  } finally {
    rmSync(clone, { recursive: true, force: true });
  }
});

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

test("package validator rejects generated event logs in bundled payload", () => {
  const dir = cloneRepo();
  try {
    const eventLog = join(dir, "plugins", "compound-agent-system", "assets", "system-files", ".agents", "events.jsonl");
    writeFileSync(eventLog, JSON.stringify({ event: "runtime-only" }) + "\n");
    const r = spawnSync(process.execPath, [join(dir, "plugins", "compound-agent-system", "scripts", "validate-package.mjs")], { cwd: dir, encoding: "utf-8" });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /Forbidden bundled files/);
    assert.match(r.stderr, /\.agents\/events\.jsonl/);
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

test("curated fixtures document purpose and fixture-only product ideas", () => {
  const fixtureFiles = walk(join(SYSTEM_ROOT, "fixtures")).filter((file) => [".md", ".json"].includes(extname(file)));
  assert.ok(fixtureFiles.length > 0);
  for (const file of fixtureFiles) {
    const rel = file.slice(SYSTEM_ROOT.length + 1).replaceAll(sep, "/");
    const text = readFileSync(file, "utf-8");
    if (rel === "fixtures/ideas/realworld-benchmarks.json") {
      const corpus = JSON.parse(text);
      assert.match(corpus[0].purpose, /Fixture purpose:/, `${rel} needs a corpus purpose note`);
      assert.match(corpus[0].not_to_build, /fixture-only product ideas/, `${rel} needs fixture-only marking`);
      continue;
    }
    assert.match(text, /Fixture purpose:/, `${rel} needs a short purpose note`);
    if (rel.startsWith("fixtures/ideas/")) {
      assert.match(text, /Not-to-build:.*fixture-only product idea/i, `${rel} needs fixture-only product marking`);
    }
  }
});
