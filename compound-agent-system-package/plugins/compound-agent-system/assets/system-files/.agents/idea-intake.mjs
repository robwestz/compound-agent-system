#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { scanMarkdown } from "./check-output-quality.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = process.cwd();
const ledgerPath = process.env.COMPOUND_TASKS_PATH || join(repoRoot, ".agents", "TASKS.json");
const templateRoot = join(here, "templates");

function parseArgs(argv) {
  const args = { mode: "dry-run", ai: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input") args.input = argv[++i];
    else if (arg === "--dry-run") args.mode = "dry-run";
    else if (arg === "--apply") args.mode = "apply";
    else if (arg === "--ai") args.ai = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function loadLedger() {
  if (!existsSync(ledgerPath)) return { version: "1", schema_url: ".agents/PROTOCOL.md", current: null, tasks: [], agents_active: [], agent_profiles: {}, log: [] };
  const ledger = JSON.parse(readFileSync(ledgerPath, "utf-8"));
  if (!Array.isArray(ledger.tasks)) ledger.tasks = [];
  if (!Array.isArray(ledger.log)) ledger.log = [];
  if (!Array.isArray(ledger.agents_active)) ledger.agents_active = [];
  return ledger;
}

function saveLedger(ledger) {
  mkdirSync(dirname(ledgerPath), { recursive: true });
  const tmp = `${ledgerPath}.tmp`;
  writeFileSync(tmp, JSON.stringify(ledger, null, 2) + "\n");
  renameSync(tmp, ledgerPath);
}

function nextId(ledger) {
  let max = 0;
  for (const task of ledger.tasks) {
    const match = /^t-(\d+)$/.exec(task.id || "");
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `t-${String(max + 1).padStart(3, "0")}`;
}

function summarizeIdea(idea) {
  const first = idea.split(/\n+/).map((line) => line.replace(/^#+\s*/, "").trim()).find(Boolean) || "Untitled idea";
  return first.length > 180 ? `${first.slice(0, 177)}...` : first;
}

function makeBlockers(idea) {
  const lower = idea.toLowerCase();
  const blockers = [
    {
      decision: "Initial delivery surface",
      question: "Should the first version be CLI-only, browser UI, or both?",
      "why-it-matters": "The surface controls setup cost, testing strategy, and how quickly the idea becomes usable.",
      "recommended-default": lower.includes("browser") ? "Browser UI plus CLI smoke command." : "CLI-only golden path first.",
      "consequence-of-default": "Fastest deterministic implementation path with low setup risk.",
      "consequence-of-alternative": "Broader UX coverage but more scaffolding before value is proven.",
      "proceed-without-user": true,
    },
    {
      decision: "Persistence model",
      question: "Where should durable project state live?",
      "why-it-matters": "State location affects resume, audit, and handoff safety.",
      "recommended-default": "Repo-local JSON and Markdown artifacts under a planning directory.",
      "consequence-of-default": "Portable, reviewable state that works without services.",
      "consequence-of-alternative": "External storage can scale later but introduces credentials and migrations.",
      "proceed-without-user": true,
    },
    {
      decision: "Security boundary",
      question: "Can the agent call external APIs during implementation?",
      "why-it-matters": "Network and secret usage change the threat model and test repeatability.",
      "recommended-default": "No external API calls until the user explicitly provides scope and credentials.",
      "consequence-of-default": "Safe local planning with deterministic tests.",
      "consequence-of-alternative": "Richer discovery but requires secret handling and rate-limit controls.",
      "proceed-without-user": false,
    },
  ];
  return blockers;
}

function renderBlockers(blockers) {
  return blockers.map((blocker) => [
    `### Decision: ${blocker.decision}`,
    "",
    `- question: ${blocker.question}`,
    `- why-it-matters: ${blocker["why-it-matters"]}`,
    `- recommended-default: ${blocker["recommended-default"]}`,
    `- consequence-of-default: ${blocker["consequence-of-default"]}`,
    `- consequence-of-alternative: ${blocker["consequence-of-alternative"]}`,
    `- proceed-without-user: ${blocker["proceed-without-user"]}`,
  ].join("\n")).join("\n\n");
}

function roleMarkdown() {
  return [
    "- planner: Owns Phase 0 regrounding, GAP SCAN, decisions, and phase plan.",
    "- executor: Starts implementation only after blockers marked no-proceed are resolved.",
    "- reviewer: Checks scope, output quality, security boundaries, and regression risk.",
    "- verifier: Runs DoD commands, imports PHASE_PLAN.md, and records verification evidence.",
  ].join("\n");
}

function template(name) {
  return readFileSync(join(templateRoot, name), "utf-8");
}

function renderArtifacts(idea) {
  const summary = summarizeIdea(idea);
  const blockers = makeBlockers(idea);
  const blockersMd = renderBlockers(blockers);
  const roles = roleMarkdown();
  const questions = blockers.map((b) => `- ${b.question} Recommended default: ${b["recommended-default"]} Proceed without user: ${b["proceed-without-user"]}.`).join("\n");
  const decisions = blockers.map((b) => `- ${b.decision}: ${b["recommended-default"]} (proceed-without-user: ${b["proceed-without-user"]})`).join("\n");
  const replacements = {
    "{{IDEA}}": idea.trim(),
    "{{SUMMARY}}": summary,
    "{{BLOCKERS}}": blockersMd,
    "{{ROLES}}": roles,
    "{{QUESTIONS}}": questions,
    "{{DECISIONS}}": decisions,
  };
  const names = ["PROJECT_BRIEF.md", "GAP_SCAN.md", "DECISIONS.md", "PHASE_PLAN.md", "OPEN_QUESTIONS.md", "AGENT_ROLES.md", "DOD_MATRIX.md"];
  const artifacts = {};
  for (const name of names) {
    let body = template(name);
    for (const [needle, value] of Object.entries(replacements)) body = body.replaceAll(needle, value);
    artifacts[name] = body;
  }
  return { summary, blockers, artifacts };
}

function createIntakeTask(ledger, idea, rendered) {
  const id = nextId(ledger);
  return {
    id,
    goal: `Idea intake and Phase 0 planning: ${rendered.summary}`,
    state: "in_progress",
    dod: [
      { check: "artifact", path: "phase-0/GAP_SCAN.md", passed_at: null },
      { check: "artifact", path: "phase-0/PHASE_PLAN.md", passed_at: null },
      { check: "test", command: "node .agents/check-output-quality.mjs phase-0/GAP_SCAN.md phase-0/PHASE_PLAN.md", passed_at: null },
    ],
    skills: ["planner", "gap-scan", "compound-agent-system"],
    blocked_by: rendered.blockers.filter((b) => !b["proceed-without-user"]).map((b) => b.question),
    unlock_command: "Answer no-proceed blocker questions or explicitly accept recommended defaults.",
    park_reason: null,
    parent: null,
    agent: process.env.COMPOUND_AGENT_ID || ledger.agents_active?.at?.(-1) || null,
    context: { original_idea: idea, gap_scan: { blockers: rendered.blockers } },
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function verifyArtifacts(artifacts) {
  const issues = [];
  for (const [name, content] of Object.entries(artifacts)) {
    issues.push(...scanMarkdown(content, { file: name }).issues);
  }
  return issues;
}

async function maybeAi(args) {
  if (!args.ai) return null;
  try {
    const mod = await import(resolve(repoRoot, "llm-client.mjs"));
    return Boolean(mod.LLMClient);
  } catch {
    return null;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input) {
    console.log("Usage: node .agents/idea-intake.mjs --input <file> [--dry-run|--apply] [--ai]");
    process.exit(args.help ? 0 : 1);
  }
  const input = resolve(repoRoot, args.input);
  const idea = readFileSync(input, "utf-8");
  await maybeAi(args);
  const ledger = loadLedger();
  const rendered = renderArtifacts(idea);
  const task = createIntakeTask(ledger, idea, rendered);
  const issues = verifyArtifacts(rendered.artifacts);
  if (issues.length) {
    console.error(JSON.stringify({ ok: false, error: "output-quality", issues }, null, 2));
    process.exit(1);
  }

  const output = { ok: true, mode: args.mode, task, blockers: rendered.blockers, artifacts: Object.keys(rendered.artifacts).map((name) => `phase-0/${name}`) };
  if (args.mode === "apply") {
    const dir = join(repoRoot, "phase-0");
    mkdirSync(dir, { recursive: true });
    for (const [name, content] of Object.entries(rendered.artifacts)) writeFileSync(join(dir, name), content);
    ledger.tasks.push(task);
    ledger.current = task.id;
    ledger.log.push({ ts: new Date().toISOString(), event: "idea-intake", task: task.id, agent: task.agent, source: args.input });
    saveLedger(ledger);
  }
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
