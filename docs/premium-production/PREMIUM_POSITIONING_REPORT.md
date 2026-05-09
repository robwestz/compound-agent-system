# Premium Positioning Report

## Scope

This report explains why the `compound-agent-system` package is premium-production class after the 32-task hardening catalog, where it appears stronger than comparable agent-workflow harnesses, and which five small follow-up upgrades could plausibly make it world-leading in specific dimensions.

This is a product-positioning and technical strategy report, not a universal benchmark. Public platform capabilities change quickly, and closed-source products cannot be exhaustively inspected. The claims below are therefore phrased around verifiable properties in this repository and documented public surfaces such as Claude Code hooks, subagents, skills, plugins, and MCP.

## Why this is premium

The package is premium because it turns agent work from chat-driven intent into a local, inspectable operating protocol with hard gates:

1. **Task state is explicit.** `.agents/TASKS.json` records current, parked, blocked, and completed work instead of relying on conversation memory.
2. **Definition of Done is executable.** Tasks carry test, artifact, and manual gates; `task.mjs verify` records active verification instead of accepting self-assertion.
3. **Planning quality is deterministic.** Idea intake emits Phase 0 artifacts, and red-team checks reject generic phase plans, unsafe defaults, missing DoD, role mismatch, unresolved placeholders, and unimportable markers.
4. **Safety boundaries are defaulted.** Fact-Forcing, approval boundaries, compliance modes, secrets policy, rollback/uninstall behavior, and support-bundle redaction are documented and tested.
5. **Long sessions have a readiness gate.** `session-readiness.mjs` refuses READY unless task state, DoD, blockers, handoff, checkpoint, workspace state, environment contract, and enforce mode are aligned.
6. **Handoffs are schema-backed.** `handoff-contract.v2` checkpoints are validated and resume prompts point the next agent to concrete files, commands, decisions, and risks.
7. **Premium work requires review evidence.** `eval-loop.mjs` enforces two evaluator feedback rounds, two improvement rounds, final signoff, and same-agent disclosure.
8. **The package is portable and low-friction.** The core runtime stays zero-dependency Node.js 18+ and ships the same payload to Claude- and Codex-compatible plugin surfaces.
9. **Release quality is measured.** The final commercial metatest composes golden path, failure recovery, doctor, readiness, support bundle, compatibility, marketplace checklist, performance limits, and task-evidence checks.

## Why this is better than ordinary agent harnesses with the same goal

Most comparable systems focus on one layer: prompt scaffolding, coding-agent configuration, subagent definitions, hooks, project memory, or CI checks. This package composes those layers into a single local product loop:

| Dimension | Ordinary harness pattern | Compound Agent System advantage |
|---|---|---|
| Task continuity | Markdown notes or chat summaries | Ledger with status, blockers, DoD, active agents, and migration path |
| Completion quality | "Done" declared in prose | Executable DoD verification plus final acceptance metatest |
| Planning | Template plan generated once | Idea-derived Phase 0 artifacts plus red-team plan-quality gate |
| Agent roles | Decorative planner/reviewer labels | `AGENT_ROLES.md` can be exported as structured static assignments |
| Safety | Model follows policy if it remembers | Fact-Forcing, approval-boundary docs, compliance modes, and doctor checks |
| Handoff | Human-written summary | Schema-validated checkpoint and deterministic resume prompt |
| Supportability | Ad hoc logs/screenshots | Redacted support bundle, event log, troubleshooting map, doctor/readiness |
| Release discipline | Tests plus README | Marketplace checklist, changelog, compatibility contract, performance limits, task evidence matrix |
| Portability | One client or one IDE | Shared payload with Claude and Codex manifests and shell/PowerShell docs |
| Size control | Accretive scripts | Explicit placement classes and package-size budget |

## What it may be uniquely better at

The strongest differentiator is not that it has hooks, subagents, skills, or MCP-compatible concepts. Public Claude Code documentation already exposes powerful extension surfaces for those primitives. The differentiator is that this repository adds a **local acceptance protocol around them**:

- A task is not just assigned; it has DoD and state.
- A plan is not just produced; it can be rejected by deterministic red-team fixtures.
- A long session is not just resumed; it must prove readiness before unattended execution.
- A review is not just requested; the evidence loop itself is validated.
- A support export is not just diagnostic; it is redacted, local, and explicitly "review before sharing."

Based on public docs and the local code in this repository, the package appears unusually strong at **agent-work proof accounting**: showing exactly why an agent is allowed to proceed, exactly what was verified, exactly what is blocked, and exactly what a next agent should resume. That is a narrower claim than "best agent product," but it is the dimension that matters most for autonomous multi-hour coding reliability.

## Five short world-class follow-up upgrades

These should not be included unless implemented to a bar where the package is plausibly better than corresponding Anthropic-native workflow usage on that specific dimension.

1. **Hook compatibility conformance harness**
   - Build a deterministic fixture suite for Claude Code hook lifecycle events used by this package: `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `Stop`, `SubagentStart`, `SubagentStop`, and `InstructionsLoaded`.
   - Why it can be world-class: public hook docs describe schemas, but this repo could ship executable compatibility fixtures proving the Compound gates behave correctly across event payload variants.
   - Short implementation path: add JSON fixtures, a hook-conformance runner, and tests that verify permission decisions, warning/block output, and ledger effects.

2. **Proof-carrying task receipts**
   - Emit a compact `.agents/receipts/<task-id>.json` whenever a task is marked done, containing DoD checks, commands, hashes of artifacts, evaluator-loop status, agent identity, and handoff pointer.
   - Why it can be world-class: stronger than prose summaries or CI-only evidence because every completed agent task carries a machine-verifiable local receipt.
   - Short implementation path: add a receipt writer to `task.mjs done`, JSON schema, redaction rule, and one golden-path receipt test.

3. **Diff-risk approval classifier**
   - Add a local classifier that scans staged changes and maps them to approval boundaries: safe docs, runtime behavior, destructive operation, secret/network risk, migration risk, or marketplace/release risk.
   - Why it can be world-class: better than generic "ask before dangerous actions" because it turns human-approval boundaries into a deterministic pre-PR risk bill.
   - Short implementation path: implement extension/path/rule heuristics, output a Markdown risk table, and test against curated diffs.

4. **Unattended-session black-box simulator**
   - Add a simulator that runs the harness through interrupted sessions: start task, lose context, resume from checkpoint, encounter blocker, recover via doctor, export support bundle, and close with receipt.
   - Why it can be world-class: stronger than normal unit tests because it validates the actual autonomous-session failure modes the product is built to solve.
   - Short implementation path: use temp workspaces and existing CLIs; compose current golden-path, readiness, handoff, doctor, and support-bundle checks into one black-box scenario.

5. **Competitive capability scorecard as code**
   - Encode the premium scorecard into a JSON or Markdown-as-data contract that maps capabilities to evidence paths, test commands, and "better-than-native-workflow" rationale.
   - Why it can be world-class: turns product claims into auditable evidence, making it harder to overclaim and easier to prove where the package beats plain prompt/hook/subagent setups.
   - Short implementation path: create `docs/premium-production/capability-scorecard.json`, add a validator test that every claim has evidence, and link it from README/release docs.

## Bottom line

The package is premium because it converts autonomous agent work into a deterministic, recoverable, evidence-producing workflow. Its best claim is not "more AI" but **less unverifiable autonomy**: every important transition has a local artifact, a gate, a recovery path, or a release check. The next leap is to make those proofs portable as receipts and scorecards so every completed task can defend itself without requiring the reader to reconstruct the session.
