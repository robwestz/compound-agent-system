#!/usr/bin/env node
// .agents/task.mjs — Compound Protocol task ledger CLI
// Zero runtime dependencies. Node 18+.
// See .agents/PROTOCOL.md, .agents/DOD.md, .agents/SKILL_SELECT.md, .agents/PLAN_MARKERS.md

import { readFileSync, writeFileSync, existsSync, statSync, renameSync, mkdirSync, unlinkSync, copyFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { appendEvent, eventLogPathFromLedgerPath, sanitizeLedgerExtra, taskEventContext } from "./event-log.mjs";
import { runPortableNodeCommand } from "./node-runtime.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const TASKS_PATH = process.env.COMPOUND_TASKS_PATH || join(__dirname, "TASKS.json");
const CURRENT_LEDGER_VERSION = "1";
const SUPPORTED_LEDGER_VERSIONS = new Set(["1"]);
const MODE_POLICY = {
  observe: {
    blocks: "nothing",
    state_changing: "logs fact-forcing guidance and continues",
    hooks: "emit structured context and continue",
    exit_code: 0,
  },
  warn: {
    blocks: "nothing",
    state_changing: "prints fact-forcing warning and continues",
    hooks: "emit structured warning and continue",
    exit_code: 0,
  },
  enforce: {
    blocks: "state-changing actions without task or grounding",
    state_changing: "requires grounding before mutation",
    hooks: "block invalid edits with exit code 2",
    exit_code: 2,
  },
};
const EXPECTED_HOOKS = {
  SessionStart: [{ matcher: null, command: "node .agents/task.mjs hook session-start" }],
  PreToolUse: [{ matcher: "Edit|Write", command: "node .agents/task.mjs hook pre-edit" }],
  Stop: [{ matcher: null, command: "node .agents/task.mjs hook stop" }],
};

const COLORS = process.stdout.isTTY
  ? { red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m", dim: "\x1b[2m", reset: "\x1b[0m" }
  : { red: "", green: "", yellow: "", cyan: "", dim: "", reset: "" };
const c = (color, s) => `${COLORS[color]}${s}${COLORS.reset}`;

const nowISO = () => new Date().toISOString();

function complianceMode() {
  const mode = String(process.env.COMPOUND_MODE || "").toLowerCase();
  if (["observe", "warn", "enforce"].includes(mode)) return mode;
  if (process.env.COMPOUND_ENFORCE === "1") return "enforce";
  return "warn";
}

function complianceInfo() {
  const mode = complianceMode();
  const policy = MODE_POLICY[mode];
  return {
    mode,
    blocks: policy.blocks,
    does_not_block: mode === "observe" ? "all actions; logs only" : mode === "warn" ? "actions after warning" : "read-only commands",
    state_changing: policy.state_changing,
    hooks: policy.hooks,
    switch: "export COMPOUND_MODE=enforce",
    recommended: "Switch after the first smoke test passes and before unattended execution.",
  };
}

function emitHook(mode, msg) {
  if (mode === "enforce") { console.error(msg); process.exit(2); }
  const payload = { hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: msg }, compound_mode: mode };
  console.log(JSON.stringify(payload));
  process.exit(0);
}

function groundedPath() {
  return join(dirname(TASKS_PATH), ".grounded");
}

function resetGrounding() {
  if (existsSync(groundedPath())) unlinkSync(groundedPath());
}

function factForceMessage() {
  return "[Fact-Forcing Gate] First state-changing action in this session requires grounding in the user's exact instruction. " +
    "This prevents agents from acting on stale or assumed context. Quote the current instruction verbatim, set COMPOUND_GROUNDED to that quote, then retry.";
}

const STATE_CHANGING_COMMANDS = new Set(["ack", "open", "park", "resume", "block", "approve", "abandon", "update", "done", "verify", "import", "migrate"]);
const APPROVAL_POLICIES = new Set(["must-ask", "defaultable", "defer"]);
const APPROVAL_CATEGORIES = new Map([
  ["secrets", { policy: "must-ask", label: "Secrets and credentials" }],
  ["network", { policy: "must-ask", label: "Network access" }],
  ["destructive-git", { policy: "must-ask", label: "Destructive git operations" }],
  ["overwrite", { policy: "must-ask", label: "Overwriting existing files" }],
  ["uninstall", { policy: "must-ask", label: "Uninstall or rollback" }],
  ["external-apis", { policy: "must-ask", label: "External API calls" }],
  ["multi-agent-spawning", { policy: "must-ask", label: "Multi-agent spawning" }],
]);

function requireGrounding(command) {
  const stateChanging = STATE_CHANGING_COMMANDS;
  if (!stateChanging.has(command)) return;
  if (process.env.COMPOUND_GROUNDED || existsSync(groundedPath())) {
    if (process.env.COMPOUND_GROUNDED) writeFileSync(groundedPath(), JSON.stringify({ grounded_at: nowISO(), quote: process.env.COMPOUND_GROUNDED }, null, 2) + "\n");
    return;
  }
  const mode = complianceMode();
  if (mode === "observe") {
    console.log(JSON.stringify({ ok: true, gate: "fact-forcing", mode, message: factForceMessage() }));
    return;
  }
  const msg = factForceMessage();
  if (mode === "enforce") { console.error(msg); process.exit(2); }
  console.warn(msg);
}

function normalizeApprovalPolicy(value) {
  if (!value) return null;
  const normalized = String(value).toLowerCase().replaceAll("_", "-");
  if (["can-default", "can-defaults", "default", "proceed-with-default"].includes(normalized)) return "defaultable";
  if (["blocking-now", "blocking", "requires-approval", "human-approval"].includes(normalized)) return "must-ask";
  if (!APPROVAL_POLICIES.has(normalized)) {
    throw new Error(`Unknown approval policy "${value}". Allowed: must-ask, defaultable, defer.`);
  }
  return normalized;
}

function normalizeApprovalCategory(value) {
  if (!value) return null;
  const normalized = String(value).toLowerCase().replaceAll("_", "-");
  if (!APPROVAL_CATEGORIES.has(normalized)) {
    throw new Error(`Unknown approval category "${value}". Allowed: ${[...APPROVAL_CATEGORIES.keys()].join(", ")}.`);
  }
  return normalized;
}

function approvalState(policy) {
  if (policy === "must-ask") return "pending-human-approval";
  if (policy === "defaultable") return "default-available";
  if (policy === "defer") return "deferred";
  return null;
}

function taskApprovalSummary(task) {
  const policy = normalizeApprovalPolicy(task?.approval_policy || task?.approvalPolicy || "");
  const category = task?.approval_category || task?.approvalCategory || null;
  if (!policy && !category) return "";
  const parts = [];
  if (policy) parts.push(`approval=${policy}`);
  if (category) parts.push(`category=${category}`);
  if (task.approval_state) parts.push(`state=${task.approval_state}`);
  return parts.join(" ");
}

function loadLedger() {
  if (!existsSync(TASKS_PATH)) {
    return { version: "1", schema_url: ".agents/PROTOCOL.md", current: null, tasks: [], agents_active: [], log: [] };
  }
  return JSON.parse(readFileSync(TASKS_PATH, "utf-8"));
}

function safeReadLedger() {
  if (!existsSync(TASKS_PATH)) {
    return { ok: true, exists: false, ledger: { version: CURRENT_LEDGER_VERSION, schema_url: ".agents/PROTOCOL.md", current: null, tasks: [], agents_active: [], log: [] } };
  }
  try {
    const raw = readFileSync(TASKS_PATH, "utf-8");
    return { ok: true, exists: true, raw, ledger: JSON.parse(raw) };
  } catch (error) {
    return { ok: false, exists: true, error: error.message };
  }
}

function saveLedger(ledger) {
  const tmp = TASKS_PATH + ".tmp";
  mkdirSync(dirname(TASKS_PATH), { recursive: true });
  writeFileSync(tmp, JSON.stringify(ledger, null, 2) + "\n");
  renameSync(tmp, TASKS_PATH);
}

function workspaceRoot() {
  const ledgerDir = dirname(resolve(TASKS_PATH));
  return ledgerDir.endsWith(`${"/"}.agents`) || ledgerDir.endsWith(`${"\\"}.agents`) ? dirname(ledgerDir) : ledgerDir;
}

function backupPath(kind = "backup") {
  return `${TASKS_PATH}.${kind}-${nowISO().replace(/[:.]/g, "-")}`;
}

function normalizeLedgerV1(ledger) {
  return {
    version: CURRENT_LEDGER_VERSION,
    schema_url: ledger.schema_url || ".agents/PROTOCOL.md",
    current: ledger.current || null,
    tasks: Array.isArray(ledger.tasks) ? ledger.tasks : [],
    agents_active: Array.isArray(ledger.agents_active) ? ledger.agents_active : [],
    agent_profiles: ledger.agent_profiles && typeof ledger.agent_profiles === "object" ? ledger.agent_profiles : {},
    log: Array.isArray(ledger.log) ? ledger.log : [],
    ...Object.fromEntries(Object.entries(ledger).filter(([key]) => !["version", "schema_url", "current", "tasks", "agents_active", "agent_profiles", "log"].includes(key))),
  };
}

function nextId(ledger) {
  let max = 0;
  for (const t of ledger.tasks) {
    const m = /^t-(\d+)$/.exec(t.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `t-${String(max + 1).padStart(3, "0")}`;
}

function appendLog(ledger, event, taskId, agent, extra = {}) {
  ledger.log.push({ ts: nowISO(), event, task: taskId, agent: agent || null, ...sanitizeLedgerExtra(extra) });
}

function logEvent(event, command, { task = null, result = { status: "ok" }, context = {}, timestamp } = {}) {
  try {
    const contextExtras = { ...context };
    delete contextExtras.goal;
    delete contextExtras.reason;
    delete contextExtras.source;
    delete contextExtras.identity;
    appendEvent({
      logPath: eventLogPathFromLedgerPath(TASKS_PATH),
      event,
      command,
      result,
      context: task ? { ...taskEventContext(task, context), ...contextExtras } : contextExtras,
      timestamp,
    });
  } catch {
    // Observability must never block task state transitions.
  }
}

function findTask(ledger, id) {
  return ledger.tasks.find((t) => t.id === id);
}

function parseDodSpec(spec) {
  const idx = spec.indexOf(":");
  if (idx === -1) throw new Error(`Bad DoD spec "${spec}". Expected "<type>:<value>" (test|artifact|manual).`);
  const type = spec.slice(0, idx).trim();
  const value = spec.slice(idx + 1).trim();
  if (type === "test") return { check: "test", command: value, passed_at: null };
  if (type === "artifact") return { check: "artifact", path: value, passed_at: null };
  if (type === "manual") return { check: "manual", description: value, passed_at: null };
  throw new Error(`Unknown DoD type "${type}". Allowed: test, artifact, manual.`);
}

function parseArgs(argv) {
  const args = { _: [], dod: [], skill: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dod") args.dod.push(argv[++i]);
    else if (a === "--skill") args.skill.push(argv[++i]);
    else if (a === "--parent") args.parent = argv[++i];
    else if (a === "--reason") args.reason = argv[++i];
    else if (a === "--unlock") args.unlock = argv[++i];
    else if (a === "--approval") args.approval = argv[++i];
    else if (a === "--approval-category") args.approvalCategory = argv[++i];
    else if (a === "--qa") args.qa = true;
    else if (a === "--all") args.all = true;
    else if (a === "--state") args.state = argv[++i];
    else if (a === "--apply") args.apply = true;
    else if (a === "--diff") args.diff = true;
    else if (a === "--strict") args.strict = true;
    else if (a === "--remove-dod") args.removeDod = parseInt(argv[++i], 10);
    else if (a.startsWith("--")) args[a.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    else args._.push(a);
  }
  return args;
}

async function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(question, (a) => { rl.close(); res(a.trim()); }));
}

// ============================ COMMANDS ============================

function cmdStatus() {
  const ledger = loadLedger();
  const version = ledgerVersionStatus(ledger);
  const cur = ledger.current ? findTask(ledger, ledger.current) : null;
  const open = ledger.tasks.filter((t) => t.state === "in_progress" || t.state === "open").length;
  const blocked = ledger.tasks.filter((t) => t.state === "blocked").length;
  const parked = ledger.tasks.filter((t) => t.state === "parked").length;
  console.log(c("cyan", "── Compound Protocol Ledger ──"));
  if (cur) {
    console.log(`Current: ${c("green", cur.id)} (${cur.state}) — ${cur.goal}`);
    if (cur.dod && cur.dod.length) {
      const passed = cur.dod.filter((d) => d.passed_at).length;
      console.log(`  DoD: ${passed}/${cur.dod.length} passed`);
      for (const d of cur.dod) {
        const tag = d.passed_at ? c("green", "✓") : c("dim", "·");
        const detail = d.command || d.path || d.description;
        console.log(`    ${tag} ${d.check}: ${detail}`);
      }
    }
    if (cur.skills && cur.skills.length) console.log(`  Skills: ${cur.skills.join(", ")}`);
    const approval = taskApprovalSummary(cur);
    if (approval) console.log(`  Approval: ${approval}`);
  } else {
    console.log(c("dim", "No current task. Use: task.mjs open \"<goal>\" --dod \"<type>:<value>\""));
  }
  console.log(`Open: ${open}  Blocked: ${blocked}  Parked: ${parked}  Total: ${ledger.tasks.length}`);
  if (ledger.agent_profiles && Object.keys(ledger.agent_profiles).length) {
    console.log("Agents:");
    for (const profile of Object.values(ledger.agent_profiles)) {
      console.log(`  ${profile.id}: client=${profile.client || "unknown"} model=${profile.model || "unspecified"} role=${profile.role || "agent"} session_id=${profile.session_id || "unknown"}`);
    }
  }
  const compliance = complianceInfo();
  console.log("Compliance level:");
  console.log(`  mode: ${compliance.mode}`);
  console.log(`  blocks: ${compliance.blocks}`);
  console.log(`  does not block: ${compliance.does_not_block}`);
  console.log(`  switch: ${compliance.switch}`);
  console.log(`  recommended switch point: ${compliance.recommended}`);
  console.log(`Ledger schema: ${version.version} (${version.status})`);
  if (version.status === "migration_needed") console.log("  next: node .agents/task.mjs migrate --apply");
  if (blocked > 0) {
    console.log(c("yellow", "Blocked tasks:"));
    for (const t of ledger.tasks.filter((t) => t.state === "blocked")) {
      const approval = taskApprovalSummary(t);
      console.log(`  ${t.id}: ${t.goal} — blocked_by: ${Array.isArray(t.blocked_by) ? t.blocked_by.join("; ") : t.blocked_by || "(none)"}; ${approval ? `${approval}; ` : ""}unlock: ${t.unlock_command || "(none)"}`);
    }
  }
}

function cmdCurrent() {
  const ledger = loadLedger();
  process.stdout.write(ledger.current || "");
}

function duplicateTaskIds(ledger) {
  const seen = new Set();
  const dupes = new Set();
  for (const task of ledger.tasks || []) {
    if (!task?.id) continue;
    if (seen.has(task.id)) dupes.add(task.id);
    seen.add(task.id);
  }
  return [...dupes];
}

function ledgerVersionStatus(ledger) {
  const version = String(ledger.version || "0");
  if (version === CURRENT_LEDGER_VERSION) return { status: "current", version };
  if (version === "0" || !ledger.version) return { status: "migration_needed", version };
  if (!SUPPORTED_LEDGER_VERSIONS.has(version)) return { status: "unsupported_version", version };
  return { status: "migration_needed", version };
}


function pathExistsFromWorkspace(rel) {
  const root = workspaceRoot();
  return existsSync(join(root, rel)) || existsSync(join(root, "plugins", "compound-agent-system", "assets", "system-files", rel));
}

function fixtureSecretScan() {
  const root = workspaceRoot();
  const candidates = [
    join(root, "fixtures"),
    join(root, "plugins", "compound-agent-system", "assets", "system-files", "fixtures"),
  ];
  const dirs = candidates.filter((dir, index) => existsSync(dir) && candidates.findIndex((item) => item === dir) === index);
  const patterns = [
    { type: "aws-access-key", re: /AKIA[0-9A-Z]{16}/ },
    { type: "github-token", re: /ghp_[A-Za-z0-9_]{20,}/ },
    { type: "groq-key", re: /gsk_[A-Za-z0-9]{20,}/ },
    { type: "api-key-assignment", re: /\b(?:GROQ_API_KEY|OPENROUTER_API_KEY|API_KEY)\s*=\s*['\"]?[^\s'\"<>]+/i },
    { type: "private-key", re: /-----BEGIN (?:RSA|OPENSSH|EC) PRIVATE KEY-----/ },
  ];
  const findings = [];
  let scannedFiles = 0;
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (entry.isFile()) {
        scannedFiles += 1;
        let text = "";
        try { text = readFileSync(abs, "utf-8"); }
        catch { continue; }
        for (const pattern of patterns) {
          if (pattern.re.test(text)) findings.push({ type: pattern.type, path: abs });
        }
      }
    }
  }
  for (const dir of dirs) walk(dir);
  return {
    ok: findings.length === 0,
    dirs,
    scanned_files: scannedFiles,
    findings,
    next_action: findings.length
      ? "Remove real-looking secrets from fixtures or replace them with documented placeholders."
      : "No fixture secret action required.",
  };
}

function securityBoundaryStatus() {
  const docs = {
    security_model: pathExistsFromWorkspace("docs/security-boundary-model.md"),
    secrets_ai_policy: pathExistsFromWorkspace("docs/secrets-and-ai-policy.md"),
  };
  const fixtureSecrets = fixtureSecretScan();
  return {
    ok: docs.security_model && docs.secrets_ai_policy && fixtureSecrets.ok,
    trust_boundaries: ["workspace files", "hooks", "ledger", "generated artifacts", "fixtures", "optional external AI"],
    default_deny: {
      network: "Core harness uses deterministic local paths by default; optional provider calls require explicit --ai plus provider key.",
      secrets: "Harness does not discover credentials; operators provide named env vars only when a command documents them.",
      workspace: "Installer rollback/uninstall refuse paths outside the target root.",
    },
    docs,
    fixture_secrets: fixtureSecrets,
    next_action: docs.security_model && docs.secrets_ai_policy && fixtureSecrets.ok
      ? "No security boundary action required."
      : [
          !docs.security_model ? "Add docs/security-boundary-model.md." : "",
          !docs.secrets_ai_policy ? "Add docs/secrets-and-ai-policy.md." : "",
          !fixtureSecrets.ok ? "Remove real-looking secrets from fixtures or replace them with documented placeholders." : "",
        ].filter(Boolean).join(" "),
  };
}

function hookStatus() {
  const settingsPath = join(workspaceRoot(), ".claude", "settings.json");
  if (!existsSync(settingsPath)) {
    return {
      status: "missing",
      settings_path: settingsPath,
      client_support: { claude: "missing settings", codex: "no hook file required", shared: "task CLI available" },
      missing: Object.entries(EXPECTED_HOOKS).flatMap(([event, hooks]) => hooks.map((hook) => `${event}:${hook.command}`)),
      next_action: "Run node .agents/activate.mjs to install Claude hooks.",
    };
  }
  let settings;
  try {
    settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
  } catch (error) {
    return {
      status: "invalid",
      settings_path: settingsPath,
      error: error.message,
      client_support: { claude: "settings JSON invalid", codex: "no hook file required", shared: "task CLI available" },
      missing: [],
      next_action: "Fix .claude/settings.json syntax, then run node .agents/activate.mjs.",
    };
  }
  const missing = [];
  const duplicates = [];
  for (const [event, expected] of Object.entries(EXPECTED_HOOKS)) {
    const configs = Array.isArray(settings.hooks?.[event]) ? settings.hooks[event] : [];
    for (const hook of expected) {
      const matches = configs.filter((config) => {
        if ((config.matcher || null) !== hook.matcher) return false;
        return Array.isArray(config.hooks) && config.hooks.some((entry) => entry.command === hook.command);
      });
      if (!matches.length) missing.push(`${event}:${hook.command}`);
      if (matches.length > 1) duplicates.push(`${event}:${hook.command}`);
    }
  }
  return {
    status: missing.length || duplicates.length ? "needs_attention" : "ok",
    settings_path: settingsPath,
    client_support: { claude: "hooks in .claude/settings.json", codex: "uses shared CLI/config fallback", shared: "task CLI available" },
    missing,
    duplicates,
    next_action: missing.length || duplicates.length ? "Run node .agents/activate.mjs; inspect duplicates before editing user hooks." : "No hook action required.",
  };
}

function doctorReport() {
  const ledgerResult = safeReadLedger();
  const nodeVersion = process.env.COMPOUND_DOCTOR_NODE_VERSION || process.version;
  const nodeMajor = Number(/^v?(\d+)/.exec(nodeVersion)?.[1] || 0);
  const compliance = complianceInfo();
  const hooks = hookStatus();
  const checks = {
    node: {
      ok: nodeMajor >= 18,
      version: nodeVersion,
      next_action: nodeMajor >= 18 ? "No Node action required." : "Install Node 18 or newer.",
    },
    mode: {
      ok: ["observe", "warn", "enforce"].includes(compliance.mode),
      current: compliance.mode,
      policy: MODE_POLICY[compliance.mode],
      next_action: compliance.mode === "enforce" ? "Mode is ready for unattended execution." : compliance.recommended,
    },
    ledger: {
      ok: false,
      path: TASKS_PATH,
      exists: ledgerResult.exists,
      status: "invalid",
      version: null,
      current_task: null,
      task_count: 0,
      duplicate_task_ids: [],
      migration_needed: false,
      next_action: "Repair ledger before continuing.",
    },
    hooks,
    security: securityBoundaryStatus(),
  };
  if (!ledgerResult.ok) {
    checks.ledger.error = ledgerResult.error;
    checks.ledger.next_action = "Restore from a known-good TASKS.json backup or manually fix JSON syntax; doctor will not overwrite corrupt ledgers.";
  } else {
    const ledger = ledgerResult.ledger;
    const version = ledgerVersionStatus(ledger);
    const dupes = duplicateTaskIds(ledger);
    checks.ledger = {
      ok: Array.isArray(ledger.tasks) && version.status === "current" && dupes.length === 0,
      path: TASKS_PATH,
      exists: ledgerResult.exists,
      status: dupes.length ? "duplicate_task_ids" : version.status,
      version: version.version,
      current_task: ledger.current || null,
      task_count: Array.isArray(ledger.tasks) ? ledger.tasks.length : 0,
      duplicate_task_ids: dupes,
      migration_needed: version.status === "migration_needed",
      next_action: dupes.length
        ? "Resolve duplicate task ids manually before continuing."
        : version.status === "current"
          ? "No ledger action required."
          : version.status === "migration_needed"
            ? "Run node .agents/task.mjs migrate --apply to write a backed-up v1 ledger."
            : "Downgrade or export this ledger with a supported Compound Agent System version.",
    };
  }
  checks.hooks.ok = hooks.status === "ok";
  const ok = Object.values(checks).every((check) => check.ok);
  const next_actions = Object.values(checks).filter((check) => !check.ok).map((check) => check.next_action);
  return { ok, status: ok ? "PASS" : "FAIL", generated_at: nowISO(), checks, next_actions };
}

function cmdDoctor() {
  const report = doctorReport();
  console.log(`Compound doctor: ${report.status}`);
  for (const action of report.next_actions) console.log(`- next: ${action}`);
  if (!report.next_actions.length) console.log("- next: No action required.");
  console.log(JSON.stringify(report, null, 2));
}

function cmdMigrate(args) {
  const ledgerResult = safeReadLedger();
  if (!ledgerResult.ok) throw new Error(`Cannot migrate invalid ledger JSON: ${ledgerResult.error}`);
  const ledger = ledgerResult.ledger;
  const version = ledgerVersionStatus(ledger);
  if (version.status === "unsupported_version") throw new Error(`Refusing to downgrade unsupported ledger version ${version.version}.`);
  if (version.status === "current") {
    console.log("Ledger schema already current.");
    return;
  }
  const migrated = normalizeLedgerV1(ledger);
  console.log(`Ledger migration: ${version.version} -> ${CURRENT_LEDGER_VERSION}`);
  if (!args.apply) {
    console.log("Dry-run. Re-run with --apply to write a backed-up migration.");
    return;
  }
  const backup = backupPath("pre-migrate");
  mkdirSync(dirname(TASKS_PATH), { recursive: true });
  if (existsSync(TASKS_PATH)) copyFileSync(TASKS_PATH, backup);
  saveLedger(migrated);
  console.log(`Backup: ${backup}`);
  console.log("Ledger migration applied.");
}

function normalizeIdentity(agentId, args, existing = {}) {
  let client = args.client || existing.client || "agent";
  let model = args.model || existing.model || "unspecified";
  const alias = String(agentId || "").toLowerCase();
  const m = /^(claude|codex|devin|cursor|gpt)-(.+)$/.exec(alias);
  if (!args.client && !args.model && m) {
    client = m[1] === "gpt" ? "codex" : m[1];
    model = m[2];
  }
  return {
    id: agentId,
    client,
    model,
    role: args.role || existing.role || "agent",
    display_name: args["display-name"] || args.displayName || existing.display_name || `${client} ${model}`.trim(),
    session_id: existing.session_id || `${nowISO().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`,
    skills: args.skill?.length ? args.skill : existing.skills || [],
    activated_at: nowISO(),
  };
}

function cmdAck(args) {
  const agentId = args._[1];
  if (!agentId) throw new Error("Usage: task.mjs ack <agent-id>");
  const ledger = loadLedger();
  if (!ledger.agent_profiles || typeof ledger.agent_profiles !== "object") ledger.agent_profiles = {};
  if (!ledger.agents_active.includes(agentId)) ledger.agents_active.push(agentId);
  const profile = normalizeIdentity(agentId, args, ledger.agent_profiles[agentId]);
  ledger.agent_profiles[agentId] = profile;
  appendLog(ledger, "ack", null, agentId, { identity: profile });
  logEvent("ack", "task.mjs ack", {
    context: {
      agent_id: agentId,
      identity_client: profile.client,
      identity_model: profile.model,
      identity_role: profile.role,
      skill_count: Array.isArray(profile.skills) ? profile.skills.length : 0,
    },
  });
  saveLedger(ledger);
  console.log(c("green", `✓ Agent "${agentId}" signed in.`));
  console.log(`Identity: client=${profile.client} model=${profile.model} role=${profile.role} session_id=${profile.session_id}`);
  cmdStatus();
}

function cmdOpen(args) {
  const goal = args._[1];
  if (!goal) throw new Error("Usage: task.mjs open \"<goal>\" --dod \"<type>:<value>\" [--skill <id>] [--parent <id>]");
  if (!args.qa && (!args.dod || args.dod.length === 0)) {
    throw new Error("ERROR: task open requires at least one --dod. For Q&A-only tasks, use --qa.");
  }
  const ledger = loadLedger();
  if (ledger.current) {
    const cur = findTask(ledger, ledger.current);
    if (cur && cur.state === "in_progress") {
      throw new Error(
        `ERROR: Task ${cur.id} is in_progress. Park or finish it first:\n` +
        `  node .agents/task.mjs park ${cur.id} --reason "<text>"\n` +
        `  node .agents/task.mjs done ${cur.id}`
      );
    }
  }
  const id = nextId(ledger);
  const approvalCategory = normalizeApprovalCategory(args.approvalCategory);
  const categoryPolicy = approvalCategory ? APPROVAL_CATEGORIES.get(approvalCategory).policy : null;
  const approvalPolicy = normalizeApprovalPolicy(args.approval || categoryPolicy);
  const task = {
    id,
    goal,
    state: args.qa ? "q-and-a" : "in_progress",
    dod: (args.dod || []).map(parseDodSpec),
    skills: args.skill || [],
    blocked_by: null,
    unlock_command: null,
    park_reason: null,
    parent: args.parent || null,
    agent: process.env.COMPOUND_AGENT_ID || ledger.agents_active[ledger.agents_active.length - 1] || null,
    started_at: nowISO(),
    updated_at: nowISO(),
  };
  if (approvalPolicy) task.approval_policy = approvalPolicy;
  if (approvalCategory) task.approval_category = approvalCategory;
  if (approvalPolicy) task.approval_state = approvalState(approvalPolicy);
  if (approvalPolicy === "must-ask") task.human_approval = { required: true, approved_at: null, approver: null };
  ledger.tasks.push(task);
  ledger.current = id;
  appendLog(ledger, "open", id, task.agent, { goal });
  logEvent("task-open", "task.mjs open", { task, context: { goal } });
  saveLedger(ledger);
  console.log(c("green", `✓ Opened ${id}: ${goal}`));
  console.log(`  State: ${task.state}`);
  if (task.dod.length) console.log(`  DoD: ${task.dod.length} check(s)`);
  if (task.skills.length) console.log(`  Skills: ${task.skills.join(", ")}`);
  if (approvalPolicy || approvalCategory) console.log(`  Approval: ${taskApprovalSummary(task)}`);
  if (!task.skills.length && !args.qa) {
    console.log(c("yellow", "WARN: no --skill declared. Run: task.mjs update " + id + " --skill <id>"));
    console.log(c("yellow", "      See .agents/SKILL_SELECT.md for selection rules."));
  }
}

function cmdList(args) {
  const ledger = loadLedger();
  let tasks = ledger.tasks;
  if (args.state) tasks = tasks.filter((t) => t.state === args.state);
  else if (!args.all) tasks = tasks.filter((t) => t.state !== "done" && t.state !== "abandoned");
  if (!tasks.length) { console.log(c("dim", "No tasks match.")); return; }
  for (const t of tasks) {
    const stateColor = t.state === "in_progress" ? "green" : t.state === "blocked" ? "red" : t.state === "done" ? "dim" : "yellow";
    const cur = ledger.current === t.id ? c("cyan", " ★") : "";
    console.log(`${t.id}${cur}  ${c(stateColor, t.state.padEnd(12))}  ${t.goal}`);
    if (t.skills && t.skills.length) console.log(c("dim", `        skills: ${t.skills.join(", ")}`));
    const approval = taskApprovalSummary(t);
    if (approval) console.log(c("dim", `        ${approval}`));
  }
}

function cmdShow(args) {
  const id = args._[1];
  if (!id) throw new Error("Usage: task.mjs show <id>");
  const ledger = loadLedger();
  const t = findTask(ledger, id);
  if (!t) throw new Error(`Task ${id} not found.`);
  console.log(JSON.stringify(t, null, 2));
}

async function runDodCheck(check) {
  if (check.check === "test") {
    const r = runPortableNodeCommand(check.command, { cwd: REPO_ROOT }) ||
      spawnSync(check.command, [], { shell: true, stdio: "pipe", encoding: "utf-8", cwd: REPO_ROOT });
    const tail = (r.stdout + r.stderr).trim().split("\n").slice(-5).join("\n");
    return { ok: r.status === 0, exit: r.status, tail };
  }
  if (check.check === "artifact") {
    if (!existsSync(check.path)) return { ok: false, reason: `Path not found: ${check.path}` };
    const st = statSync(check.path);
    if (check.min_bytes && st.size < check.min_bytes) return { ok: false, reason: `Size ${st.size} < min_bytes ${check.min_bytes}` };
    if (check.contains && st.isFile()) {
      const content = readFileSync(check.path, "utf-8");
      const re = new RegExp(check.contains);
      if (!re.test(content)) return { ok: false, reason: `Does not contain: ${check.contains}` };
    }
    return { ok: true, size: st.size };
  }
  if (check.check === "manual") {
    const ans = await prompt(`  Manual: ${check.description}\n  Confirmed? [y/N]: `);
    return { ok: /^y(es)?$/i.test(ans), confirmer: process.env.USER || process.env.USERNAME || "operator" };
  }
  return { ok: false, reason: `Unknown check type: ${check.check}` };
}

async function cmdVerify(args) {
  const id = args._[1] || (loadLedger().current);
  if (!id) throw new Error("Usage: task.mjs verify <id> (or set current task)");
  const ledger = loadLedger();
  const t = findTask(ledger, id);
  if (!t) throw new Error(`Task ${id} not found.`);
  if (!t.dod || !t.dod.length) { console.log(c("yellow", `Task ${id} has no DoD checks.`)); return; }
  let allPass = true;
  for (let i = 0; i < t.dod.length; i++) {
    const d = t.dod[i];
    process.stdout.write(`[${i + 1}/${t.dod.length}] check: ${d.check} ... `);
    const result = await runDodCheck(d);
    if (result.ok) {
      d.passed_at = nowISO();
      if (result.confirmer) d.confirmed_by = result.confirmer;
      if (result.size != null) d.artifact_size = result.size;
      console.log(c("green", "✓"));
      if (result.tail) console.log(c("dim", "    " + result.tail.replace(/\n/g, "\n    ")));
    } else {
      d.passed_at = null;
      d.last_failure = { ts: nowISO(), ...result };
      console.log(c("red", "✗"));
      if (result.reason) console.log(c("red", "    " + result.reason));
      if (result.tail) console.log(c("dim", "    " + result.tail.replace(/\n/g, "\n    ")));
      allPass = false;
    }
  }
  t.updated_at = nowISO();
  appendLog(ledger, "verify", id, t.agent, { allPass });
  logEvent("quality-check", "task.mjs verify", {
    task: t,
    result: { status: allPass ? "pass" : "fail" },
    context: {
      allPass,
      checks_total: t.dod.length,
      checks_passed: t.dod.filter((d) => d.passed_at).length,
      failed_checks: t.dod.filter((d) => !d.passed_at).map((d) => d.check),
    },
  });
  saveLedger(ledger);
  if (allPass) console.log(c("green", `\n✓ All DoD checks passed. Run: task.mjs done ${id}`));
  else { console.log(c("red", `\n✗ Verification failed. Fix and re-run: task.mjs verify ${id}`)); process.exit(1); }
}

async function cmdDone(args) {
  const id = args._[1] || (loadLedger().current);
  if (!id) throw new Error("Usage: task.mjs done <id>");
  const ledger = loadLedger();
  const t = findTask(ledger, id);
  if (!t) throw new Error(`Task ${id} not found.`);
  const unverified = (t.dod || []).filter((d) => !d.passed_at);
  if (unverified.length) {
    console.error(c("red", `ERROR: ${unverified.length}/${t.dod.length} DoD checks have not passed:`));
    for (const d of unverified) console.error(`  - ${d.check}: ${d.command || d.path || d.description}`);
    console.error(c("yellow", `\nUnlock: node .agents/task.mjs verify ${id}`));
    process.exit(1);
  }
  t.state = "done";
  t.completed_at = nowISO();
  t.updated_at = nowISO();
  if (ledger.current === id) ledger.current = null;
  appendLog(ledger, "done", id, t.agent);
  logEvent("task-done", "task.mjs done", { task: t, timestamp: t.completed_at });
  saveLedger(ledger);
  console.log(c("green", `✓ ${id} done.`));
  console.log(c("cyan", "\nNow log the COMPOUND register per .agents/COMPOUND.md."));
}

function cmdPark(args) {
  const id = args._[1];
  const reason = args.reason || args._[2];
  if (!id || !reason) throw new Error("Usage: task.mjs park <id> --reason \"<text>\"");
  const ledger = loadLedger();
  const t = findTask(ledger, id);
  if (!t) throw new Error(`Task ${id} not found.`);
  t.state = "parked";
  t.park_reason = reason;
  t.updated_at = nowISO();
  if (ledger.current === id) ledger.current = null;
  appendLog(ledger, "park", id, t.agent, { reason });
  logEvent("task-park", "task.mjs park", { task: t, context: { reason } });
  saveLedger(ledger);
  console.log(c("yellow", `⏸ Parked ${id}: ${reason}`));
}

function cmdResume(args) {
  const id = args._[1];
  if (!id) throw new Error("Usage: task.mjs resume <id>");
  const ledger = loadLedger();
  const t = findTask(ledger, id);
  if (!t) throw new Error(`Task ${id} not found.`);
  if (ledger.current && ledger.current !== id) {
    const cur = findTask(ledger, ledger.current);
    if (cur && cur.state === "in_progress") throw new Error(`ERROR: Task ${cur.id} is in_progress. Park it first.`);
  }
  t.state = "in_progress";
  t.park_reason = null;
  t.updated_at = nowISO();
  ledger.current = id;
  appendLog(ledger, "resume", id, t.agent);
  logEvent("task-resume", "task.mjs resume", { task: t });
  saveLedger(ledger);
  console.log(c("green", `▶ Resumed ${id}: ${t.goal}`));
}

function cmdApprove(args) {
  const id = args._[1];
  const approver = args.by || args.approver || args._[2] || process.env.COMPOUND_AGENT_ID || "human";
  const scope = args.scope || args.reason || null;
  if (!id) throw new Error("Usage: task.mjs approve <id> --by \"<approver>\" [--scope \"<approved scope>\"]");
  const ledger = loadLedger();
  const t = findTask(ledger, id);
  if (!t) throw new Error(`Task ${id} not found.`);
  const policy = normalizeApprovalPolicy(t.approval_policy);
  if (policy !== "must-ask") throw new Error(`Task ${id} is not waiting on must-ask approval.`);
  t.human_approval = {
    required: true,
    approved_at: nowISO(),
    approver,
    scope,
  };
  t.approval_state = "approved";
  t.updated_at = nowISO();
  appendLog(ledger, "approve", id, t.agent, { approval_category: t.approval_category || null, approver, scope });
  logEvent("task-approve", "task.mjs approve", {
    task: t,
    result: { status: "approved" },
    context: { approval_category: t.approval_category || null, approver_present: Boolean(approver), scope_present: Boolean(scope) },
  });
  saveLedger(ledger);
  console.log(c("green", `✓ Approved ${id}: ${taskApprovalSummary(t)}`));
}

function cmdBlock(args) {
  const id = args._[1];
  const reason = args.reason || args._[2];
  if (!id || !reason || !args.unlock) throw new Error("Usage: task.mjs block <id> --reason \"<text>\" --unlock \"<command>\" [--approval must-ask|defaultable|defer] [--approval-category <category>]");
  const ledger = loadLedger();
  const t = findTask(ledger, id);
  if (!t) throw new Error(`Task ${id} not found.`);
  const hasApprovalBoundary = args.approval !== undefined || args.approvalCategory !== undefined;
  const approvalCategory = normalizeApprovalCategory(args.approvalCategory);
  const categoryPolicy = approvalCategory ? APPROVAL_CATEGORIES.get(approvalCategory).policy : null;
  const approvalPolicy = hasApprovalBoundary ? normalizeApprovalPolicy(args.approval || categoryPolicy || "must-ask") : null;
  t.state = "blocked";
  t.blocked_by = reason;
  t.unlock_command = args.unlock;
  if (hasApprovalBoundary) {
    t.approval_policy = approvalPolicy;
    t.approval_category = approvalCategory || t.approval_category || null;
    t.approval_state = approvalState(approvalPolicy);
    t.human_approval = approvalPolicy === "must-ask" ? { required: true, approved_at: null, approver: null } : null;
  }
  t.updated_at = nowISO();
  appendLog(ledger, "block", id, t.agent, { reason, approval_policy: approvalPolicy, approval_category: t.approval_category });
  logEvent("task-block", "task.mjs block", {
    task: t,
    result: { status: "blocked", approval_policy: approvalPolicy },
    context: { reason, unlock_command_present: Boolean(args.unlock), approval_policy: approvalPolicy, approval_category: t.approval_category },
  });
  saveLedger(ledger);
  console.log(c("red", `⛔ Blocked ${id}: ${reason}`));
  const approval = taskApprovalSummary(t);
  if (approval) console.log(c("yellow", `   Approval: ${approval}`));
  console.log(c("yellow", `   Unlock: ${args.unlock}`));
}

function cmdAbandon(args) {
  const id = args._[1];
  const reason = args.reason || args._[2];
  if (!id || !reason) throw new Error("Usage: task.mjs abandon <id> --reason \"<text>\"");
  const ledger = loadLedger();
  const t = findTask(ledger, id);
  if (!t) throw new Error(`Task ${id} not found.`);
  t.state = "abandoned";
  t.abandon_reason = reason;
  t.updated_at = nowISO();
  if (ledger.current === id) ledger.current = null;
  appendLog(ledger, "abandon", id, t.agent, { reason });
  logEvent("task-abandon", "task.mjs abandon", { task: t, result: { status: "abandoned" }, context: { reason } });
  saveLedger(ledger);
  console.log(c("dim", `✗ Abandoned ${id}: ${reason}`));
}

function cmdUpdate(args) {
  const id = args._[1];
  if (!id) throw new Error("Usage: task.mjs update <id> [--skill <id>] [--dod <spec>] [--remove-dod <i> --reason <r>]");
  const ledger = loadLedger();
  const t = findTask(ledger, id);
  if (!t) throw new Error(`Task ${id} not found.`);
  if (args.skill && args.skill.length) for (const s of args.skill) if (!t.skills.includes(s)) t.skills.push(s);
  if (args.dod && args.dod.length) for (const spec of args.dod) t.dod.push(parseDodSpec(spec));
  if (args.approval) {
    t.approval_policy = normalizeApprovalPolicy(args.approval);
    t.approval_state = approvalState(t.approval_policy);
    t.human_approval = t.approval_policy === "must-ask" ? { required: true, approved_at: null, approver: null } : null;
  }
  if (args.approvalCategory) {
    t.approval_category = normalizeApprovalCategory(args.approvalCategory);
  }
  if (args.removeDod != null) {
    if (!args.reason) throw new Error("--remove-dod requires --reason \"<text>\"");
    const removed = t.dod.splice(args.removeDod, 1)[0];
    t.dod_removed = t.dod_removed || [];
    t.dod_removed.push({ check: removed, reason: args.reason, ts: nowISO() });
    appendLog(ledger, "remove-dod", id, t.agent, { reason: args.reason, removed });
  }
  t.updated_at = nowISO();
  logEvent("task-update", "task.mjs update", {
    task: t,
    context: {
      added_skills: args.skill?.length || 0,
      added_dod: args.dod?.length || 0,
      approval_policy: t.approval_policy || null,
      approval_category: t.approval_category || null,
      removed_dod: args.removeDod != null,
      reason: args.reason,
    },
  });
  saveLedger(ledger);
  console.log(c("green", `✓ Updated ${id}.`));
}

// ----- Plan-marker import -----

function parseFrontmatter(content) {
  const m = /^---\n([\s\S]*?)\n---/.exec(content);
  if (!m) return null;
  return parseSimpleYaml(m[1]);
}

function parseSimpleYaml(yaml) {
  const lines = yaml.split("\n");
  const result = {};
  const stack = [{ obj: result, indent: -1 }];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.match(/^ */)[0].length;
    const trimmed = line.trim();
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    const cur = stack[stack.length - 1].obj;
    if (trimmed.startsWith("- ")) {
      const item = trimmed.slice(2);
      if (!Array.isArray(cur)) continue;
      if (item.includes(":")) {
        const newObj = {};
        cur.push(newObj);
        const [k, ...rest] = item.split(":");
        const v = rest.join(":").trim();
        if (v) newObj[k.trim()] = stripQuotes(v);
        stack.push({ obj: newObj, indent });
      } else {
        cur.push(stripQuotes(item));
      }
      continue;
    }
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();
    if (!value) {
      const next = lines.slice(i + 1).find((l) => l.trim());
      if (next && next.trim().startsWith("- ")) { cur[key] = []; stack.push({ obj: cur[key], indent }); }
      else { cur[key] = {}; stack.push({ obj: cur[key], indent }); }
    } else {
      cur[key] = stripQuotes(value);
    }
  }
  return result;
}

function stripQuotes(s) {
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
  if (s === "null") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  return s;
}

function parseInlineMarkers(content) {
  const re = /\[COMPOUND-PHASE\s+([^\]]+)\]/g;
  const phases = [];
  let m;
  while ((m = re.exec(content))) {
    const attrs = parseInlineAttrs(m[1]);
    if (!attrs.id) continue;
    const phase = { id: attrs.id, goal: attrs.goal || "", skills: [], dod: [], parent: attrs.parent || null };
    if (attrs.skills) phase.skills = attrs.skills.split(";").map((s) => s.trim()).filter(Boolean);
    if (attrs.dod) for (const spec of attrs.dod.split(";")) { const t = spec.trim(); if (t) phase.dod.push(parseDodSpec(t)); }
    phases.push(phase);
  }
  return phases;
}

function parseInlineAttrs(s) {
  const out = {};
  const re = /(\w+)=("([^"]*)"|(\S+))/g;
  let m;
  while ((m = re.exec(s))) out[m[1]] = m[3] != null ? m[3] : m[4];
  return out;
}

function uniquePhases(phases) {
  const seen = new Set();
  const unique = [];
  for (const phase of phases) {
    if (!phase.id || seen.has(phase.id)) continue;
    seen.add(phase.id);
    unique.push(phase);
  }
  return unique;
}

function cmdImport(args) {
  const file = args._[1];
  if (!file) throw new Error("Usage: task.mjs import <plan-file> [--apply]");
  const content = readFileSync(file, "utf-8");
  const fm = parseFrontmatter(content);
  const isActive = (fm && fm.compound === "active") || /<!--\s*COMPOUND:\s*active\s*-->/i.test(content);
  if (!isActive) { console.log(c("yellow", `Plan ${file} is not marked compound:active. Skipping.`)); return; }
  let phases = [];
  if (fm && fm.phases) {
    for (const p of fm.phases) {
      const phase = { id: p.id, goal: p.goal || "", skills: p.skills || [], parent: p.parent || null, dod: [] };
      if (p.dod) for (const d of p.dod) {
        if (d.check === "test") phase.dod.push({ check: "test", command: d.command, passed_at: null });
        else if (d.check === "artifact") phase.dod.push({ check: "artifact", path: d.path, passed_at: null });
        else if (d.check === "manual") phase.dod.push({ check: "manual", description: d.description, passed_at: null });
      }
      phases.push(phase);
    }
  }
  phases = uniquePhases(phases.concat(parseInlineMarkers(content)));
  const ledger = loadLedger();
  const existing = new Set(ledger.tasks.map((t) => t.id));
  const toAdd = phases.filter((p) => !existing.has(p.id));
  const toUpdate = phases.filter((p) => existing.has(p.id));
  console.log(c("cyan", `Plan: ${file}`));
  console.log(`  + ${toAdd.length} new task(s)`);
  console.log(`  ~ ${toUpdate.length} existing task(s)`);
  if (!args.apply) {
    if (toAdd.length) {
      console.log(c("dim", "\nWould add:"));
      for (const p of toAdd) console.log(`  ${p.id}: ${p.goal} (skills: ${(p.skills || []).join(",")}, dod: ${p.dod.length})`);
    }
    console.log(c("yellow", "\nDry-run. Re-run with --apply to write to ledger."));
    return;
  }
  for (const p of toAdd) {
    ledger.tasks.push({
      id: p.id, goal: p.goal, state: "open", dod: p.dod, skills: p.skills,
      blocked_by: null, unlock_command: null, park_reason: null,
      parent: p.parent, agent: null, started_at: nowISO(), updated_at: nowISO(),
    });
    appendLog(ledger, "import", p.id, null, { source: file });
    logEvent("task-import", "task.mjs import", {
      task: ledger.tasks.at(-1),
      context: { source: file, goal: p.goal },
    });
  }
  saveLedger(ledger);
  console.log(c("green", `✓ Imported ${toAdd.length} task(s).`));
}

// ----- Hook handlers -----

function hookSessionStart() {
  resetGrounding();
  const ledger = loadLedger();
  const cur = ledger.current ? findTask(ledger, ledger.current) : null;
  const open = ledger.tasks.filter((t) => t.state === "in_progress" || t.state === "open").length;
  const blocked = ledger.tasks.filter((t) => t.state === "blocked").length;
  let msg = `\n[Compound Protocol] ledger: ${open} open, ${blocked} blocked.`;
  if (cur) msg += `\n  Current task: ${cur.id} (${cur.state}) — ${cur.goal}`;
  if (blocked > 0) msg += `\n  Blocked tasks need attention. Run: node .agents/task.mjs status`;
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: msg } }));
}

function hookPreEdit() {
  const mode = complianceMode();
  const ledger = loadLedger();
  const cur = ledger.current ? findTask(ledger, ledger.current) : null;
  if (cur && cur.state === "in_progress") { process.exit(0); }
  const msg = "[Compound Protocol] No in_progress task. Open one before editing:\n" +
    "  node .agents/task.mjs open \"<goal>\" --dod \"<type>:<value>\" --skill <id>";
  emitHook(mode, msg);
}

function hookStop() {
  const ledger = loadLedger();
  if (ledger.current) {
    const t = findTask(ledger, ledger.current);
    if (t) { t.updated_at = nowISO(); saveLedger(ledger); }
  }
}

// ============================ MAIN ============================

const HELP = `task.mjs — Compound Protocol task ledger
Usage:
  task.mjs status                                Show current task + ledger summary
  task.mjs current                               Print current task id only
  task.mjs ack <agent-id>                        Sign in as agent
  task.mjs open "<goal>" --dod "<type>:<value>" [--skill <id>] [--parent <id>] [--qa] [--approval must-ask|defaultable|defer] [--approval-category <category>]
  task.mjs list [--state <s>] [--all]            List tasks
  task.mjs show <id>                             Full task JSON
  task.mjs verify [<id>]                         Run DoD checks
  task.mjs done [<id>]                           Close task (requires DoD all passed)
  task.mjs park <id> --reason "<text>"           Park task
  task.mjs resume <id>                           Resume parked task
  task.mjs approve <id> --by "<approver>" [--scope "<approved scope>"]
  task.mjs block <id> --reason "<text>" --unlock "<cmd>" [--approval must-ask|defaultable|defer] [--approval-category <category>]
  task.mjs abandon <id> --reason "<text>"
  task.mjs update <id> [--skill <id>] [--dod <spec>] [--approval <policy>] [--approval-category <category>] [--remove-dod <i> --reason <r>]
  task.mjs import <plan-file> [--apply]
  task.mjs doctor                               Diagnose ledger, hooks, mode, runtime
  task.mjs migrate [--apply]                    Migrate ledger with backup

  task.mjs hook <event>                          (internal — invoked by Claude hooks)

DoD specs: test:<command> | artifact:<path> | manual:<description>
Approval policies: must-ask (blocked until human approval), defaultable (safe documented default exists), defer (out of scope for now).
Approval categories: secrets, network, destructive-git, overwrite, uninstall, external-apis, multi-agent-spawning.
See .agents/PROTOCOL.md for the full contract.
`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  try {
    if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") { console.log(HELP); return; }
    requireGrounding(cmd);
    if (cmd === "status") return cmdStatus();
    if (cmd === "current") return cmdCurrent();
    if (cmd === "ack") return cmdAck(args);
    if (cmd === "open") return cmdOpen(args);
    if (cmd === "list") return cmdList(args);
    if (cmd === "show") return cmdShow(args);
    if (cmd === "verify") return await cmdVerify(args);
    if (cmd === "done") return await cmdDone(args);
    if (cmd === "park") return cmdPark(args);
    if (cmd === "resume") return cmdResume(args);
    if (cmd === "approve") return cmdApprove(args);
    if (cmd === "block") return cmdBlock(args);
    if (cmd === "abandon") return cmdAbandon(args);
    if (cmd === "update") return cmdUpdate(args);
    if (cmd === "import") return cmdImport(args);
    if (cmd === "doctor") return cmdDoctor(args);
    if (cmd === "migrate") return cmdMigrate(args);
    if (cmd === "hook") {
      const ev = args._[1];
      if (ev === "session-start") return hookSessionStart();
      if (ev === "pre-edit") return hookPreEdit();
      if (ev === "stop") return hookStop();
      throw new Error(`Unknown hook event: ${ev}`);
    }
    throw new Error(`Unknown command: ${cmd}\n\n${HELP}`);
  } catch (err) {
    console.error(c("red", err.message));
    process.exit(1);
  }
}

main();
