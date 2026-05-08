# Subagent Batch Execution Playbook

Use this playbook when a premium-production wave contains independent task files that can be worked in parallel without weakening the two-round evaluator standard.

## Eligibility gate

A task is eligible for a batch only when all of these are true:

- Its `Dependencies:` line is already `DONE` on `main` or is included earlier in the same explicitly ordered stack.
- Its expected edits do not overlap another batch task's primary files.
- It has a bounded placement decision: core plugin, optional skill, docs/playbook, external workbench, or test-only.
- Its DoD can be verified locally with deterministic commands or a documented manual approval.
- It does not require new runtime dependencies, secrets, destructive git operations, external API calls, or automatic agent spawning.

Do not batch dependent tasks. Do not batch two tasks that both need to rewrite the same CLI, schema, manifest section, or README section unless one is explicitly designated as the foundation PR and the other starts after it merges.

## Batch setup

1. Refresh `main` and verify the baseline:
   - `node plugins/compound-agent-system/scripts/validate-package.mjs`
   - `node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs`
2. Build a batch table with task number, dependency status, primary files, likely conflicts, branch name, owner, and stop condition.
3. Assign one implementer/evaluator pair per task. Same-session review is allowed only when the report discloses it is not independent.
4. Cap the batch at 10 pairs. Use fewer when several tasks touch shared package metadata, docs indexes, or `manifest.json`.

## Branch and PR naming

Use one branch and one PR per task:

```text
devin/<timestamp>-task-<nn>-<short-slug>
```

PR titles should start with the task placement and objective, for example:

```text
docs: add task 19 subagent batch playbook
test: harden task 25 Windows parity
```

Each PR body must link the task file, name the placement decision, list verification commands, include residual risks, and summarize both evaluator rounds.

## Evidence requirements

Every task PR must include:

- The completed task file updated to `Status: DONE`.
- A task report containing `Implementer:`, `Evaluator:`, and independence disclosure when needed.
- `## First completion`
- `## Self-review`
- `## Evaluator feedback round 1`
- `## Improvement 1`
- `## Evaluator feedback round 2`
- `## Improvement 2`
- `## Final signoff`
- Output from the package validator and affected focused tests.
- Full system-file test suite output before final push.

Validate the task report before signoff:

```bash
node plugins/compound-agent-system/assets/system-files/.agents/eval-loop.mjs docs/premium-production/tasks/<nn>-<slug>.md
```

For a target repo after installation, use:

```bash
node .agents/eval-loop.mjs docs/premium-production/tasks/<nn>-<slug>.md
```

## Merge ordering

Merge in dependency order, not completion order.

1. Foundation or schema PRs.
2. CLI/runtime PRs.
3. Tests and fixture PRs that depend on the runtime behavior.
4. Docs/playbook PRs that reference the final CLI names.
5. Release-readiness and acceptance PRs.

After each merge, refresh the remaining open branches against `main`, regenerate `manifest.json` from actual system-file byte counts, and rerun validator plus affected tests. Manifest conflicts are clerical only when the underlying files are independent; resolve them by recalculating bytes, not by choosing one side.

## Conflict rules

Before starting, each task declares its primary files. If two tasks plan to edit the same primary file, do one of the following:

- Split the shared foundation into a separate first PR.
- Reassign one task to depend on the other.
- Narrow one PR to docs/tests only.
- Stop the batch if neither task can be safely narrowed.

If a conflict is purely generated metadata (`manifest.json`) and the payload files are otherwise independent, regenerate metadata and continue. If the conflict is semantic, such as two PRs changing the same readiness rule, stop the affected tasks and ask for an ordering decision.

## Stop-batch conditions

Stop launching new tasks and park in-flight tasks when any of these occur:

- Baseline validator or full suite fails on fresh `main`.
- A merged foundation PR breaks two or more in-flight branches.
- A task needs a runtime dependency or a new external service.
- A security boundary changes without an approval matrix update.
- Two evaluator rounds leave a critical finding unresolved.
- A child session reports `running` or `claimed` with no progress long enough to threaten duplicate work; terminate or park it before manual fallback.

## Collision simulation

If task A and task B both declare `README.md` as a primary file:

1. Treat the collision as semantic, not clerical.
2. Choose one foundation owner for the README section.
3. Make the other task depend on that PR or move its change to a task-specific doc.
4. Only resume parallelism after the foundation PR merges and the dependent branch is refreshed.

This prevents a batch from producing two individually green PRs that cannot be reviewed or merged safely together.
