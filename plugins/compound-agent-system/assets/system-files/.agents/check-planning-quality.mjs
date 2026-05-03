#!/usr/bin/env node
import { readFileSync } from "node:fs";

const GENERIC_PHASE_RE = /\b(foundation|verification)\b/i;
const ROLE_RE = /\b(planner|executor|reviewer|verifier)\b/i;
const BLOCKER_FIELDS = [
  ["recommended-default", "missing-blocker-recommended-default"],
  ["priority", "missing-blocker-priority"],
  ["reversibility", "missing-blocker-reversibility"],
  ["proceed-policy", "missing-blocker-proceed-policy"],
  ["unlock-condition", "missing-blocker-unlock-condition"],
];

function readAll(files) {
  return files.map((file) => ({ file, content: readFileSync(file, "utf-8") }));
}

function parseAttrs(raw) {
  return Object.fromEntries([...raw.matchAll(/(\w+)="([^"]*)"|(\w+)=(\S+)/g)].map((m) => [m[1] || m[3], m[2] || m[4]]));
}

function phaseNames(plan, issues) {
  const names = [];
  const lines = plan.replace(/\r\n/g, "\n").split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.includes("[COMPOUND-PHASE")) continue;
    const marker = /\[COMPOUND-PHASE\s+([^\]]+)\]/.exec(line);
    if (!marker) {
      issues.push({ type: "unimportable-phase-marker", line: i + 1, reason: "marker is not closed or attributes cannot be parsed" });
      continue;
    }
    const attrs = parseAttrs(marker[1]);
    if (!attrs.id || !attrs.goal) {
      issues.push({ type: "unimportable-phase-marker", line: i + 1, reason: "marker requires id and goal attributes" });
      continue;
    }
    names.push({ id: attrs.id, goal: attrs.goal, dod: attrs.dod || "", skills: attrs.skills || "", line: i + 1 });
  }
  return names;
}

export function scanPlanningQuality(inputs) {
  const issues = [];
  const combined = inputs.map((input) => input.content).join("\n\n");
  const plan = inputs.find((input) => /PHASE_PLAN\.md$/i.test(input.file))?.content || inputs[0]?.content || "";
  const phases = phaseNames(plan, issues);

  if (!/first_vertical_slice/i.test(combined)) issues.push({ type: "missing-first-vertical-slice" });
  if (!phases.length) issues.push({ type: "missing-importable-markers" });
  if (phases.length && phases.every((p) => GENERIC_PHASE_RE.test(`${p.id} ${p.goal}`))) issues.push({ type: "generic-phase-plan" });
  if (phases.length && phases.every((p) => /foundation|verification/i.test(p.id))) issues.push({ type: "generic-only-phase-names" });
  const phaseIds = new Map();
  const phaseGoals = new Map();
  for (const phase of phases) {
    if (!phase.dod) issues.push({ type: "missing-phase-dod", phase: phase.id });
    if (!phase.skills || !ROLE_RE.test(phase.skills)) issues.push({ type: "missing-role-ownership", phase: phase.id });
    const seenIds = phaseIds.get(phase.id) || [];
    seenIds.push(phase.line);
    phaseIds.set(phase.id, seenIds);
    const goalKey = phase.goal.trim().toLowerCase();
    const seenGoals = phaseGoals.get(goalKey) || [];
    seenGoals.push({ id: phase.id, line: phase.line });
    phaseGoals.set(goalKey, seenGoals);
  }
  for (const [id, lines] of phaseIds.entries()) {
    if (lines.length > 1) issues.push({ type: "duplicate-phase-id", phase: id, lines });
  }
  for (const [goal, refs] of phaseGoals.entries()) {
    if (goal && refs.length > 1) issues.push({ type: "duplicate-phase-goal", goal, phases: refs.map((ref) => ref.id), lines: refs.map((ref) => ref.line) });
  }
  const frontmatterIds = [...plan.matchAll(/^\s*-\s+id:\s*"?([^"\n]+)"?\s*$/gm)].map((m) => m[1].trim());
  if (frontmatterIds.length && phases.length) {
    const markerIds = new Set(phases.map((phase) => phase.id));
    const frontIds = new Set(frontmatterIds);
    const missingFromMarkers = frontmatterIds.filter((id) => !markerIds.has(id));
    const missingFromFrontmatter = phases.map((phase) => phase.id).filter((id) => !frontIds.has(id));
    if (missingFromMarkers.length || missingFromFrontmatter.length) issues.push({ type: "phase-frontmatter-marker-mismatch", missing_from_markers: missingFromMarkers, missing_from_frontmatter: missingFromFrontmatter });
  }
  if (/##\s+Blockers\b/i.test(combined)) {
    for (const [field, type] of BLOCKER_FIELDS) {
      if (!combined.includes(field)) issues.push({ type, field });
    }
  }
  for (const input of inputs) {
    const h2s = new Map();
    for (const [index, line] of input.content.replace(/\r\n/g, "\n").split("\n").entries()) {
      const heading = /^##\s+(.+?)\s*$/.exec(line);
      if (!heading) continue;
      const key = heading[1].trim().toLowerCase();
      const seen = h2s.get(key) || [];
      seen.push(index + 1);
      h2s.set(key, seen);
    }
    for (const [section, lines] of h2s.entries()) {
      if (lines.length > 1) issues.push({ type: "duplicate-planning-section", file: input.file, section, lines });
    }
  }
  for (const match of combined.matchAll(/^-\s*role_owner_(planner|executor|reviewer|verifier):\s*(.+)$/gim)) {
    const expected = match[1].toLowerCase();
    const owner = match[2].toLowerCase();
    const containsOtherRole = /\b(planner|executor|reviewer|verifier)\b/.test(owner) && !owner.includes(expected);
    if (containsOtherRole) issues.push({ type: "role-owner-mismatch", expected_role: expected, owner: match[2].trim() });
  }
  const lines = combined.replace(/\r\n/g, "\n").split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    if (!/(allow|call|use|enable|access).{0,80}(external\s+api|network|credential|secret)/i.test(lines[i])) continue;
    const blockLines = [];
    for (let j = i; j < lines.length && blockLines.length < 12; j += 1) {
      if (j > i && /^###?\s+/.test(lines[j])) break;
      blockLines.push(lines[j]);
    }
    const localBlock = blockLines.join("\n");
    if (/(proceed-policy:\s*proceed-with-default|proceed-without-user:\s*true)/i.test(localBlock) && !/(proceed-policy:\s*must-ask|proceed-without-user:\s*false)/i.test(localBlock)) {
      issues.push({ type: "unsafe-external-api-default", line: i + 1 });
      break;
    }
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
