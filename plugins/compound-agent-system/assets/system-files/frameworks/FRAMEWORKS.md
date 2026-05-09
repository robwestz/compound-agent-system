# Frameworks index

The installed Compound Agent System primarily uses the canonical contracts under `.agents/`. This directory exists for compatibility with package-generated plans that reference `frameworks/*`.

| Framework | Canonical source | Purpose |
|---|---|---|
| Compound Protocol | `.agents/PROTOCOL.md` | Task ledger, hooks, and session activation |
| Compound overlay | `.agents/COMPOUND.md` | GAP SCAN, CONTEXT REFRESH, COMPOUND REGISTER |
| Definition of Done | `.agents/DOD.md` | Active verification before completion |
| Skill selection | `.agents/SKILL_SELECT.md` | Perfect-fit / partial / miss workflow |
| Quality gate | `frameworks/QUALITY_GATE.md` | Per-deliverable review dimensions |

If a framework here conflicts with `.agents/*`, prefer `.agents/*` for live workspace operation.
