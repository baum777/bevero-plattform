# Intent Memory — Shift Sessions Cockpit

- id: shift-sessions-cockpit-2026-06-20
- timestamp: 2026-06-20T11:10:00+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-20-shift-sessions-cockpit.md`
- status: reviewed

## Core intention

Make the runtime boundary visible without treating the browser as the authorization boundary.

## Logic followed

Staff sees one card per assignment and can start/end its runtime session. Tasks remain visible before start but actions are disabled; API enforcement remains decisive. The existing handover start action remains a distinct workflow.

## Design assumptions

- The backend returns the additive today-session and summary contracts.

## Tradeoffs

- Accepted: summary shows assignment/session detail inline rather than replacing area aggregation.
- Rejected: coupling a handover confirmation to the operational shift start.

## Durable memory

- Server-confirmed session values, not browser timestamps, are displayed as operational truth.

## Do not reuse blindly

- The UI task lock is informative only; never remove the corresponding backend guard.

## Relation to Rauschenberger OS / Bevero

- location logic: assignment area is shown per session.
- role/approval logic: staff starts own work; lead exceptions stay backend-authorized.
- inventory/procurement/shift-planning logic: confined to shift planning.
- external-system boundary: unchanged.

## Next logic gate

Verify with an authenticated runtime after Supabase configuration is available.
