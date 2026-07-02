# MSPR Entry — Cockpit API Transport

- id: 2026-06-26-cockpit-api-transport
- timestamp: 2026-06-26T16:35:00+02:00
- runId: codex-local-2026-06-26-cockpit-api-transport
- agentRole: builder
- taskType: implementation

## Scope

- layer: app_local
- pathsInScope:
  - `apps/cockpit/lib/backend/api-fetch.ts`
  - `apps/cockpit/app/(app)/inventory/bar-refill/refill-client.tsx`
  - `apps/cockpit/app/(app)/movements/movements-client.tsx`
  - `apps/cockpit/app/(app)/inventory/goods-receipt/goods-receipt-client.tsx`
  - `apps/cockpit/app/(app)/inventory/withdrawal/withdrawal-client.tsx`
  - `apps/cockpit/app/(app)/kitchen/walk-route/walk-route-client.tsx`
  - `apps/cockpit/app/(app)/freigaben/freigaben-client.tsx`
  - `apps/cockpit/app/components/app-shell.tsx`
  - `apps/api/tests/cockpit-api-transport-contract.test.ts`
  - `apps/api/scripts/smoke/supabase-runtime-smoke.ts`
- pathsOutOfScope:
  - `apps/api/src/routes/*` route registration changes
  - Prisma schema and migrations
  - external FoodNotify, Dynamics, DATEV, or live provider writeback
  - shared-core / portfolio governance assets
  - `.env*` and secrets
- autonomyTier: 2

## Code Change Context

- Trigger/request: Close the Cockpit transport gap called out in the recommended fix order: central API transport, hard organization context, Bar-Refill cancel, confirm evidence retention, and runtime-smoke coverage.
- Why the change was needed: Backend routing and proxy forwarding already supported organization-aware actions, but Cockpit action callsites still hand-built bearer-only fetches and could fail for multi-organization users.
- Files read:
  - `AGENTS.md`
  - `README.md`
  - `IDENTITY.md`
  - `governance/rules.md`
  - `context/current-state.md`
  - `docs/agent-team/work_documentation_rule.md`
  - `docs/agent-team/templates/code_change_context.md`
  - `docs/agent-team/templates/intent_memory_entry.md`
  - `apps/cockpit/README.md`
  - `apps/cockpit/package.json`
  - `apps/cockpit/lib/backend/api-base.ts`
  - `apps/cockpit/app/api/backend/[...path]/route.ts`
  - `apps/cockpit/app/providers/auth-provider.tsx`
  - `apps/cockpit/app/components/app-shell.tsx`
  - `apps/cockpit/app/(app)/inventory/bar-refill/refill-client.tsx`
  - `apps/cockpit/app/(app)/movements/movements-client.tsx`
  - `apps/cockpit/app/(app)/inventory/goods-receipt/goods-receipt-client.tsx`
  - `apps/cockpit/app/(app)/inventory/withdrawal/withdrawal-client.tsx`
  - `apps/cockpit/app/(app)/kitchen/walk-route/walk-route-client.tsx`
  - `apps/cockpit/app/(app)/freigaben/freigaben-client.tsx`
  - `apps/api/AGENTS.md`
  - `apps/api/README.md`
  - `apps/api/package.json`
  - `apps/api/src/modules/auth/actor.ts`
  - `apps/api/src/routes/inventory.route.ts`
  - `apps/api/src/modules/inventory/inventory.schemas.ts`
  - `apps/api/scripts/smoke/supabase-runtime-smoke.ts`
  - `apps/api/tests/inventory.routes.test.ts`
  - `apps/api/tests/mobile-nav-quick-notes-contract.test.ts`
  - `apps/api/tests/movements-quick-actions.test.ts`
  - `apps/api/tests/settings-team-approval-contract.test.ts`
- Files changed:
  - `apps/cockpit/lib/backend/api-fetch.ts`
  - `apps/cockpit/app/(app)/inventory/bar-refill/refill-client.tsx`
  - `apps/cockpit/app/(app)/movements/movements-client.tsx`
  - `apps/cockpit/app/(app)/inventory/goods-receipt/goods-receipt-client.tsx`
  - `apps/cockpit/app/(app)/inventory/withdrawal/withdrawal-client.tsx`
  - `apps/cockpit/app/(app)/kitchen/walk-route/walk-route-client.tsx`
  - `apps/cockpit/app/(app)/freigaben/freigaben-client.tsx`
  - `apps/cockpit/app/components/app-shell.tsx`
  - `apps/api/tests/cockpit-api-transport-contract.test.ts`
  - `apps/api/scripts/smoke/supabase-runtime-smoke.ts`
  - `docs/agent-team/mspr_logbook/2026-06-26-cockpit-api-transport.md`
  - `docs/agent-team/intent_logbook/2026-06-26-cockpit-api-transport.md`
- Commands run:
  - `pwd` -> pass
  - `git status --short` -> pass; existing untracked `.playwright-mcp/` and `.understand-anything/` left untouched
  - `rg --files -g 'AGENTS.md' -g 'README.md' -g 'IDENTITY.md' -g 'governance/rules.md' -g 'docs/agent-team/work_documentation_rule.md' -g 'package.json'` -> pass
  - `sed -n ... apps/cockpit/app/(app)/...` without quoting -> fail; shell path quoting issue only
  - `npm --workspace=apps/api run test -- --run tests/cockpit-api-transport-contract.test.ts` -> pass
  - `npm --workspace=apps/cockpit run typecheck` -> pass
  - `npm --workspace=apps/api run test -- --run tests/mobile-nav-quick-notes-contract.test.ts tests/movements-quick-actions.test.ts tests/settings-team-approval-contract.test.ts` -> pass
  - `git diff --check` -> pass
  - `npm --workspace=apps/api run typecheck` -> pass
  - `npm --workspace=apps/api run test -- --run tests/cockpit-api-transport-contract.test.ts tests/mobile-nav-quick-notes-contract.test.ts tests/movements-quick-actions.test.ts tests/settings-team-approval-contract.test.ts` -> pass
- Validation results:
  - Central Cockpit transport helper type-checks and is covered by a static contract test.
  - Bar-Refill load fallback, patch, confirm, cancel, and primer now route through the helper with organization context.
  - Movements, goods receipt, withdrawal, walk-route correction, and correction approval/rejection actions now require organization context.
  - Bar-Refill confirm response keeps `movementId` and `stockAfter` in typed local state; movement writes emit a local `bevero:movement-evidence` event.
  - Supabase runtime smoke now creates a multi-membership actor and asserts missing `x-organization-id` returns 409 before using the selected organization header.

## Memory

- newFindings:
  - Backend auth already requires `X-Organization-Id` when a user has multiple memberships; the Cockpit gap was bearer-only action transport, not route registration.
  - The existing Next proxy forwards `authorization`, `content-type`, and `x-organization-id`, so Cockpit can standardize on `/api/backend` without losing direct-mode support.
- reusableRules:
  - Browser/client Cockpit backend calls should use `apiFetch` / `apiJson` and pass `organizationId` from `useAuth()` when the backend route is organization-scoped.
  - Flows with GET-then-POST fallback should use `throwOnError: false` only for the probing request.
- gotchas:
  - Do not prefix paths passed to `apiFetch` with `/api/backend`; the helper adds that prefix in proxy mode.
  - Direct live Login/Playwright smoke requires valid Supabase browser credentials and was not run in this slice.

## Review

- status: pass
- risks:
  - Live browser login and real API runtime smoke were not executed because no safe runtime credentials were provided in this slice.
  - Some older Cockpit backend surfaces outside the requested action cluster still use direct/ad hoc fetches and should be migrated in later slices.
- scorecard:
  - outcomeQuality: 4
  - scopeDiscipline: 4
  - safety: 5
  - evidenceQuality: 4
  - sideEffects: 4
- nextGate: Run the Supabase runtime smoke with approved credentials, then migrate remaining lower-priority Cockpit backend fetches to `apiFetch` endpoint-by-endpoint.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-06-26-cockpit-api-transport.md`
