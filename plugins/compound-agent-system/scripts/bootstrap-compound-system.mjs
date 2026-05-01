#!/usr/bin/env node
// Usage: node scripts/bootstrap-compound-system.mjs --target <repo> [--agent-id <id>] [--overwrite] [--dry-run] [--no-activate]
// Installs the bundled Compound Agent System into a target repo, activates hooks, and optionally signs in the current agent.

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const installScript = join(pluginRoot, "scripts", "install-compound-system.mjs");

function parseArgs(argv) {
  const args = { target: process.cwd(), overwrite: false, dryRun: false, activate: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--target") args.target = argv[++i];
    else if (a === "--agent-id") args.agentId = argv[++i];
    else if (a === "--role") args.role = argv[++i];
    else if (a === "--skill") (args.skills ||= []).push(argv[++i]);
    else if (a === "--overwrite") args.overwrite = true;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--no-activate") args.activate = false;
    else if (a === "--help" || a === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function run(command, args, opts = {}) {
  console.log(`\n> ${[command, ...args].join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: false, ...opts });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) throw new Error(`Command failed with exit ${result.status}: ${command}`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: node scripts/bootstrap-compound-system.mjs --target <repo> [--agent-id <id>] [--overwrite] [--dry-run] [--no-activate]");
    console.log("");
    console.log("Bootstrap means:");
    console.log("  1. Copy the Compound harness files into the target repo.");
    console.log("  2. Activate repo hooks and ledger unless --no-activate is used.");
    console.log("  3. Optionally sign in the current agent with --agent-id.");
    return;
  }

  const targetRoot = resolve(args.target);
  const installArgs = [installScript, "--target", targetRoot];
  if (args.overwrite) installArgs.push("--overwrite");
  if (args.dryRun) installArgs.push("--dry-run");

  console.log("Compound workspace harness bootstrap");
  console.log(`Target: ${targetRoot}`);
  console.log(`Mode: ${args.dryRun ? "dry-run" : "write"}`);
  console.log(`Activate: ${args.activate && !args.dryRun ? "yes" : "no"}`);
  if (args.agentId) console.log(`Agent: ${args.agentId}`);

  run(process.execPath, installArgs);

  if (args.dryRun) {
    console.log("\nDry-run complete. No target files were changed.");
    console.log(`Review install plan: ${join(targetRoot, "compound-install-plan.json")}`);
    return;
  }

  if (args.activate) {
    const activateScript = join(targetRoot, ".agents", "activate.mjs");
    if (!existsSync(activateScript)) throw new Error(`Missing activation script after install: ${activateScript}`);
    run(process.execPath, [activateScript], { cwd: targetRoot });
  }

  if (args.agentId) {
    const agentActivate = join(targetRoot, ".agents", "agent-activate.mjs");
    const taskScript = join(targetRoot, ".agents", "task.mjs");
    if (existsSync(agentActivate)) {
      const agentArgs = [agentActivate, "--id", args.agentId];
      if (args.role) agentArgs.push("--role", args.role);
      for (const skill of args.skills || []) agentArgs.push("--skill", skill);
      run(process.execPath, agentArgs, { cwd: targetRoot });
    } else {
      run(process.execPath, [taskScript, "ack", args.agentId], { cwd: targetRoot });
    }
  }
}

main();
