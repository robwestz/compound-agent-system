# Premium Production Roadmap

This directory is the task catalog for moving Compound Agent System from strong beta / early production candidate to premium commercial production quality.

The purpose of this PR is planning only: no implementation is included here. Each task is intentionally small enough to assign to one implementer/evaluator pair while still demanding finished-product quality.

## Premium standard

Every task must satisfy this bar:

- Commercial-grade behavior: installable, diagnosable, recoverable, documented, and deterministic.
- No runtime dependencies unless explicitly approved.
- No API Alchemy Engine build; fixture material only.
- Plugin-size discipline: classify output as `core plugin`, `optional skill`, `docs/playbook`, `external workbench`, or `test-only`.
- Two feedback rounds minimum after the first complete implementation.
- Machine-verifiable tests where possible; manual acceptance only for UX/product judgment.

## Execution model

Use `OPERATING_MODEL.md` for the agent-batch protocol. Do not start with all tasks in parallel. Run by wave:

1. **Foundation blockers**: Tasks 01-08.
2. **Security, modularity, and policy**: Tasks 09-13.
3. **Product UX and benchmarks**: Tasks 14-17.
4. **Agent orchestration and eval loop**: Tasks 18-21.
5. **Supportability and compatibility**: Tasks 22-27.
6. **Release readiness and meta-acceptance**: Tasks 28-32.

## Task index

| ID | Task | Placement | Parallel wave |
|---|---|---|---|
| 01 | Golden-path E2E suite | test-only | 1 |
| 02 | Failure recovery suite | test-only/core plugin | 1 |
| 03 | Diagnostics doctor CLI | core plugin | 1 |
| 04 | Environment workbench contract | external workbench/docs | 1 |
| 05 | Install, rollback, uninstall | core plugin | 1 |
| 06 | Ledger schema migrations | core plugin | 1 |
| 07 | Hook idempotency cross-client hardening | core plugin | 1 |
| 08 | Compliance mode policy hardening | core plugin | 1 |
| 09 | Security boundary model | docs/core plugin | 2 |
| 10 | Secrets and optional AI policy | docs/core plugin | 2 |
| 11 | Supply-chain and package integrity | core plugin/test-only | 2 |
| 12 | Plugin size budget and modularity | docs/test-only | 2 |
| 13 | Error-message UX pass | core plugin/docs | 2 |
| 14 | First-session guided wizard | core plugin | 3 |
| 15 | Real-world idea benchmark corpus | test-only | 3 |
| 16 | Planning-quality red-team corpus | test-only | 3 |
| 17 | Agent role orchestration runtime | core plugin/optional skill | 3 |
| 18 | Evaluator feedback loop runner | optional skill/test-only | 4 |
| 19 | Subagent batch execution playbook | docs/playbook | 4 |
| 20 | Handoff contract v2 | core plugin/docs | 4 |
| 21 | Session readiness premium gate | core plugin | 4 |
| 22 | Observability event log | core plugin | 5 |
| 23 | Support bundle export | core plugin | 5 |
| 24 | Compatibility matrix | test-only/docs | 5 |
| 25 | Windows PowerShell parity | test-only/core plugin | 5 |
| 26 | Documentation information architecture | docs | 5 |
| 27 | Examples and fixture curation | docs/test-only | 5 |
| 28 | Manual approval boundaries | docs/core plugin | 6 |
| 29 | Performance and scale limits | test-only/docs | 6 |
| 30 | Marketplace release readiness | docs/packaging | 6 |
| 31 | Backward compatibility contract | test-only/docs | 6 |
| 32 | Commercial acceptance metatest | test-only/docs | 6 |

## Done for the full roadmap

- Every task file has status, scope, placement, dependencies, DoD, constraints, quality bar, suggested skill, evaluator role, and required feedback loops.
- All tasks can be imported into a project plan or assigned to implementer/evaluator pairs without additional interpretation.
- The final commercial acceptance metatest can verify that the first 31 tasks actually compose into a premium harness.
