#!/usr/bin/env node
// .agents/agent-activate.mjs - sign an agent into the Compound ledger.
// Usage: node .agents/agent-activate.mjs --id <agent-id> [--client <client>] [--model <model>] [--display-name <name>] [--role <role>] [--skill <skill>...]

import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { appendEvent, eventLogPathFromLedgerPath } from "./event-log.mjs";
import { printFirstSessionWizard } from "./first-session-wizard.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const ledgerPath = process.env.COMPOUND_TASKS_PATH || join(here, "TASKS.json");

function parseArgs(argv) {
  const args = { skills: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--id") args.id = argv[++i];
    else if (a === "--client") args.client = argv[++i];
    else if (a === "--model") args.model = argv[++i];
    else if (a === "--display-name") args.displayName = argv[++i];
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

function normalizeIdentity(args, existing = {}) {
  let client = args.client || existing.client || "agent";
  let model = args.model || existing.model || "unspecified";
  const alias = String(args.id || "").toLowerCase();
  const m = /^(claude|codex|devin|cursor|gpt)-(.+)$/.exec(alias);
  if (!args.client && !args.model && m) {
    client = m[1] === "gpt" ? "codex" : m[1];
    model = m[2];
  }
  const sessionId = existing.session_id || `${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id: args.id,
    client,
    model,
    role: args.role || existing.role || "agent",
    display_name: args.displayName || existing.display_name || `${client} ${model}`.trim(),
    session_id: sessionId,
    skills: args.skills.length ? args.skills : existing.skills || [],
    activated_at: new Date().toISOString(),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.id) {
    console.log("Usage: node .agents/agent-activate.mjs --id <agent-id> [--client <client>] [--model <model>] [--display-name <name>] [--role <role>] [--skill <skill>...]");
    console.log("");
    console.log("Activation means the agent is registered in .agents/TASKS.json before it opens or resumes work.");
    return args.help ? undefined : process.exit(1);
  }

  const ledger = loadLedger();
  if (!ledger.agents_active.includes(args.id)) ledger.agents_active.push(args.id);
  const profile = normalizeIdentity(args, ledger.agent_profiles[args.id]);
  ledger.agent_profiles[args.id] = profile;
  ledger.log.push({ ts: new Date().toISOString(), event: "agent-activate", task: null, agent: args.id, identity: profile });
  try {
    appendEvent({
      logPath: eventLogPathFromLedgerPath(ledgerPath),
      event: "agent-activate",
      command: "agent-activate.mjs",
      result: { status: "ok" },
      timestamp: profile.activated_at,
      context: {
        agent_id: profile.id,
        client: profile.client,
        model: profile.model,
        role: profile.role,
        skill_count: profile.skills.length,
      },
    });
  } catch {
    // Observability must never block agent activation.
  }
  saveLedger(ledger);

  printFirstSessionWizard({ ledger });
  console.log("");
  console.log(`Identity: id=${profile.id} client=${profile.client} model=${profile.model} role=${profile.role} session_id=${profile.session_id}`);
  if (profile.skills.length) console.log(`Skills: ${profile.skills.join(", ")}`);
}

main();
