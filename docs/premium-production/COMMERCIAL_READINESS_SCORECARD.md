# Commercial Readiness Scorecard

Use this scorecard in every evaluator round.

| Dimension | Premium bar | Hard fail example |
|---|---|---|
| Installability | Fresh target repo install works and explains next step. | Install succeeds but leaves user unsure what to run. |
| Determinism | Tests and generated artifacts are repeatable without network. | Output changes without input changes. |
| Recovery | Broken state has a clear diagnostic and repair path. | User must inspect JSON manually to recover. |
| Security | Secrets, network, and AI calls are explicit opt-in. | Optional AI path can run silently with ambient credentials. |
| Modularity | Core stays small; optional workflows live as skills/playbooks/docs. | Every improvement is copied into the core payload. |
| Cross-client support | Claude/Codex surfaces remain portable. | A feature only works in one client without fallback. |
| UX clarity | CLI output names status, risk, and next action. | Output uses internal jargon without user action. |
| Observability | Failures can be exported as support evidence. | Debugging requires reproducing on the user's machine. |
| Compatibility | Node/OS/client assumptions are documented and tested. | Works only on one unrecorded developer environment. |
| Release discipline | Package validation, tests, and rollback are part of release. | Release is "merge and hope". |

## Minimum score

A task is complete only when every applicable dimension is either:

- **Pass**: verified by command, fixture, or reviewer evidence.
- **Not applicable**: justified in the task report.

"Partial pass" is not premium production.
