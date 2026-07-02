# Intent Memory — Kitchen route 500 recovery

- id: kitchen-route-500-recovery-2026-06-20
- timestamp: 2026-06-20T23:00:00+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-20-kitchen-route-500-recovery.md`
- status: reviewed

## Core intention

Restore the kitchen workflow routes without masking a route-specific failure or weakening their existing safe error states.

## Logic followed

The audit showed two 500s at the same time. Their server pages already convert unavailable session/backend reads to recoverable UI input, so a shared Cockpit compile boundary was investigated before changing route logic. The smallest valid repair is the corrected checklist type declaration already present on this branch; this slice records that root cause and updates the audit outcome.

## Design assumptions

- The audit failures occurred while the pre-`7177d4d` checklist type declaration was active.
- A successful Cockpit typecheck proves the compiler blocker is removed, but does not replace an authenticated rendered-route check.

## Tradeoffs

- Accepted:
  - Preserve the existing route fetch/error behavior and avoid unrelated refactors.
- Rejected:
  - Adding route-local fallbacks to hide a global compile failure.

## Durable memory

- Simultaneous unrelated App Router 500s should trigger a compile/import-chain check before debugging API reads.

## Do not reuse blindly

- Do not call the recovered routes browser-verified until a fresh authenticated screenshot is captured.

## Relation to Rauschenberger OS / Bevero

- location logic: Kitchen & Lager navigation keeps `/kitchen/walk-route` as the physical stock-count route.
- role/approval logic: No approval or mutation authority changed.
- inventory/procurement/shift-planning logic: The existing Walk-Route escalation and Mängel resolution flows are unchanged.
- external-system boundary: No backend or third-party integration changed.

## Next logic gate

Regenerate the two audit screenshots from a stable authenticated local Cockpit server.
