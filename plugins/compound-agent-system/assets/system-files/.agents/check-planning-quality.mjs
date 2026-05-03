#!/usr/bin/env node
import { readFileSync } from "node:fs";

const GENERIC_PHASE_RE = /\b(foundation|verification)\b/i;
const REQUIRED_BLOCKER_FIELDS = ["recommended-default", "priority", "reversibility", "proceed-policy", "unlock-condition"];
const ROLE_NAMES = ["planner", "executor", "reviewer", "verifier"];

function readAll(files) {
  return files.map((file) => ({ file, content: readFileSync(file, "utf-8") }));
}

function phaseNames(plan) {
  const names = [];
  const yamlSkills = new Map();
  let currentId = null;
  let inSkills = false;
  for (const line of plan.split(/\r?\n/)) {
    const idMatch = line.match(/^\s*-\s+id:\s*["']?([^"'\s]+)["']?/);
    if (idMatch) {
      currentId = idMatch[1];
      inSkills = false;
      if (!yamlSkills.has(currentId)) yamlSkills.set(currentId, []);
      continue;
    }
    if (currentId && /^\s*skills:\s*$/.test(line)) {
      inSkills = true;
      continue;
    }
    if (inSkills) {
      const skillMatch = line.match(/^\s*-\s+["']?([^"']+)["']?\s*$/);
      if (skillMatch) yamlSkills.get(currentId).push(skillMatch[1]);
      else if (!/^\s*$/.test(line)) inSkills = false;
    }
  }
  for (const match of plan.matchAll(/\[COMPOUND-PHASE\s+([^\]]+)\]/g)) {
    const attrs = Object.fromEntries([...match[1].matchAll(/(\w+)="([^"]*)"|(\w+)=(\S+)/g)].map((m) => [m[1] || m[3], m[2] || m[4]]));
    names.push({ id: attrs.id || "", goal: attrs.goal || "", dod: attrs.dod || "", skills: attrs.skills || "", frontmatterSkills: yamlSkills.get(attrs.id || "") || [] });
  }
  return names;
}

export function scanPlanningQuality(inputs) {
  const issues = [];
  const combined = inputs.map((input) => input.content).join("\n\n");
  const plan = inputs.find((input) => /PHASE_PLAN\.md$/i.test(input.file))?.content || inputs[0]?.content || "";
  const phases = phaseNames(plan);

  if (!/first_vertical_slice/i.test(combined)) issues.push({ type: "missing-first-vertical-slice" });
  if (!phases.length) issues.push({ type: "missing-importable-markers" });
  if (phases.length && phases.every((p) => GENERIC_PHASE_RE.test(`${p.id} ${p.goal}`))) issues.push({ type: "generic-phase-plan" });
  if (phases.length && phases.every((p) => /foundation|verification/i.test(p.id))) issues.push({ type: "generic-only-phase-names" });
  if (/TODO|TBD|\{\{[^}]+\}\}/i.test(combined)) issues.push({ type: "unresolved-placeholder" });
  if (/default:\s*(ask the user|none|tbd|n\/a)/i.test(combined)) issues.push({ type: "unsafe-default" });
  for (const phase of phases) {
    if (!phase.dod) issues.push({ type: "missing-phase-dod", phase: phase.id });
    if (!phase.skills) issues.push({ type: "missing-role-ownership", phase: phase.id });
    if (phase.skills && !ROLE_NAMES.some((role) => new RegExp(`\\b${role}\\b`, "i").test(phase.skills))) issues.push({ type: "role-mismatch", phase: phase.id });
    if (phase.frontmatterSkills.length && phase.skills) {
      const markerSkills = phase.skills.split(/[;,]/).map((skill) => skill.trim()).filter(Boolean);
      const missingFromMarker = phase.frontmatterSkills.filter((skill) => !markerSkills.includes(skill));
      const extraInMarker = markerSkills.filter((skill) => !phase.frontmatterSkills.includes(skill));
      if (missingFromMarker.length || extraInMarker.length) issues.push({ type: "role-mismatch", phase: phase.id });
    }
    if (!phase.goal || phase.goal.length < 8 || /^(do it|fix it|build it|verify it)$/i.test(phase.goal.trim())) issues.push({ type: "thin-phase-goal", phase: phase.id });
  }
  for (const field of REQUIRED_BLOCKER_FIELDS) {
    if (!combined.includes(field)) issues.push({ type: "missing-blocker-defaults", field });
  }
  for (const bucket of ["blocking_now", "can_default", "defer"]) {
    if (!new RegExp(`\\b${bucket}\\b`).test(combined)) issues.push({ type: "missing-question-buckets", bucket });
  }

  return { ok: issues.length === 0, issues };
}

function main() {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error(JSON.stringify({ ok: false, issues: [{ type: "usage", message: "Usage: node .agents/check-planning-quality.mjs <PHASE_PLAN.md> [GAP_SCAN.md]" }] }, null, 2));
    process.exit(1);
  }
  try {
    const result = scanPlanningQuality(readAll(files));
    const output = JSON.stringify(result, null, 2);
    if (result.ok) console.log(output);
    else console.error(output);
    process.exit(result.ok ? 0 : 1);
  } catch (error) {
    console.error(JSON.stringify({ ok: false, issues: [{ type: "read-error", message: error.message }] }, null, 2));
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith("check-planning-quality.mjs")) main();
