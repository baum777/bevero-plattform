# Intent Memory — Shift Sessions Backend

- id: shift-sessions-backend-2026-06-20
- timestamp: 2026-06-20T11:10:00+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-20-shift-sessions-backend.md`
- status: reviewed

## Core intention

Separate planned staffing from the auditably executed shift without allowing a client clock or a UI-only guard to become authoritative.

## Logic followed

`shift_assignments` remains the planning record. A single runtime session and append-only events capture start, end, corrections and missed shifts. Staff task actions are server-gated only for assignment-bound tasks; old unlinked rows remain operational.

## Design assumptions

- Shift Lead is represented by `shift_lead` or `admin`.
- The application layer scopes organization access; RLS prevents direct public-table access.

## Tradeoffs

- Accepted: no automatic missed-shift scheduler.
- Rejected: mutating the plan record with actual runtime state.

## Durable memory

- Corrections change factual timestamps but not the semantic punctuality vocabulary; `startSource` and audit event express manual intervention.

## Do not reuse blindly

- The legacy fallback is intentionally narrow: only tasks with no `shiftAssignmentId` bypass the active-session requirement.

## Relation to Rauschenberger OS / Bevero

- location logic: scoped through organization/workspace group.
- role/approval logic: staff owns own shift; lead performs exceptional corrections.
- inventory/procurement/shift-planning logic: no external-system writeback.
- external-system boundary: unchanged.

## Next logic gate

Run a Supabase-backed migration and browser smoke before asserting runtime readiness.
