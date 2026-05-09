#!/usr/bin/env node
// .agents/activate.mjs — idempotent installer for Compound Protocol hooks
// Writes hook config to .claude/settings.json. Safe to run multiple times.
// See .agents/PROTOCOL.md.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { appendEvent, eventLogPathFromLedgerPath } from "./event-log.mjs";
import { printFirstSessionWizard } from "./first-session-wizard.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const SETTINGS_PATH = join(REPO_ROOT, ".claude", "settings.json");
const TASKS_PATH = process.env.COMPOUND_TASKS_PATH || join(__dirname, "TASKS.json");

const HOOK_MARKER = "compound-protocol";
const HOOK_COMMANDS = {
  sessionStart: "node .agents/task.mjs hook session-start",
  preEdit: "node .agents/task.mjs hook pre-edit",
  stop: "node .agents/task.mjs hook stop",
};

const HOOKS_TO_INSTALL = {
  SessionStart: [
    {
      hooks: [{ type: "command", command: HOOK_COMMANDS.sessionStart, _compound: HOOK_MARKER }],
    },
  ],
  PreToolUse: [
    {
      matcher: "Edit|Write",
      hooks: [{ type: "command", command: HOOK_COMMANDS.preEdit, _compound: HOOK_MARKER }],
    },
  ],
  Stop: [
    {
      hooks: [{ type: "command", command: HOOK_COMMANDS.stop, _compound: HOOK_MARKER }],
    },
  ],
};

function loadSettings() {
  if (!existsSync(SETTINGS_PATH)) return {};
  return JSON.parse(readFileSync(SETTINGS_PATH, "utf-8"));
}

function saveSettings(s) {
  mkdirSync(dirname(SETTINGS_PATH), { recursive: true });
  writeFileSync(SETTINGS_PATH, JSON.stringify(s, null, 2) + "\n");
}

function ensureTasksLedger() {
  if (existsSync(TASKS_PATH)) return false;
  mkdirSync(dirname(TASKS_PATH), { recursive: true });
  writeFileSync(
    TASKS_PATH,
    JSON.stringify(
      { version: "1", schema_url: ".agents/PROTOCOL.md", current: null, tasks: [], agents_active: [], log: [] },
      null,
      2
    ) + "\n"
  );
  return true;
}

export function mergeHooks(existing, incoming) {
  const out = { ...existing };
  for (const [event, configs] of Object.entries(incoming)) {
    if (!Array.isArray(out[event])) out[event] = [];
    for (const cfg of configs) {
      const idx = out[event].findIndex(
        (e) =>
          Array.isArray(e.hooks) &&
          e.hooks.some((h) => h._compound === HOOK_MARKER) &&
          e.matcher === cfg.matcher
      );
      if (idx >= 0) out[event][idx] = cfg;
      else out[event].push(cfg);
    }
  }
  return out;
}

function main() {
  const created = ensureTasksLedger();
  const settings = loadSettings();
  const before = JSON.stringify(settings.hooks || {});
  settings.hooks = mergeHooks(settings.hooks || {}, HOOKS_TO_INSTALL);
  const changed = JSON.stringify(settings.hooks) !== before;
  if (changed) saveSettings(settings);
  const mode = process.env.COMPOUND_MODE || (process.env.COMPOUND_ENFORCE === "1" ? "enforce" : "warn");
  try {
    appendEvent({
      logPath: eventLogPathFromLedgerPath(TASKS_PATH),
      event: "activate",
      command: "activate.mjs",
      result: { status: "ok" },
      context: {
        created_ledger: created,
        hooks_changed: changed,
        hook_events: Object.keys(HOOKS_TO_INSTALL),
        compliance_mode: mode,
      },
    });
  } catch {
    // Observability must never block activation.
  }
  console.log("Compound Protocol — activation");
  console.log("  Settings: " + SETTINGS_PATH);
  console.log("  Tasks ledger: " + TASKS_PATH + (created ? " (created)" : " (already present)"));
  console.log("  Hooks: " + (changed ? "installed/updated" : "already up to date"));
  console.log("");
  console.log("Installed hooks:");
  for (const ev of Object.keys(HOOKS_TO_INSTALL)) console.log(`  - ${ev}: node .agents/task.mjs hook ...`);
  console.log("");
  console.log("Compliance level: " + mode.toUpperCase());
  console.log("Observe: log only; Warn: warn but do not block; Enforce: block invalid state-changing actions.");
  console.log("To enable enforcement (POSIX): export COMPOUND_MODE=enforce");
  console.log("To enable enforcement (PowerShell): $env:COMPOUND_MODE = 'enforce'");
  console.log("Recommended switch point: after the first smoke test passes, before unattended execution.");
  console.log("");
  printFirstSessionWizard({ complianceMode: mode });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
