# 10 — Secrets and optional AI policy

## Metadata

- Status: NOT_STARTED
- Placement: docs/core plugin
- Suggested skill: compound-agent-system
- Dependencies: 09-security-boundary-model
- Parallel wave: 2
- Risk: high; optional AI must not compromise determinism.

## Objective

Define how optional `--ai` behavior, LLM keys, and future secrets are requested, scoped, saved, and tested.

## DoD

- [ ] Policy states deterministic non-AI path is always supported.
- [ ] CLI output clearly says when AI is unavailable or skipped.
- [ ] Tests cover `--ai` with no key and deterministic fallback behavior.
- [ ] Docs include secret naming and storage expectations without real secrets.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- No secrets in repo.
- No tests that require live LLM providers.

## Quality bar

Premium: optional AI enhances output without becoming a hidden dependency.

## Evaluation prompt

Run with no keys, bogus keys, and AI flag disabled; behavior must be safe and clear.
