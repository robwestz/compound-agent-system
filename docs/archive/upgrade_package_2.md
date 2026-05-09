You are working on the upgraded Compound Agent System repository.
Important: ignore any local Cursor/PowerShell hook problem mentioned in prior discussion. That issue is related to the local Cursor chat environment, not this repository’s product scope. Do not spend time debugging Cursor window spawning unless repository tests directly cover it.
Primary objective:
Move Compound Agent System from a mechanically improved harness into a stronger project-start intelligence system. The previous upgrade added important primitives: idea intake, task creation, output-quality checks, identity normalization, install plans, first-session UX, Fact-Forcing improvements, and long-session readiness. Now the next upgrade must improve the quality and specificity of the generated project plan.
Read first:
- README.md
- CLAUDE.md
- UPGRADE_TRACKER.md
- compound-agent-system-product-upgrade-spec.md
- plugins/compound-agent-system/assets/system-files/.agents/idea-intake.mjs
- plugins/compound-agent-system/assets/system-files/.agents/templates/
- plugins/compound-agent-system/assets/system-files/tests/idea-intake.test.mjs
- plugins/compound-agent-system/assets/system-files/tests/*.test.mjs
Before coding:
1. Summarize the current idea-intake flow.
2. Confirm the current test status on your machine.
3. Identify which phase-plan output is generic/hardcoded.
4. Propose a file-level implementation plan.
5. Wait for confirmation before broad edits.
Known current issue:
- Full suite was observed as 109/110 passing on Windows.
- The failing test appears to be a CRLF/LF mismatch in `idea-intake.test.mjs`.
- Fix this first, then update `UPGRADE_TRACKER.md` truthfully.
Do not:
- Do not build API Alchemy Engine.
- Do not turn this into a SaaS/app build.
- Do not add runtime dependencies.
- Do not remove core mechanisms: bootstrap, hooks, ledger, DoD, Fact-Forcing Gate, observe/warn/enforce, GAP SCAN, CONTEXT REFRESH, COMPOUND REGISTER.
Phase 1: Fix Test Truthfulness And Cross-Platform Baseline
Goal: Make the current upgraded repo honestly green before adding new behavior.

Tasks:

Fix Windows line-ending sensitivity in idea-intake.test.mjs.
Use CRLF-safe assertions, e.g. normalize plan.replace(/\r\n/g, "\n") before matching.
Re-run the full package test suite.
Update UPGRADE_TRACKER.md only with verified results.
DoD:

node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs passes.
UPGRADE_TRACKER.md does not claim green tests unless they actually passed.
No behavior changes beyond test portability.
Phase 2: Replace Generic Phase Plan With Idea-Derived Phase Plan
Goal: The generated PHASE_PLAN.md must be meaningfully different for different ideas.

Current weakness: The plan appears too generic: foundation + verification. That proves mechanics, but not project-start intelligence.

Tasks:

Update idea-intake.mjs so phase generation is derived from idea content.
Derive phases from signals such as:
product surface: CLI, UI, API, library, workflow, data product
data/storage needs
external integration/API needs
security/secrets/network risk
first runnable vertical slice
verification strategy
handoff/readiness requirements
Generate 3-6 phases instead of a fixed 2-phase template.
Each phase must include:
specific goal
role ownership
DoD checks
expected artifacts
whether it can proceed without user input
DoD:

Simple idea and long idea produce meaningfully different phase plans.
Tests assert different phase names/goals for different fixtures.
No phase plan may consist only of generic “foundation” and “verification”.
PHASE_PLAN.md remains importable by task.mjs import.
Phase 3: Add First Vertical Slice As A Required Planning Concept
Goal: Every generated plan must identify the smallest runnable proof of the project.

Tasks:

Add a first_vertical_slice section to generated Phase 0 artifacts.
It should describe:
what the first runnable/inspectable proof is
why it is the smallest useful slice
what command/artifact proves it works
which phase owns it
If no runnable slice is possible, the plan must explicitly explain why.
DoD:

PHASE_PLAN.md or PROJECT_BRIEF.md includes first_vertical_slice.
Tests assert the section exists.
At least one DoD check references the first vertical slice.
Long idea fixture produces a more specific first slice than the short fixture.
Phase 4: Upgrade Decision Quality In GAP SCAN
Goal: Blockers should reduce user burden, not dump ambiguity back on the user.

Tasks:

Extend blockers/decisions with:
priority: critical / important / defer
reversibility: reversible / costly / irreversible
proceed policy: proceed-with-default / must-ask / defer
recommended default
rationale
unlock condition
Limit immediate user-blocking questions to the smallest set.
Move non-blocking questions to OPEN_QUESTIONS.md.
DoD:

Every blocker has priority, reversibility, proceed policy, default, and unlock condition.
OPEN_QUESTIONS.md separates:
blocking_now
can_default
defer
Tests assert no more than 3-5 blocking_now questions unless explicitly justified.
The user-facing output asks only blocking_now questions.
Phase 5: Add Agent-Team Execution Map
Goal: A plan should not just say what to build. It should say which agent role does what.

Tasks:

Make AGENT_ROLES.md project-specific.
For each phase, specify:
planner
executor
reviewer
verifier
expected artifacts
handoff conditions
autonomy level
Connect this to long-session readiness where practical.
DoD:

AGENT_ROLES.md varies between simple and long idea fixtures.
Each generated phase has a role map.
Tests assert planner/executor/reviewer/verifier are present per phase.
The role map is machine-readable enough for future import/parsing.
Phase 6: Add Planning Quality Gate
Goal: Prevent the harness from producing impressive-looking but generic plans.

Tasks:

Add a deterministic planning quality checker or extend output-quality checking.
It should fail plans that:
have only generic phase names
lack first vertical slice
lack DoD per phase
lack role ownership
lack blocker defaults
lack importable markers
Keep it deterministic for now. No LLM judge required.
Suggested command: node .agents/check-planning-quality.mjs phase-0/PHASE_PLAN.md phase-0/GAP_SCAN.md

DoD:

Checker exists.
Tests include passing and failing fixtures.
idea-intake output passes the checker.
Generic two-phase plans fail.
Phase 7: Add Project-Start Benchmark Fixtures
Goal: Measure whether the harness handles different idea shapes.

Fixtures:

One-line vague idea.
Medium feature idea.
Long project brief, using API Alchemy only as fixture material.
Tasks:

Add/expand fixtures.
Run all through idea intake.
Assert each produces:
intake task
GAP SCAN
recommended defaults
specific phase plan
role map
DoD
first vertical slice
importable markers
DoD:

All three fixtures pass.
Phase plans differ meaningfully.
Tests prove no generic-only output.
Final Definition Of Done
The upgrade is complete when:

Full package test suite passes.
UPGRADE_TRACKER.md reflects actual verified results.
idea-intake generates project-specific phase plans.
Every plan includes first vertical slice.
GAP SCAN decisions include defaults, reversibility, priority, and proceed policy.
OPEN_QUESTIONS.md separates blocking/defaultable/deferred questions.
AGENT_ROLES.md is project-specific and phase-linked.
Planning quality checker rejects generic plans.
Short, medium, and long idea fixtures all pass.
No API Alchemy implementation is built.
Start by giving me your implementation plan only.