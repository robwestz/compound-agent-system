#!/usr/bin/env node
import { readFileSync } from "node:fs";

const GENERIC_PHASE_RE = /\b(foundation|verification)\b/i;

function readAll(files) {
  return files.map((file) => ({ file, content: readFileSync(file, "utf-8") }));
}

function phaseNames(plan) {
  const names = [];
  for (const match of plan.matchAll(/\[COMPOUND-PHASE\s+([^\]]+)\]/g)) {
    const attrs = Object.fromEntries([...match[1].matchAll(/(\w+)="([^"]*)"|(\w+)=(\S+)/g)].map((m) => [m[1] || m[3], m[2] || m[4]]));
    names.push({ id: attrs.id || "", goal: attrs.goal || "", dod: attrs.dod || "", skills: attrs.skills || "" });
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
  for (const phase of phases) {
    if (!phase.dod) issues.push({ type: "missing-phase-dod", phase: phase.id });
    if (!phase.skills || !/(planner|executor|reviewer|verifier)/.test(phase.skills)) issues.push({ type: "missing-role-ownership", phase: phase.id });
  }
  for (const field of ["recommended-default", "priority", "reversibility", "proceed-policy", "unlock-condition"]) {
    if (!combined.includes(field)) issues.push({ type: "missing-blocker-defaults", field });
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
