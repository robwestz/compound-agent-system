export const TIERS = ["mvp", "production", "cutting-edge"];

export function slugifyLabel(label = "package") {
  return String(label).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "package";
}

function tierLabel(tier = "production") {
  if (tier === "mvp") return "MVP";
  if (tier === "cutting-edge") return "Cutting-edge";
  return "Production";
}

export function buildPhase0Block({ goal = "", tier = "production", chunkPlan = null, prefill = null } = {}) {
  const parts = [
    "## Phase 0 — Preflight Contract",
    "",
    "### 0.1 Goal restate",
    prefill?.restatement ? `Your restatement: **${prefill.restatement}**` : `Restate the goal: ${goal}`,
    "",
    "### 0.2 Skill-scan",
    prefill?.skillScan === "perfect-fit" ? "- [x] **Perfect-fit:** available" : "- [ ] **Perfect-fit:** available",
    prefill?.skillScan === "partial" ? "- [x] **Partial:** usable with fallback" : "- [ ] **Partial:** usable with fallback",
    prefill?.skillScan === "miss" ? "- [x] **Miss:** skill development required" : "- [ ] **Miss:** skill development required",
    "",
    "### 0.3 Skill-first fallback",
    "If skill scan is miss or partial, use the sanctioned skill-development fallback before broad edits.",
    "",
    "### 0.4 Definition of Done",
    `**Tier:** ${tierLabel(tier)}`,
    prefill?.dod?.acceptanceCriteria ? prefill.dod.acceptanceCriteria.map((item) => `- **${item}**`).join("\n") : "- Define executable acceptance checks before implementation.",
    "",
    "### 0.5 Hard gates",
    "No work starts without task, DoD, and grounding.",
    "",
    "### 0.6 Contract signed",
    prefill?.signedBy ? `_Signed by: **${prefill.signedBy}**_` : "_Unsigned until the active agent acknowledges._",
  ];
  if (prefill) parts.splice(2, 0, "Pre-onboarding (operator-confirmed)", "", "PRE-FILLED by operator", "");
  if (["miss", "partial"].includes(prefill?.skillScan)) {
    parts.push("", "## Auto Skill Development", `Auto-triggered for this package because skill scan was ${prefill.skillScan}.`, "Run: claude /plugin-dev:skill-development");
  }
  if (Array.isArray(chunkPlan) && chunkPlan.length) {
    parts.push("", "## Chunk Plan (logical-order DAG)", "");
    chunkPlan.forEach((chunk, index) => {
      parts.push(`### C${index + 1} — ${chunk.name}`);
      if (chunk.dependsOn?.length) parts.push(`**Depends on:** ${chunk.dependsOn.map((n) => `C${n}`).join(", ")}`);
      if (chunk.skills?.length) parts.push(`**Skills used:** ${chunk.skills.map((skill) => `\`${skill}\``).join(", ")}`);
      if (chunk.done) parts.push(`**Done:** ${chunk.done}`);
      parts.push("");
    });
  }
  return parts.join("\n");
}

export function buildCompoundBlock() {
  return [
    "## Compound Mechanisms",
    "",
    "[GAP SCAN] Identify missing facts, defaults, and proceed policy.",
    "[COMPOUND] Register completed units with evidence.",
    "[CONTEXT REFRESH] Reground before long execution or handoff.",
  ].join("\n");
}

export function buildEvalLoopBlock({ tier = "production" } = {}) {
  const min = tier === "cutting-edge" ? 3 : 2;
  return [
    "## Eval Loop",
    "",
    "[EVAL LOOP] Run adversarial review before done.",
    `CRITIQUE (≥${min})`,
    `PRAISE   (≥${min})`,
    "PRESERVE",
    "FIX",
    "DEFER",
    "DECISION: proceed / rework / escalate",
    "Live debate substrate (preferred): node factory/v2-personas/debate.mjs --config operator-ask.config.json",
  ].join("\n");
}

export function buildScenarioGateBlock({ gatePath = null } = {}) {
  if (!gatePath) return "";
  return [
    "## Scenario Gate",
    "",
    `Path: ${gatePath}`,
    `Run: bash ${gatePath}/scenarios/runner.sh --json --timeout 15`,
    "Pass policy: all scenarios pass without leakage.",
    `Do NOT read scenarios under ${gatePath}/scenarios/private before implementation.`,
    `Do NOT modify files under ${gatePath}/scenarios/private.`,
  ].join("\n");
}

export function buildQualityGateBlock({ tier = "production" } = {}) {
  return [
    "## Quality Gate",
    "",
    `Tier: ${tierLabel(tier)}`,
    "- Correctness",
    "- Architecture",
    "- Cost-efficiency",
    "- Maintainability",
    "- Originality",
  ].join("\n");
}

export function buildDebateBlock({ topic } = {}) {
  if (!topic || !String(topic).trim()) return "";
  return [
    "## Pre-decision Debate",
    "",
    `Topic: ${topic}`,
    "Run: node factory/v2-personas/debate.mjs --config operator-ask.config.json",
  ].join("\n");
}

export function buildKickoffWithPhase0(options = {}) {
  const skills = (options.nodes || []).map((node) => `- ${node.slug || node.name}: ${node.name || node.slug}`).join("\n");
  return [
    `# ${options.packageName || "Workspace Package"}`,
    "",
    "## Goal",
    options.goal || "",
    "",
    skills ? `## Selected Skills\n\n${skills}` : "## Selected Skills\n\nNone selected.",
    "",
    buildPhase0Block(options),
    "",
    options.debateTopic ? `${buildDebateBlock({ topic: options.debateTopic })}\n` : "",
    buildCompoundBlock(),
    "",
    buildEvalLoopBlock(options),
    "",
    buildScenarioGateBlock({ gatePath: options.gatePath }),
    "",
    buildQualityGateBlock(options),
  ].filter((part) => part !== "").join("\n");
}

export function buildClaudeMd({ nodes = [] } = {}) {
  return ["# CLAUDE.md", "", "Use the bundled KICKOFF.md contract before implementation.", "", ...nodes.map((node) => `- ${node.slug}: ${node.name}`)].join("\n");
}

export function buildReadme({ goal = "", packageName = "workspace", nodes = [] } = {}) {
  return [`# ${packageName}`, "", goal, "", `Skills: ${nodes.length}`].join("\n");
}
