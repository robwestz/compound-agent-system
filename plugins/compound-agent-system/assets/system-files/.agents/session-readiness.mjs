#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const ledgerPath = process.env.COMPOUND_TASKS_PATH || join(here, "TASKS.json");

function mode() {
  const explicit = String(process.env.COMPOUND_MODE || "").toLowerCase();
  if (["observe", "warn", "enforce"].includes(explicit)) return explicit;
  if (process.env.COMPOUND_ENFORCE === "1") return "enforce";
  return "warn";
}

function loadLedger() {
  if (!existsSync(ledgerPath)) return { current: null, tasks: [], log: [] };
  return JSON.parse(readFileSync(ledgerPath, "utf-8"));
}

function latestLog(ledger, event) {
  return [...(ledger.log || [])].reverse().find((entry) => entry.event === event || String(entry.event || "").includes(event));
}

function checkpoints(ledger) {
  const fromTasks = (ledger.tasks || []).flatMap((task) => task.handoffs || []);
  const dirs = [join(repoRoot, ".omc", "state", "checkpoints"), join(repoRoot, ".agents", "checkpoints")];
  const fileExists = dirs.some((dir) => existsSync(dir));
  return { count: fromTasks.length + (fileExists ? 1 : 0), fromTasks };
}

export function assessReadiness({ ledger = loadLedger(), complianceMode = mode() } = {}) {
  const current = ledger.current ? (ledger.tasks || []).find((task) => task.id === ledger.current) : null;
  const blockerTasks = (ledger.tasks || []).filter((task) => task.state === "blocked" || (Array.isArray(task.blocked_by) && task.blocked_by.length));
  const pendingQuestions = blockerTasks.flatMap((task) => task.blocked_by || []).filter(Boolean);
  const checkpoint = checkpoints(ledger);
  const checks = {
    active_task: Boolean(current),
    active_task_has_dod: Boolean(current?.dod?.length),
    current_phase: Boolean(current?.id || current?.goal),
    last_context_refresh: Boolean(latestLog(ledger, "context-refresh")),
    last_compound_register: Boolean(latestLog(ledger, "compound-register") || latestLog(ledger, "done")),
    known_blockers_clear: blockerTasks.length === 0,
    pending_questions_clear: pendingQuestions.length === 0,
    handoff_checkpoint: checkpoint.count > 0,
    compliance_mode_enforce: complianceMode === "enforce",
  };
  const unlock_steps = [];
  if (!checks.active_task) unlock_steps.push("Open or resume an active task with DoD.");
  if (checks.active_task && !checks.active_task_has_dod) unlock_steps.push("Add at least one DoD check to the active task.");
  if (!checks.last_context_refresh) unlock_steps.push("Run a CONTEXT REFRESH and log it before long execution.");
  if (!checks.last_compound_register) unlock_steps.push("Complete or register the last unit of work with COMPOUND REGISTER.");
  if (!checks.known_blockers_clear) unlock_steps.push("Resolve blockers or accept documented recommended defaults.");
  if (!checks.handoff_checkpoint) unlock_steps.push("Create a handoff checkpoint with handoff-bridge.mjs before unattended work.");
  if (!checks.compliance_mode_enforce) unlock_steps.push("Set COMPOUND_MODE=enforce before unattended execution.");
  const ready = Object.values(checks).every(Boolean);
  return { ready, status: ready ? "READY" : "NOT_READY", checks, unlock_steps, current_task: current?.id || null, compliance_mode: complianceMode, blockers: blockerTasks.map((task) => task.id), pending_questions: pendingQuestions };
}

function main() {
  const result = assessReadiness();
  console.log(`Long-session readiness: ${result.status}`);
  console.log(`- current task: ${result.checks.active_task ? result.current_task : "no"}`);
  console.log(`- DoD: ${result.checks.active_task_has_dod ? "yes" : "no"}`);
  console.log(`- current phase: ${result.checks.current_phase ? "yes" : "no"}`);
  console.log(`- last context refresh: ${result.checks.last_context_refresh ? "yes" : "no"}`);
  console.log(`- last compound register: ${result.checks.last_compound_register ? "yes" : "no"}`);
  console.log(`- known blockers: ${result.blockers.length}`);
  console.log(`- pending questions: ${result.pending_questions.length}`);
  console.log(`- handoff checkpoint: ${result.checks.handoff_checkpoint ? "yes" : "missing"}`);
  console.log(`- compliance mode: ${result.compliance_mode}`);
  console.log(`- unattended safe: ${result.ready ? "yes" : "no"}`);
  if (!result.ready) {
    console.log("\nUnlock:");
    result.unlock_steps.forEach((step, index) => console.log(`${index + 1}. ${step}`));
  }
  console.log("\nJSON:");
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
