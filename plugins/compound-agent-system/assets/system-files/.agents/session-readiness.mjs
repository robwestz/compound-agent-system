#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ledgerPath = process.env.COMPOUND_TASKS_PATH || join(here, "TASKS.json");

function workspaceRoot() {
  const ledgerDir = dirname(resolve(ledgerPath));
  if (basename(ledgerDir) === ".agents") return dirname(ledgerDir);
  if (ledgerDir === here) return resolve(here, "..");
  if (existsSync(join(ledgerDir, ".agents"))) return ledgerDir;
  if (existsSync(join(ledgerDir, ".omc"))) return ledgerDir;
  return dirname(ledgerDir);
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

function latestTaskLog(ledger, event, taskId) {
  return [...(ledger.log || [])].reverse().find((entry) => {
    const eventMatches = entry.event === event || String(entry.event || "").includes(event);
    return eventMatches && (!taskId || entry.task === taskId);
  });
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

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value) return [value];
  return [];
}

function dodChecks(task) {
  return Array.isArray(task?.dod) ? task.dod : [];
}

function dodIsStructured(dod) {
  return dod.length > 0 && dod.every((check) => {
    if (check?.check === "test") return Boolean(check.command);
    if (check?.check === "artifact") return Boolean(check.path);
    if (check?.check === "manual") return Boolean(check.description);
    return false;
  });
}

function manualDodSafe(dod) {
  return dod.every((check) => check?.check !== "manual" || !check.passed_at || Boolean(check.confirmed_by));
}

function blockers(ledger) {
  return (ledger.tasks || []).filter((task) => task.state === "blocked" || normalizeList(task.blocked_by).length);
}

function questions(ledger) {
  const ledgerQuestions = normalizeList(ledger.open_questions || ledger.pending_questions);
  const taskQuestions = (ledger.tasks || []).flatMap((task) => normalizeList(task.open_questions || task.pending_questions || task.questions));
  const blockerQuestions = blockers(ledger).flatMap((task) => normalizeList(task.blocked_by));
  return [...ledgerQuestions, ...taskQuestions, ...blockerQuestions].filter(Boolean);
}

function resolveWorkspacePath(root, path) {
  if (!path) return null;
  return resolve(root, path);
}

function handoffs(ledger, current) {
  const root = workspaceRoot();
  const taskHandoffs = normalizeList(current?.handoffs).map((handoff) => ({
    source: "task",
    path: handoff.path || null,
    exists: handoff.path ? fileExists(resolveWorkspacePath(root, handoff.path)) : false,
  }));
  const logged = latestTaskLog(ledger, "handoff-checkpoint", current?.id);
  if (logged?.path) {
    taskHandoffs.push({
      source: "log",
      path: logged.path,
      exists: fileExists(resolveWorkspacePath(root, logged.path)),
    });
  }
  return taskHandoffs;
}

function envContract(ledger, current) {
  const candidates = [
    current?.env_contract,
    current?.environment_contract,
    ledger.env_contract,
    ledger.environment_contract,
  ].filter(Boolean);
  const contract = candidates[0] || null;
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) return { present: false, ready: false };
  const status = String(contract.status || "").toLowerCase();
  const ready = contract.ready === true || contract.accepted === true || ["ready", "known", "accepted"].includes(status);
  return { present: true, ready, contract };
}

function worktreeState(ledger, current) {
  const declared = current?.worktree_state || ledger.worktree_state || current?.git_state || ledger.git_state;
  if (declared && typeof declared === "object") {
    const status = String(declared.status || "").toLowerCase();
    const knownDirty = status === "known-dirty" && normalizeList(declared.files).length > 0 && Boolean(declared.reason);
    return {
      source: "ledger",
      status,
      clean: status === "clean",
      known_dirty: knownDirty,
      files: normalizeList(declared.files),
      reason: declared.reason || null,
    };
  }

  const root = workspaceRoot();
  const git = spawnSync("git", ["-C", root, "status", "--porcelain"], { encoding: "utf-8", stdio: "pipe" });
  if (git.status !== 0) {
    return { source: "git", status: "unknown", clean: false, known_dirty: false, reason: "git status unavailable" };
  }
  const files = git.stdout.trim().split("\n").map((line) => line.trim()).filter(Boolean);
  return { source: "git", status: files.length ? "dirty" : "clean", clean: files.length === 0, known_dirty: false, files };
}

function addUnlock(unlockSteps, id, requirement, command) {
  unlockSteps.push({ id, requirement, command });
}

export function assessReadiness({ ledger = loadLedger(), complianceMode = mode() } = {}) {
  const current = ledger.current ? (ledger.tasks || []).find((task) => task.id === ledger.current) : null;
  const blockerTasks = blockers(ledger);
  const pendingQuestions = questions(ledger);
  const checkpoint = checkpoints(ledger);
  const currentDod = dodChecks(current);
  const currentHandoffs = handoffs(ledger, current);
  const environment = envContract(ledger, current);
  const tree = worktreeState(ledger, current);
  const checks = {
    active_task: Boolean(current && current.state === "in_progress"),
    active_task_has_dod: Boolean(currentDod.length),
    dod_structured: dodIsStructured(currentDod),
    manual_dod_safe: manualDodSafe(currentDod),
    current_phase: Boolean(current?.id && current?.goal),
    last_context_refresh: Boolean(latestTaskLog(ledger, "context-refresh", current?.id)),
    last_compound_register: Boolean(latestTaskLog(ledger, "compound-register", current?.id) || latestTaskLog(ledger, "done", current?.id)),
    known_blockers_clear: blockerTasks.length === 0,
    pending_questions_clear: pendingQuestions.length === 0,
    handoff_checkpoint: checkpoint.count > 0,
    handoff_contract: currentHandoffs.some((handoff) => handoff.exists),
    env_contract: environment.present && environment.ready,
    clean_or_known_dirty: tree.clean || tree.known_dirty,
    compliance_mode_enforce: complianceMode === "enforce",
  };
  const unlock_steps = [];
  if (!checks.active_task) addUnlock(unlock_steps, "active_task", "Open or resume an in-progress active task with DoD.", "node .agents/task.mjs open \"<goal>\" --dod \"test:<command>\" --skill <id>");
  if (current && !checks.active_task_has_dod) addUnlock(unlock_steps, "active_task_has_dod", "Add at least one DoD check to the active task.", `node .agents/task.mjs update ${current.id} --dod "test:<command>"`);
  if (current && currentDod.length && !checks.dod_structured) addUnlock(unlock_steps, "dod_structured", "Replace incomplete DoD entries with test, artifact, or manual checks that include required detail.", `node .agents/task.mjs update ${current.id} --dod "test:<command>"`);
  if (!checks.manual_dod_safe) addUnlock(unlock_steps, "manual_dod_safe", "Manual DoD checks with passed_at must include confirmed_by; do not auto-pass manual checks.", "Re-run manual verification through node .agents/task.mjs verify <task-id> with operator confirmation.");
  if (!checks.last_context_refresh) addUnlock(unlock_steps, "last_context_refresh", "Run a CONTEXT REFRESH and log it before long execution.", "Append a context-refresh ledger event after completing the visible CONTEXT REFRESH block.");
  if (!checks.last_compound_register) addUnlock(unlock_steps, "last_compound_register", "Complete or register the last unit of work with COMPOUND REGISTER.", "Append a compound-register ledger event after completing the visible COMPOUND block.");
  if (!checks.known_blockers_clear) addUnlock(unlock_steps, "known_blockers_clear", "Resolve blockers or accept documented recommended defaults.", "node .agents/task.mjs block <task-id> --reason \"<blocker>\" --unlock \"<command>\" or resolve the blocker.");
  if (!checks.pending_questions_clear) addUnlock(unlock_steps, "pending_questions_clear", "Resolve pending questions before unattended execution.", "Answer or remove open_questions / pending_questions in the task ledger.");
  if (!checks.handoff_checkpoint) addUnlock(unlock_steps, "handoff_checkpoint", "Create a checkpoint file before unattended work.", "node handoff-bridge.mjs checkpoint --task <task-id> --from <agent-id> --summary \"<state>\" --pending \"<next>\"");
  if (!checks.handoff_contract) addUnlock(unlock_steps, "handoff_contract", "Attach a handoff contract path to the active task or handoff-checkpoint log.", "node handoff-bridge.mjs checkpoint --task <task-id> --from <agent-id> --summary \"<state>\" --pending \"<next>\"");
  if (!checks.env_contract) addUnlock(unlock_steps, "env_contract", "Record an explicit env_contract with ready/accepted status for this run.", "Add env_contract: { status: \"ready\", node: \">=18\", runtime_dependencies: \"zero\" } to the ledger or active task.");
  if (!checks.clean_or_known_dirty) addUnlock(unlock_steps, "clean_or_known_dirty", "Clean the worktree or document known-dirty files with a reason.", "git status --short; then clean files or add worktree_state: { status: \"known-dirty\", files: [...], reason: \"...\" }.");
  if (!checks.compliance_mode_enforce) addUnlock(unlock_steps, "compliance_mode_enforce", "Set COMPOUND_MODE=enforce before unattended execution.", "export COMPOUND_MODE=enforce");
  const ready = Object.values(checks).every(Boolean);
  return {
    ready,
    status: ready ? "READY" : "NOT_READY",
    checks,
    unlock_steps,
    current_task: current?.id || null,
    compliance_mode: complianceMode,
    blockers: blockerTasks.map((task) => task.id),
    pending_questions: pendingQuestions,
    checkpoint_count: checkpoint.count,
    handoffs: currentHandoffs,
    env_contract: { present: environment.present, ready: environment.ready },
    worktree_state: {
      source: tree.source,
      status: tree.status,
      files: tree.files || [],
      reason: tree.reason || null,
    },
  };
}

function main() {
  const result = assessReadiness();
  console.log(`Long-session readiness: ${result.status}`);
  console.log(`- current task: ${result.checks.active_task ? result.current_task : "no"}`);
  console.log(`- DoD: ${result.checks.active_task_has_dod ? "yes" : "no"}`);
  console.log(`- DoD structured: ${result.checks.dod_structured ? "yes" : "no"}`);
  console.log(`- manual DoD safe: ${result.checks.manual_dod_safe ? "yes" : "no"}`);
  console.log(`- current phase: ${result.checks.current_phase ? "yes" : "no"}`);
  console.log(`- last context refresh: ${result.checks.last_context_refresh ? "yes" : "no"}`);
  console.log(`- last compound register: ${result.checks.last_compound_register ? "yes" : "no"}`);
  console.log(`- known blockers: ${result.blockers.length}`);
  console.log(`- pending questions: ${result.pending_questions.length}`);
  console.log(`- handoff checkpoint: ${result.checks.handoff_checkpoint ? "yes" : "missing"}`);
  console.log(`- handoff contract: ${result.checks.handoff_contract ? "yes" : "missing"}`);
  console.log(`- env contract: ${result.checks.env_contract ? "ready" : "missing"}`);
  console.log(`- worktree state: ${result.checks.clean_or_known_dirty ? result.worktree_state.status : "unsafe"}`);
  console.log(`- compliance mode: ${result.compliance_mode}`);
  console.log(`- unattended safe: ${result.ready ? "yes" : "no"}`);
  if (!result.ready) {
    console.log("\nUnlock:");
    result.unlock_steps.forEach((step, index) => {
      console.log(`${index + 1}. [${step.id}] ${step.requirement}`);
      console.log(`   command: ${step.command}`);
    });
  }
  console.log("\nJSON:");
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
