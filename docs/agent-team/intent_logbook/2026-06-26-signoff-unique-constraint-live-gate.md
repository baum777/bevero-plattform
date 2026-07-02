# Intent Memory — Signoff Unique Constraint Live Gate

- id: 2026-06-26-signoff-unique-constraint-live-gate
- timestamp: 2026-06-26T17:25:00+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-26-signoff-unique-constraint-live-gate.md`
- status: reviewed

## Core intention

Apply the signoff concurrency guard only after proving the live table has no duplicate rows that would cause the unique index migration to fail or hide unresolved operational data.

## Logic followed

The migration's contract is exactly one signoff per organization, date, workspace group, and department. The live preflight query used that same key. Because it returned zero duplicate groups, no cleanup plan was required and the migration could be applied directly.

## Design assumptions

- The operator's latest request approved this specific gate: inspect duplicates, then apply if clean.
- The migration does not need data cleanup when `duplicateGroups` is empty.
- Focused signoff tests and Prisma migration status are sufficient validation for this database-only gate.

## Tradeoffs

- Accepted:
  - Run a live aggregate query before applying the unique index.
  - Apply via `prisma migrate deploy` once this was the only pending migration.
  - Keep the gate documentation separate from the earlier profile RPC smoke.
- Rejected:
  - Applying before duplicate inspection.
  - Touching Cockpit transport or unrelated dirty files in this gate.
  - Creating a cleanup plan when live evidence showed no duplicates.

## Durable memory

- The unique signoff key is `("organizationId", "date", "workspaceGroupId", "department")`.
- The live Supabase target reported all 63 migrations applied after this gate.
- `shift_signoffs` uses `signedAt`; avoid assuming `createdAt` on this table.

## Do not reuse blindly

- Do not apply future unique constraints without a live duplicate preflight on the exact candidate key.
- Do not infer UI behavior from this DB migration; this only enforces backend persistence uniqueness.
- Do not merge this gate with profile RPC or Cockpit transport work in future review notes.

## Relation to Rauschenberger OS / Bevero

- shift-planning logic: The database now enforces the same one-signoff contract the application expected.
- audit logic: Concurrent duplicate signoff writes are blocked at persistence level instead of relying only on application-level checks.
- governance logic: Live DB mutation followed an explicit preflight/apply/verify gate.

## Next logic gate

No pending Prisma migration remains on the target; package the combined changes for review or commit when the operator asks.
