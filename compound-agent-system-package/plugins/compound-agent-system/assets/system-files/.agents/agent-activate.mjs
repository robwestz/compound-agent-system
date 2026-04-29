#!/usr/bin/env node
// .agents/agent-activate.mjs - sign an agent into the Compound ledger.
// Usage: node .agents/agent-activate.mjs --id <agent-id> [--role <role>] [--skill <skill>...]

import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ledgerPath = join(here, "TASKS.json");

function parseArgs(argv) {
  const args = { skills: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--id") args.id = argv[++i];
    else if (a === "--role") args.role = argv[++i];
    else if (a === "--skill") args.skills.push(argv[++i]);
    else if (a === "--help" || a === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function loadLedger() {
  if (!existsSync(ledgerPath)) {
    return { version: "1", schema_url: ".agents/PROTOCOL.md", current: null, tasks: [], agents_active: [], agent_profiles: {}, log: [] };
  }
  const ledger = JSON.parse(readFileSync(ledgerPath, "utf-8"));
  if (!Array.isArray(ledger.agents_active)) ledger.agents_active = [];
  if (!ledger.agent_profiles || typeof ledger.agent_profiles !== "object") ledger.agent_profiles = {};
  if (!Array.isArray(ledger.log)) ledger.log = [];
  return ledger;
}

function saveLedger(ledger) {
  const tmp = ledgerPath + ".tmp";
  mkdirSync(dirname(ledgerPath), { recursive: true });
  writeFileSync(tmp, JSON.stringify(ledger, null, 2) + "\n");
  renameSync(tmp, ledgerPath);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.id) {
    console.log("Usage: node .agents/agent-activate.mjs --id <agent-id> [--role <role>] [--skill <skill>...]");
    console.log("");
    console.log("Activation means the agent is registered in .agents/TASKS.json before it opens or resumes work.");
    return args.help ? undefined : process.exit(1);
  }

  const ledger = loadLedger();
  if (!ledger.agents_active.includes(args.id)) ledger.agents_active.push(args.id);
  ledger.agent_profiles[args.id] = {
    id: args.id,
    role: args.role || ledger.agent_profiles[args.id]?.role || "agent",
    skills: args.skills.length ? args.skills : ledger.agent_profiles[args.id]?.skills || [],
    activated_at: new Date().toISOString(),
  };
  ledger.log.push({ ts: new Date().toISOString(), event: "agent-activate", task: null, agent: args.id, role: ledger.agent_profiles[args.id].role });
  saveLedger(ledger);

  console.log(`Agent activated: ${args.id}`);
  console.log(`Role: ${ledger.agent_profiles[args.id].role}`);
  if (ledger.agent_profiles[args.id].skills.length) console.log(`Skills: ${ledger.agent_profiles[args.id].skills.join(", ")}`);
  console.log("Next: node .agents/task.mjs status");
}

main();
