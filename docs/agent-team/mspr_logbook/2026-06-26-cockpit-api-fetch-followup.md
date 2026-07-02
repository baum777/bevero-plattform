# MSPR Entry — Cockpit API Fetch Follow-up

- id: 2026-06-26-cockpit-api-fetch-followup
- timestamp: 2026-06-26T17:10:00+02:00
- runId: codex-local-2026-06-26-cockpit-api-fetch-followup
- agentRole: builder
- taskType: implementation

## Scope

- layer: app_local
- pathsInScope:
  - `apps/cockpit/lib/backend/*`
  - `apps/cockpit/lib/supabase/queries/*`
  - `apps/cockpit/lib/*-hooks.ts`
  - `apps/cockpit/lib/location-context.tsx`
  - `apps/cockpit/app/(app)/**/*`
  - `apps/cockpit/app/api/alerts/tasks/[id]/[command]/route.ts`
  - `apps/api/scripts/smoke/supabase-runtime-smoke.ts`
  - `apps/api/prisma/migrations/20260626170000_fix_profile_upsert_rpc_variable_conflict/migration.sql`
  - `apps/api/tests/*`
- pathsOutOfScope:
  - live Supabase migration execution
  - backend route rewrites outside transport contract coverage
  - unrelated untracked `.playwright-mcp/` and `.understand-anything/`
  - external provider writeback, ordering, payments, bookings, or customer data export
- autonomyTier: 2

## Code Change Context

- Trigger/request: Run the approved seeded Supabase live smoke, then migrate remaining lower-priority Cockpit backend fetches to `apiFetch` in endpoint-owned slices.
- Why the change was needed: The first transport slice fixed the high-risk action cluster. Remaining Cockpit backend callsites still mixed direct `fetch`, ad hoc headers, relative proxy paths, and implicit credential behavior.
- Files read:
  - `AGENTS.md`
  - `apps/cockpit/README.md`
  - `apps/api/AGENTS.md`
  - `docs/agent-team/work_documentation_rule.md`
  - `docs/agent-team/mspr_logbook/2026-06-26-cockpit-api-transport.md`
  - `docs/agent-team/intent_logbook/2026-06-26-cockpit-api-transport.md`
  - `apps/cockpit/lib/backend/api-fetch.ts`
  - `apps/cockpit/app/providers/auth-provider.tsx`
  - `apps/cockpit/lib/location-context.tsx`
  - `apps/cockpit/app/(app)/workspaces/[locationId]/layout.tsx`
  - `apps/cockpit/app/(app)/workspaces/[locationId]/event-spaces/page.tsx`
  - `apps/cockpit/app/(app)/workspaces/[locationId]/calendar/page.tsx`
  - `apps/cockpit/app/(app)/workspaces/[locationId]/connectors/page.tsx`
  - `apps/cockpit/app/(app)/procurement/[id]/procurement-confirm-button.tsx`
  - `apps/cockpit/app/api/alerts/tasks/[id]/[command]/route.ts`
  - `apps/cockpit/lib/supabase/queries/settings.ts`
  - `apps/cockpit/lib/supabase/queries/locations.ts`
  - `apps/api/prisma/migrations/20260609130000_fix_bootstrap_rpc_null_guard/migration.sql`
  - `apps/api/tests/profile-upsert-rpc.test.ts`
  - `apps/api/tests/settings-team-approval-contract.test.ts`
  - `apps/api/package.json`
  - `apps/cockpit/package.json`
- Files changed:
  - `apps/api/prisma/migrations/20260626170000_fix_profile_upsert_rpc_variable_conflict/migration.sql`
  - `apps/api/tests/profile-upsert-rpc.test.ts`
  - `apps/api/tests/settings-team-approval-contract.test.ts`
  - `apps/cockpit/app/(app)/automation/suggestions/suggestions-client.tsx`
  - `apps/cockpit/app/(app)/freigaben/page.tsx`
  - `apps/cockpit/app/(app)/heute/page.tsx`
  - `apps/cockpit/app/(app)/heute/shift-command-client.tsx`
  - `apps/cockpit/app/(app)/inventory/items/items-client.tsx`
  - `apps/cockpit/app/(app)/notes/notes-client.tsx`
  - `apps/cockpit/app/(app)/procurement/[id]/procurement-confirm-button.tsx`
  - `apps/cockpit/app/(app)/schichtplan/abschluss/abschluss-client.tsx`
  - `apps/cockpit/app/(app)/schichtplan/heute/staff-today-client.tsx`
  - `apps/cockpit/app/(app)/schichtplan/maengel/maengel-client.tsx`
  - `apps/cockpit/app/(app)/settings/team/create-invite-form.tsx`
  - `apps/cockpit/app/(app)/settings/team/invite-list.tsx`
  - `apps/cockpit/app/(app)/settings/team/registered-member-approval-form.tsx`
  - `apps/cockpit/app/(app)/shift-handover/shift-handover-client.tsx`
  - `apps/cockpit/app/(app)/workspaces/[locationId]/calendar/page.tsx`
  - `apps/cockpit/app/(app)/workspaces/[locationId]/connectors/page.tsx`
  - `apps/cockpit/app/(app)/workspaces/[locationId]/event-spaces/page.tsx`
  - `apps/cockpit/app/(app)/workspaces/[locationId]/layout.tsx`
  - `apps/cockpit/app/api/alerts/tasks/[id]/[command]/route.ts`
  - `apps/cockpit/app/components/quick-notes-fab.tsx`
  - `apps/cockpit/app/providers/workspace-provider.tsx`
  - `apps/cockpit/lib/backend/procurement-orders.ts`
  - `apps/cockpit/lib/backend/review-tasks.ts`
  - `apps/cockpit/lib/backend/shift-handover.ts`
  - `apps/cockpit/lib/backend/shift-planning.ts`
  - `apps/cockpit/lib/cube-hooks.ts`
  - `apps/cockpit/lib/location-context.tsx`
  - `apps/cockpit/lib/mother-concern-hooks.ts`
  - `apps/cockpit/lib/motorworld-hooks.ts`
  - `apps/cockpit/lib/supabase/queries/locations.ts`
  - `apps/cockpit/lib/supabase/queries/settings.ts`
  - `docs/agent-team/mspr_logbook/2026-06-26-cockpit-api-fetch-followup.md`
  - `docs/agent-team/intent_logbook/2026-06-26-cockpit-api-fetch-followup.md`
- Commands run:
  - `/bin/bash -lc 'SMOKE_TEST_ENABLED=true npm run smoke:supabase'` in `apps/api` with approved live access -> blocked by live DB RPC ambiguity before transport path validation
  - `rg -n "fetch\\(|getBackendApiBase\\(|NEXT_PUBLIC_API_BASE_URL|credentials: \"include\"" apps/cockpit/app apps/cockpit/lib apps/cockpit/hooks` -> pass; remaining fetches are central helper/proxy/internal Next routes
  - `npm --workspace=apps/cockpit run typecheck` -> pass
  - `npm --workspace=apps/api run typecheck` -> pass
  - `npm --workspace=apps/api run test -- --run` -> pass after updating the static settings-team contract to the new `apiFetch` contract
- Validation results:
  - Cockpit lower-priority backend surfaces now use `apiFetch` with bearer token and `organizationId` where backend scope requires it.
  - Server-side Cockpit backend calls use `transportMode: "direct"`; browser calls stay same-origin through the backend proxy.
  - The seeded live smoke did run, but failed inside `public.upsert_current_user_profile('Smoke User', null)` with Postgres `42702` / Prisma `P2010`: column reference `"authUserId"` is ambiguous.
  - A local Prisma follow-up migration redefines the RPC with `#variable_conflict use_column` while preserving the existing null-guard behavior.

## Memory

- newFindings:
  - The current live Supabase database still has an ambiguous `upsert_current_user_profile` definition, so the live smoke cannot reach the Cockpit transport assertions until that migration is applied.
  - Relative proxy URLs are appropriate in browser components, but server components and route handlers must use `apiFetch(..., transportMode: "direct")`.
- reusableRules:
  - Endpoint-owned Cockpit client slices should pull `organizationId` from `useAuth()` and obtain the Supabase access token at action time.
  - Server-side Cockpit query helpers should resolve the user's first `OrganizationMember.organizationId` before calling organization-scoped backend endpoints.
- gotchas:
  - Static contract tests that assert literal `/api/backend/...` fetches must move up to the `apiFetch` contract, otherwise they will fail after correct migration.
  - The local migration is not proof that the live DB is fixed; deployment/application remains a separate operator-approved gate.

## Review

- status: partial
- risks:
  - Live smoke remains blocked until the new profile RPC migration is applied to the target Supabase database.
  - No live browser smoke was executed in this slice; only the approved API smoke was attempted.
  - Existing untracked `.playwright-mcp/` and `.understand-anything/` artifacts were present and left untouched.
- scorecard:
  - outcomeQuality: 4
  - scopeDiscipline: 4
  - safety: 5
  - evidenceQuality: 4
  - sideEffects: 4
- nextGate: Apply the new Prisma migration to the approved Supabase target, then rerun `SMOKE_TEST_ENABLED=true npm run smoke:supabase`.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-06-26-cockpit-api-fetch-followup.md`
