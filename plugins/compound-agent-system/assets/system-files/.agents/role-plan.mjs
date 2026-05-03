#!/usr/bin/env node
// Export AGENT_ROLES.md into an auditable static assignment plan.
// Zero runtime dependencies. Node 18+.

import { readFileSync } from "node:fs";

const REQUIRED_ROLES = ["planner", "executor", "reviewer", "verifier"];

function usage() {
  return "Usage: role-plan.mjs <phase-0/AGENT_ROLES.md> [--json]";
}

function extractJsonBlock(markdown) {
  const match = /```json\n([\s\S]+?)\n```/.exec(markdown);
  if (!match) throw new Error("AGENT_ROLES.md must contain a fenced json role map.");
  return JSON.parse(match[1]);
}

function normalizeRole(phase, role) {
  const value = Array.isArray(phase.roles) ? phase.roles.find((entry) => entry && entry.role === role) : phase[role];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Phase ${phase.phase_id || "<unknown>"} missing ${role} assignment object.`);
  }
  const taskIds = Array.isArray(value.task_ids) && value.task_ids.length ? value.task_ids : Array.isArray(phase.task_ids) ? phase.task_ids : [];
  const artifacts = Array.isArray(value.artifacts) && value.artifacts.length ? value.artifacts : Array.isArray(phase.expected_artifacts) ? phase.expected_artifacts : [];
  const autonomy = value.autonomy_level || phase.autonomy_level;
  const handoff = value.handoff_condition || phase.handoff_condition;
  if (!taskIds.length) throw new Error(`Phase ${phase.phase_id} ${role} assignment missing task_ids.`);
  if (!artifacts.length) throw new Error(`Phase ${phase.phase_id} ${role} assignment missing artifacts.`);
  if (!autonomy) throw new Error(`Phase ${phase.phase_id} ${role} assignment missing autonomy_level.`);
  if (!handoff) throw new Error(`Phase ${phase.phase_id} ${role} assignment missing handoff_condition.`);
  return {
    role,
    assignee_hint: value.assignee_hint || value.assignee || "unassigned",
    task_ids: taskIds,
    artifacts,
    autonomy_level: autonomy,
    handoff_condition: handoff,
  };
}

export function exportRolePlan(markdown) {
  const phases = extractJsonBlock(markdown);
  if (!Array.isArray(phases) || !phases.length) throw new Error("Role map JSON must be a non-empty array.");
  const assignments = [];
  for (const phase of phases) {
    if (!phase.phase_id) throw new Error("Role map phase missing phase_id.");
    if (phase.spawn_policy && phase.spawn_policy !== "static-export-only") {
      throw new Error(`Phase ${phase.phase_id} has unsupported spawn_policy ${phase.spawn_policy}.`);
    }
    for (const role of REQUIRED_ROLES) {
      assignments.push({ phase_id: phase.phase_id, ...normalizeRole(phase, role) });
    }
  }
  return {
    schema: "compound-role-assignment-plan.v1",
    spawn_policy: "static-export-only",
    generated_from: "AGENT_ROLES.md",
    assignment_count: assignments.length,
    assignments,
  };
}

function renderText(plan) {
  const lines = [
    `Role assignment plan: ${plan.assignment_count} assignment(s)`,
    `spawn_policy: ${plan.spawn_policy}`,
  ];
  for (const assignment of plan.assignments) {
    lines.push(`- ${assignment.phase_id}/${assignment.role}: ${assignment.assignee_hint}`);
    lines.push(`  task_ids: ${assignment.task_ids.join(", ")}`);
    lines.push(`  artifacts: ${assignment.artifacts.join(", ")}`);
    lines.push(`  autonomy_level: ${assignment.autonomy_level}`);
    lines.push(`  handoff_condition: ${assignment.handoff_condition}`);
  }
  return `${lines.join("\n")}\n`;
}

function main() {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith("--"));
  if (!file || args.includes("--help") || args.includes("-h")) {
    console.log(usage());
    return;
  }
  const plan = exportRolePlan(readFileSync(file, "utf-8"));
  if (args.includes("--json")) console.log(JSON.stringify(plan, null, 2));
  else process.stdout.write(renderText(plan));
}

main();
