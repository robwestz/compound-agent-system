#!/usr/bin/env node
/**
 * handoff-bridge.mjs
 *
 * Checkpoint/resume bridge between agent sessions. v1 is intentionally explicit:
 * manual trigger first, schema supports token/stop-mid-task for future adapters.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = __dirname;
const DEFAULT_LEDGER = ".agents/TASKS.json";
const SCHEMA_VERSION_V1 = "handoff-contract.v1";
const SCHEMA_VERSION_V2 = "handoff-contract.v2";
const SCHEMA_VERSION = SCHEMA_VERSION_V2;
const SUPPORTED_SCHEMA_VERSIONS = new Set([SCHEMA_VERSION_V1, SCHEMA_VERSION_V2]);
const TRIGGERS = new Set(["manual", "token", "stop-mid-task"]);
const TARGETS = new Set(["claude", "codex"]);
const RISK_SEVERITIES = new Set(["low", "medium", "high", "critical"]);

function nowISO() {
  return new Date().toISOString();
}

function compactTimestamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function slugify(text = "handoff") {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    || "handoff";
}

function parseArgs(argv) {
  const args = { _: [], completed: [], pending: [], file: [], decision: [], risk: [], command: [], verification: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--completed") args.completed.push(argv[++i] ?? "");
    else if (arg === "--pending") args.pending.push(argv[++i] ?? "");
    else if (arg === "--file") args.file.push(argv[++i] ?? "");
    else if (arg === "--decision") args.decision.push(argv[++i] ?? "");
    else if (arg === "--risk") args.risk.push(argv[++i] ?? "");
    else if (arg === "--command") args.command.push(argv[++i] ?? "");
    else if (arg === "--verification") args.verification.push(argv[++i] ?? "");
    else if (arg.startsWith("--")) args[arg.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    else args._.push(arg);
  }
  return args;
}

export function ledgerPathFromEnv(env = process.env, cwd = REPO_ROOT) {
  return resolve(cwd, env.COMPOUND_TASKS_PATH || DEFAULT_LEDGER);
}

export function loadLedger(path = ledgerPathFromEnv()) {
  if (!existsSync(path)) {
    return { version: "1", schema_url: ".agents/PROTOCOL.md", current: null, tasks: [], agents_active: [], log: [] };
  }
  return JSON.parse(readFileSync(path, "utf-8"));
}

function saveLedger(ledger, path) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(ledger, null, 2) + "\n");
  renameSync(tmp, path);
}

function normalizeRelativePath(path, cwd = REPO_ROOT) {
  if (!path) return "";
  const resolved = isAbsolute(path) ? path : resolve(cwd, path);
  const rel = relative(cwd, resolved).replace(/\\/g, "/");
  return rel.startsWith("..") ? path.replace(/\\/g, "/") : rel;
}

function hasSecretLikeValue(text) {
  return /(sk-[a-z0-9_-]{12,}|gsk_[a-z0-9_-]{12,}|sbp_[a-z0-9_-]{12,}|api[_-]?key\s*[:=]|password\s*[:=])/i.test(String(text));
}

function hasUserAbsolutePath(text) {
  return /[A-Za-z]:\\Users\\|\/home\/[^/\s]+|\/Users\/[^/\s]+/.test(String(text));
}

function safeList(values = []) {
  return values.map((v) => String(v || "").trim()).filter(Boolean);
}

function taskDodSummary(dod = []) {
  return dod.map((d) => ({
    check: d.check,
    command: d.command,
    path: d.path,
    description: d.description,
    passed_at: d.passed_at || null,
  }));
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function itemizeStrings(values = [], prefix, key) {
  return safeList(values).map((value, index) => ({
    id: `${prefix}-${index + 1}`,
    [key]: value,
  }));
}

function normalizeArtifact(path, cwd, index, status = "referenced") {
  return {
    id: `artifact-${index + 1}`,
    path: normalizeRelativePath(path, cwd),
    kind: "file",
    status,
  };
}

function defaultResumeCommands(task, ledgerPath) {
  const commands = [
    {
      label: "Inspect Compound ledger state",
      command: "node .agents/task.mjs status",
      cwd: ".",
      reason: `Confirms current task pointer in ${ledgerPath} before edits.`,
    },
  ];
  if (task?.id) {
    commands.push({
      label: "Resume the handed-off task if parked",
      command: `node .agents/task.mjs resume ${task.id}`,
      cwd: ".",
      reason: "Use only if ledger status shows this task is parked and no other task is active.",
    });
  }
  for (const check of task?.dod || []) {
    if (check.check === "test" && check.command) {
      commands.push({
        label: `Verify DoD for ${task.id}`,
        command: check.command,
        cwd: ".",
        reason: "Run before marking the resumed task done.",
      });
    }
  }
  return commands;
}

function normalizeResumeCommands(commands = [], task, ledgerPath) {
  const provided = safeList(commands).map((command, index) => ({
    label: `Resume command ${index + 1}`,
    command,
    cwd: ".",
    reason: "Provided by exporting agent.",
  }));
  return provided.length ? provided : defaultResumeCommands(task, ledgerPath);
}

function normalizeRisks(risks = []) {
  return safeList(risks).map((description, index) => ({
    id: `risk-${index + 1}`,
    severity: "medium",
    description,
    mitigation: "Review before proceeding.",
  }));
}

function asV2Contract(contract) {
  if (contract?.schema_version === SCHEMA_VERSION_V2) return contract;
  if (contract?.schema_version === SCHEMA_VERSION_V1) return migrateHandoffV1ToV2(contract);
  return contract;
}

function resolveFromAgent(options = {}) {
  const id = options.from || process.env.COMPOUND_AGENT_ID;
  if (!id) {
    throw new Error(
      "from_agent.id must be explicit. Pass --from-agent <id> for checkpoints or set COMPOUND_AGENT_ID."
    );
  }
  return String(id);
}

export function findTask(ledger, taskId) {
  const id = taskId || ledger.current;
  return ledger.tasks.find((task) => task.id === id) || null;
}

export function createHandoffContract(options = {}) {
  const cwd = options.cwd ? resolve(options.cwd) : REPO_ROOT;
  const ledgerPath = resolve(cwd, options.ledgerPath || DEFAULT_LEDGER);
  const ledger = options.ledger || loadLedger(ledgerPath);
  const task = options.task || findTask(ledger, options.taskId);
  if (!task) throw new Error("No task found. Pass --task <id> or open a Compound task first.");

  const triggerType = options.trigger || "manual";
  if (!TRIGGERS.has(triggerType)) throw new Error(`Invalid trigger "${triggerType}". Use manual, token, or stop-mid-task.`);
  const target = options.to || "claude";
  if (!TARGETS.has(target)) throw new Error(`Invalid target "${target}". Use claude or codex.`);

  const createdAt = options.createdAt || nowISO();
  const checkpointId = options.checkpointId || `cp-${compactTimestamp(new Date(createdAt))}-${slugify(task.id || task.goal)}`;
  const contextSummary = String(options.summary || `Continue task ${task.id}: ${task.goal}`).trim();

  const dod = taskDodSummary(task.dod || []);
  const completedChunks = itemizeStrings(options.completed, "chunk", "summary");
  const pendingSteps = safeList(options.pending);
  const artifactPaths = unique([
    ...safeList(options.files),
    ...dod.filter((check) => check.path).map((check) => check.path),
  ].map((path) => normalizeRelativePath(path, cwd)));
  const ledgerReference = options.ledgerPath ? normalizeRelativePath(ledgerPath, cwd) : DEFAULT_LEDGER;
  const resumeCommands = normalizeResumeCommands(options.commands, task, ledgerReference);

  const contract = {
    schema_version: SCHEMA_VERSION,
    schema_path: "schemas/handoff-contract.v2.json",
    checkpoint_id: checkpointId,
    created_at: createdAt,
    trigger: {
      type: triggerType,
      ...(options.reason ? { reason: String(options.reason) } : {}),
    },
    from_agent: {
      id: resolveFromAgent(options),
      ...(options.runtime ? { runtime: String(options.runtime) } : {}),
    },
    to_agent: {
      target,
      expected_format: target === "claude" ? "Claude Code startup prompt" : "Codex startup prompt",
    },
    task_state: {
      id: task.id,
      goal: task.goal,
      state: task.state,
      skills: task.skills || [],
      dod,
      ledger_path: ledgerReference,
      ledger_current: ledger.current || null,
      updated_at: task.updated_at || null,
      pending_steps: pendingSteps,
    },
    context_summary: contextSummary,
    completed_chunks: completedChunks,
    pending_decisions: itemizeStrings(options.decisions, "decision", "question").map((decision) => ({
      ...decision,
      status: "open",
      owner: "next-agent",
      files: artifactPaths,
    })),
    artifacts: artifactPaths.map((path, index) => normalizeArtifact(path, cwd, index)),
    risks: normalizeRisks(options.risks),
    resume_commands: resumeCommands,
    commands_run: safeList(options.commands),
    verification: safeList(options.verification),
    safety: {
      shareable: true,
      redactions: [],
    },
  };

  const validation = validateHandoff(contract);
  if (!validation.ok) {
    contract.safety.shareable = false;
    contract.safety.redactions = validation.errors;
  }
  return contract;
}

export function validateHandoff(contract) {
  const errors = [];
  if (!contract || typeof contract !== "object") errors.push("Contract must be an object.");
  if (!SUPPORTED_SCHEMA_VERSIONS.has(contract?.schema_version)) {
    errors.push(`schema_version must be ${SCHEMA_VERSION_V2} or migratable ${SCHEMA_VERSION_V1}.`);
  }
  if (!contract?.checkpoint_id) errors.push("checkpoint_id is required.");
  if (!contract?.created_at || Number.isNaN(Date.parse(contract.created_at))) errors.push("created_at must be ISO-8601.");
  if (!TRIGGERS.has(contract?.trigger?.type)) errors.push("trigger.type must be manual, token, or stop-mid-task.");
  if (!contract?.from_agent?.id) errors.push("from_agent.id is required.");
  if (!TARGETS.has(contract?.to_agent?.target)) errors.push("to_agent.target must be claude or codex.");
  if (!contract?.context_summary) errors.push("context_summary is required.");
  if (contract?.schema_version === SCHEMA_VERSION_V1) {
    if (!contract?.task?.id) errors.push("task.id is required.");
    for (const field of ["completed", "pending", "current_files", "decisions", "risks", "commands_run", "verification"]) {
      if (!Array.isArray(contract?.[field])) errors.push(`${field} must be an array.`);
    }
  }
  if (contract?.schema_version === SCHEMA_VERSION_V2) {
    if (contract.schema_path !== "schemas/handoff-contract.v2.json") errors.push("schema_path must be schemas/handoff-contract.v2.json.");
    if (!contract?.task_state?.id) errors.push("task_state.id is required.");
    if (!contract?.task_state?.goal) errors.push("task_state.goal is required.");
    if (!contract?.task_state?.state) errors.push("task_state.state is required.");
    if (!contract?.task_state?.ledger_path) errors.push("task_state.ledger_path is required.");
    for (const field of ["completed_chunks", "pending_decisions", "artifacts", "risks", "resume_commands", "commands_run", "verification"]) {
      if (!Array.isArray(contract?.[field])) errors.push(`${field} must be an array.`);
    }
    if (Array.isArray(contract?.resume_commands) && contract.resume_commands.length === 0) {
      errors.push("resume_commands must contain at least one entry.");
    }
    for (const [index, chunk] of (contract?.completed_chunks || []).entries()) {
      if (!chunk.id || !chunk.summary) errors.push(`completed_chunks[${index}] requires id and summary.`);
    }
    for (const [index, decision] of (contract?.pending_decisions || []).entries()) {
      if (!decision.id || !decision.question || decision.status !== "open") {
        errors.push(`pending_decisions[${index}] requires id, question, and open status.`);
      }
    }
    for (const [index, artifact] of (contract?.artifacts || []).entries()) {
      if (!artifact.id || !artifact.path || !artifact.kind || !artifact.status) {
        errors.push(`artifacts[${index}] requires id, path, kind, and status.`);
      }
    }
    for (const [index, risk] of (contract?.risks || []).entries()) {
      if (!risk.id || !RISK_SEVERITIES.has(risk.severity) || !risk.description || !risk.mitigation) {
        errors.push(`risks[${index}] requires id, valid severity, description, and mitigation.`);
      }
    }
    for (const [index, command] of (contract?.resume_commands || []).entries()) {
      if (!command.label || !command.command || !command.cwd || !command.reason) {
        errors.push(`resume_commands[${index}] requires label, command, cwd, and reason.`);
      }
    }
  }

  const inspectable = JSON.stringify(contract || {});
  if (hasSecretLikeValue(inspectable)) errors.push("Possible secret detected; redact before sharing.");
  const pathFields = [
    ...(contract?.current_files || []),
    ...(contract?.artifacts || []).map((artifact) => artifact.path),
    contract?.ledger?.task_path || "",
    contract?.task_state?.ledger_path || "",
  ];
  for (const value of pathFields) {
    if (hasUserAbsolutePath(value)) errors.push(`User-absolute path detected: ${value}`);
  }

  return { ok: errors.length === 0, errors };
}

export function migrateHandoffV1ToV2(contract) {
  const validation = validateHandoff(contract);
  if (!validation.ok) throw new Error(`Cannot migrate invalid v1 handoff: ${validation.errors.join("; ")}`);
  if (contract.schema_version !== SCHEMA_VERSION_V1) return contract;
  const completedChunks = itemizeStrings(contract.completed, "chunk", "summary");
  const artifactPaths = unique([
    ...(contract.current_files || []),
    ...(contract.task?.dod || []).filter((check) => check.path).map((check) => check.path),
  ]);
  return {
    schema_version: SCHEMA_VERSION_V2,
    schema_path: "schemas/handoff-contract.v2.json",
    checkpoint_id: contract.checkpoint_id,
    created_at: contract.created_at,
    trigger: contract.trigger,
    from_agent: contract.from_agent,
    to_agent: contract.to_agent,
    task_state: {
      id: contract.task.id,
      goal: contract.task.goal,
      state: contract.task.state,
      skills: contract.task.skills || [],
      dod: contract.task.dod || [],
      ledger_path: contract.ledger?.task_path || ".agents/TASKS.json",
      ledger_current: contract.ledger?.task_current ?? null,
      updated_at: contract.ledger?.task_updated_at ?? null,
      pending_steps: contract.pending || [],
      migrated_from: SCHEMA_VERSION_V1,
    },
    context_summary: contract.context_summary,
    completed_chunks: completedChunks,
    pending_decisions: itemizeStrings(contract.decisions, "decision", "question").map((decision) => ({
      ...decision,
      status: "open",
      owner: "next-agent",
      files: artifactPaths,
    })),
    artifacts: artifactPaths.map((path, index) => normalizeArtifact(path, REPO_ROOT, index)),
    risks: normalizeRisks(contract.risks),
    resume_commands: normalizeResumeCommands(contract.commands_run, contract.task, contract.ledger?.task_path || ".agents/TASKS.json", REPO_ROOT),
    commands_run: contract.commands_run || [],
    verification: contract.verification || [],
    safety: contract.safety || { shareable: true, redactions: [] },
    compatibility: {
      migrated_from: SCHEMA_VERSION_V1,
      migration_note: "v1 fields were mapped into v2 task_state, completed_chunks, pending_decisions, artifacts, risks, and resume_commands.",
    },
  };
}

export function buildResumePrompt(contract, { target = contract?.to_agent?.target || "claude" } = {}) {
  const migrated = asV2Contract(contract);
  const validation = validateHandoff(migrated);
  if (!validation.ok) throw new Error(`Invalid handoff: ${validation.errors.join("; ")}`);
  const label = target === "claude" ? "Claude Code" : "Codex";
  const openDecisions = migrated.pending_decisions.filter((decision) => decision.status === "open");
  const lines = [
    `You are ${label}, resuming a Buildr/Compound task from a handoff checkpoint.`,
    "",
    "Read first:",
    "- `.agents/PROTOCOL.md`",
    `- \`${migrated.task_state.ledger_path}\``,
    `- \`${migrated.schema_path}\``,
    "- the handoff JSON that produced this prompt",
    "",
    "Resume target:",
    `- Task: ${migrated.task_state.id} - ${migrated.task_state.goal}`,
    `- Checkpoint: ${migrated.checkpoint_id}`,
    `- Trigger: ${migrated.trigger.type}${migrated.trigger.reason ? ` (${migrated.trigger.reason})` : ""}`,
    `- From agent: ${migrated.from_agent.id}`,
    "",
    "Context summary:",
    migrated.context_summary,
    "",
    "Completed chunks:",
    ...(migrated.completed_chunks.length ? migrated.completed_chunks.map((item) => `- ${item.id}: ${item.summary}`) : ["- None recorded"]),
    "",
    "Pending task steps:",
    ...(migrated.task_state.pending_steps.length ? migrated.task_state.pending_steps.map((item) => `- ${item}`) : ["- Inspect task DoD and continue the next unfinished step"]),
    "",
    "Exact files/artifacts:",
    ...(migrated.artifacts.length ? migrated.artifacts.map((item) => `- ${item.path} (${item.kind}, ${item.status})`) : ["- None recorded"]),
    "",
    "Open decisions:",
    ...(openDecisions.length ? openDecisions.map((item) => `- ${item.id}: ${item.question}`) : ["- None recorded"]),
    "",
    "Risks:",
    ...(migrated.risks.length ? migrated.risks.map((item) => `- ${item.id} [${item.severity}]: ${item.description}; mitigation: ${item.mitigation}`) : ["- None recorded"]),
    "",
    "Resume commands:",
    ...migrated.resume_commands.map((item) => `- ${item.label}: \`${item.command}\` (cwd: ${item.cwd}) — ${item.reason}`),
    "",
    "Verification state:",
    ...(migrated.verification.length ? migrated.verification.map((item) => `- ${item}`) : ["- Run the task DoD checks before claiming done"]),
    "",
    "Instructions:",
    "- Sign in to the ledger with your agent id.",
    "- Confirm the current task is still active or resume it before edits.",
    "- Continue from Pending, not from scratch.",
    "- Preserve the handoff contract; write a new checkpoint before stopping.",
  ];
  return `${lines.join("\n")}\n`;
}

export function writeCheckpoint(options = {}) {
  const cwd = options.cwd ? resolve(options.cwd) : REPO_ROOT;
  const ledgerPath = resolve(cwd, options.ledgerPath || DEFAULT_LEDGER);
  const ledger = options.ledger || loadLedger(ledgerPath);
  const task = findTask(ledger, options.taskId);
  if (!task) throw new Error("No task found. Pass --task <id> or open a Compound task first.");
  const contract = createHandoffContract({ ...options, cwd, ledgerPath, ledger, task });
  const validation = validateHandoff(contract);
  if (!validation.ok) throw new Error(`Refusing unsafe handoff: ${validation.errors.join("; ")}`);

  const outPath = resolve(cwd, options.out || `handoffs/${contract.checkpoint_id}.handoff.json`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(contract, null, 2) + "\n");

  task.handoffs = task.handoffs || [];
  task.handoffs.push({
    checkpoint_id: contract.checkpoint_id,
    path: normalizeRelativePath(outPath, cwd),
    schema_version: contract.schema_version,
    to: contract.to_agent.target,
    trigger: contract.trigger.type,
    created_at: contract.created_at,
  });
  task.last_handoff = task.handoffs.at(-1);
  task.updated_at = contract.created_at;
  if (!ledger.current && task.state === "in_progress") ledger.current = task.id;
  ledger.log = ledger.log || [];
  ledger.log.push({
    ts: contract.created_at,
    event: "handoff-checkpoint",
    task: task.id,
    agent: contract.from_agent.id,
    checkpoint_id: contract.checkpoint_id,
    to: contract.to_agent.target,
    path: normalizeRelativePath(outPath, cwd),
  });
  saveLedger(ledger, ledgerPath);

  return { contract, outPath, ledger };
}

export function loadHandoff(path, cwd = REPO_ROOT) {
  const abs = resolve(cwd, path);
  const contract = JSON.parse(readFileSync(abs, "utf-8"));
  const validation = validateHandoff(contract);
  if (!validation.ok) throw new Error(`Invalid handoff: ${validation.errors.join("; ")}`);
  return asV2Contract(contract);
}

export function writeResumePrompt({ handoffPath, out, target, cwd = REPO_ROOT } = {}) {
  if (!handoffPath) throw new Error("--from <handoff.json> is required for resume.");
  const contract = loadHandoff(handoffPath, cwd);
  const prompt = buildResumePrompt(contract, { target });
  if (out) {
    const outPath = resolve(cwd, out);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, prompt);
    return { contract, prompt, outPath };
  }
  return { contract, prompt, outPath: null };
}

function printUsage() {
  console.log(`handoff-bridge - checkpoint/resume bridge

Usage:
  node handoff-bridge.mjs checkpoint [options]
  node handoff-bridge.mjs resume --from <handoff.json> [--out RESUME.md]
  node handoff-bridge.mjs verify --from <handoff.json>

Checkpoint options:
  --task <id>              Task id, defaults to ledger current
  --from-agent <id>        Required unless COMPOUND_AGENT_ID is set
  --to <claude|codex>      Target agent, default claude
  --trigger <type>         manual | token | stop-mid-task, default manual
  --summary <text>         Required context summary; defaults from task
  --completed <text>       Repeatable
  --pending <text>         Repeatable
  --file <path>            Repeatable, converted to repo-relative when possible
  --decision <text>        Repeatable open decision for the next agent
  --risk <text>            Repeatable
  --command <text>         Repeatable
  --verification <text>    Repeatable
  --out <path>             Default handoffs/<checkpoint>.handoff.json

Recovery:
  If checkpoint or resume refuses a file, run verify for exact validation errors:
  node handoff-bridge.mjs verify --from <handoff.json>

Resume options:
  --from <handoff.json>    Handoff contract to resume from
  --target <claude|codex>  Override prompt target
  --out <path>             Write prompt to file instead of stdout
`);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  try {
    if (!cmd || cmd === "--help" || cmd === "-h" || cmd === "help") {
      printUsage();
      return;
    }
    if (cmd === "checkpoint") {
      const result = writeCheckpoint({
        taskId: args.task,
        to: args.to || "claude",
        trigger: args.trigger || "manual",
        reason: args.reason,
        summary: args.summary,
        completed: args.completed,
        pending: args.pending,
        files: args.file,
        decisions: args.decision,
        risks: args.risk,
        commands: args.command,
        verification: args.verification,
        out: args.out,
        from: args.fromAgent || args.from,
        runtime: args.runtime,
      });
      console.log(`checkpoint: ${result.contract.checkpoint_id}`);
      console.log(`wrote: ${result.outPath}`);
      return;
    }
    if (cmd === "resume") {
      const result = writeResumePrompt({
        handoffPath: args.from || args._[0],
        target: args.target,
        out: args.out,
      });
      if (result.outPath) console.log(`wrote: ${result.outPath}`);
      else process.stdout.write(result.prompt);
      return;
    }
    if (cmd === "verify") {
      const contract = loadHandoff(args.from || args._[0]);
      console.log(`valid: ${contract.checkpoint_id}`);
      return;
    }
    throw new Error(`Unknown command: ${cmd}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
