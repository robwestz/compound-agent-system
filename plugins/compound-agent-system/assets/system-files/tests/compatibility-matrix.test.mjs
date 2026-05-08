import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..", "..", "..", "..");
const SYSTEM_ROOT = join(REPO_ROOT, "plugins", "compound-agent-system", "assets", "system-files");
const MATRIX = join(REPO_ROOT, "docs", "compatibility-matrix.md");
const BUNDLED_MATRIX = join(SYSTEM_ROOT, "docs", "compatibility-matrix.md");
const WORKFLOW = join(SYSTEM_ROOT, ".github", "workflows", "test.yml");

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile()) out.push(p);
  }
  return out;
}

function nodeMajor(version) {
  return Number(/^v?(\d+)/.exec(version)?.[1] || 0);
}

test("compatibility matrix declares only CI-tested Node versions as supported", () => {
  const matrix = readFileSync(MATRIX, "utf-8");
  assert.equal(readFileSync(BUNDLED_MATRIX, "utf-8"), matrix);
  const workflow = readFileSync(WORKFLOW, "utf-8");

  assert.match(workflow, /node:\s*\[18,\s*20,\s*22\]/);
  assert.match(matrix, /18\.x LTS \| \*\*Supported\*\*/);
  assert.match(matrix, /20\.x LTS \| \*\*Supported\*\*/);
  assert.match(matrix, /22\.x LTS \| \*\*Supported\*\*/);
  assert.match(matrix, /23\.x \/ odd releases \| Best-effort/);
  assert.match(matrix, /16\.x and older \| \*\*Unsupported\*\*/);
});

test("compatibility matrix does not claim untested OS and shell support", () => {
  const matrix = readFileSync(MATRIX, "utf-8");

  assert.match(matrix, /Ubuntu Linux on GitHub Actions \| \*\*Supported\*\*/);
  assert.match(matrix, /Other Linux distributions \| Best-effort/);
  assert.match(matrix, /macOS .*\| Best-effort/);
  assert.match(matrix, /Windows 10\/11 \| Best-effort/);
  assert.match(matrix, /Bash \(4\+\) \| \*\*Supported\*\*/);
  assert.match(matrix, /PowerShell .*\| Best-effort/);
  assert.match(matrix, /Fish, Nushell, etc\. \| Unsupported/);
});

test("manifest paths are normalized with forward slashes for cross-platform validation", () => {
  const manifest = JSON.parse(readFileSync(join(REPO_ROOT, "manifest.json"), "utf-8"));
  assert.ok(Array.isArray(manifest.system_files));
  for (const entry of manifest.system_files) {
    assert.equal(entry.path.includes("\\"), false, entry.path);
    assert.equal(entry.path.startsWith("/"), false, entry.path);
    assert.equal(entry.path.includes(".."), false, entry.path);
  }
});

test("system-file text fixtures use LF line endings", () => {
  const textExtensions = new Set([".md", ".mjs", ".js", ".json", ".toml", ".yml", ".yaml", ".ps1"]);
  const offenders = [];
  for (const file of walk(SYSTEM_ROOT)) {
    const ext = file.slice(file.lastIndexOf("."));
    if (!textExtensions.has(ext)) continue;
    const raw = readFileSync(file, "utf-8");
    if (raw.includes("\r\n")) offenders.push(file.slice(SYSTEM_ROOT.length + 1).replaceAll(sep, "/"));
  }
  assert.deepEqual(offenders, []);
});

test("Node version boundary is deterministic for doctor support checks", () => {
  assert.equal(nodeMajor("v16.20.0") >= 18, false);
  assert.equal(nodeMajor("16.20.0") >= 18, false);
  assert.equal(nodeMajor("v18.0.0") >= 18, true);
  assert.equal(nodeMajor("v20.11.1") >= 18, true);
  assert.equal(nodeMajor("v22.12.0") >= 18, true);
});

test("release checklist requires matrix verification", () => {
  const matrix = readFileSync(MATRIX, "utf-8");

  assert.match(matrix, /## Release checklist — matrix verification/);
  assert.match(matrix, /CI passes on Node 18, 20, and 22/);
  assert.match(matrix, /compatibility matrix doc matches the actual CI matrix/);
  assert.match(matrix, /No docs or README claim support for environments not listed as "Supported"/);
  assert.match(matrix, /COMPOUND_DOCTOR_NODE_VERSION=v16\.20\.0/);
  assert.match(matrix, /examples\/activate-existing-repo\/README\.md/);
});
