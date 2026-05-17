# Adoption Map

This is the operator map for turning the repository from "many premium-production
PRs landed" into a repo that a new agent can use correctly on the first run.

## Current source of truth

Use `origin/main` as the canonical branch. The task-28 branch
`devin/1778279235-task-28-approval-boundaries` is already merged into
`origin/main` and has no remaining diff against it.

For release-candidate status, prefer these files in this order:

1. `docs/premium-production/TASK_EVIDENCE_MATRIX.md`
2. `docs/premium-production/FINAL_ACCEPTANCE_REPORT.md`
3. `README.md`
4. Individual task files under `docs/premium-production/tasks/` as supporting
   evidence only

If these disagree, treat the disagreement as a documentation blocker, not as a
reason to start another feature branch. The repo has enough feature surface; the
next useful work is making the accepted path unambiguous.

## Why repeated "done" claims still felt unusable

The result was technically improved but operationally hard to trust because the
work landed as many small branches and task PRs before there was a single
adoption map. That creates three failure modes:

- **Status fragmentation:** README, task files, task evidence, branch names, and
  PR history can tell different stories unless one source of truth is named.
- **Branch clutter:** merged remote branches remain visible and look like
  unfinished work even when their commits are already in `main`.
- **No first-use owner:** tests can pass while the operator still lacks a
  concise "start here, then run this, then stop if this fails" path.

The fix is not "use a stronger model" by itself. The fix is to force every agent,
including Devin, through a smaller operating contract with explicit branch,
evidence, and adoption gates.

## Canonical first-use path

After installing the harness into a target repository, use this sequence:

```bash
node .agents/task.mjs status
node .agents/task.mjs doctor
node .agents/agent-activate.mjs --id <agent-id> --role planner --skill compound-agent-system
node .agents/first-session-wizard.mjs
```

Then capture the project idea and import the generated plan:

```bash
node .agents/idea-intake.mjs --input idea.md --apply
node .agents/task.mjs status
node .agents/task.mjs import phase-0/PHASE_PLAN.md --apply
node .agents/session-readiness.mjs
```

Only move into unattended implementation when `session-readiness.mjs` reports
`READY`. If it reports `NOT_READY`, follow its unlock steps instead of asking the
model to improvise.

## How to make Devin useful on this repo

Use Devin like a PR-producing engineer inside this protocol, not like an
unbounded chat agent.

### Good task shape

Give one task at a time:

```text
Repo: robwestz/compound-agent-system.
Start from latest main on branch devin/<timestamp>-short-name.
Read CLAUDE.md and the relevant doc/task file.
Change only <specific files or domain>.
Do not expand scope.
Run:
- node plugins/compound-agent-system/scripts/validate-package.mjs
- node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs
Create PR, wait for CI, and report PR URL/status/tests.
Do not merge.
```

### Required acceptance gates

For this repository, a Devin task is not complete until it reports:

- branch name
- PR URL
- files changed
- validator result
- full system-file suite result
- CI result
- any review comments addressed or explicitly left open
- whether `origin/main` already contains the work

If the work is docs-only, the same reporting still applies. The validator and
full suite are cheap enough and catch stale manifests or bundled-doc drift.

### When to use a stronger model

Changing the driver model can help with architecture, contradiction spotting, and
review. It does not replace repo hygiene.

Use the highest-reasoning model available for:

- designing the operating model
- reviewing branch disposition
- resolving contradictory task status
- changing safety boundaries, readiness gates, approval policy, or install logic

Standard implementation agents are acceptable for:

- narrow docs updates
- focused tests
- mechanical manifest updates
- small CLI fixes with clear expected behavior

Do not use model choice as the primary control. The primary control is a
single-task branch, explicit DoD, deterministic tests, PR review, and no merge
until the evidence is readable.

## Branch disposition

As of this audit, there are 34 remote branches excluding `origin/HEAD`:

- `origin/main` is the canonical branch.
- 29 non-main remote branches are already merged into `origin/main`.
- 4 are not merged into `origin/main`.

No branch should be deleted automatically. Deletion is a must-ask destructive-git
action and requires explicit operator approval.

### Already merged branches

These branches can be considered archive/delete candidates after operator
approval because their commits are reachable from `origin/main`:

- `chore/move-package-to-root`
- `devin/1777510462-compound-upgrade`
- `devin/1777626868-upgrade-package-2`
- `devin/1777642698-premium-production-task-catalog`
- `devin/1777646031-wave-1-premium-hardening`
- `devin/1777648406-wave-2-premium-hardening`
- `devin/1777653110-compatibility-matrix`
- `devin/1777653129-handoff-contract-v2`
- `devin/1777653138-idea-intake-benchmarks`
- `devin/1777653212-first-session-guided-wizard`
- `devin/1777814463-observability-event-log`
- `devin/1777814463-observability-event-log-clean`
- `devin/1777822138-planning-red-team-corpus`
- `devin/1777823456-role-orchestration-runtime`
- `devin/1777833863-session-readiness-premium-gate`
- `devin/1778215783-evaluator-feedback-loop-runner`
- `devin/1778235065-support-bundle-export`
- `devin/1778279235-task-28-approval-boundaries`
- `devin/1778279236-task-25-windows-powershell-parity`
- `devin/1778279238-task-26-docs-ia`
- `devin/1778279242-task-27-examples-fixtures`
- `devin/1778280173-task-19-subagent-batch-playbook`
- `devin/1778282068-final-premium-wave`
- `devin/1778298719-housekeeping-release-polish`
- `devin/1778303168-payload-identity-cleanup`
- `devin/update-skills-1777639156`
- `devin/update-skills-1778251941`
- `ecc-tools/compound-agent-system-1777627342298`
- `fix/review-feedback-grounding-readiness`

### Unmerged branches

These branches need an explicit disposition decision:

| Branch | Ahead of `origin/main` | Recommended action |
|---|---:|---|
| `devin/1777817043-task-17-role-orchestration` | 2 commits | Compare against PR #19 and current `role-plan.mjs`; cherry-pick only if it contains missing role-plan behavior, otherwise close/archive. |
| `devin/1777821224-task-21-session-readiness-premium-gate` | 3 commits | Compare against PR #20 and current `session-readiness.mjs`; likely superseded by later readiness work, but inspect before closing. |
| `devin/1777824660-planning-quality-red-team` | 1 commit | Compare against PR #18 and current planning-quality fixtures; cherry-pick if any red-team fixture is still absent. |
| `devin/update-skills-1778297913` | 1 commit | Review skill text only; either merge as a small skills-doc PR or close if superseded. |

Do this as a separate branch-disposition PR before deleting branches. The PR
should say "keep", "cherry-pick", or "delete after merge" for each unmerged
branch.

## What not to do next

- Do not start more premium-production feature tasks until the status sources
  agree or the disagreement is intentionally documented.
- Do not delete remote branches from inside an implementation task.
- Do not treat a passing test suite as proof that the repository is easy to
  adopt; first-run usability needs its own operator-facing evidence.
- Do not spawn multiple agents until `docs/manual-approval-boundaries.md` approval
  scope for multi-agent spawning is satisfied.

## Minimal next PR after this map

Open a branch-disposition PR that performs no feature work:

1. Inspect each of the four unmerged branches.
2. For each, decide `keep`, `cherry-pick`, or `close/delete-after-approval`.
3. Run validator and the full system-file suite.
4. Ask for explicit approval before any branch deletion.
