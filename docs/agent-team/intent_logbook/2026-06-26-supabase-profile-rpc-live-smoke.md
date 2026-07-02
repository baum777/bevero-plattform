# Intent Memory — Supabase Profile RPC Live Smoke

- id: 2026-06-26-supabase-profile-rpc-live-smoke
- timestamp: 2026-06-26T17:20:00+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-26-supabase-profile-rpc-live-smoke.md`
- status: reviewed

## Core intention

Close the live Supabase blocker with the smallest approved DB mutation and prove the Cockpit/API runtime smoke reaches the endpoint assertions.

## Logic followed

The target had more than one pending Prisma migration, so the safe path was not `migrate deploy`. The requested RPC SQL was applied directly, corrected when the live function return type exposed a timestamp mismatch, and then marked as applied in Prisma's migration ledger after successful execution.

## Design assumptions

- Applying only the explicitly named RPC migration is authorized by the user request.
- Applying `20260620_add_signoff_unique_constraint` is not authorized by this request and should remain a separate gate.
- The seeded Supabase user and local env are approved for this smoke because the user explicitly requested the approved live smoke rerun.

## Tradeoffs

- Accepted:
  - Use targeted `prisma db execute` to avoid unrelated pending migration execution.
  - Update the smoke harness to impersonate the real `authenticated` SQL role for RLS validation.
  - Record the targeted migration as applied after execution.
- Rejected:
  - Running `prisma migrate deploy` while an unrelated pending migration existed.
  - Changing live RLS policies to satisfy a harness that was not actually running as `authenticated`.
  - Logging or inspecting `.env` secrets.

## Durable memory

- Profile RPC live-safe definition requires:
  - `#variable_conflict use_column`
  - null-preserving `COALESCE` updates for optional fields
  - `createdAt` and `updatedAt` casts to `timestamptz`
- Supabase RLS smoke through Prisma must set JWT claims and `SET LOCAL ROLE authenticated` to approximate browser-authenticated access.
- A passed smoke after this slice covered profile RPC, missing multi-org header rejection, transfer, review-task actions, dashboard history, and cross-org rejection.

## Do not reuse blindly

- Do not use targeted `db execute` as the default migration workflow; use it only when the operator approves a single migration and other pending migrations must remain untouched.
- Do not mark a migration as applied unless the exact SQL has already executed successfully on the same target.
- Do not infer that the unrelated signoff migration is safe to apply from this smoke result.

## Relation to Rauschenberger OS / Bevero

- auth/profile logic: Browser-authenticated profile bootstrap remains invoker-scoped and RLS-checked.
- multi-org logic: The smoke proves missing organization header rejection still works for multi-membership users.
- inventory logic: Transfer and cross-org rejection runtime paths remained intact after the RPC fix.
- governance logic: Live DB mutation stayed inside the explicitly approved path and did not apply unrelated pending migrations.

## Next logic gate

Review and approve or defer `20260620_add_signoff_unique_constraint` as its own migration/runtime gate.
