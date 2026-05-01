# 23 — Support bundle export

## Metadata

- Status: NOT_STARTED
- Placement: core plugin
- Suggested skill: compound-agent-system
- Dependencies: 22-observability-event-log
- Parallel wave: 5
- Risk: medium; support bundles can leak private content.

## Objective

Create a safe support bundle export that collects diagnostics, versions, config summaries, recent events, and redacted ledger state.

## DoD

- [ ] Export command creates a local archive or folder with documented contents.
- [ ] Redaction rules are explicit and tested.
- [ ] Bundle includes doctor output and readiness state.
- [ ] User gets a review-before-share warning.
- [ ] Two evaluator feedback rounds are completed and addressed.

## Constraints

- No automatic upload.
- No raw secrets, tokens, or full idea text unless user opts in.

## Quality bar

Premium: support can diagnose without asking for a full repo dump.

## Evaluation prompt

Seed fake secrets and verify they are not present in the bundle.
