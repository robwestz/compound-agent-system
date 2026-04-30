#!/usr/bin/env node
import { readFileSync } from "node:fs";

const REQUIRED_CLOSING = /(^|\n)##\s+(Closing|Next steps|Verification|Done)\b/i;
const REQUIRED_SECTIONS = ["Blockers"];

export function scanMarkdown(content, { file = "<input>" } = {}) {
  const issues = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const topHeadings = new Map();
  const stack = [];
  let fence = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^```/.test(line.trim())) fence = !fence;
    if (fence) continue;

    const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      if (!text || /[:\-–—,;]$/.test(text)) {
        issues.push({ type: "truncated-heading", file, line: i + 1, heading: text });
      }
      while (stack.length && stack[stack.length - 1] >= level) stack.pop();
      if (level > 1 && stack.length === 0 && lines.slice(0, i).some((l) => /^#\s+/.test(l))) {
        // valid: a top h1 can be followed by h2; only flag impossible jumps below
      }
      if (level > 2 && !stack.length) {
        issues.push({ type: "unparseable-markdown-structure", file, line: i + 1, heading: text, reason: "heading level jumps without parent" });
      }
      stack.push(level);
      if (level === 2) {
        const key = text.toLowerCase();
        const seen = topHeadings.get(key) || [];
        seen.push(i + 1);
        topHeadings.set(key, seen);
      }
    }
  }

  for (const [heading, occurrences] of topHeadings.entries()) {
    if (occurrences.length > 1) issues.push({ type: "duplicate-top-level-heading", file, heading, lines: occurrences });
  }

  const normalizedBlocks = new Map();
  for (let i = 0; i <= lines.length - 4; i += 1) {
    const block = lines.slice(i, i + 4).map((l) => l.trim()).filter(Boolean);
    if (block.length < 4) continue;
    if (block.some((l) => /^#{1,6}\s+/.test(l))) continue;
    const key = block.join("\n").toLowerCase();
    const seen = normalizedBlocks.get(key) || [];
    seen.push(i + 1);
    normalizedBlocks.set(key, seen);
  }
  for (const [block, occurrences] of normalizedBlocks.entries()) {
    if (occurrences.length > 1) issues.push({ type: "repeated-text-block", file, lines: occurrences, preview: block.split("\n").slice(0, 2).join(" | ") });
  }

  const lower = content.toLowerCase();
  for (const section of REQUIRED_SECTIONS) {
    if (lower.includes(section.toLowerCase())) {
      const sectionRe = new RegExp(`(^|\\n)##\\s+${section}\\b`, "i");
      const m = sectionRe.exec(content);
      if (m) {
        const start = m.index + m[0].length;
        const next = content.slice(start).search(/\n##\s+/);
        const sectionText = next === -1 ? content.slice(start) : content.slice(start, start + next);
        const sentences = sectionText.split("\n").map((s) => s.trim()).filter(Boolean).filter((s) => !/^[-*]\s+\w+:/i.test(s));
        const last = sentences[sentences.length - 1] || "";
        if (last && !/[.!?)`\]]$/.test(last) && !/^[-*]\s/.test(last)) {
          issues.push({ type: "interrupted-sentence", file, section, text: last });
        }
      }
    }
  }

  const headings = lines.filter((line) => /^#{1,6}\s+/.test(line.trim()));
  if (headings.length > 0 && lower.includes("gap scan") && !REQUIRED_CLOSING.test(content)) {
    issues.push({ type: "missing-closing-section", file, expected: "## Closing or equivalent" });
  }

  return { ok: issues.length === 0, issues };
}

function main() {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error(JSON.stringify({ ok: false, issues: [{ type: "usage", message: "Usage: node .agents/check-output-quality.mjs <markdown-file> [...]" }] }, null, 2));
    process.exit(1);
  }
  const allIssues = [];
  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      allIssues.push(...scanMarkdown(content, { file }).issues);
    } catch (error) {
      allIssues.push({ type: "read-error", file, message: error.message });
    }
  }
  const result = { ok: allIssues.length === 0, issues: allIssues };
  const output = JSON.stringify(result, null, 2);
  if (result.ok) console.log(output);
  else console.error(output);
  process.exit(result.ok ? 0 : 1);
}

if (process.argv[1] && process.argv[1].endsWith("check-output-quality.mjs")) main();
