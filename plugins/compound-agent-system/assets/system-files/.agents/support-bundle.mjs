#!/usr/bin/env node
// .agents/support-bundle.mjs — local redacted diagnostics export.
// Zero runtime dependencies. Node 18+.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { appendEvent, eventLogPathFromLedgerPath, readEvents, redactText, safeContext, summarizeText } from "./event-log.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const defaultLedgerPath = process.env.COMPOUND_TASKS_PATH || join(process.cwd(), ".agents", "TASKS.json");
const SECRET_KEY_RE = /(secret|token|password|passwd|pwd|api[_-]?key|authorization|cookie|credential|private[_-]?key|access[_-]?key|refresh[_-]?token|client[_-]?secret|session[_-]?key)/i;
const SUMMARY_KEYS = new Set(["goal", "reason", "source", "idea", "prompt", "raw", "body"]);

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function parseArgs(argv) {
  const args = { events: 20 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--out") args.out = argv[++i];
    else if (arg === "--ledger") args.ledger = argv[++i];
    else if (arg === "--events") args.events = Number.parseInt(argv[++i], 10);
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isFinite(args.events) || args.events < 0) throw new Error("--events must be a non-negative integer.");
  return args;
}

function workspaceRoot(ledgerPath) {
  const ledgerDir = dirname(resolve(ledgerPath));
  return basename(ledgerDir) === ".agents" ? dirname(ledgerDir) : ledgerDir;
}

function defaultOutDir(root) {
  return join(root, ".agents", "support-bundles", `support-bundle-${nowStamp()}`);
}

function assertInsideRoot(root, path) {
  const relativePath = relative(root, path);
  if (relativePath.startsWith("..") || relativePath === ".." || relativePath === "") {
    throw new Error(`Support bundle output must be inside the workspace: ${path}`);
  }
}

function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function safeReadJson(path, fallback = null) {
  try {
    return { value: readJson(path, fallback), error: null };
  } catch (error) {
    return { value: fallback, error: redactText(error.message) };
  }
}

function safeReadEvents(path) {
  try {
    return { events: readEvents(path), error: null };
  } catch (error) {
    return { events: [], error: redactText(error.message) };
  }
}

function summarizeValue(value, key) {
  if (typeof value === "string") return summarizeText(value, key);
  return { [`${key}_present`]: Boolean(value), [`${key}_type`]: Array.isArray(value) ? "array" : typeof value };
}

export function sanitizeForBundle(value, key = "") {
  if (value == null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeForBundle(item, key));
  if (typeof value !== "object") return String(value);

  const out = {};
  for (const [childKey, raw] of Object.entries(value)) {
    if (raw === undefined || typeof raw === "function") continue;
    if (SECRET_KEY_RE.test(childKey)) {
      out[childKey] = "[REDACTED]";
    } else if (SUMMARY_KEYS.has(childKey)) {
      Object.assign(out, summarizeValue(raw, childKey));
    } else {
      out[childKey] = sanitizeForBundle(raw, childKey);
    }
  }
  return safeContext(out);
}

function runJsonCommand(script, args, cwd, ledgerPath, parser) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, COMPOUND_TASKS_PATH: ledgerPath, NO_COLOR: "1" },
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
  try {
    return {
      ok: result.status === 0,
      exit_code: result.status,
      report: sanitizeForBundle(parser(result.stdout || "")),
    };
  } catch (error) {
    return {
      ok: false,
      exit_code: result.status,
      parse_error: redactText(error.message),
      output: redactText(output),
    };
  }
}

function parseDoctor(stdout) {
  const start = stdout.indexOf("{");
  if (start < 0) throw new Error("doctor output did not contain JSON");
  return JSON.parse(stdout.slice(start));
}

function parseReadiness(stdout) {
  const marker = "\nJSON:\n";
  const start = stdout.indexOf(marker);
  if (start >= 0) return JSON.parse(stdout.slice(start + marker.length));
  const jsonStart = stdout.indexOf("{");
  if (jsonStart < 0) throw new Error("readiness output did not contain JSON");
  return JSON.parse(stdout.slice(jsonStart));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function relativeTo(root, path) {
  const rel = relative(root, path);
  return rel && !rel.startsWith("..") ? rel : redactText(path);
}

export function createSupportBundle(options = {}) {
  const ledgerPath = resolve(options.ledger || defaultLedgerPath);
  const root = workspaceRoot(ledgerPath);
  const outDir = resolve(options.out || defaultOutDir(root));
  assertInsideRoot(root, outDir);
  if (existsSync(outDir)) throw new Error(`Refusing to overwrite existing support bundle directory: ${outDir}`);
  mkdirSync(outDir, { recursive: true });

  const ledgerRead = safeReadJson(ledgerPath, { missing: true });
  const eventPath = eventLogPathFromLedgerPath(ledgerPath);
  const eventRead = safeReadEvents(eventPath);
  const recentEvents = eventRead.events.slice(-options.events);
  const doctor = runJsonCommand(join(here, "task.mjs"), ["doctor"], root, ledgerPath, parseDoctor);
  const readiness = runJsonCommand(join(here, "session-readiness.mjs"), [], root, ledgerPath, parseReadiness);

  const files = [
    "README.md",
    "manifest.json",
    "versions.json",
    "config-summary.json",
    "ledger-redacted.json",
    "events-recent-redacted.json",
    "doctor.json",
    "readiness.json",
  ];

  writeFileSync(join(outDir, "README.md"), `# Compound Agent System support bundle

Review before sharing. This bundle is local-only and was not uploaded anywhere.

The export redacts secret-looking keys/values, summarizes long task text such as goals and reasons, and keeps recent events only. It is intended to help support diagnose harness state without requiring a full repository dump.

If anything in this directory looks sensitive, delete the bundle or remove that file before sharing.
`);

  writeJson(join(outDir, "versions.json"), {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    generated_at: new Date().toISOString(),
  });
  writeJson(join(outDir, "config-summary.json"), sanitizeForBundle({
    workspace_root: relativeTo(root, root) || ".",
    ledger_path: relativeTo(root, ledgerPath),
    event_log_path: relativeTo(root, eventPath),
    compound_mode: process.env.COMPOUND_MODE || (process.env.COMPOUND_ENFORCE === "1" ? "enforce" : "warn"),
    compound_tasks_path_present: Boolean(process.env.COMPOUND_TASKS_PATH),
    event_limit: options.events,
  }));
  writeJson(join(outDir, "ledger-redacted.json"), ledgerRead.error ? { error: ledgerRead.error } : sanitizeForBundle(ledgerRead.value));
  writeJson(join(outDir, "events-recent-redacted.json"), sanitizeForBundle(recentEvents));
  if (eventRead.error) writeJson(join(outDir, "events-read-error.json"), { error: eventRead.error });
  writeJson(join(outDir, "doctor.json"), doctor);
  writeJson(join(outDir, "readiness.json"), readiness);
  writeJson(join(outDir, "manifest.json"), {
    schema_version: "compound-support-bundle.v1",
    generated_at: new Date().toISOString(),
    warning: "Review before sharing. No automatic upload was performed.",
    source: {
      ledger_path: relativeTo(root, ledgerPath),
      event_log_path: relativeTo(root, eventPath),
    },
    files,
  });

  try {
    appendEvent({
      logPath: eventPath,
      event: "support-bundle-export",
      command: "support-bundle.mjs",
      result: { status: "ok" },
      context: { out_dir: relativeTo(root, outDir), file_count: files.length, event_count: recentEvents.length },
    });
  } catch {
    // Support export must remain diagnostic even if observability logging fails.
  }

  return { outDir, files, doctor_ok: doctor.ok, readiness_ok: readiness.ok };
}

function usage() {
  return `Usage: node .agents/support-bundle.mjs [--out <dir>] [--ledger <path>] [--events <count>]

Creates a local redacted support bundle folder. No upload is performed.
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  const result = createSupportBundle(args);
  console.log("Compound support bundle export complete.");
  console.log("Review before sharing. No upload was performed.");
  console.log(`Bundle: ${result.outDir}`);
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(redactText(error.message));
    process.exit(1);
  }
}
