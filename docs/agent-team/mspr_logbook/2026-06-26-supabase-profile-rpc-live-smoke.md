# MSPR Entry — Supabase Profile RPC Live Smoke

- id: 2026-06-26-supabase-profile-rpc-live-smoke
- timestamp: 2026-06-26T17:20:00+02:00
- runId: codex-local-2026-06-26-supabase-profile-rpc-live-smoke
- agentRole: builder
- taskType: runtime_validation

## Scope

- layer: api_runtime
- pathsInScope:
  - `apps/api/prisma/migrations/20260626170000_fix_profile_upsert_rpc_variable_conflict/migration.sql`
  - `apps/api/scripts/smoke/supabase-runtime-smoke.ts`
  - `apps/api/tests/profile-upsert-rpc.test.ts`
  - `docs/agent-team/mspr_logbook/2026-06-26-supabase-profile-rpc-live-smoke.md`
  - `docs/agent-team/intent_logbook/2026-06-26-supabase-profile-rpc-live-smoke.md`
- pathsOutOfScope:
  - `apps/api/prisma/migrations/20260620_add_signoff_unique_constraint`
  - Cockpit UI implementation changes
  - unrelated untracked `.playwright-mcp/` and `.understand-anything/`
  - external provider writeback, ordering, payments, bookings, or customer data export
- autonomyTier: 3

## Code Change Context

- Trigger/request: Apply `apps/api/prisma/migrations/20260626170000_fix_profile_upsert_rpc_variable_conflict/migration.sql` to the approved Supabase target, then rerun `SMOKE_TEST_ENABLED=true npm run smoke:supabase`.
- Why the change was needed: The prior live smoke was blocked by an ambiguous `authUserId` reference in `public.upsert_current_user_profile`.
- Files read:
  - `AGENTS.md`
  - `apps/api/AGENTS.md`
  - `apps/api/README.md`
  - `apps/api/package.json`
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260626170000_fix_profile_upsert_rpc_variable_conflict/migration.sql`
  - `apps/api/prisma/migrations/20260531132000_harden_user_profile_rls/migration.sql`
  - `apps/api/scripts/smoke/supabase-runtime-smoke.ts`
  - `apps/api/tests/profile-upsert-rpc.test.ts`
- Files changed:
  - `apps/api/prisma/migrations/20260626170000_fix_profile_upsert_rpc_variable_conflict/migration.sql`
  - `apps/api/scripts/smoke/supabase-runtime-smoke.ts`
  - `apps/api/tests/profile-upsert-rpc.test.ts`
  - `docs/agent-team/mspr_logbook/2026-06-26-supabase-profile-rpc-live-smoke.md`
  - `docs/agent-team/intent_logbook/2026-06-26-supabase-profile-rpc-live-smoke.md`
- Commands run:
  - `npx prisma migrate status --schema prisma/schema.prisma` in `apps/api` -> partial; showed both `20260620_add_signoff_unique_constraint` and `20260626170000_fix_profile_upsert_rpc_variable_conflict` pending
  - `npx prisma db execute --file prisma/migrations/20260626170000_fix_profile_upsert_rpc_variable_conflict/migration.sql --schema prisma/schema.prisma` in `apps/api` -> pass
  - `SMOKE_TEST_ENABLED=true npm run smoke:supabase` in `apps/api` -> failed first with timestamp/timestamptz return mismatch
  - `npx prisma db execute --file prisma/migrations/20260626170000_fix_profile_upsert_rpc_variable_conflict/migration.sql --schema prisma/schema.prisma` in `apps/api` after adding casts -> pass
  - `SMOKE_TEST_ENABLED=true npm run smoke:supabase` in `apps/api` -> failed next because the profile RLS negative test did not impersonate SQL role `authenticated`
  - `SMOKE_TEST_ENABLED=true npm run smoke:supabase` in `apps/api` after setting `SET LOCAL ROLE authenticated` in the smoke harness -> pass
  - `npx prisma migrate resolve --applied 20260626170000_fix_profile_upsert_rpc_variable_conflict --schema prisma/schema.prisma` in `apps/api` -> pass
  - `npx prisma migrate status --schema prisma/schema.prisma` in `apps/api` -> partial; only unrelated `20260620_add_signoff_unique_constraint` remains pending
  - `npm --workspace=apps/api run typecheck` -> pass
  - `npm --workspace=apps/api run test -- --run` -> pass
- Validation results:
  - The requested profile RPC migration was applied to the approved Supabase target.
  - The migration was also recorded as applied in Prisma's migration ledger.
  - Supabase runtime smoke passed after the RPC cast fix and authenticated-role RLS harness correction.
  - API typecheck and full API test suite passed locally.

## Memory

- newFindings:
  - The RPC fix needs both `#variable_conflict use_column` and explicit `p."createdAt"::timestamptz` / `p."updatedAt"::timestamptz` casts.
  - Prisma direct smoke checks that intend to validate authenticated RLS must set both JWT GUCs and `SET LOCAL ROLE authenticated`.
- reusableRules:
  - When a single migration is approved while another pending migration exists, use targeted `prisma db execute` plus `prisma migrate resolve --applied`, not `prisma migrate deploy`.
  - A non-zero `prisma migrate status` can still verify the requested migration if the remaining pending migration is explicitly unrelated and named.
- gotchas:
  - `migrate deploy` would have applied `20260620_add_signoff_unique_constraint`; this was intentionally avoided.
  - Do not treat Supabase owner/pooler Prisma writes as RLS-authenticated browser behavior unless the SQL role is switched.

## Review

- status: pass
- risks:
  - `20260620_add_signoff_unique_constraint` remains unapplied on the target and was out of scope for this request.
  - Live smoke used existing seeded Supabase credentials from local environment; no secrets were logged.
  - Existing unrelated untracked `.playwright-mcp/` and `.understand-anything/` artifacts remain untouched.
- scorecard:
  - outcomeQuality: 5
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 5
  - sideEffects: 4
- nextGate: Decide separately whether and when to apply `20260620_add_signoff_unique_constraint`.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-06-26-supabase-profile-rpc-live-smoke.md`
