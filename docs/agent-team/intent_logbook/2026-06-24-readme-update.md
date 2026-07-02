# Intent Memory — README root update

- id: readme-update-2026-06-24
- timestamp: 2026-06-24T00:00:00+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-24-readme-update.md`
- status: reviewed

## Core intention

Keep the root README as an accurate, single-glance orientation for any agent or human entering this repo — not a changelog, but a current snapshot.

## Logic followed

README tracks the *current* system state, not history. When modules are added, directories change, or numbers drift, the README becomes misleading without an update. The Gastronovi connector, shift sessions, and screenshot evidence represent material additions since the last update.

## Design assumptions

- Module count is an approximate KPI (derived, not re-counted from filesystem)
- Screenshot evidence location (`assets/Screenshots/01-tabs/`) is stable enough to document

## Tradeoffs

- Accepted: approximate module count rather than doing a full filesystem audit (docs-only slice, not worth L2 scope)
- Rejected: Adding a detailed changelog section — README is an orientation doc, not a log

## Durable memory

- README stand-date should be updated whenever a new module, integration, or significant structural change lands
- The `tools/` directory contains `skill-architecture-auditor` and audit scripts — worth keeping in the structure overview
- Gastronovi connector lives at `apps/api/src/modules/gastronovi/` — document in Externe Systeme section

## Do not reuse blindly

- Module count (20) was inferred, not counted — re-verify if precision matters

## Relation to Rauschenberger OS / Bevero

- external-system boundary: Gastronovi is now a documented external system with a source connector

## Next logic gate

Commit README + all uncommitted screenshot assets in one clean commit.
