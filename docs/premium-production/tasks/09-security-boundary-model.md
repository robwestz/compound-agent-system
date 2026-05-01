# 09 — Security boundary model

## Metadata

- Status: NOT_STARTED
- Placement: docs/core plugin
- Suggested skill: skill-development if no security-review skill exists
- Dependencies: 04-environment-workbench-contract
- Parallel wave: 2
- Risk: high; security policy must be explicit.

## Objective

Document and enforce boundaries for local files, hooks, secrets, optional AI, external APIs, and generated artifacts.

## DoD

- [ ] Security model documents trust boundaries and default-deny behavior.
- [ ] Optional AI and external API paths are opt-in only.
- [ ] Tests or assertions prove fixtures contain no secrets.
- [ ] Installer and idea-intake docs reflect the boundary model.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- No credential discovery features.
- Do not add network behavior to core tests.

## Quality bar

Premium: security posture is reviewable before enterprise use.

## Evaluation prompt

Look for any path that can call network or read secrets without explicit user approval.
