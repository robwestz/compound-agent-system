# Environment Workbench Contract

This contract defines how `robwestz/devin_workbench` may produce environment files for projects that consume the Compound Agent System harness.

## Ownership

| Area | Owner | Contract |
|---|---|---|
| Workbench generation logic | `robwestz/devin_workbench` | Owns prompts, templates, validation, and any repo-specific environment assembly. |
| Compound harness consumption | `robwestz/compound-agent-system` | Reads committed or generated environment artifacts as operator-provided inputs; it does not generate secrets or repo environments itself. |
| Target repository | The project being bootstrapped | Owns accepted environment files, local overrides, and policy decisions about credentials, services, and test data. |

The plugin core must remain portable and dependency-free. Environment generation belongs in the workbench or project-specific files, not in `.agents/task.mjs`, bootstrap, hooks, or install logic.

## Inputs

The workbench may consume:

- target repo name and checkout path
- package manager and runtime versions
- test/build commands
- required local services
- non-secret defaults
- references to secret names, never secret values
- project-specific notes about setup, fixtures, and browser login needs

Secrets must be referenced as names such as `GITHUB_TOKEN`, `OPENROUTER_API_KEY`, or repo-scoped secret placeholders. The generated output must not contain live credentials.

## Outputs

The minimal environment handoff file is Markdown plus optional machine-readable blocks:

```markdown
# Devin Environment Handoff

repo: robwestz/compound-agent-system
generated_by: robwestz/devin_workbench
schema: devin-environment-handoff.v1

## Required runtime

- Node: >=18
- Package manager: npm only if project scripts require it

## Commands

- Validate package: `node plugins/compound-agent-system/scripts/validate-package.mjs`
- Full tests: `node --test plugins/compound-agent-system/assets/system-files/tests/*.test.mjs`

## Secrets

None required for deterministic harness tests.

## Local services

None required.

## Failure modes

- Missing Node >=18: install or select a supported Node runtime.
- Missing generated artifacts: run the workbench again and compare against this contract.
```

The workbench may also produce `.env.example`, `.devin/environment.md`, or repo-specific setup notes if the target project wants those files. Machine-readable outputs must include a schema name and version.

## Failure modes and escalation

| Failure | Safe action | Escalate when |
|---|---|---|
| Missing workbench output | Continue with repo README/test discovery and record that no environment handoff exists. | The task explicitly depends on workbench output. |
| Secret placeholder unresolved | Request the named secret using Devin secret storage options. | The workflow cannot run without the secret. |
| Conflicting runtime versions | Prefer the target repo's committed config over generated notes. | The repo has no authoritative config and tests disagree. |
| Generated command fails | Treat the failure as environment evidence, not as permission to edit plugin core. | The command is required for DoD and no safe workaround exists. |
| Workbench suggests plugin-core changes | Reject by default; create a separate design task. | The user explicitly approves a core/plugin boundary change. |

## What must remain out of plugin core

- provider-specific cloud setup
- generated `.env` or credential files
- per-project IDE settings
- organization-only VPN, registry, or SSO setup
- browser login automation for a single app
- runtime dependencies for environment generation
- mutable machine snapshot assumptions

The harness may document how to consume those artifacts, but the workbench owns their generation.

## Acceptance criteria

A new Devin session should be able to infer:

1. which repo owns generation logic
2. which repo consumes the result
3. what input data is allowed
4. what output files are expected
5. which failures are safe to auto-recover
6. which failures require manual escalation
