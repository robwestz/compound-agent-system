#!/usr/bin/env node
// .agents/first-session-wizard.mjs — concise first-run guide after bootstrap.
// Zero runtime dependencies. Node 18+.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ledgerPath = process.env.COMPOUND_TASKS_PATH || join(here, "TASKS.json");
const statePath = process.env.COMPOUND_WIZARD_STATE_PATH || join(here, "first-session-wizard.json");

function mode() {
  const explicit = String(process.env.COMPOUND_MODE || "").toLowerCase();
  if (["observe", "warn", "enforce"].includes(explicit)) return explicit;
  if (process.env.COMPOUND_ENFORCE === "1") return "enforce";
  return "warn";
}

function modeLabel(value = mode()) {
  const v = String(value).toLowerCase();
  if (v === "enforce") return "ENFORCE (blocks unsafe changes)";
  if (v === "observe") return "OBSERVE (logs guidance only)";
  return "WARN (guides without blocking)";
}

function commandVariants(posix, powershell = null) {
  return powershell ? { posix, powershell } : posix;
}

function printCommand(label, command) {
  if (typeof command === "string") {
    console.log(`${label}: ${command}`);
    return;
  }
  console.log(`${label}: ${command.posix}`);
  console.log(`${label} (PowerShell): ${command.powershell}`);
}

function workspaceRoot() {
  const ledgerDir = dirname(resolve(ledgerPath));
  if (basename(ledgerDir) === ".agents") return dirname(ledgerDir);
  if (ledgerDir === here) return resolve(here, "..");
  return ledgerDir;
}

function loadLedger() {
  if (!existsSync(ledgerPath)) return { current: null, tasks: [], agents_active: [], agent_profiles: {}, log: [] };
  const ledger = JSON.parse(readFileSync(ledgerPath, "utf-8"));
  if (!Array.isArray(ledger.tasks)) ledger.tasks = [];
  if (!Array.isArray(ledger.agents_active)) ledger.agents_active = [];
  if (!ledger.agent_profiles || typeof ledger.agent_profiles !== "object") ledger.agent_profiles = {};
  return ledger;
}

function loadState() {
  if (!existsSync(statePath)) return { skipped: false };
  try {
    return JSON.parse(readFileSync(statePath, "utf-8"));
  } catch {
    return { skipped: false };
  }
}

function saveState(state) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
}

function activeProfile(ledger) {
  const latest = [...(ledger.agents_active || [])].reverse().find((id) => ledger.agent_profiles?.[id]);
  if (latest) return ledger.agent_profiles[latest];
  const profiles = Object.values(ledger.agent_profiles || {});
  return profiles[profiles.length - 1] || null;
}

function phaseTasksImported(ledger) {
  return (ledger.tasks || []).some((task) => /^phase-/.test(task.id || ""));
}

function nextStep({ root = workspaceRoot(), ledger = loadLedger(), complianceMode = mode() } = {}) {
  const profile = activeProfile(ledger);
  const planPath = join(root, "phase-0", "PHASE_PLAN.md");
  const ideaPath = join(root, "idea.md");
  if (!profile) {
    return {
      step: "1 of 5",
      title: "sign in the agent",
      agent: "not signed in",
      next: commandVariants("node .agents/agent-activate.mjs --id <agent-id>", "node .agents\\agent-activate.mjs --id <agent-id>"),
      mode: modeLabel(complianceMode),
    };
  }
  const agent = `${profile.id || profile.display_name || "agent"} signed in as ${profile.role || "agent"}`;
  if (!existsSync(ideaPath) && !existsSync(planPath)) {
    return {
      step: "2 of 5",
      title: "capture your idea",
      agent,
      next: "create idea.md with your raw idea",
      mode: modeLabel(complianceMode),
    };
  }
  if (!existsSync(planPath)) {
    return {
      step: "3 of 5",
      title: "turn the idea into a plan",
      agent,
      next: commandVariants("node .agents/idea-intake.mjs --input idea.md --apply", "node .agents\\idea-intake.mjs --input idea.md --apply"),
      mode: modeLabel(complianceMode),
    };
  }
  if (!phaseTasksImported(ledger)) {
    return {
      step: "4 of 5",
      title: "import planned tasks",
      agent,
      next: commandVariants("node .agents/task.mjs import phase-0/PHASE_PLAN.md --apply", "node .agents\\task.mjs import phase-0\\PHASE_PLAN.md --apply"),
      mode: modeLabel(complianceMode),
    };
  }
  return {
    step: "5 of 5",
    title: "check readiness",
    agent,
    next: commandVariants("node .agents/session-readiness.mjs", "node .agents\\session-readiness.mjs"),
    mode: modeLabel(complianceMode),
  };
}

export function printFirstSessionWizard(options = {}) {
  if (process.env.COMPOUND_FIRST_SESSION_WIZARD === "0" || process.env.COMPOUND_SKIP_FIRST_SESSION_WIZARD === "1") return;
  const state = loadState();
  if (state.skipped) {
    console.log("First-session guided wizard: skipped.");
    console.log("Underlying CLI commands still work: node .agents/task.mjs status");
    return;
  }
  const step = nextStep(options);
  console.log("First-session guided wizard");
  console.log(`Step ${step.step}: ${step.title}.`);
  console.log(`System: installed; mode ${step.mode}.`);
  console.log(`Agent: ${step.agent}.`);
  printCommand("Next", step.next);
  printCommand("Skip", commandVariants("node .agents/first-session-wizard.mjs skip", "node .agents\\first-session-wizard.mjs skip"));
}

function main() {
  const command = process.argv[2] || "status";
  if (command === "status") {
    printFirstSessionWizard();
    return;
  }
  if (command === "skip") {
    saveState({ skipped: true, skipped_at: new Date().toISOString() });
    console.log("First-session guided wizard: skipped.");
    console.log("Underlying CLI commands still work: node .agents/task.mjs status");
    return;
  }
  if (command === "--help" || command === "-h" || command === "help") {
    console.log("Usage: node .agents/first-session-wizard.mjs [status|skip]");
    console.log("status prints one primary next action. skip hides future wizard guidance.");
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
