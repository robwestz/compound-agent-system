#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { appendEvent, eventLogPathFromLedgerPath } from "./event-log.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const ledgerPath = process.env.COMPOUND_TASKS_PATH || join(here, "TASKS.json");

function workspaceRoot() {
  const ledgerDir = dirname(resolve(ledgerPath));
  if (basename(ledgerDir) === ".agents") return dirname(ledgerDir);
  if (ledgerDir === here) return resolve(here, "..");
  return ledgerDir;
}

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

function fileExists(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function checkpointFiles(dir) {
  if (!existsSync(dir)) return [];
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...checkpointFiles(path));
    else if (entry.isFile()) found.push(path);
  }
  return found;
}

function checkpoints(ledger) {
  const root = workspaceRoot();
  const fromTasks = (ledger.tasks || [])
    .flatMap((task) => task.handoffs || [])
    .map((handoff) => handoff.path ? resolve(root, handoff.path) : null)
    .filter((path) => path && fileExists(path));
  const dirs = [join(root, ".omc", "state", "checkpoints"), join(root, ".agents", "checkpoints")];
  const files = dirs.flatMap(checkpointFiles);
  const unique = new Set([...fromTasks, ...files]);
  return { count: unique.size, fromTasks, files };
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
  appendEvent({
    logPath: eventLogPathFromLedgerPath(ledgerPath),
    event: "readiness-decision",
    command: "session-readiness.mjs",
    result: { status: result.status },
    context: {
      ready: result.ready,
      current_task: result.current_task,
      compliance_mode: result.compliance_mode,
      blocker_count: result.blockers.length,
      pending_question_count: result.pending_questions.length,
      failed_checks: Object.entries(result.checks).filter(([, ok]) => !ok).map(([name]) => name),
    },
  });
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
