#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function readJsonFile(path) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function readableString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function valuePresent(value) {
  if (readableString(value)) return true;
  if (Array.isArray(value)) return value.length > 0;
  if (isObject(value)) return Object.keys(value).length > 0;
  return Boolean(value);
}

function taskDetail(check) {
  return check.command || check.path || check.description || "";
}

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value].filter(Boolean);
}

function dodStatus(task) {
  const dod = Array.isArray(task?.dod) ? task.dod : [];
  const malformed = dod.filter((check) => !readableString(check?.check) || !readableString(taskDetail(check)));
  const manualOpen = dod.filter((check) => check?.check === "manual" && !check.passed_at);
  return {
    total: dod.length,
    has_checks: dod.length > 0,
    all_defined: dod.length > 0 && malformed.length === 0,
    manual_checks_resolved: manualOpen.length === 0,
    malformed: malformed.map((check) => check.check || "unknown"),
    open_manual: manualOpen.map((check) => check.description || "manual confirmation"),
  };
}

function resolveCandidatePath(root, path) {
  if (!readableString(path)) return null;
  return resolve(root, path);
}

function activeHandoffCandidates(ledger, current) {
  if (!current) return [];
  const root = workspaceRoot();
  const candidates = [];
  for (const handoff of normalizeList(current.handoffs)) {
    const path = resolveCandidatePath(root, handoff.path);
    candidates.push({ source: "task.handoffs", path, metadata: handoff });
  }
  if (current.last_handoff?.path) {
    candidates.push({ source: "task.last_handoff", path: resolveCandidatePath(root, current.last_handoff.path), metadata: current.last_handoff });
  }
  for (const entry of ledger.log || []) {
    if (entry.event === "handoff-checkpoint" && entry.task === current.id && entry.path) {
      candidates.push({ source: "ledger.log", path: resolveCandidatePath(root, entry.path), metadata: entry });
    }
  }
  return candidates.filter((candidate) => candidate.path);
}

function validHandoffContract(contract, current) {
  if (!isObject(contract) || contract.safety?.shareable === false) return false;
  if (contract.schema_version === "handoff-contract.v1") {
    const taskId = contract.task?.id;
    return readableString(contract.checkpoint_id)
      && readableString(contract.created_at)
      && !Number.isNaN(Date.parse(contract.created_at))
      && readableString(taskId)
      && taskId === current?.id
      && readableString(contract.context_summary)
      && ["completed", "pending", "current_files", "decisions", "risks", "commands_run", "verification"].every((field) => Array.isArray(contract[field]));
  }
  if (contract.schema_version !== "handoff-contract.v2") return false;
  const requiredArrays = ["completed_chunks", "pending_decisions", "artifacts", "risks", "resume_commands", "commands_run", "verification"];
  return contract.schema_path === "schemas/handoff-contract.v2.json"
    && readableString(contract.checkpoint_id)
    && readableString(contract.created_at)
    && !Number.isNaN(Date.parse(contract.created_at))
    && ["manual", "token", "stop-mid-task"].includes(contract.trigger?.type)
    && readableString(contract.from_agent?.id)
    && ["claude", "codex"].includes(contract.to_agent?.target)
    && readableString(contract.context_summary)
    && contract.task_state?.id === current?.id
    && readableString(contract.task_state?.goal)
    && readableString(contract.task_state?.state)
    && readableString(contract.task_state?.ledger_path)
    && requiredArrays.every((field) => Array.isArray(contract[field]))
    && contract.resume_commands.length > 0
    && contract.resume_commands.every((command) => readableString(command.label) && readableString(command.command) && readableString(command.cwd) && readableString(command.reason));
}

function handoffStatus(ledger, current) {
  const root = workspaceRoot();
  const candidates = activeHandoffCandidates(ledger, current);
  const existing = candidates.filter((candidate) => fileExists(candidate.path));
  const contracts = existing.map((candidate) => ({ ...candidate, contract: readJsonFile(candidate.path) }));
  const valid = contracts.filter(({ contract }) => validHandoffContract(contract, current));
  const dirs = [join(root, ".omc", "state", "checkpoints"), join(root, ".agents", "checkpoints")];
  const files = dirs.flatMap(checkpointFiles);
  return {
    checkpoint_count: existing.length,
    valid_contract_count: valid.length,
    candidates,
    existing,
    files,
    latest: valid.at(-1)?.path || null,
    pending_decisions: valid.flatMap(({ contract }) => normalizeList(contract.pending_decisions).filter((decision) => decision.status === "open").map((decision) => decision.question)),
  };
}

function envContractStatus(ledger, current) {
  const root = workspaceRoot();
  const sources = [
    { source: "task.env_contract", value: current?.env_contract || current?.environment_contract },
    { source: "ledger.env_contract", value: ledger.env_contract || ledger.environment_contract },
  ].filter((entry) => valuePresent(entry.value));
  const files = [
    ".agents/env-contract.json",
    ".agents/ENV_CONTRACT.md",
    "ENV_CONTRACT.md",
  ].map((path) => resolve(root, path)).filter(fileExists);
  return {
    present: sources.length > 0 || files.length > 0,
    sources: [...sources.map((entry) => entry.source), ...files.map((path) => path.replace(`${root}/`, ""))],
  };
}

function knownDirtyReason(ledger, current) {
  return current?.known_dirty_reason
    || current?.workspace_state?.reason
    || current?.worktree_state?.reason
    || ledger.known_dirty_reason
    || ledger.workspace_state?.reason
    || ledger.worktree_state?.reason
    || process.env.COMPOUND_KNOWN_DIRTY_REASON
    || "";
}

function documentedWorkspaceState(ledger, current) {
  const state = current?.workspace_state || current?.worktree_state || ledger.workspace_state || ledger.worktree_state;
  if (readableString(state)) return { state, source: "ledger" };
  if (isObject(state)) return { state: state.status || state.state || state.clean_state, source: "ledger", reason: state.reason || "" };
  if (readableString(process.env.COMPOUND_WORKTREE_STATE)) return { state: process.env.COMPOUND_WORKTREE_STATE, source: "env", reason: process.env.COMPOUND_KNOWN_DIRTY_REASON || "" };
  return null;
}

function workspaceState(ledger, current) {
  const root = workspaceRoot();
  const gitCheck = spawnSync("git", ["-C", root, "rev-parse", "--is-inside-work-tree"], { encoding: "utf-8", timeout: 2000 });
  if (gitCheck.status === 0 && String(gitCheck.stdout).trim() === "true") {
    const status = spawnSync("git", ["-C", root, "status", "--porcelain"], { encoding: "utf-8", timeout: 3000 });
    if (status.status !== 0) return { ok: false, state: "unknown", source: "git-status" };
    if (!status.stdout.trim()) return { ok: true, state: "clean", source: "git" };
    const documented = documentedWorkspaceState(ledger, current);
    const documentedState = String(documented?.state || "").toLowerCase();
    const reason = knownDirtyReason(ledger, current);
    const known = ["known-dirty", "known_dirty", "dirty"].includes(documentedState)
      || readableString(current?.known_dirty_reason)
      || readableString(ledger.known_dirty_reason)
      || readableString(process.env.COMPOUND_KNOWN_DIRTY_REASON);
    return { ok: known && readableString(reason), state: known && reason ? "known-dirty" : "dirty", source: "git", reason };
  }

  const documented = documentedWorkspaceState(ledger, current);
  if (!documented) return { ok: false, state: "unknown", source: "git-unavailable" };
  const state = String(documented.state || "").toLowerCase();
  const reason = documented.reason || knownDirtyReason(ledger, current);
  if (state === "clean") return { ok: true, state: "clean", source: documented.source };
  if (["known-dirty", "known_dirty", "dirty"].includes(state)) return { ok: Boolean(reason), state: reason ? "known-dirty" : "dirty", source: documented.source, reason };
  return { ok: false, state: state || "unknown", source: documented.source };
}

function openQuestionsFromMarkdown() {
  const root = workspaceRoot();
  const path = join(root, "phase-0", "OPEN_QUESTIONS.md");
  if (!fileExists(path)) return [];
  const text = readFileSync(path, "utf-8");
  const blocking = text.split(/^##\s+can_default/im)[0].split(/^##\s+blocking_now/im)[1] || "";
  return blocking
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- ") && !/\bnone\b/i.test(line))
    .map((line) => line.replace(/^-\s*/, ""));
}

function questionStatus(ledger, current, handoff) {
  const taskQuestions = (ledger.tasks || []).flatMap((task) => normalizeList(task.open_questions || task.pending_questions || task.questions));
  const ledgerQuestions = normalizeList(ledger.open_questions || ledger.pending_questions || ledger.questions);
  const activeQuestions = normalizeList(current?.open_questions || current?.pending_questions || current?.questions);
  const all = [...taskQuestions, ...ledgerQuestions, ...activeQuestions, ...openQuestionsFromMarkdown(), ...handoff.pending_decisions]
    .map((question) => typeof question === "string" ? question : question?.question || question?.description || question?.text)
    .filter(Boolean);
  return { open: all };
}

function unlock(id, title, command) {
  return { id, title, command };
}

export function assessReadiness({ ledger = loadLedger(), complianceMode = mode() } = {}) {
  const current = ledger.current ? (ledger.tasks || []).find((task) => task.id === ledger.current) : null;
  const blockerTasks = (ledger.tasks || []).filter((task) => task.state === "blocked" || normalizeList(task.blocked_by).length);
  const blockerQuestions = blockerTasks.flatMap((task) => normalizeList(task.blocked_by)).filter(Boolean);
  const dod = dodStatus(current);
  const handoff = handoffStatus(ledger, current);
  const questions = questionStatus(ledger, current, handoff);
  const envContract = envContractStatus(ledger, current);
  const workspace = workspaceState(ledger, current);
  const checks = {
    active_task: Boolean(current),
    active_task_in_progress: current?.state === "in_progress",
    active_task_has_dod: dod.has_checks,
    dod_checks_defined: dod.all_defined,
    manual_dod_resolved: dod.manual_checks_resolved,
    current_phase: Boolean(current?.id && current?.goal),
    last_context_refresh: Boolean(latestLog(ledger, "context-refresh")),
    last_compound_register: Boolean(latestLog(ledger, "compound-register") || latestLog(ledger, "done")),
    known_blockers_clear: blockerTasks.length === 0,
    pending_questions_clear: blockerQuestions.length === 0 && questions.open.length === 0,
    checkpoint_present: handoff.checkpoint_count > 0,
    handoff_contract_valid: handoff.valid_contract_count > 0,
    env_contract_present: envContract.present,
    workspace_clean_or_known_dirty: workspace.ok,
    compliance_mode_enforce: complianceMode === "enforce",
  };
  const unlock_steps = [];
  if (!checks.active_task) unlock_steps.push(unlock("active_task", "Open or resume an active task with DoD.", "node .agents/task.mjs open \"<goal>\" --dod \"test:<command>\" --skill <id>"));
  if (checks.active_task && !checks.active_task_in_progress) unlock_steps.push(unlock("active_task_in_progress", "Resume the active task before unattended work.", `node .agents/task.mjs resume ${current.id}`));
  if (checks.active_task && !checks.active_task_has_dod) unlock_steps.push(unlock("active_task_has_dod", "Add at least one DoD check to the active task.", `node .agents/task.mjs update ${current.id} --dod "test:<command>"`));
  if (checks.active_task && checks.active_task_has_dod && !checks.dod_checks_defined) unlock_steps.push(unlock("dod_checks_defined", "Fill in every DoD command, artifact path, or manual description.", `node .agents/task.mjs show ${current.id}`));
  if (!checks.manual_dod_resolved) unlock_steps.push(unlock("manual_dod_resolved", "Resolve manual DoD checks explicitly; readiness will not auto-pass them.", `node .agents/task.mjs verify ${current?.id || "<task-id>"}`));
  if (!checks.last_context_refresh) unlock_steps.push(unlock("last_context_refresh", "Run a CONTEXT REFRESH and log it before long execution.", "node .agents/task.mjs status"));
  if (!checks.last_compound_register) unlock_steps.push(unlock("last_compound_register", "Complete or register the last unit of work with COMPOUND REGISTER.", "Record a [COMPOUND] block before unattended execution."));
  if (!checks.known_blockers_clear) unlock_steps.push(unlock("known_blockers_clear", "Resolve blockers or accept documented recommended defaults.", "node .agents/task.mjs status"));
  if (!checks.pending_questions_clear) unlock_steps.push(unlock("pending_questions_clear", "Resolve open questions or convert them to documented defaults.", "Review phase-0/OPEN_QUESTIONS.md and handoff pending_decisions."));
  if (!checks.checkpoint_present) unlock_steps.push(unlock("checkpoint_present", "Create a checkpoint for the active task.", `node handoff-bridge.mjs checkpoint --task ${current?.id || "<task-id>"} --from-agent <agent-id> --summary "<state>" --out .agents/checkpoints/${current?.id || "task"}.handoff.json`));
  if (checks.checkpoint_present && !checks.handoff_contract_valid) unlock_steps.push(unlock("handoff_contract_valid", "Create a valid shareable handoff contract for the active task.", `node handoff-bridge.mjs checkpoint --task ${current?.id || "<task-id>"} --from-agent <agent-id> --summary "<state>" --out .agents/checkpoints/${current?.id || "task"}.handoff.json`));
  if (!checks.env_contract_present) unlock_steps.push(unlock("env_contract_present", "Document the environment contract for the unattended run.", "Create .agents/env-contract.json or add env_contract to the active task."));
  if (!checks.workspace_clean_or_known_dirty) unlock_steps.push(unlock("workspace_clean_or_known_dirty", "Confirm git state is clean or document known-dirty files with a reason.", "git status --short"));
  if (!checks.compliance_mode_enforce) unlock_steps.push(unlock("compliance_mode_enforce", "Set COMPOUND_MODE=enforce before unattended execution.", "export COMPOUND_MODE=enforce"));
  const ready = Object.values(checks).every(Boolean);
  return {
    ready,
    status: ready ? "READY" : "NOT_READY",
    checks,
    unlock_steps,
    current_task: current?.id || null,
    compliance_mode: complianceMode,
    blockers: blockerTasks.map((task) => task.id),
    pending_questions: [...blockerQuestions, ...questions.open],
    dod,
    checkpoint: {
      count: handoff.checkpoint_count,
      handoff_contracts: handoff.valid_contract_count,
      latest: handoff.latest,
    },
    env_contract: envContract,
    workspace_state: workspace,
  };
}

function main() {
  const result = assessReadiness();
  console.log(`Long-session readiness: ${result.status}`);
  console.log("Readiness profile: premium preflight gate");
  console.log(`- current task: ${result.checks.active_task ? result.current_task : "no"}`);
  console.log(`- task state: ${result.checks.active_task_in_progress ? "in_progress" : "not ready"}`);
  console.log(`- DoD: ${result.checks.active_task_has_dod ? "yes" : "no"}`);
  console.log(`- DoD details: ${result.checks.dod_checks_defined ? "defined" : "incomplete"}`);
  console.log(`- manual DoD: ${result.checks.manual_dod_resolved ? "resolved or none" : "requires explicit confirmation"}`);
  console.log(`- current phase: ${result.checks.current_phase ? "yes" : "no"}`);
  console.log(`- last context refresh: ${result.checks.last_context_refresh ? "yes" : "no"}`);
  console.log(`- last compound register: ${result.checks.last_compound_register ? "yes" : "no"}`);
  console.log(`- known blockers: ${result.blockers.length}`);
  console.log(`- pending questions: ${result.pending_questions.length}`);
  console.log(`- checkpoint: ${result.checks.checkpoint_present ? "yes" : "missing"}`);
  console.log(`- handoff contract: ${result.checks.handoff_contract_valid ? "valid" : "missing/invalid"}`);
  console.log(`- env contract: ${result.checks.env_contract_present ? "yes" : "missing"}`);
  console.log(`- workspace state: ${result.workspace_state.state}${result.workspace_state.source ? ` (${result.workspace_state.source})` : ""}`);
  console.log(`- compliance mode: ${result.compliance_mode}`);
  console.log(`- unattended safe: ${result.ready ? "yes" : "no"}`);
  if (!result.ready) {
    console.log("\nUnlock:");
    result.unlock_steps.forEach((step, index) => {
      console.log(`${index + 1}. [${step.id}] ${step.title}`);
      console.log(`   command: ${step.command}`);
    });
  }
  console.log("\nJSON:");
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
