# 07 — Hook idempotency cross-client hardening

## Metadata

- Status: NOT_STARTED
- Placement: core plugin
- Suggested skill: compound-agent-system
- Dependencies: 03-diagnostics-doctor-cli
- Parallel wave: 1
- Risk: medium; client-specific assumptions can leak.

## Objective

Harden hook activation so repeated activation is idempotent and Claude/Codex portability remains explicit.

## DoD

- [ ] Tests prove repeated activation does not duplicate hooks.
- [ ] Doctor reports hook ownership and client support status.
- [ ] Docs state what is Claude-only, Codex-only, and shared.
- [ ] Activation handles missing settings files gracefully.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Preserve existing hook tags and behavior.
- No client-specific hardcoding without fallback.

## Quality bar

Premium: activation is safe to run repeatedly.

## Evaluation prompt

Run activation three times on mixed existing settings and inspect hook output.
