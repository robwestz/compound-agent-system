import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..", "..", "..", "..");
const SYSTEM_ROOT = join(REPO_ROOT, "plugins", "compound-agent-system", "assets", "system-files");

const intentDocs = [
  "docs/install.md",
  "docs/first-run.md",
  "docs/concepts.md",
  "docs/operations.md",
  "docs/troubleshooting.md",
  "docs/development.md",
  "docs/release.md",
  "docs/performance-and-scale-limits.md",
  "docs/marketplace-release-readiness.md",
  "docs/backward-compatibility-contract.md",
];

function read(rel) {
  return readFileSync(join(REPO_ROOT, rel), "utf-8");
}

function markdownLinks(markdown) {
  const links = [];
  const pattern = /\[[^\]]+\]\(([^)]+)\)/g;
  let match;
  while ((match = pattern.exec(markdown))) {
    const target = match[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    links.push(target.split("#")[0]);
  }
  return links.filter(Boolean);
}

test("README routes supported user intents to docs", () => {
  const readme = read("README.md");
  for (const doc of intentDocs) {
    assert.match(readme, new RegExp(doc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const intent of ["Install", "First run", "Concepts", "Operations", "Troubleshooting", "Development", "Release"]) {
    assert.match(readme, new RegExp(intent, "i"));
  }
});

test("root and bundled intent docs stay mirrored", () => {
  const mirrored = [
    "docs/compatibility-matrix.md",
    "docs/install.md",
    "docs/first-run.md",
    "docs/concepts.md",
    "docs/operations.md",
    "docs/release.md",
    "docs/performance-and-scale-limits.md",
    "docs/marketplace-release-readiness.md",
    "docs/backward-compatibility-contract.md",
    "docs/troubleshooting.md",
    "docs/plugin-size-budget.md",
    "docs/secrets-and-ai-policy.md",
    "docs/security-boundary-model.md",
  ];
  for (const rel of mirrored) {
    assert.equal(readFileSync(join(SYSTEM_ROOT, rel), "utf-8"), read(rel), rel);
  }
});

test("troubleshooting maps failures to doctor readiness and support bundle", () => {
  const doc = read("docs/troubleshooting.md");
  assert.match(doc, /node \.agents\/task\.mjs doctor/);
  assert.match(doc, /node \.agents\/session-readiness\.mjs/);
  assert.match(doc, /node \.agents\/support-bundle\.mjs/);
  assert.match(doc, /Long-session readiness: NOT_READY/);
  assert.match(doc, /stale `manifest\.json` byte metadata/);
});

test("API Alchemy fixture-only warning is preserved in IA entrypoints", () => {
  for (const rel of ["README.md", "docs/concepts.md", "docs/development.md"]) {
    const doc = read(rel);
    assert.match(doc, /API Alchemy Engine/);
    assert.match(doc, /fixture/i);
  }
});

test("relative markdown links in IA docs resolve", () => {
  for (const root of [REPO_ROOT, SYSTEM_ROOT]) {
    for (const rel of ["README.md", ...intentDocs, "docs/premium-production/PREMIUM_POSITIONING_REPORT.md"]) {
      const file = join(root, rel);
      if (!existsSync(file)) continue;
      const baseDir = dirname(file);
      const doc = readFileSync(file, "utf-8");
      for (const link of markdownLinks(doc)) {
        assert.equal(existsSync(resolve(baseDir, link)), true, `${file} -> ${link}`);
      }
    }
  }
});

test("root housekeeping keeps historical prompts archived and scratch files absent", () => {
  const readme = read("README.md");
  assert.match(readme, /Version:\*\* `1\.0\.0`/);
  assert.match(readme, /premium-production release candidate/);
  assert.match(readme, /docs\/archive\/SESSION\.md/);
  assert.match(readme, /docs\/archive\/upgrade_package_2\.md/);
  assert.equal(existsSync(join(REPO_ROOT, "SESSION.md")), false);
  assert.equal(existsSync(join(REPO_ROOT, "upgrade_package_2.md")), false);
  assert.equal(existsSync(join(REPO_ROOT, "file1.txt")), false);
  assert.equal(existsSync(join(REPO_ROOT, "file2.txt")), false);
  assert.equal(existsSync(join(REPO_ROOT, "docs", "archive", "SESSION.md")), true);
  assert.equal(existsSync(join(REPO_ROOT, "docs", "archive", "upgrade_package_2.md")), true);
});

test("premium positioning report records world-class quick wins with constraints", () => {
  const report = read("docs/premium-production/PREMIUM_POSITIONING_REPORT.md");
  assert.match(report, /Why this is premium/);
  assert.match(report, /Why this is better than ordinary agent harnesses/);
  assert.match(report, /What it may be uniquely better at/);
  assert.match(report, /Five short world-class follow-up upgrades/);
  for (const item of [
    "Hook compatibility conformance harness",
    "Proof-carrying task receipts",
    "Diff-risk approval classifier",
    "Unattended-session black-box simulator",
    "Competitive capability scorecard as code",
  ]) {
    assert.match(report, new RegExp(item));
  }
  assert.match(report, /better than corresponding Anthropic-native workflow usage/);
});
