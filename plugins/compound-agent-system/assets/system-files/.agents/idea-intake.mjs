#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { scanMarkdown } from "./check-output-quality.mjs";
import { scanPlanningQuality } from "./check-planning-quality.mjs";

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

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

const MANUAL_APPROVAL_MATRIX = [
  {
    category: "secrets",
    decision: "Secrets and credentials",
    policy: "must-ask",
    default: "Do not read, request, paste, export, or store credentials.",
    unlock: "User provides the credential through an approved secret channel, states session/permanent scope, and confirms the exact command that may use it.",
  },
  {
    category: "network",
    decision: "Network access",
    policy: "must-ask",
    default: "Stay local and use committed fixtures or dry-run output.",
    unlock: "User approves destination, purpose, data sent, expected cost/quota impact, and retry limit.",
  },
  {
    category: "destructive-git",
    decision: "Destructive git operations",
    policy: "must-ask",
    default: "Use read-only git inspection and non-destructive commits on an owned branch.",
    unlock: "User names the exact destructive git command or branch/history rewrite and acknowledges the affected refs.",
  },
  {
    category: "overwrite",
    decision: "Overwriting existing files",
    policy: "must-ask",
    default: "Refuse overwrite and write a plan/diff or backup-preserving alternative.",
    unlock: "User approves the specific paths to overwrite after reviewing the diff or install plan.",
  },
  {
    category: "uninstall",
    decision: "Uninstall or rollback",
    policy: "must-ask",
    default: "Inspect rollback/uninstall manifest only; do not remove files.",
    unlock: "User confirms the manifest, changed-file handling, and target workspace before removal.",
  },
  {
    category: "external-apis",
    decision: "External API calls",
    policy: "must-ask",
    default: "Use deterministic local ranking, cached examples, or mock responses.",
    unlock: "User approves provider, endpoint scope, credential source, rate/cost limit, and data-sharing boundary.",
  },
  {
    category: "multi-agent-spawning",
    decision: "Multi-agent spawning",
    policy: "must-ask",
    default: "Export a static role plan only; do not spawn agents.",
    unlock: "User approves the spawn count, roles, task split, merge owner, and stop condition.",
  },
];

function quote(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function titleFromIdea(idea, summary) {
  const heading = idea.split("\n").map((line) => /^#\s+(.+?)\s*$/.exec(line)?.[1]?.trim()).find(Boolean);
  return heading || summary;
}

function extractFeatures(idea) {
  const features = [];
  for (const line of idea.replace(/\r\n/g, "\n").split("\n")) {
    const match = /^\s*(?:[-*]|\d+\.)\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const text = match[1].replace(/^[A-Z][A-Za-z ]+:\s*/, "").trim();
    if (text.length > 8 && !/^should\b/i.test(text)) features.push(text.replace(/\.$/, ""));
  }
  return features.slice(0, 6);
}

function analyzeIdea(idea) {
  const lower = idea.toLowerCase();
  const summary = summarizeIdea(idea);
  const features = extractFeatures(idea);
  const surfaces = [];
  if (includesAny(lower, ["cli", "command", "script", "terminal", "local-first", "local files", "deterministic"])) surfaces.push("CLI");
  if (includesAny(lower, ["browser", "dashboard", "frontend"]) || /\bui\b/.test(lower)) surfaces.push("browser UI");
  if (includesAny(lower, ["api", "endpoint", "feed", "rest", "rss", "csv", "source"])) surfaces.push("API/data workflow");
  if (includesAny(lower, ["library", "sdk", "package", "module"])) surfaces.push("library");
  if (includesAny(lower, ["workflow", "planning", "review", "triage"])) surfaces.push("workflow");
  if (!surfaces.length) surfaces.push("CLI");
  const dataNeeds = includesAny(lower, ["data", "dataset", "registry", "storage", "state", "manifest", "provenance", "record", "field"]);
  const integrationNeeds = includesAny(lower, ["api", "external", "source", "feed", "rss", "csv", "auth", "authenticated", "paginated", "network"]);
  const securityNeeds = includesAny(lower, ["secret", "credential", "auth", "token", "license", "licensing", "network", "external api"]);
  const verificationNeeds = includesAny(lower, ["test", "verify", "quality", "scoring", "review", "deterministic", "reusable"]);
  return { idea, lower, summary, title: titleFromIdea(idea, summary), features, surfaces: unique(surfaces), dataNeeds, integrationNeeds, securityNeeds, verificationNeeds, isLongBrief: idea.split(/\n/).length > 12 || features.length >= 4 };
}

function approvalMatrixBlock() {
  return MANUAL_APPROVAL_MATRIX.map((item) => [
    `### Decision: ${item.decision}`,
    "",
    `- question: Is ${item.category} approved for this task?`,
    `- why-it-matters: ${item.decision} changes trust, reversibility, or cost boundaries.`,
    "- priority: critical",
    "- reversibility: costly",
    `- approval-policy: ${item.policy}`,
    `- recommended-default: ${item.default}`,
    "- rationale: Premium autonomy stays bounded unless a human explicitly expands scope.",
    `- unlock-condition: ${item.unlock}`,
    `- consequence-of-default: The agent can continue read-only inspection, local planning, dry-runs, and fixture-backed tests without this approval.`,
    "- consequence-of-alternative: The approved risky action may proceed only within the approved scope and must be recorded in the ledger or task report.",
    "- proceed-without-user: false",
  ].join("\n")).join("\n\n");
}

function makeBlockers(analysis) {
  const blockers = [
    {
      decision: "Initial delivery surface",
      question: "Should the first version be CLI-only, browser UI, or both?",
      "why-it-matters": "The surface controls setup cost, testing strategy, and how quickly the idea becomes usable.",
      "recommended-default": analysis.surfaces.includes("browser UI") ? "Browser UI backed by a CLI smoke command." : "CLI-only golden path first.",
      "consequence-of-default": "Fastest deterministic implementation path with low setup risk.",
      "consequence-of-alternative": "Broader UX coverage but more scaffolding before value is proven.",
      priority: "important",
      reversibility: "reversible",
      "proceed-policy": "proceed-with-default",
      rationale: "The first surface can be expanded after the runnable slice proves value.",
      "unlock-condition": "User overrides the default surface or accepts the generated first vertical slice.",
      "proceed-without-user": true,
    },
    {
      decision: "Persistence model",
      question: "Where should durable project state live?",
      "why-it-matters": "State location affects resume, audit, and handoff safety.",
      "recommended-default": analysis.dataNeeds ? "Repo-local JSON/Markdown manifests with explicit provenance fields." : "Repo-local Markdown artifacts under a planning directory.",
      "consequence-of-default": "Portable, reviewable state that works without services.",
      "consequence-of-alternative": "External storage can scale later but introduces credentials and migrations.",
      priority: analysis.dataNeeds ? "critical" : "important",
      reversibility: "costly",
      "proceed-policy": "proceed-with-default",
      rationale: "Local artifacts keep Phase 0 importable and avoid database setup before the slice is known.",
      "unlock-condition": "Proceed with local artifacts until the user requests shared storage.",
      "proceed-without-user": true,
    },
    {
      decision: "Security boundary",
      question: "Can the agent call external APIs during implementation?",
      "why-it-matters": "Secrets, network, destructive git, overwrites, uninstall, external APIs, and multi-agent spawning change the threat model and test repeatability.",
      "recommended-default": "No must-ask action is approved; continue with read-only inspection, local planning, dry-runs, fixtures, and static role exports.",
      "consequence-of-default": "Safe local planning with deterministic tests while risky actions stay blocked.",
      "consequence-of-alternative": "Broader autonomy but only inside explicitly approved scope, cost, credentials, paths, and stop conditions.",
      priority: analysis.integrationNeeds || analysis.securityNeeds ? "critical" : "defer",
      reversibility: "costly",
      "proceed-policy": analysis.integrationNeeds || analysis.securityNeeds ? "must-ask" : "defer",
      rationale: "Must-ask actions can leak intent, consume quota, remove work, overwrite user files, or spawn unbounded agents.",
      "unlock-condition": "User explicitly approves the relevant approval category from docs/manual-approval-boundaries.md.",
      "proceed-without-user": false,
    },
  ];
  if (includesAny(analysis.lower, ["license", "licensing", "reusable", "dataset", "public data"])) {
    blockers.push({
      decision: "Reuse and licensing threshold",
      question: "What licensing evidence is required before generated data artifacts are reusable?",
      "why-it-matters": "Reuse rules prevent plans from treating uncertain public data as safe production input.",
      "recommended-default": "Treat unknown licensing as non-reusable until a manual review records the source license.",
      "consequence-of-default": "Safe provenance-first output with slower promotion to reusable datasets.",
      "consequence-of-alternative": "Faster reuse but higher legal and trust risk.",
      priority: "important",
      reversibility: "costly",
      "proceed-policy": "proceed-with-default",
      rationale: "The default preserves progress while keeping risky reuse blocked.",
      "unlock-condition": "User supplies a licensing policy or accepts manual review as a DoD check.",
      "proceed-without-user": true,
    });
  }
  return blockers;
}

function renderBlockers(blockers) {
  return blockers.map((blocker) => [
    `### Decision: ${blocker.decision}`,
    "",
    `- question: ${blocker.question}`,
    `- why-it-matters: ${blocker["why-it-matters"]}`,
    `- priority: ${blocker.priority}`,
    `- reversibility: ${blocker.reversibility}`,
    `- proceed-policy: ${blocker["proceed-policy"]}`,
    `- recommended-default: ${blocker["recommended-default"]}`,
    `- rationale: ${blocker.rationale}`,
    `- unlock-condition: ${blocker["unlock-condition"]}`,
    `- consequence-of-default: ${blocker["consequence-of-default"]}`,
    `- consequence-of-alternative: ${blocker["consequence-of-alternative"]}`,
    `- proceed-without-user: ${blocker["proceed-without-user"]}`,
  ].join("\n")).join("\n\n");
}

function firstVerticalSlice(analysis) {
  if (analysis.isLongBrief && analysis.dataNeeds) {
    return {
      title: "local source-to-dataset manifest proof",
      description: "A local CLI run records one candidate source, captures provenance and licensing status, and exports a dataset manifest without calling external APIs.",
      proof: "node scripts/smoke-source-manifest.mjs fixtures/sample-source.json",
      phase: "phase-2-local-source-to-dataset-slice",
      rationale: "It proves discovery, registry, provenance, export, and review boundaries without building a full ingestion engine.",
    };
  }
  if (analysis.surfaces.includes("browser UI")) {
    return { title: "single-screen browser workflow proof", description: "A minimal screen accepts one project input and produces one reviewable planning artifact.", proof: "npm run build && npm test", phase: "phase-2-browser-workflow-slice", rationale: "It validates the user-facing surface before deeper workflow automation." };
  }
  if (analysis.dataNeeds || analysis.integrationNeeds) {
    return { title: "CLI data-source planning proof", description: "A CLI command accepts one source idea and emits a reusable dataset definition stub with provenance placeholders.", proof: "node scripts/smoke-data-source-plan.mjs fixtures/sample-source.md", phase: "phase-2-cli-data-source-slice", rationale: "It is the smallest inspectable proof of source discovery becoming a reusable artifact." };
  }
  return { title: "CLI planning proof", description: "A CLI command converts the idea into one reviewable artifact and one executable verification command.", proof: "node scripts/smoke-plan.mjs fixtures/example.md", phase: "phase-2-cli-planning-slice", rationale: "It proves the project can produce value before adding additional surfaces." };
}

function phase(id, name, goal, roles, dod, artifacts, proceedWithoutUser, skills) {
  return { id, name, goal, roles, dod, artifacts, proceedWithoutUser, skills };
}

function makePhases(analysis, slice) {
  const phases = [
    phase("phase-1-scope-decisions", `${analysis.surfaces[0]} scope and decision lock`, `Convert "${analysis.summary}" into accepted scope, defaults, and no-proceed boundaries.`, { planner: "lead planner", executor: "planning executor", reviewer: "scope reviewer", verifier: "DoD verifier" }, [{ check: "artifact", path: "phase-0/DECISIONS.md" }, { check: "manual", description: "Blocking_now questions have an owner, default, or explicit escalation path" }], ["DECISIONS.md", "OPEN_QUESTIONS.md"], true, ["planner", "gap-scan"]),
    phase(slice.phase, slice.title, `${slice.description} This is the first_vertical_slice.`, { planner: "slice planner", executor: "vertical-slice builder", reviewer: "slice reviewer", verifier: "smoke-test verifier" }, [{ check: "artifact", path: "docs/first-vertical-slice.md" }, { check: "test", command: slice.proof }], ["docs/first-vertical-slice.md", "fixtures/sample-input"], true, ["executor", "verifier"]),
  ];
  if (analysis.dataNeeds) {
    phases.push(phase(analysis.isLongBrief ? "phase-3-adapter-registry-provenance" : "phase-3-data-definition-model", analysis.isLongBrief ? "adapter registry and provenance model" : "data definition model", analysis.isLongBrief ? "Define source, adapter, pagination, authentication, normalization, and provenance records for candidate public data sources." : "Define the minimal reusable dataset/source manifest the API engine can create and verify.", { planner: "data planner", executor: "data-model executor", reviewer: "provenance reviewer", verifier: "schema verifier" }, [{ check: "artifact", path: "docs/data-model.md" }, { check: "test", command: "node --test tests/data-model.test.mjs" }], ["docs/data-model.md", "schemas/source-manifest.json"], true, ["executor", "reviewer"]));
  }
  if (analysis.integrationNeeds || analysis.securityNeeds) {
    phases.push(phase("phase-4-integration-risk-boundary", "external integration and risk boundary", "Specify network, secret, licensing, rate-limit, and manual-review boundaries before any external source calls are implemented.", { planner: "risk planner", executor: "boundary executor", reviewer: "security reviewer", verifier: "policy verifier" }, [{ check: "artifact", path: "docs/integration-boundary.md" }, { check: "manual", description: "User-approved policy exists before external calls or credentials are used" }], ["docs/integration-boundary.md", "docs/secret-handling.md"], false, ["reviewer", "verifier"]));
  } else if (analysis.surfaces.includes("browser UI")) {
    phases.push(phase("phase-3-browser-user-workflow", "browser user workflow", "Turn the first slice into a reviewable browser workflow with deterministic fixture data.", { planner: "UX planner", executor: "frontend executor", reviewer: "UX reviewer", verifier: "browser verifier" }, [{ check: "artifact", path: "docs/browser-workflow.md" }, { check: "test", command: "npm test" }], ["docs/browser-workflow.md"], true, ["executor", "reviewer"]));
  }
  if (analysis.verificationNeeds || analysis.isLongBrief) {
    phases.push(phase("phase-5-quality-verification", analysis.isLongBrief ? "quality scoring and export verification" : "quality verification", analysis.isLongBrief ? "Verify quality scoring, stale documentation flags, sparse-record handling, and export readiness against deterministic fixtures." : "Verify the generated artifact against deterministic tests and documented DoD.", { planner: "verification planner", executor: "test executor", reviewer: "quality reviewer", verifier: "release verifier" }, [{ check: "test", command: "node --test tests/*.test.mjs" }, { check: "artifact", path: "docs/verification-report.md" }], ["docs/verification-report.md"], true, ["reviewer", "verifier"]));
  }
  phases.push(phase("phase-final-handoff-readiness", "handoff and long-session readiness", "Record handoff checkpoints, readiness status, open decisions, and the next safe autonomous action.", { planner: "handoff planner", executor: "checkpoint executor", reviewer: "handoff reviewer", verifier: "readiness verifier" }, [{ check: "artifact", path: "HANDOFF.md" }, { check: "manual", description: "Readiness report lists blockers, pending questions, and next action" }], ["HANDOFF.md", ".agents/checkpoints/latest.json"], true, ["planner", "verifier"]));
  return phases.slice(0, 6);
}

function roleMarkdown(phases) {
  const machine = phases.map((p) => ({
    schema: "compound-role-map-phase.v1",
    phase_id: p.id,
    task_ids: [p.id],
    expected_artifacts: p.artifacts,
    handoff_condition: `${p.id} DoD is recorded, blockers are updated, and the next agent can resume from ${p.artifacts[0]}.`,
    autonomy_level: p.proceedWithoutUser ? "autonomous-with-defaults" : "requires-user-approval",
    spawn_policy: "static-export-only",
    roles: [
      roleAssignment("planner", p.roles.planner, p),
      roleAssignment("executor", p.roles.executor, p),
      roleAssignment("reviewer", p.roles.reviewer, p),
      roleAssignment("verifier", p.roles.verifier, p),
    ],
  }));
  return ["- planner: Owns Phase 0 regrounding, GAP SCAN, decisions, and phase plan.", "- executor: Starts implementation only after blockers marked no-proceed are resolved.", "- reviewer: Checks scope, output quality, security boundaries, and regression risk.", "- verifier: Runs DoD commands, imports PHASE_PLAN.md, and records verification evidence.", "- spawn_policy: static-export-only; no agents are spawned unless a human explicitly approves execution.", "", "## Phase role map", "", "```json", JSON.stringify(machine, null, 2), "```", "", "Export with `node .agents/role-plan.mjs phase-0/AGENT_ROLES.md` to produce an auditable batch assignment plan."].join("\n");
}

function roleSummary(phases) {
  return [
    "- planner: Owns Phase 0 regrounding, GAP SCAN, decisions, and phase plan.",
    "- executor: Starts implementation only after blockers marked no-proceed are resolved.",
    "- reviewer: Checks scope, output quality, security boundaries, and regression risk.",
    "- verifier: Runs DoD commands, imports PHASE_PLAN.md, and records verification evidence.",
    "- spawn_policy: static-export-only; no agents are spawned unless a human explicitly approves execution.",
    "- export: `node .agents/role-plan.mjs phase-0/AGENT_ROLES.md --json` for task IDs, artifacts, autonomy, and handoff conditions.",
    "",
    ...phases.map((p) => `- ${p.id}: planner=${p.roles.planner}; executor=${p.roles.executor}; reviewer=${p.roles.reviewer}; verifier=${p.roles.verifier}; handoff=${p.artifacts[0]}`),
  ].join("\n");
}

function roleAssignment(role, assigneeHint, phaseInfo) {
  const handoff = `${phaseInfo.id} DoD is recorded, blockers are updated, and the next agent can resume from ${phaseInfo.artifacts[0]}.`;
  return {
    role,
    assignee_hint: assigneeHint,
    task_ids: [phaseInfo.id],
    artifacts: phaseInfo.artifacts,
    autonomy_level: phaseInfo.proceedWithoutUser ? "autonomous-with-defaults" : "requires-user-approval",
    handoff_condition: handoff,
  };
}

function template(name) {
  return readFileSync(join(templateRoot, name), "utf-8");
}

function renderPhaseFrontmatter(phases) {
  const lines = ["---", "compound: active", "phases:"];
  for (const p of phases) {
    lines.push(`  - id: ${p.id}`);
    lines.push(`    goal: "${quote(p.goal)}"`);
    lines.push("    dod:");
    for (const d of p.dod) {
      lines.push(`      - check: ${d.check}`);
      if (d.command) lines.push(`        command: "${quote(d.command)}"`);
      if (d.path) lines.push(`        path: "${quote(d.path)}"`);
      if (d.description) lines.push(`        description: "${quote(d.description)}"`);
    }
    lines.push("    skills:");
    for (const skill of p.skills) lines.push(`      - "${quote(skill)}"`);
  }
  lines.push("---");
  return lines.join("\n");
}

function renderPhaseMarkers(phases) {
  return phases.map((p) => {
    const dod = p.dod.map((d) => {
      if (d.check === "test") return `test:${d.command}`;
      if (d.check === "artifact") return `artifact:${d.path}`;
      return `manual:${d.description}`;
    }).join(";");
    return `[COMPOUND-PHASE id=${p.id} goal="${quote(p.goal)}" dod="${quote(dod)}" skills="${quote(p.skills.join(";"))}"]`;
  }).join("\n");
}

function renderPhaseSummary(phases) {
  return phases.map((p) => [
    `### ${p.name}`,
    "",
    `- phase_id: ${p.id}`,
    `- goal: ${p.goal}`,
    `- proceed_without_user: ${p.proceedWithoutUser}`,
    `- expected_artifacts: ${p.artifacts.join(", ")}`,
    `- role_owner_planner: ${p.roles.planner}`,
    `- role_owner_executor: ${p.roles.executor}`,
    `- role_owner_reviewer: ${p.roles.reviewer}`,
    `- role_owner_verifier: ${p.roles.verifier}`,
    "- dod_checks:",
    ...p.dod.map((d) => `  - ${d.check}: ${d.command || d.path || d.description}`),
  ].join("\n")).join("\n\n");
}

function renderQuestions(blockers, kind) {
  const selected = blockers.filter((b) => {
    if (kind === "blocking_now") return b["proceed-policy"] === "must-ask";
    if (kind === "can_default") return b["proceed-policy"] === "proceed-with-default";
    return b["proceed-policy"] === "defer";
  });
  if (!selected.length) return "- None.";
  return selected.map((b) => `- ${b.question} Default: ${b["recommended-default"]}. Unlock: ${b["unlock-condition"]}.`).join("\n");
}

function renderDecisions(blockers) {
  return blockers.map((b) => `- ${b.decision}: ${b["recommended-default"]} (priority: ${b.priority}; reversibility: ${b.reversibility}; proceed-policy: ${b["proceed-policy"]}; unlock: ${b["unlock-condition"]})`).join("\n");
}

function renderDodMatrix(phases, slice) {
  return [
    "- Intake task exists in `.agents/TASKS.json`.",
    "- GAP SCAN has recommended defaults, priority, reversibility, proceed policy, rationale, and unlock condition.",
    "- PHASE_PLAN.md has [COMPOUND-PHASE] markers.",
    `- First vertical slice is verified by: ${slice.proof}.`,
    ...phases.map((p) => `- ${p.id}: ${p.dod.map((d) => `${d.check}:${d.command || d.path || d.description}`).join("; ")}`),
    "- Generated markdown passes `.agents/check-output-quality.mjs`.",
    "- Generated plan passes `.agents/check-planning-quality.mjs`.",
  ].join("\n");
}

function renderArtifacts(idea) {
  const analysis = analyzeIdea(idea);
  const blockers = makeBlockers(analysis);
  const slice = firstVerticalSlice(analysis);
  const phases = makePhases(analysis, slice);
  const blockersMd = renderBlockers(blockers);
  const roles = roleMarkdown(phases);
  const replacements = {
    "{{IDEA}}": idea.trim(),
    "{{SUMMARY}}": analysis.summary,
    "{{TITLE}}": analysis.title,
    "{{BLOCKERS}}": blockersMd,
    "{{APPROVAL_MATRIX}}": approvalMatrixBlock(),
    "{{ROLES}}": roleSummary(phases),
    "{{BLOCKING_NOW}}": renderQuestions(blockers, "blocking_now"),
    "{{CAN_DEFAULT}}": renderQuestions(blockers, "can_default"),
    "{{DEFER}}": renderQuestions(blockers, "defer"),
    "{{DECISIONS}}": renderDecisions(blockers),
    "{{PHASE_FRONTMATTER}}": renderPhaseFrontmatter(phases),
    "{{PHASE_MARKERS}}": renderPhaseMarkers(phases),
    "{{PHASE_SUMMARY}}": renderPhaseSummary(phases),
    "{{DOD_MATRIX}}": renderDodMatrix(phases, slice),
    "{{FIRST_VERTICAL_SLICE_TITLE}}": slice.title,
    "{{FIRST_VERTICAL_SLICE_DESCRIPTION}}": slice.description,
    "{{FIRST_VERTICAL_SLICE_RATIONALE}}": slice.rationale,
    "{{FIRST_VERTICAL_SLICE_PROOF}}": slice.proof,
    "{{FIRST_VERTICAL_SLICE_PHASE}}": slice.phase,
  };
  const names = ["PROJECT_BRIEF.md", "GAP_SCAN.md", "DECISIONS.md", "PHASE_PLAN.md", "OPEN_QUESTIONS.md", "AGENT_ROLES.md", "DOD_MATRIX.md"];
  const artifacts = {};
  for (const name of names) {
    let body = template(name);
    if (name === "AGENT_ROLES.md") body = body.replaceAll("{{ROLES}}", roles);
    for (const [needle, value] of Object.entries(replacements)) body = body.replaceAll(needle, value);
    artifacts[name] = body;
  }
  return { summary: analysis.summary, blockers, artifacts, phases, first_vertical_slice: slice };
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
    approval_policy: rendered.blockers.some((b) => b["proceed-policy"] === "must-ask") ? "must-ask" : "defaultable",
    approval_category: "external-apis",
    approval_state: rendered.blockers.some((b) => b["proceed-policy"] === "must-ask") ? "pending-human-approval" : "default-available",
    park_reason: null,
    parent: null,
    agent: process.env.COMPOUND_AGENT_ID || ledger.agents_active?.at?.(-1) || null,
    context: { original_idea: idea, gap_scan: { blockers: rendered.blockers }, first_vertical_slice: rendered.first_vertical_slice, phases: rendered.phases.map((p) => p.id) },
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function verifyArtifacts(artifacts) {
  const issues = [];
  for (const [name, content] of Object.entries(artifacts)) {
    if (name === "AGENT_ROLES.md") continue;
    issues.push(...scanMarkdown(content, { file: name }).issues);
  }
  issues.push(...scanPlanningQuality([
    { file: "PHASE_PLAN.md", content: artifacts["PHASE_PLAN.md"] },
    { file: "GAP_SCAN.md", content: artifacts["GAP_SCAN.md"] },
  ]).issues.map((issue) => ({ ...issue, file: issue.file || "planning-quality" })));
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
