#!/usr/bin/env node
// .agents/event-log.mjs — local append-only observability log.
// Zero runtime dependencies. Node 18+.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, dirname, join, resolve } from "node:path";

export const EVENT_SCHEMA_VERSION = "compound-event-log.v1";
export const EVENT_SCHEMA_PATH = "schemas/event-log.v1.json";
export const DEFAULT_EVENT_LOG = ".agents/events.jsonl";

const REDACTED = "[REDACTED]";
const SECRET_KEY_RE = /(secret|token|password|passwd|pwd|api[_-]?key|authorization|cookie|credential|private[_-]?key|access[_-]?key|refresh[_-]?token|client[_-]?secret|session[_-]?key)/i;
const SECRET_VALUE_RE = /(sk-[a-z0-9_-]{12,}|gsk_[a-z0-9_-]{12,}|sbp_[a-z0-9_-]{12,}|gh[pousr]_[a-z0-9_]{12,}|xox[baprs]-[a-z0-9-]{12,}|bearer\s+[a-z0-9._~+/-]{12,}|authorization:\s*\S+|api[_-]?key\s*[:=]\s*\S+|password\s*[:=]\s*\S+)/gi;
const ABSOLUTE_USER_PATH_RE = /([A-Za-z]:\\Users\\|\/home\/|\/Users\/)([^/\s\\]+)/g;

function nowISO() {
  return new Date().toISOString();
}

function shortHash(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 12);
}

export function redactText(value) {
  return String(value)
    .replace(SECRET_VALUE_RE, REDACTED)
    .replace(ABSOLUTE_USER_PATH_RE, "$1[USER]");
}

function primitive(value) {
  if (value == null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return redactText(value);
  return undefined;
}

export function safeContext(value, depth = 0) {
  if (depth > 5) return "[TRUNCATED]";
  const simple = primitive(value);
  if (simple !== undefined) return simple;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => safeContext(item, depth + 1));
  if (!value || typeof value !== "object") return String(value);

  const out = {};
  for (const [key, raw] of Object.entries(value)) {
    if (raw === undefined || typeof raw === "function") continue;
    if (SECRET_KEY_RE.test(key)) {
      out[key] = REDACTED;
      continue;
    }
    out[key] = safeContext(raw, depth + 1);
  }
  return out;
}

export function sanitizeLedgerExtra(extra = {}) {
  const out = {};
  for (const [key, value] of Object.entries(extra || {})) {
    if (value === undefined) continue;
    if (key === "goal" || key === "reason" || key === "source") Object.assign(out, summarizeText(value, key));
    else if (key === "identity") out.identity = taskEventContext({}, { identity: value }).identity;
    else if (key === "removed") out.removed_check = value?.check || null;
    else out[key] = safeContext(value);
  }
  return out;
}

export function summarizeText(value, label = "text") {
  const text = String(value || "");
  if (!text) return { [`${label}_present`]: false };
  return {
    [`${label}_present`]: true,
    [`${label}_length`]: text.length,
    [`${label}_sha256_12`]: shortHash(text),
  };
}

export function eventLogPathFromLedgerPath(ledgerPath) {
  return join(dirname(resolve(ledgerPath)), "events.jsonl");
}

export function defaultEventLogPath(cwd = process.cwd()) {
  return resolve(cwd, DEFAULT_EVENT_LOG);
}

function normalizeResult(result) {
  if (typeof result === "string") return { status: result };
  if (!result || typeof result !== "object") return { status: "ok" };
  return safeContext(result);
}

export function createEvent({ event, command, result = { status: "ok" }, context = {}, timestamp = nowISO() } = {}) {
  if (!event || typeof event !== "string") throw new Error("event is required.");
  if (!command || typeof command !== "string") throw new Error("command is required.");
  if (Number.isNaN(Date.parse(timestamp))) throw new Error("timestamp must be ISO-8601.");
  return {
    schema_version: EVENT_SCHEMA_VERSION,
    schema_path: EVENT_SCHEMA_PATH,
    timestamp,
    event: redactText(event),
    command: redactText(command),
    result: normalizeResult(result),
    context: safeContext(context),
  };
}

export function appendEvent(options = {}) {
  const logPath = resolve(options.logPath || defaultEventLogPath(options.cwd));
  const record = createEvent(options);
  mkdirSync(dirname(logPath), { recursive: true });
  appendFileSync(logPath, JSON.stringify(record) + "\n", { encoding: "utf-8", flag: "a" });
  return record;
}

export function readEvents(logPath) {
  if (!existsSync(logPath)) return [];
  return readFileSync(logPath, "utf-8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function taskEventContext(task = {}, extra = {}) {
  const context = {
    task_id: task.id || extra.task_id || null,
    agent_id: task.agent || extra.agent_id || null,
    state: task.state || null,
    dod_count: Array.isArray(task.dod) ? task.dod.length : undefined,
    skill_count: Array.isArray(task.skills) ? task.skills.length : undefined,
    has_blockers: Array.isArray(task.blocked_by) ? task.blocked_by.length > 0 : Boolean(task.blocked_by),
  };
  if (extra.goal) Object.assign(context, summarizeText(extra.goal, "goal"));
  if (extra.reason) Object.assign(context, summarizeText(extra.reason, "reason"));
  if (extra.source) context.source_file = basename(String(extra.source));
  if (extra.allPass != null) context.all_pass = Boolean(extra.allPass);
  if (extra.checks_total != null) context.checks_total = extra.checks_total;
  if (extra.checks_passed != null) context.checks_passed = extra.checks_passed;
  if (extra.identity) {
    context.identity = {
      client: extra.identity.client || null,
      model: extra.identity.model || null,
      role: extra.identity.role || null,
      skill_count: Array.isArray(extra.identity.skills) ? extra.identity.skills.length : 0,
    };
  }
  return context;
}
