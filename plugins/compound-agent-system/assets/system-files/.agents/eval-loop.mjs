#!/usr/bin/env node
import { readFileSync } from "node:fs";

const REQUIRED_MILESTONES = [
  { type: "missing-first-completion", label: "first completion", headingPattern: /\b(first completion|initial implementation|first complete implementation)\b/i },
  { type: "missing-self-review", label: "self-review", headingPattern: /\bself[- ]review\b/i },
  { type: "missing-eval-round-1", label: "evaluator round 1", headingPattern: /\b(evaluator (feedback |review )?round 1|eval round 1)\b/i },
  { type: "missing-improvement-1", label: "improvement 1", headingPattern: /\b(improvement 1|round 1 (fix|improvement|addressed)|fixes from round 1)\b/i },
  { type: "missing-eval-round-2", label: "evaluator round 2", headingPattern: /\b(evaluator (feedback |review )?round 2|eval round 2)\b/i },
  { type: "missing-improvement-2", label: "improvement 2", headingPattern: /\b(improvement 2|round 2 (fix|improvement|addressed)|fixes from round 2)\b/i },
  { type: "missing-final-signoff", label: "final signoff", headingPattern: /\b(final signoff|final evaluator signoff)\b/i },
];

function identity(content, label) {
  const match = new RegExp(`\\b${label}\\s*:\\s*([^\\n]+)`, "i").exec(content);
  return match ? match[1].trim().toLowerCase() : "";
}

function sectionHeadings(content) {
  return [...content.matchAll(/^#{2,6}\s+(.+)$/gm)].map((match) => ({
    heading: match[1].trim(),
    index: match.index,
  }));
}

function milestoneIndexes(content) {
  const headings = sectionHeadings(content);
  return REQUIRED_MILESTONES.map((milestone) => {
    const match = headings.find((heading) => milestone.headingPattern.test(heading.heading));
    return { ...milestone, index: match ? match.index : -1 };
  });
}

function evidenceSection(content) {
  const marker = /^##\s+Task report\s*$/im.exec(content);
  return marker ? content.slice(marker.index) : content;
}

export function scanEvalLoop(inputs) {
  const content = evidenceSection(inputs.map((input) => input.content).join("\n\n"));
  const issues = [];
  const milestones = milestoneIndexes(content);

  for (const milestone of milestones) {
    if (milestone.index < 0) issues.push({ type: milestone.type, milestone: milestone.label });
  }

  const present = milestones.filter((milestone) => milestone.index >= 0);
  const sorted = [...present].sort((a, b) => a.index - b.index);
  if (present.length === milestones.length && present.some((milestone, index) => milestone.type !== sorted[index].type)) {
    issues.push({ type: "out-of-order-feedback-loop" });
  }

  if (!/\bevaluator (review|feedback|round|signoff)\b/i.test(content)) issues.push({ type: "missing-evaluator-review" });

  const implementer = identity(content, "implementer");
  const evaluator = identity(content, "evaluator");
  if (!implementer) issues.push({ type: "missing-implementer-identity" });
  if (!evaluator) issues.push({ type: "missing-evaluator-identity" });
  if (implementer && evaluator && implementer === evaluator) {
    const disclosed = /\b(not independent|same agent|same session|not a separate agent|independence disclosed)\b/i.test(content);
    if (/\bindependent\b/i.test(content) && !disclosed) issues.push({ type: "false-independent-review" });
    if (!disclosed) {
      issues.push({ type: "evaluator-independence-undisclosed" });
    }
  }

  return { ok: issues.length === 0, issues };
}

function readInputs(files) {
  return files.map((file) => ({ file, content: readFileSync(file, "utf-8") }));
}

function main() {
  const files = process.argv.slice(2).filter((arg) => arg !== "--json");
  if (!files.length) {
    console.error(JSON.stringify({ ok: false, issues: [{ type: "usage", message: "Usage: node .agents/eval-loop.mjs <task-report.md> [--json]" }] }, null, 2));
    process.exit(1);
  }
  try {
    const result = scanEvalLoop(readInputs(files));
    const output = JSON.stringify(result, null, 2);
    if (result.ok) console.log(output);
    else console.error(output);
    process.exit(result.ok ? 0 : 1);
  } catch (error) {
    console.error(JSON.stringify({ ok: false, issues: [{ type: "read-error", message: error.message }] }, null, 2));
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith("eval-loop.mjs")) main();
