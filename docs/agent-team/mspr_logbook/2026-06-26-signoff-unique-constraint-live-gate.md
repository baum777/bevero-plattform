# MSPR Entry — Signoff Unique Constraint Live Gate

- id: 2026-06-26-signoff-unique-constraint-live-gate
- timestamp: 2026-06-26T17:25:00+02:00
- runId: codex-local-2026-06-26-signoff-unique-constraint-live-gate
- agentRole: builder
- taskType: runtime_validation

## Scope

- layer: api_runtime
- pathsInScope:
  - `apps/api/prisma/migrations/20260620_add_signoff_unique_constraint/migration.sql`
  - `apps/api/prisma/schema.prisma`
  - `apps/api/tests/shift-planning-issues-signoff.test.ts`
  - `docs/agent-team/mspr_logbook/2026-06-26-signoff-unique-constraint-live-gate.md`
  - `docs/agent-team/intent_logbook/2026-06-26-signoff-unique-constraint-live-gate.md`
- pathsOutOfScope:
  - Cockpit UI transport changes
  - profile RPC migration
  - external provider writeback, ordering, payments, bookings, or customer data export
- autonomyTier: 3

## Code Change Context

- Trigger/request: Inspect duplicate candidates on live Supabase, then apply `20260620_add_signoff_unique_constraint` only if the duplicate check is clean or a cleanup plan is approved.
- Why the change was needed: `shift_signoffs` needed a database-level race guard for one signoff per organization/date/workspace/department.
- Files read:
  - `apps/api/prisma/migrations/20260620_add_signoff_unique_constraint/migration.sql`
  - `apps/api/prisma/schema.prisma`
  - `apps/api/tests/shift-planning-issues-signoff.test.ts`
- Files changed:
  - `docs/agent-team/mspr_logbook/2026-06-26-signoff-unique-constraint-live-gate.md`
  - `docs/agent-team/intent_logbook/2026-06-26-signoff-unique-constraint-live-gate.md`
- Commands run:
  - live duplicate query for `public.shift_signoffs` grouped by `"organizationId"`, `"date"`, `"workspaceGroupId"`, `"department"` -> pass; `duplicateGroups: []`
  - `npx prisma migrate deploy --schema prisma/schema.prisma` in `apps/api` -> pass; applied `20260620_add_signoff_unique_constraint`
  - `npx prisma migrate status --schema prisma/schema.prisma` in `apps/api` -> pass; database schema is up to date
  - `npm --workspace=apps/api run typecheck` -> pass
  - `npm --workspace=apps/api run test -- --run tests/shift-planning-issues-signoff.test.ts` -> pass
- Validation results:
  - No cleanup plan was needed because live duplicate candidate inspection returned no duplicate groups.
  - The signoff unique index migration applied successfully.
  - Prisma reports all 63 migrations applied on the Supabase target.
  - Focused signoff tests passed locally.

## Memory

- newFindings:
  - Live `public.shift_signoffs` had no duplicate groups for the planned unique key.
  - After the prior RPC gate, `20260620_add_signoff_unique_constraint` was the only pending Prisma migration.
- reusableRules:
  - Before applying unique constraints to live operational tables, run a grouped duplicate query on the exact proposed key.
  - If duplicate inspection is clean and the migration is the only pending migration, `prisma migrate deploy` is appropriate.
- gotchas:
  - The physical table uses `signedAt`, not `createdAt`; duplicate inspection should not assume generic timestamp columns.

## Review

- status: pass
- risks:
  - The migration changes live write behavior by enforcing one signoff row per organization/date/workspace/department.
  - Existing unrelated dirty tree from earlier Cockpit/API slices remains in the workspace and was not modified except for this documentation entry.
- scorecard:
  - outcomeQuality: 5
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 5
  - sideEffects: 4
- nextGate: No DB migration remains pending; continue with commit/review packaging if desired.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-06-26-signoff-unique-constraint-live-gate.md`
