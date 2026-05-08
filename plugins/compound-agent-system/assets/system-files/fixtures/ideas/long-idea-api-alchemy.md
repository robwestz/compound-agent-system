# API Alchemy Engine — sanitized fixture

Fixture purpose: Long-form idea for idea-intake, blocker, first-slice, role-map, and golden-path regression tests.
Not-to-build: This is a sanitized fixture-only product idea; do not implement the API Alchemy Engine while working on the plugin.

## Vision

Build a local-first planning tool that helps a developer discover useful public data sources, evaluate their reliability, and convert them into reusable dataset definitions. This is fixture content for testing Compound Agent System idea intake only; do not build this product as part of plugin work.

## Target users

- Solo developers who need quick dataset prototypes.
- Data analysts who want repeatable source evaluation notes.
- Product teams validating whether an external API can support a feature.

## Core features

1. Source discovery: collect candidate APIs, feeds, and public files for a domain.
2. Adapter registry: record how each source is authenticated, queried, paginated, and normalized.
3. Dataset composer: turn source fields into reusable dataset manifests with provenance.
4. Quality scoring: flag stale documentation, unclear licensing, sparse records, and rate-limit risk.
5. Export path: emit a project-ready dataset definition and open implementation questions.

## Technical constraints

- Prefer local files and deterministic scripts for the first version.
- Keep secrets out of fixtures and generated plans.
- Support manual review before state-changing ingestion.
- Do not require runtime dependencies for this test fixture.
- Generated output must include phases, roles, DoD, blockers, and recommended defaults.

## Open questions

- Should the registry be global across projects or local to each project?
- Which source types should be supported first: REST APIs, CSV files, RSS feeds, or all three?
- How strict should licensing checks be before a dataset can be reused?
- Should the first implementation include a browser UI or CLI-only workflow?
- What is the minimum acceptable provenance record for each dataset field?
