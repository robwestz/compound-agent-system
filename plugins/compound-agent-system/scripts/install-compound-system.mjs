#!/usr/bin/env node
// Usage: node scripts/install-compound-system.mjs --target <repo> [--overwrite] [--dry-run]
// Copies the bundled Compound Agent System files into a target repository.

import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(pluginRoot, "assets", "system-files");
const HIGH_IMPACT_ROOT_WRITES = new Set(["CLAUDE.md", "package.json", "AGENT_ONBOARDING.md", "HANDOFF.md", "FUTURE_WORK.md", "package-lock.json"]);

function parseArgs(argv) {
  const args = { target: process.cwd(), overwrite: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--target") args.target = argv[++i];
    else if (a === "--overwrite") args.overwrite = true;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
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

function sameFile(a, b) {
  if (!existsSync(a) || !existsSync(b)) return false;
  const as = statSync(a);
  const bs = statSync(b);
  if (as.size !== bs.size) return false;
  return readFileSync(a).equals(readFileSync(b));
}

function classifyFile(rel, src, dest, args) {
  const rootLevel = !rel.includes("/") && !rel.includes("\\");
  const highImpact = rootLevel && HIGH_IMPACT_ROOT_WRITES.has(rel);
  const exists = existsSync(dest);
  const same = exists && sameFile(src, dest);
  const entry = { path: rel, source: src, target: dest, root_level: rootLevel, high_impact: highImpact };
  if (!exists) return { bucket: "files_to_create", entry };
  if (same) return { bucket: "files_to_skip", entry: { ...entry, reason: "identical" } };
  if (args.overwrite) return { bucket: "files_to_modify", overwrite: { ...entry, reason: "target differs and --overwrite was set" }, entry };
  return { bucket: "files_to_skip", overwrite: { ...entry, reason: "target differs and --overwrite was not set" }, entry: { ...entry, reason: "exists" } };
}

export function buildInstallPlan(args) {
  const targetRoot = resolve(args.target);
  const files = walk(sourceRoot);
  const plan = {
    version: 1,
    target: targetRoot,
    dry_run: Boolean(args.dryRun),
    overwrite: Boolean(args.overwrite),
    files_to_create: [],
    files_to_modify: [],
    files_to_skip: [],
    overwrites: [],
    root_level_writes: [],
    hook_mutations: [
      { event: "SessionStart", command: "node .agents/task.mjs hook session-start" },
      { event: "PreToolUse", command: "node .agents/task.mjs hook pre-edit" },
      { event: "Stop", command: "node .agents/task.mjs hook stop" },
    ],
    ledger_init: existsSync(join(targetRoot, ".agents", "TASKS.json")) ? "preserve existing ledger" : "initialize .agents/TASKS.json during activation",
    activation_behavior: "run node .agents/activate.mjs after apply unless bootstrap used --no-activate",
    warnings: [],
    apply_command: `node ${relative(targetRoot, fileURLToPath(import.meta.url)).replaceAll("\\", "/")} --target ${JSON.stringify(targetRoot)}${args.overwrite ? " --overwrite" : ""}`,
  };

  for (const src of files) {
    const rel = relative(sourceRoot, src).replaceAll("\\", "/");
    const dest = join(targetRoot, rel);
    const classified = classifyFile(rel, src, dest, args);
    plan[classified.bucket].push(classified.entry);
    if (classified.overwrite) plan.overwrites.push(classified.overwrite);
    if (classified.entry.root_level) plan.root_level_writes.push(classified.entry);
    if (classified.entry.high_impact) plan.warnings.push({ type: "high_impact_root_write", path: rel, message: `${rel} is a root-level contract file.` });
  }
  return plan;
}

function planPath(targetRoot) {
  return join(targetRoot, "compound-install-plan.json");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: node scripts/install-compound-system.mjs --target <repo> [--overwrite] [--dry-run]");
    return;
  }
  if (!existsSync(sourceRoot)) throw new Error(`Missing bundled system files: ${sourceRoot}`);
  const targetRoot = resolve(args.target);
  mkdirSync(targetRoot, { recursive: true });
  const plan = buildInstallPlan(args);
  writeFileSync(planPath(targetRoot), JSON.stringify(plan, null, 2) + "\n");

  for (const entry of [...plan.files_to_create, ...plan.files_to_modify]) {
    console.log(`${args.dryRun ? "would copy" : "copy"}: ${entry.path}`);
    if (!args.dryRun) {
      mkdirSync(dirname(entry.target), { recursive: true });
      copyFileSync(entry.source, entry.target);
    }
  }
  for (const entry of plan.files_to_skip) console.log(`skip existing: ${entry.path}`);

  console.log(`\nCompound system install ${args.dryRun ? "dry-run" : "complete"}: ${plan.files_to_create.length + plan.files_to_modify.length} copied, ${plan.files_to_skip.length} skipped.`);
  console.log(`Install plan: ${planPath(targetRoot)}`);
  if (plan.warnings.length) console.log(`Warnings: ${plan.warnings.length} (review high_impact root writes before applying).`);
  console.log("Next:");
  console.log("  node .agents/activate.mjs");
  console.log("  node .agents/agent-activate.mjs --id <agent-id>");
  console.log("  node .agents/task.mjs status");
  console.log("  node .agents/idea-intake.mjs --input <idea-file> --apply");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
