import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildResumePrompt,
  createHandoffContract,
  loadHandoff,
  validateHandoff,
  writeCheckpoint,
  writeResumePrompt,
} from "../handoff-bridge.mjs";

function tempWorkspace() {
  const dir = mkdtempSync(join(tmpdir(), "handoff-bridge-test-"));
  const ledgerPath = join(dir, "TASKS.json");
  const ledger = {
    version: "1",
    schema_url: ".agents/PROTOCOL.md",
    current: "t-001",
    agents_active: ["codex-gpt-5-codex"],
    log: [],
    tasks: [
      {
        id: "t-001",
        goal: "Live Handoff Bridge v1",
        state: "in_progress",
        agent: "codex-gpt-5-codex",
        skills: ["agent-framework", "harness-engineering"],
        dod: [
          { check: "artifact", path: "handoff-bridge.mjs", passed_at: null },
          { check: "test", command: "node --test tests/handoff-bridge.test.mjs", passed_at: null },
        ],
        updated_at: "2026-04-27T19:00:00.000Z",
      },
    ],
  };
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
  return { dir, ledgerPath, ledger };
}

test("createHandoffContract builds a safe v1 contract from ledger task", () => {
  const { dir, ledgerPath, ledger } = tempWorkspace();
  try {
    const contract = createHandoffContract({
      cwd: dir,
      ledgerPath,
      ledger,
      taskId: "t-001",
      to: "claude",
      trigger: "manual",
      summary: "Codex created the schema and is handing implementation to Claude.",
      completed: ["Task opened in Compound ledger"],
      pending: ["Implement bridge CLI"],
      files: [join(dir, "handoff-bridge.mjs")],
      decisions: ["Manual trigger ships first; token trigger stays enum-only."],
      risks: ["No live session launcher in v1."],
      commands: ["node .agents/task.mjs open ..."],
      verification: ["Unit tests planned"],
      createdAt: "2026-04-27T19:01:02.000Z",
      from: "codex-gpt-5-codex",
    });

    assert.equal(contract.schema_version, "handoff-contract.v1");
    assert.equal(contract.trigger.type, "manual");
    assert.equal(contract.to_agent.target, "claude");
    assert.equal(contract.task.id, "t-001");
    assert.deepEqual(contract.current_files, ["handoff-bridge.mjs"]);
    assert.equal(validateHandoff(contract).ok, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validateHandoff rejects secret-like content and user-absolute paths", () => {
  const { dir, ledgerPath, ledger } = tempWorkspace();
  try {
    const contract = createHandoffContract({
      cwd: dir,
      ledgerPath,
      ledger,
      taskId: "t-001",
      summary: "safe summary",
      pending: ["Continue"],
      createdAt: "2026-04-27T19:01:02.000Z",
      from: "codex-gpt-5-codex",
    });
    contract.commands_run.push("export API_KEY=sk-test-secret-token");
    contract.current_files.push("C:\\Users\\robin\\secret.txt");

    const validation = validateHandoff(contract);
    assert.equal(validation.ok, false);
    assert.ok(validation.errors.some((err) => /secret/i.test(err)));
    assert.ok(validation.errors.some((err) => /absolute path/i.test(err)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("writeCheckpoint writes handoff JSON and persists pointer in TASKS ledger", () => {
  const { dir, ledgerPath } = tempWorkspace();
  try {
    const { contract, outPath } = writeCheckpoint({
      cwd: dir,
      ledgerPath,
      taskId: "t-001",
      to: "claude",
      summary: "Codex hands off to Claude.",
      completed: ["Schema created"],
      pending: ["Write resume prompt generator"],
      out: "handoffs/codex-to-claude.json",
      createdAt: "2026-04-27T19:02:03.000Z",
      from: "codex-gpt-5-codex",
    });

    assert.match(outPath, /codex-to-claude\.json$/);
    const loaded = loadHandoff(outPath, dir);
    assert.equal(loaded.checkpoint_id, contract.checkpoint_id);

    const ledger = JSON.parse(readFileSync(ledgerPath, "utf-8"));
    assert.equal(ledger.tasks[0].handoffs.length, 1);
    assert.equal(ledger.tasks[0].last_handoff.to, "claude");
    assert.equal(ledger.log.at(-1).event, "handoff-checkpoint");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("createHandoffContract requires explicit sender identity", () => {
  const { dir, ledgerPath, ledger } = tempWorkspace();
  try {
    ledger.agents_active = ["codex-gpt-5-codex", "claude-opus-4.7"];
    ledger.tasks[0].agent = "codex-gpt-5-codex";

    assert.throws(
      () => createHandoffContract({
        cwd: dir,
        ledgerPath,
        ledger,
        taskId: "t-001",
        summary: "A checkpoint with ambiguous sender.",
        pending: ["Continue roundtrip proof"],
        createdAt: "2026-04-27T19:02:30.000Z",
      }),
      /from_agent\.id must be explicit/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("createHandoffContract can derive sender from COMPOUND_AGENT_ID session identity", () => {
  const { dir, ledgerPath, ledger } = tempWorkspace();
  const previous = process.env.COMPOUND_AGENT_ID;
  try {
    process.env.COMPOUND_AGENT_ID = "claude-opus-4.7";
    ledger.agents_active = ["codex-gpt-5-codex", "claude-opus-4.7"];
    ledger.tasks[0].agent = "codex-gpt-5-codex";

    const contract = createHandoffContract({
      cwd: dir,
      ledgerPath,
      ledger,
      taskId: "t-001",
      summary: "Claude is writing a checkpoint for a Codex-owned task.",
      pending: ["Continue roundtrip proof"],
      createdAt: "2026-04-27T19:02:30.000Z",
    });

    assert.equal(contract.from_agent.id, "claude-opus-4.7");
  } finally {
    if (previous === undefined) delete process.env.COMPOUND_AGENT_ID;
    else process.env.COMPOUND_AGENT_ID = previous;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("writeCheckpoint does not make a parked explicit task current", () => {
  const { dir, ledgerPath, ledger } = tempWorkspace();
  try {
    ledger.current = null;
    ledger.tasks[0].state = "parked";
    writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));

    writeCheckpoint({
      cwd: dir,
      ledgerPath,
      taskId: "t-001",
      to: "claude",
      summary: "Codex acknowledges a parked-task handoff.",
      pending: ["Await manual confirmation"],
      out: "handoffs/parked-task.json",
      createdAt: "2026-04-27T19:02:45.000Z",
      from: "codex-gpt-5-codex",
    });

    const updated = JSON.parse(readFileSync(ledgerPath, "utf-8"));
    assert.equal(updated.current, null);
    assert.equal(updated.tasks[0].state, "parked");
    assert.equal(updated.tasks[0].handoffs.length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("buildResumePrompt tells the target agent to continue pending work, not restart", () => {
  const { dir, ledgerPath, ledger } = tempWorkspace();
  try {
    const contract = createHandoffContract({
      cwd: dir,
      ledgerPath,
      ledger,
      taskId: "t-001",
      to: "claude",
      summary: "Bridge is half-built.",
      completed: ["Schema exists"],
      pending: ["Add roundtrip simulation"],
      files: ["handoff-bridge.mjs", "tests/handoff-bridge.test.mjs"],
      createdAt: "2026-04-27T19:03:04.000Z",
      from: "codex-gpt-5-codex",
    });

    const prompt = buildResumePrompt(contract);
    assert.match(prompt, /You are Claude Code/);
    assert.match(prompt, /Continue from Pending, not from scratch/);
    assert.match(prompt, /Add roundtrip simulation/);
    assert.match(prompt, /\.agents\/TASKS\.json/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("writeResumePrompt can write a copy-pasteable prompt file", () => {
  const { dir, ledgerPath } = tempWorkspace();
  try {
    const { outPath } = writeCheckpoint({
      cwd: dir,
      ledgerPath,
      taskId: "t-001",
      to: "claude",
      summary: "Prompt file test.",
      pending: ["Resume from this handoff"],
      out: "handoff.json",
      createdAt: "2026-04-27T19:04:05.000Z",
      from: "codex-gpt-5-codex",
    });
    const result = writeResumePrompt({
      cwd: dir,
      handoffPath: outPath,
      out: "RESUME.md",
    });

    assert.match(result.outPath, /RESUME\.md$/);
    const text = readFileSync(result.outPath, "utf-8");
    assert.match(text, /Prompt file test/);
    assert.match(text, /Resume from this handoff/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
