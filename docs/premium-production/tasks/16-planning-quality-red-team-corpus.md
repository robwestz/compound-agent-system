# 16 — Planning-quality red-team corpus

## Metadata

- Status: DONE
- Placement: test-only
- Suggested skill: compound-agent-system
- Dependencies: 15-idea-intake-realworld-benchmarks
- Parallel wave: 3
- Risk: medium; quality gates can become superficial.

## Objective

Create failing planning fixtures for generic phases, missing DoD, role mismatch, repeated sections, missing blocker metadata, unsafe defaults, and unimportable markers.

## DoD

- [x] Red-team corpus covers at least 10 distinct failure types.
- [x] Each failure has a specific issue type.
- [x] Good generated outputs still pass.
- [x] Docs explain how to add new quality checks without overfitting.
- [x] Two evaluator feedback rounds are completed and addressed.

## Constraints

- Do not require LLM evaluation.
- Avoid fragile prose-only assertions where structure can be checked.

## Quality bar

Premium: bad plans fail for named, actionable reasons.

## Evaluation prompt

Try to sneak a polished but generic plan through the checker.

## Evidence

- Added a deterministic red-team corpus under `plugins/compound-agent-system/assets/system-files/fixtures/planning-quality/` covering 15 fixtures and 17 named issue types: generic phases, generic-only phase names, missing `first_vertical_slice`, missing phase DoD, missing role ownership, duplicate phase id, duplicate phase goal, duplicate planning section, five missing blocker metadata fields, unimportable marker, marker/frontmatter mismatch, role-owner mismatch, and unsafe external API defaults.
- Extended `plugins/compound-agent-system/assets/system-files/.agents/check-planning-quality.mjs` with scoped structural checks only; no runtime dependencies and no LLM evaluation.
- Extended `plugins/compound-agent-system/assets/system-files/tests/check-planning-quality.test.mjs` so each fixture must fail with its expected issue type and the corpus must retain at least 10 distinct issue types.
- Documented the extension workflow in `plugins/compound-agent-system/assets/system-files/README.md` and `plugins/compound-agent-system/skills/compound-agent-system/SKILL.md`: add focused fixtures first, assert exact issue types, prefer structural fields over prose matching, and keep good generated output passing.
- Feedback round 1 finding: the unsafe external API default detector overreached into later blocker lines and failed a good real-world benchmark. Addressed by bounding the check to the current blocker block and rerunning focused idea-intake/planning tests.
- Feedback round 2 finding: new required fixture files were not listed in package validation. Addressed by adding them to `plugins/compound-agent-system/scripts/validate-package.mjs` and refreshing manifest byte metadata.

## Verification

- `node plugins/compound-agent-system/scripts/validate-package.mjs` — pass; payload size 588233 bytes across 146 files.
- `cd plugins/compound-agent-system/assets/system-files && node --test tests/check-planning-quality.test.mjs` — pass 2, fail 0.
- `cd plugins/compound-agent-system/assets/system-files && node --test tests/idea-intake.test.mjs tests/check-planning-quality.test.mjs` — pass 13, fail 0.
- `cd plugins/compound-agent-system/assets/system-files && node --test tests/*.test.mjs` — pass 167, fail 0.
