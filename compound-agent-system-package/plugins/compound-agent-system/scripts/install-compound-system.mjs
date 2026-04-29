#!/usr/bin/env node
// Usage: node scripts/install-compound-system.mjs --target <repo> [--overwrite] [--dry-run]
// Copies the bundled Compound Agent System files into a target repository.

import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(pluginRoot, "assets", "system-files");

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

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: node scripts/install-compound-system.mjs --target <repo> [--overwrite] [--dry-run]");
    return;
  }
  if (!existsSync(sourceRoot)) throw new Error(`Missing bundled system files: ${sourceRoot}`);
  const targetRoot = resolve(args.target);
  const files = walk(sourceRoot);
  let copied = 0;
  let skipped = 0;

  for (const src of files) {
    const rel = relative(sourceRoot, src);
    const dest = join(targetRoot, rel);
    if (existsSync(dest) && !args.overwrite) {
      skipped++;
      console.log(`skip existing: ${rel}`);
      continue;
    }
    copied++;
    console.log(`${args.dryRun ? "would copy" : "copy"}: ${rel}`);
    if (!args.dryRun) {
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
    }
  }

  console.log(`\nCompound system install ${args.dryRun ? "dry-run" : "complete"}: ${copied} copied, ${skipped} skipped.`);
  console.log("Next:");
  console.log("  node .agents/activate.mjs");
  console.log("  node .agents/agent-activate.mjs --id <agent-id>");
  console.log("  node .agents/task.mjs status");
  console.log("  node .agents/task.mjs open \"<project goal>\" --dod \"manual:<first acceptance gate>\"");
}

main();
