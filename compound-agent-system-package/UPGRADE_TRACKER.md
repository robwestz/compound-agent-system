# Upgrade Tracker

Living tracker for `compound-agent-system-product-upgrade-spec.md`. Status values: `NOT_STARTED`, `IN_PROGRESS`, `DONE`.

## Cross-phase notes

- Initial full-suite pre-work run failed before feature edits: `tests/assemble.test.mjs` could not import missing `zip-builder.mjs`; `tests/node-runtime.test.mjs` saw ANSI-colored stdout under Node 22. They were tracked as pre-existing during phase work and are now fixed in this upgrade so the full suite passes.
- Onboarding references `frameworks/FRAMEWORKS.md` and catalog data files that are not present in this package payload.
- The API Alchemy Engine concept is fixture material only; it must not be built.

## Phase 1: Fixtures + Output Quality

Status: DONE

DoD checklist:
- [x] A deterministic markdown quality checker exists.
- [x] Tests include a passing clean output fixture.
- [x] Tests include a failing duplicated-section fixture.
- [x] Tests include a failing repeated-blocker fixture.
- [x] The long-idea fixture runs through this checker.
- [x] The README or skill docs say generated planning output must pass this check before it is treated as an artifact.

Verification command(s):
- `node --test plugins/compound-agent-system/assets/system-files/tests/check-output-quality.test.mjs`
- `node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs`

Notes:
- Phase-specific test passes (`pass 4`, `fail 0`).
- Earlier full-suite baseline failures (missing bundled assembly support files and Node 22 colorized output) are fixed in this upgrade; full suite now passes (`pass 110`, `fail 0`).

## Phase 2: Idea Intake Golden Path (P0, P1, P2)

Status: DONE

DoD checklist:
- [x] A test fixture with a one-line idea exists.
- [x] A test fixture with the long API Alchemy Engine idea exists or is represented by a shortened but structurally equivalent fixture.
- [x] Running the golden-path smoke test creates or previews an intake/planning task.
- [x] The generated task has at least one DoD check.
- [x] The generated plan contains planner, executor, reviewer, and verifier roles.
- [x] The generated plan contains `.agents` import markers or an equivalent import artifact.
- [x] A status command proves the task exists in `.agents/TASKS.json`.
- [x] The test fails if the implementation only prints prose and does not create machine-readable task or plan state.
- [x] Documentation states intake/planning opens before blocker questions.
- [x] Tests prove implementation tasks are not opened prematurely.
- [x] Every blocker includes a recommended default and proceed/no-proceed policy.

Verification command(s):
- `node --test plugins/compound-agent-system/assets/system-files/tests/idea-intake.test.mjs`
- `node .agents/idea-intake.mjs --input fixtures/ideas/simple-idea.md --apply && node .agents/task.mjs status`
- `node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs`

Notes:
- Phase-specific idea-intake test passes (`pass 5`, `fail 0`).
- Smoke command passed in a temp workspace: `node .agents/idea-intake.mjs --input fixtures/ideas/simple-idea.md --apply`, then `node .agents/task.mjs status` showed the intake task.
- Earlier full-suite baseline failures (missing bundled assembly support files and Node 22 colorized output) are fixed in this upgrade; full suite now passes (`pass 110`, `fail 0`).

## Phase 3: Plan Artifact Standards (P10)

Status: DONE

DoD checklist:
- [x] Artifact list is documented.
- [x] Idea intake can generate or preview the seven Phase 0 artifacts.
- [x] `PHASE_PLAN.md` imports into `.agents`.
- [x] Tests verify required artifacts exist for a sample idea.
- [x] Tests verify phase markers are parseable.

Verification command(s):
- `node --test plugins/compound-agent-system/assets/system-files/tests/idea-intake.test.mjs`
- `node .agents/task.mjs import phase-0/PHASE_PLAN.md --apply`
- `node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs`

Notes:
- Covered by `idea-intake.test.mjs`: all seven artifacts are generated, `PHASE_PLAN.md` has active frontmatter and `[COMPOUND-PHASE]` markers, and `task.mjs import` succeeds.
- Earlier full-suite baseline failures (missing bundled assembly support files and Node 22 colorized output) are fixed in this upgrade; full suite now passes (`pass 110`, `fail 0`).

## Phase 4: Normalize Agent Identity (P4)

Status: DONE

DoD checklist:
- [x] Identity schema is documented.
- [x] Activation stores normalized identity.
- [x] Status output displays identity fields clearly.
- [x] Tests cover alias input and normalized output.
- [x] No docs imply that client, model, role, and ledger_agent_id are the same thing.

Verification command(s):
- `node --test plugins/compound-agent-system/assets/system-files/tests/agents-task.test.mjs`
- `node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs`

Notes:
- Phase-specific `agents-task.test.mjs` passes (`pass 22`, `fail 0`) with alias normalization and status assertions.
- Earlier full-suite baseline failures (missing bundled assembly support files and Node 22 colorized output) are fixed in this upgrade; full suite now passes (`pass 110`, `fail 0`).

## Phase 5: Bootstrap Install Plan (P5)

Status: DONE

DoD checklist:
- [x] Dry-run emits a machine-readable install plan.
- [x] Human-readable summary points to the plan.
- [x] Tests cover new install, existing target, and conflict target.
- [x] Root writes are explicitly classified.
- [x] Apply mode can reference the dry-run plan or re-compute the same plan deterministically.

Verification command(s):
- `node --test plugins/compound-agent-system/assets/system-files/tests/bootstrap-install-plan.test.mjs`
- `node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs`

Notes:
- Phase-specific bootstrap install-plan test passes (`pass 4`, `fail 0`).
- Earlier full-suite baseline failures (missing bundled assembly support files and Node 22 colorized output) are fixed in this upgrade; full suite now passes (`pass 110`, `fail 0`).

## Phase 6: WARN/ENFORCE + Observe Mode (P6)

Status: DONE

DoD checklist:
- [x] README explains WARN and ENFORCE without ambiguity.
- [x] Activation output includes current compliance level.
- [x] Status output includes current compliance level.
- [x] Tests prove WARN does not block and ENFORCE does block for at least one gate.
- [x] First-session guidance recommends when to move to ENFORCE.

Verification command(s):
- `node --test plugins/compound-agent-system/assets/system-files/tests/agents-task.test.mjs`
- `node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs`

Notes:
- Phase-specific `agents-task.test.mjs` passes (`pass 26`, `fail 0`) with observe/warn/enforce assertions and compliance status output.
- README documentation lands in Phase 10.
- Earlier full-suite baseline failures (missing bundled assembly support files and Node 22 colorized output) are fixed in this upgrade; full suite now passes (`pass 110`, `fail 0`).

## Phase 7: First-Session UX (P7)

Status: DONE

DoD checklist:
- [x] Bootstrap completion output uses the new template.
- [x] Agent activation output uses the new template.
- [x] No duplicated role lines.
- [x] No internal-only jargon appears without a short explanation.
- [x] User-facing output gives one clear next action.
- [x] Tests or snapshots cover the first-session output.

Verification command(s):
- `node --test plugins/compound-agent-system/assets/system-files/tests/first-session-output.test.mjs`
- `node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs`

Notes:
- Phase-specific first-session output test passes (`pass 3`, `fail 0`).
- Earlier full-suite baseline failures (missing bundled assembly support files and Node 22 colorized output) are fixed in this upgrade; full suite now passes (`pass 110`, `fail 0`).

## Phase 8: Fact-Forcing Gate (P8)

Status: DONE

DoD checklist:
- [x] Gate message explains the reason, not only the action.
- [x] Tests cover at least one blocked state-changing command.
- [x] Tests cover at least one allowed read-only/status command.
- [x] README or protocol docs explain the gate in user terms.

Verification command(s):
- `node --test plugins/compound-agent-system/assets/system-files/tests/agents-task.test.mjs`
- `node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs`

Notes:
- Phase-specific `agents-task.test.mjs` passes (`pass 29`, `fail 0`) with Fact-Forcing Gate state-changing/read-only coverage.
- README/protocol user-facing explanation lands in Phase 10.
- Earlier full-suite baseline failures (missing bundled assembly support files and Node 22 colorized output) are fixed in this upgrade; full suite now passes (`pass 110`, `fail 0`).

## Phase 9: Long-Session Readiness (P9)

Status: DONE

DoD checklist:
- [x] A readiness command or status section exists.
- [x] It reports whether unattended execution is safe.
- [x] It gives unlock steps when not ready.
- [x] It integrates with existing handoff/checkpoint tools if present.
- [x] Tests cover ready and not-ready scenarios.

Verification command(s):
- `node --test plugins/compound-agent-system/assets/system-files/tests/session-readiness.test.mjs`
- `node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs`

Notes:
- Phase-specific session-readiness test passes (`pass 3`, `fail 0`).
- Earlier full-suite baseline failures (missing bundled assembly support files and Node 22 colorized output) are fixed in this upgrade; full suite now passes (`pass 110`, `fail 0`).

## Phase 10: Documentation (P12)

Status: DONE

DoD checklist:
- [x] A Devin-ready handoff prompt exists in the repo.
- [x] It references the upgrade spec.
- [x] It explicitly says not to build API Alchemy Engine.
- [x] It tells the agent to produce a plan before broad edits.
- [x] It includes test and verification expectations.
- [x] Package validation passes with all new required files.
- [x] Full test suite passes or pre-existing failures are documented separately.

Verification command(s):
- `node plugins/compound-agent-system/scripts/validate-package.mjs`
- `node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs`

Notes:
- Package validation passes.
- Focused upgraded-suite verification passes (`pass 48`, `fail 0`) across new/modified phase tests.
- README now documents compliance modes, identity model, idea-intake usage, plan artifacts, Fact-Forcing Gate, and long-session readiness.
- Earlier full-suite baseline failures (missing bundled assembly support files and Node 22 colorized output) are fixed in this upgrade; full suite now passes (`pass 110`, `fail 0`).
