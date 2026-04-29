# Compound Agent System - Product Upgrade Spec

## Purpose

This document is a handoff specification for the next agent that improves the
Compound Agent System plugin. It is based on the first real test session, where
the plugin was bootstrapped into this workspace and then used against a large
project idea, `startpaket_projektidé_api_alchemy_engine.md`.

The goal is not to build API Alchemy Engine. The goal is to upgrade the plugin
so that any future project starts with a structured, logged, highly autonomous
development environment instead of an ad hoc chat. A new project should never
feel the same after this harness is installed: the first idea should become a
task, the task should have DoD, the plan should contain agent roles, long CLI
agent sessions should be survivable, and every phase should leave durable
state that future agents can resume.

Target outcome:

- A user can provide either a one-line raw idea or a long prewritten project
  brief.
- The harness immediately creates an intake/planning task in the ledger.
- The harness performs GAP SCAN, asks only necessary questions, and proposes
  strong defaults instead of blocking on every ambiguity.
- The harness produces plan artifacts that can be imported into `.agents`.
- The harness assigns planner, executor, reviewer, and verifier roles.
- The harness can run in WARN mode for adoption and ENFORCE mode for long
  unattended sessions.
- CLI agents such as Claude, Codex, Devin, or future agents can execute for a
  long time without losing task state, context, DoD, or handoff continuity.

## Background

The current package is a Claude/Codex-compatible plugin package named
Compound Agent System. The package root contains a convenience `bootstrap.mjs`
entrypoint that delegates to
`plugins/compound-agent-system/scripts/bootstrap-compound-system.mjs`.

The README describes the current bootstrap as:

- copy harness files into a target repo
- run `.agents/activate.mjs`
- optionally run `.agents/agent-activate.mjs --id <agent-id>`
- print ledger status and the first project task command

The first test session proved several important things:

- package validation worked
- dry-run worked before real install
- bootstrap copied the harness into the target repo
- hooks were installed into `.claude/settings.json`
- `.agents/TASKS.json` was initialized
- an agent could be activated
- Fact-Forcing Gate actually blocked a state-changing command until the agent
  quoted the user's instruction

That is a strong foundation. The weakness is that the session mostly proved
installation and discipline, not the core product promise.

The core product promise is:

> A raw idea becomes a verified, logged, agent-executable development plan.

The current behavior did not fully prove that. When the user supplied a large
project idea, the agent produced a useful GAP SCAN and architecture sketch, but
it did not open a ledger task immediately. It also treated unanswered questions
as a reason to delay ledger usage, duplicated large sections of output, mixed
internal terminology into the user-facing response, and did not provide
recommended defaults for every blocker.

This document turns those findings into implementation work.

## Product Principle

The harness must not be a bureaucracy layer around agents. It must be the
operating system for autonomous project execution.

Every feature should be judged by this question:

> Does this make it easier for an agent to start, continue, verify, hand off,
> or resume meaningful work without the user babysitting it?

If the answer is no, the feature is probably ritual rather than product.

## Non-Negotiables To Preserve

Do not remove or weaken these pieces:

- Bootstrap with dry-run before write mode.
- `.agents` task ledger.
- Definition of Done as active verification.
- Fact-Forcing Gate.
- WARN mode as a low-friction adoption default.
- ENFORCE mode as the path to unattended work.
- GAP SCAN before significant work.
- COMPOUND REGISTER after completed work.
- CONTEXT REFRESH for long sessions and phase transitions.
- Claude/Codex portability.
- Zero runtime dependencies unless the operator explicitly approves otherwise.

The upgrade should sharpen these mechanisms, not replace them.

## Priority 0 - Create A Real Golden Path

### Priority 0 Problem

The first session proved that files can be copied and hooks can run. It did not
prove that the harness can take an idea and produce machine-readable project
state.

This is the largest product gap.

### Priority 0 Required Change

Add a first-class golden path:

1. User provides an idea.
2. Harness creates an `idea-intake` or `phase-0-planning` task immediately.
3. Harness records the original idea in the task context or linked artifact.
4. Harness runs GAP SCAN.
5. Harness creates recommended defaults for open decisions.
6. Harness emits a phase plan with `.agents` plan markers.
7. Harness imports or previews the plan into the ledger.
8. Harness verifies the resulting ledger state.

Implementation may be a script, command, skill, or a combination. The exact
surface is flexible, but the capability must be testable from the command line.

Suggested command:

```powershell
node .agents/idea-intake.mjs --input fixtures/ideas/simple-idea.md --dry-run
node .agents/idea-intake.mjs --input fixtures/ideas/simple-idea.md --apply
```

Alternative command names are acceptable if the behavior is explicit.

### Priority 0 Definition Of Done

- A test fixture with a one-line idea exists.
- A test fixture with the long API Alchemy Engine idea exists or is represented
  by a shortened but structurally equivalent fixture.
- Running the golden-path smoke test creates or previews an intake/planning
  task.
- The generated task has at least one DoD check.
- The generated plan contains planner, executor, reviewer, and verifier roles.
- The generated plan contains `.agents` import markers or an equivalent import
  artifact.
- A status command proves the task exists in `.agents/TASKS.json`.
- The test fails if the implementation only prints prose and does not create
  machine-readable task or plan state.

## Priority 1 - Open Intake Tasks Immediately

### Priority 1 Problem

The tested agent said no ledger task would be opened until the user answered
blocker questions. That is the wrong rule.

Implementation work should wait for critical answers. Intake/planning work
should not.

If the harness waits for perfect clarity before opening a task, the first and
most important part of the project is untracked.

### Priority 1 Required Change

Change the operating rule:

- Do not open implementation tasks until blockers are resolved.
- Do open an intake/planning task as soon as the user provides a project idea.

The intake task owns:

- regrounding the idea
- identifying critical blockers
- proposing defaults
- creating Phase 0 artifacts
- preparing importable phase tasks
- asking for user confirmation only where needed

### Priority 1 Definition Of Done

- Documentation states this rule clearly.
- The command or skill that handles ideas opens an intake/planning task before
  asking blocker questions.
- Tests cover both short and long ideas.
- Tests prove implementation tasks are not opened prematurely.
- Tests prove the intake/planning task is opened even when blockers remain.

## Priority 2 - Provide Recommended Defaults For Blockers

### Priority 2 Problem

The agent identified good blocker questions for API Alchemy Engine, but it left
too much work on the user. A harness intended for autonomous execution should
not ask the user to design the system from scratch when a safe default exists.

Questions should be reserved for decisions that are truly irreversible,
expensive, security-sensitive, or preference-dependent.

### Priority 2 Required Change

Every blocker question must have:

- the question
- why it matters
- recommended default
- consequence of accepting the default
- consequence of choosing the main alternative
- whether the agent may proceed with the default if the user is absent

Example:

```text
Decision: Adapter Registry scope
Why it matters: determines whether adapters compound across projects.
Recommended default: global registry with per-project activation.
Proceed without user? yes, for local single-user mode.
Alternative: per-project registry, safer isolation but weaker compounding.
```

### Priority 2 Definition Of Done

- GAP SCAN output has a structured decision format.
- Every blocker includes a recommended default.
- Each default has a proceed/no-proceed policy.
- At least one test asserts that blocker output contains defaults.
- Long-form idea intake no longer ends with only questions.

## Priority 3 - Eliminate Duplicated Or Corrupted Output

### Priority 3 Problem

The test response duplicated sections multiple times and contained broken text.
For a harness that claims to create structure and discipline, this is not a
cosmetic issue. It damages trust.

Long unattended CLI sessions cannot rely on output that repeats or corrupts
critical decisions.

### Priority 3 Required Change

Add output-quality checks for generated markdown artifacts and first-session
responses.

At minimum, detect:

- duplicated top-level sections
- duplicated blocker question blocks
- repeated option lists
- truncated headings
- obvious interrupted sentences in required sections
- missing closing sections
- markdown that cannot be parsed by a simple section scanner

The check can be simple and deterministic. Do not overbuild it with an LLM
judge for v1.

Suggested command:

```powershell
node .agents/check-output-quality.mjs out/sample-gap-scan.md
```

### Priority 3 Definition Of Done

- A deterministic markdown quality checker exists.
- Tests include a passing clean output fixture.
- Tests include a failing duplicated-section fixture.
- Tests include a failing repeated-blocker fixture.
- The long-idea fixture runs through this checker.
- The README or skill docs say generated planning output must pass this check
  before it is treated as an artifact.

## Priority 4 - Normalize Agent Identity

### Priority 4 Problem

The first session mixed identity concepts:

- `claude` as bootstrap agent id
- `claude-opus-4.7` as signed-in ledger identity
- Opus as planner model
- Sonnet as executor model
- Claude/Codex as clients

Those are different things. Mixing them weakens auditability and handoff.

### Priority 4 Required Change

Introduce a clear identity model.

Recommended fields:

- `client`: `claude`, `codex`, `devin`, `cursor`, etc.
- `model`: `opus`, `sonnet`, `gpt-5.5`, etc.
- `role`: `planner`, `executor`, `reviewer`, `verifier`, `operator`
- `ledger_agent_id`: stable id used in `.agents/TASKS.json`
- `session_id`: unique id for this run
- `display_name`: human-readable label

The CLI may accept simple aliases, but it should normalize them before writing
ledger events.

### Priority 4 Definition Of Done

- Identity schema is documented.
- `ack` or equivalent activation stores normalized identity.
- Status output displays identity fields clearly.
- Tests cover alias input and normalized output.
- No docs imply that `client`, `model`, `role`, and `ledger_agent_id` are the
  same thing.

## Priority 5 - Make Bootstrap Produce An Install Plan

### Priority 5 Problem

Bootstrap copied many files, including root-adjacent project contract files.
The dry-run warned about this in prose, but the install was not represented as
a reviewable manifest.

For a plugin that will be installed into arbitrary repos, root writes must be
diffable, explicit, and auditable.

### Priority 5 Required Change

Dry-run should produce an install plan artifact.

Suggested artifact:

```text
.agents/install-plan.json
```

or, if the target does not yet have `.agents`:

```text
compound-install-plan.json
```

The plan should include:

- files to create
- files to modify
- files to skip
- files that would overwrite existing content
- root-level writes
- hook mutations
- ledger initialization behavior
- activation behavior
- warnings
- exact apply command

Root-level contract files such as `CLAUDE.md`, `package.json`, and
`package-lock.json` should be marked high-impact.

### Priority 5 Definition Of Done

- Dry-run emits a machine-readable install plan.
- Human-readable summary points to the plan.
- Tests cover new install, existing target, and conflict target.
- Root writes are explicitly classified.
- Apply mode can reference the dry-run plan or re-compute the same plan
  deterministically.

## Priority 6 - Clarify WARN Mode And ENFORCE Mode

### Priority 6 Problem

WARN mode is a good adoption default, but it can create false confidence if the
user thinks the harness is enforcing rules when it is only reporting them.

Long unattended sessions need ENFORCE mode or an explicit reason why WARN is
still acceptable.

### Priority 6 Required Change

Rename or document modes as compliance levels:

- `observe`: logs only
- `warn`: warns but does not block
- `enforce`: blocks invalid actions

If the code only supports WARN and ENFORCE today, document those honestly.

Every status output after activation should state:

- current mode
- what it blocks
- what it does not block
- how to switch to enforce
- recommended point to switch

Example:

```text
Mode: WARN
Meaning: reports missing task/DoD issues but does not block all actions.
For unattended agent execution: set COMPOUND_ENFORCE=1.
Recommended after: first smoke test passes.
```

### Priority 6 Definition Of Done

- README explains WARN and ENFORCE without ambiguity.
- Activation output includes current compliance level.
- Status output includes current compliance level.
- Tests prove WARN does not block and ENFORCE does block for at least one gate.
- First-session guidance recommends when to move to ENFORCE.

## Priority 7 - Improve First-Session UX

### Priority 7 Problem

The first session exposed too many internal concepts at once. GAP SCAN,
REGISTER, DoD, ledger, parked tasks, hooks, agent identity, WARN mode, and
activation all appeared before the user had seen the product create value.

This is powerful for builders but heavy for first-time users.

### Priority 7 Required Change

Create a concise first-session response template.

It should answer:

1. Is the harness installed?
2. Is the agent signed in?
3. What mode is active?
4. What can the user do next?
5. What will the harness do automatically with the next idea?

Recommended shape:

```text
Compound Agent System is active.

System: hooks installed, ledger ready, mode WARN.
Agent: <display_name> signed in as <role>.
Next: send a raw idea or a full project brief.

I will create an intake task, run GAP SCAN, propose defaults, assign agent
roles, and prepare importable phase tasks with DoD.
```

Detailed protocol output can be linked or placed under a "details" section.

### Priority 7 Definition Of Done

- Bootstrap completion output uses the new template.
- Agent activation output uses the new template.
- No duplicated role lines.
- No internal-only jargon appears without a short explanation.
- User-facing output gives one clear next action.
- Tests or snapshots cover the first-session output.

## Priority 8 - Make Fact-Forcing Gate Helpful, Not Mysterious

### Priority 8 Problem

Fact-Forcing Gate worked, but the block message was terse. It told the agent to
quote the user, but not why the gate existed or what kind of action triggered
it.

This is acceptable for expert operators, but not ideal for broader adoption.

### Priority 8 Required Change

Improve the gate message:

```text
[Fact-Forcing Gate]
First state-changing action in this session requires grounding in the user's
exact instruction.

Quote the current instruction verbatim, then retry the same operation.
```

Also review which commands should trigger the gate.

Recommended policy:

- read-only/status commands should not require fact-forcing
- state-changing commands such as `ack`, `open`, `park`, `done`, `register`,
  and writes should require it when appropriate

### Priority 8 Definition Of Done

- Gate message explains the reason, not only the action.
- Tests cover at least one blocked state-changing command.
- Tests cover at least one allowed read-only/status command.
- README or protocol docs explain the gate in user terms.

## Priority 9 - Treat Long CLI Sessions As A Product Surface

### Priority 9 Problem

The stated ambition is long, mostly uninterrupted agent development sessions.
That requires more than tasks and hooks. It requires resumability, checkpoints,
context refresh, and handoff surfaces designed for agents that may run for
hours.

The repo already contains handoff and token-budget concepts. The plugin should
surface them as part of the product story.

### Priority 9 Required Change

Define a "long-session readiness" path.

It should include:

- active task with DoD
- current phase
- last context refresh
- last compound register
- known blockers
- pending questions
- handoff checkpoint command
- resume prompt location
- compliance mode
- whether the session is safe for unattended work

Suggested command:

```powershell
node .agents/session-readiness.mjs
```

Example output:

```text
Long-session readiness: NOT READY
- current task: yes
- DoD: yes
- enforce mode: no
- handoff checkpoint: missing
- blockers: 2

Unlock:
1. set COMPOUND_ENFORCE=1
2. run node handoff-bridge.mjs checkpoint ...
3. answer or default blocker decisions
```

### Priority 9 Definition Of Done

- A readiness command or status section exists.
- It reports whether unattended execution is safe.
- It gives unlock steps when not ready.
- It integrates with existing handoff/checkpoint tools if present.
- Tests cover ready and not-ready scenarios.

## Priority 10 - Add Plan Artifact Standards

### Priority 10 Problem

The system should not only chat about a plan. It should produce artifacts that
future agents can import, verify, and execute.

### Priority 10 Required Change

Define standard Phase 0 artifacts for new projects.

Recommended artifacts:

- `PROJECT_BRIEF.md`
- `GAP_SCAN.md`
- `DECISIONS.md`
- `PHASE_PLAN.md`
- `OPEN_QUESTIONS.md`
- `AGENT_ROLES.md`
- `DOD_MATRIX.md`

`PHASE_PLAN.md` should include `.agents` plan markers or frontmatter so it can
be imported into `.agents/TASKS.json`.

### Priority 10 Definition Of Done

- Artifact list is documented.
- Idea intake can generate or preview these artifacts.
- `PHASE_PLAN.md` imports into `.agents`.
- Tests verify required artifacts exist for a sample idea.
- Tests verify phase markers are parseable.

## Priority 11 - Add Fixtures For Short And Long Ideas

### Priority 11 Problem

The test used a long, well-structured project brief. The harness must also work
when the user provides a vague sentence.

### Priority 11 Required Change

Add two fixture classes:

1. Short raw idea:

```text
Build an API engine that finds useful data sources and turns them into
reusable datasets.
```

1. Long project brief:
   Use a sanitized or shortened equivalent of API Alchemy Engine. It should
   contain enough structure to test GAP SCAN, decisions, roles, and phases.

The long fixture must not become the product being built. It is only a test
input for the harness.

### Priority 11 Definition Of Done

- Short idea fixture exists.
- Long idea fixture exists.
- Both run through idea intake.
- Both produce an intake/planning task.
- Both produce blockers/defaults.
- Both produce importable phase plan output.

## Priority 12 - Documentation For Devin And Other External Agents

### Priority 12 Problem

This plugin will be improved by different agents. The next agent should not
need the full chat history to understand the job.

### Priority 12 Required Change

Add a handoff section to the README or a dedicated document for external coding
agents.

It should tell Devin or another agent:

- what the package is
- what not to build
- what to preserve
- where the plugin payload lives
- where tests live
- what the upgrade priorities are
- what commands to run
- what DoD means
- what must be reported back

### Priority 12 Definition Of Done

- A Devin-ready handoff prompt exists in the repo.
- It references this spec.
- It explicitly says not to build API Alchemy Engine.
- It tells the agent to produce a plan before broad edits.
- It includes test and verification expectations.

## Suggested Work Order

Do the work in this order:

1. Add fixtures and output-quality tests.
2. Add idea-intake golden path in dry-run mode.
3. Add immediate intake/planning task creation.
4. Add recommended defaults in GAP SCAN output.
5. Add plan artifact generation and import markers.
6. Normalize agent identity.
7. Add install-plan manifest for bootstrap.
8. Clarify WARN/ENFORCE output.
9. Improve first-session response templates.
10. Improve Fact-Forcing Gate messages and trigger policy.
11. Add long-session readiness status.
12. Update README and external-agent handoff docs.

This order front-loads testability and prevents the agent from making broad UX
changes without a regression harness.

## Global Definition Of Done

The upgrade is complete only when all of the following are true:

- `node --test tests/*.test.mjs` passes in the plugin package or documented
  package test command passes if tests are scoped differently.
- A post-bootstrap smoke test proves idea to plan to ledger task to DoD to
  status.
- Short and long idea fixtures are covered.
- Output duplication/corruption is regression-tested.
- Agent identity is normalized and documented.
- Bootstrap dry-run emits an install plan.
- WARN/ENFORCE behavior is documented and tested.
- First-session output is concise and user-oriented.
- Fact-Forcing Gate explains why it blocks.
- Plan artifacts are importable into `.agents`.
- External-agent handoff docs exist.
- The API Alchemy Engine idea is used only as fixture material, not built.

## Success Standard

After this upgrade, a new user should be able to install the plugin into a new
repo, paste a one-sentence project idea, and get:

- a ledger task
- a GAP SCAN
- recommended defaults
- a phase plan
- agent roles
- DoD checks
- importable task markers
- a readiness signal for long-running agent execution

That is the bar. Anything less is still a promising protocol, but not yet the
10x project-start product this plugin is meant to become.

## Starter Prompt For Devin

Use this prompt when assigning the work to Devin or another coding agent:

```text
You are working on the Compound Agent System plugin.

Read:
- README.md
- bootstrap.mjs
- docs/reviews/compound-agent-system-product-upgrade-spec.md
- plugins/compound-agent-system/scripts/
- plugins/compound-agent-system/assets/system-files/.agents/
- existing tests

Task:
Upgrade the plugin according to the product upgrade spec.

Important scope:
- Do not build API Alchemy Engine.
- Use the API Alchemy Engine idea only as a long-form idea-intake fixture.
- Preserve bootstrap, hooks, ledger, DoD, Fact-Forcing Gate, WARN mode,
  GAP SCAN, CONTEXT REFRESH, and COMPOUND REGISTER.
- Improve first-session UX, idea intake, smoke verification, identity handling,
  install planning, output quality, and long-session readiness.

Before coding:
1. Summarize the current package architecture.
2. Identify which items in the spec are already covered.
3. Propose an implementation plan with files to change and tests to add.
4. Wait for confirmation before broad changes.

Definition of Done:
- Post-bootstrap smoke test proves idea -> plan -> ledger task -> DoD -> status.
- Idea intake always creates an intake/planning task immediately.
- Short and long idea fixtures are covered.
- Output duplication/corruption is regression-tested.
- Agent identity distinguishes client/model/role/session/ledger id.
- Bootstrap produces a clear install plan.
- WARN mode is documented as observe/report, not enforcement.
- First-session response is concise and user-oriented.
- Fact-Forcing Gate explains why it blocks.
- Long-session readiness is visible.
- Tests pass.
```
