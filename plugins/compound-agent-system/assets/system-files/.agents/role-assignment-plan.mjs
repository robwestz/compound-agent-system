#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_ROLES = ["planner", "executor", "reviewer", "verifier"];
const DEFAULT_INPUT = "phase-0/AGENT_ROLES.md";

function parseArgs(argv) {
  const args = { input: DEFAULT_INPUT, out: null, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input") args.input = argv[++i];
    else if (arg === "--out") args.out = argv[++i];
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return [
    "Usage: node .agents/role-assignment-plan.mjs [--input phase-0/AGENT_ROLES.md] [--out phase-0/BATCH_ASSIGNMENT_PLAN.json]",
    "",
    "Exports planner/executor/reviewer/verifier role maps as a static batch assignment plan.",
    "The core exporter writes JSON only; it never spawns agents or starts multi-agent execution.",
  ].join("\n");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function extractRoleMapJson(content, inputPath) {
  const trimmed = content.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) return JSON.parse(trimmed);
  const match = /```json\s*([\s\S]+?)\s*```/.exec(content);
  if (!match) throw new Error(`${inputPath} does not contain a fenced json role map`);
  return JSON.parse(match[1]);
}

function normalizeRoleMap(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.role_map)) return parsed.role_map;
  if (Array.isArray(parsed.phases)) return parsed.phases;
  throw new Error("role map must be a JSON array or an object with role_map/phases array");
}

function validateRoleMap(phases) {
  const issues = [];
  if (!phases.length) issues.push("role map must include at least one phase");
  phases.forEach((phase, index) => {
    const label = phase.phase_id || phase.task_id || `index ${index}`;
    const taskId = phase.task_id || phase.phase_id;
    if (!taskId || typeof taskId !== "string") issues.push(`${label}: missing task_id or phase_id`);
    for (const role of REQUIRED_ROLES) {
      if (!phase[role] || typeof phase[role] !== "string") issues.push(`${label}: missing required role "${role}"`);
    }
    if (!Array.isArray(phase.expected_artifacts) || !phase.expected_artifacts.length) issues.push(`${label}: expected_artifacts must be a non-empty array`);
    if (!phase.handoff_condition || typeof phase.handoff_condition !== "string") issues.push(`${label}: missing handoff_condition`);
    if (!phase.autonomy_level || typeof phase.autonomy_level !== "string") issues.push(`${label}: missing autonomy_level`);
  });
  return issues;
}

function aggregateAutonomy(assignments) {
  const levels = unique(assignments.map((assignment) => assignment.autonomy_level));
  return levels.length === 1 ? levels[0] : "mixed";
}

export function buildRoleAssignmentPlan(roleMap, options = {}) {
  const phases = normalizeRoleMap(roleMap);
  const issues = validateRoleMap(phases);
  if (issues.length) {
    const error = new Error("role assignment plan export failed validation");
    error.issues = issues;
    throw error;
  }
  const sourceInput = options.input || DEFAULT_INPUT;

  const assignments = [];
  for (const phase of phases) {
    const taskId = phase.task_id || phase.phase_id;
    for (const role of REQUIRED_ROLES) {
      assignments.push({
        assignment_id: `${taskId}:${role}`,
        role,
        assignee_role: phase[role],
        task_ids: [taskId],
        phase_id: phase.phase_id || taskId,
        artifacts: phase.expected_artifacts,
        autonomy_level: phase.autonomy_level,
        handoff_condition: phase.handoff_condition,
        approval_required_before_execution: true,
      });
    }
  }

  const roles = {};
  for (const role of REQUIRED_ROLES) {
    const roleAssignments = assignments.filter((assignment) => assignment.role === role);
    const taskIds = unique(roleAssignments.flatMap((assignment) => assignment.task_ids));
    roles[role] = {
      role,
      task_ids: taskIds,
      artifacts: unique(roleAssignments.flatMap((assignment) => assignment.artifacts)),
      autonomy_level: aggregateAutonomy(roleAssignments),
      handoff_condition: `Complete ${role} assignments for task IDs: ${taskIds.join(", ")}. Preserve each assignment handoff_condition before reassignment.`,
      assignments: roleAssignments.map((assignment) => assignment.assignment_id),
    };
  }

  return {
    schema: "compound-role-assignment-plan.v1",
    generated_at: options.generatedAt || new Date().toISOString(),
    source: {
      input: sourceInput,
      role_map_phases: phases.length,
    },
    execution_mode: "static_plan_export",
    core_behavior: {
      automatic_subagent_spawning: false,
      multi_agent_execution_requires_human_approval: true,
      export_only: true,
    },
    role_order: REQUIRED_ROLES,
    roles,
    assignments,
    audit: [
      `Generated from planner/executor/reviewer/verifier role map at ${sourceInput}.`,
      "Core exporter performed no agent spawning or execution side effects.",
      "Coordinator must obtain explicit human approval before multi-agent execution.",
    ],
  };
}

export function loadRoleMap(path) {
  if (!existsSync(path)) throw new Error(`Input not found: ${path}`);
  return normalizeRoleMap(extractRoleMapJson(readFileSync(path, "utf-8"), path));
}

function writeJsonAtomic(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
  renameSync(tmp, path);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  const input = resolve(args.input);
  const roleMap = loadRoleMap(input);
  const plan = buildRoleAssignmentPlan(roleMap, { input: args.input });
  if (args.out) {
    writeJsonAtomic(resolve(args.out), plan);
    console.log(`Wrote ${args.out}`);
  } else {
    console.log(JSON.stringify(plan, null, 2));
  }
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === thisFile) {
  try {
    main();
  } catch (error) {
    console.error("Role assignment plan export failed.");
    console.error("Why it matters: coordinators need a complete static assignment plan before any multi-agent execution is approved.");
    console.error("Next action: fix the role map so every phase has planner, executor, reviewer, verifier, expected_artifacts, autonomy_level, and handoff_condition.");
    if (Array.isArray(error.issues)) {
      for (const issue of error.issues) console.error(`- ${issue}`);
    } else {
      console.error(`- ${error.message}`);
    }
    process.exit(1);
  }
}
