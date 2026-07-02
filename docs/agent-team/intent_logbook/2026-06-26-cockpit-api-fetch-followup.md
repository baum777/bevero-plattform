# Intent Memory — Cockpit API Fetch Follow-up

- id: 2026-06-26-cockpit-api-fetch-followup
- timestamp: 2026-06-26T17:10:00+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-26-cockpit-api-fetch-followup.md`
- status: partial

## Core intention

Finish the Cockpit transport consolidation beyond the initial high-risk inventory paths and prove the remaining blocker with live Supabase evidence instead of assuming the runtime path works.

## Logic followed

The transport helper is the boundary for Cockpit-to-backend calls. Browser components should call backend paths through the same-origin proxy; server helpers and route handlers should call the backend directly because relative proxy URLs are not a stable server-side transport contract. Organization context must be explicitly resolved and forwarded in both cases.

## Design assumptions

- First membership remains the existing Cockpit convention for selecting the current organization until a dedicated organization picker exists.
- Failing before the request when `organizationId` is missing is safer than letting the backend infer a tenant.
- The live Supabase smoke should not trigger schema changes; migration application is a separate approval gate.

## Tradeoffs

- Accepted:
  - Keep the follow-up broad enough to remove remaining endpoint-owned ad hoc backend fetches.
  - Use a local migration to fix the RPC exposed by live-smoke evidence, without applying it to production/live automatically.
  - Preserve internal Next route fetches because they are not Cockpit backend transports.
- Rejected:
  - Running or deploying a live database migration without explicit operator approval.
  - Moving tenant authority into UI state beyond forwarding the already selected organization id.
  - Rewriting backend route registration, which was not the failing layer.

## Durable memory

- `apiFetch` default proxy mode is for browser callsites; server callsites should pass `transportMode: "direct"`.
- Organization-scoped Cockpit actions must include `{ accessToken, organizationId, requireOrganization: true }`.
- Live-smoke failure at `upsert_current_user_profile` with `42702 authUserId is ambiguous` means the target database is missing the follow-up RPC conflict directive.
- The local fix is `apps/api/prisma/migrations/20260626170000_fix_profile_upsert_rpc_variable_conflict/migration.sql`.

## Do not reuse blindly

- Do not treat a successful TypeScript/static test pass as proof of live Supabase readiness.
- Do not change `.env*`, seed credentials, or live DB schema as part of a frontend transport migration unless the operator explicitly opens that gate.
- Do not convert internal app API calls, such as dashboard route reads, into backend direct calls just to eliminate every string named `fetch`.

## Relation to Rauschenberger OS / Bevero

- location logic: Cockpit location/workspace pages now use the same organization-scoped backend transport contract as inventory and shift actions.
- role/approval logic: Team, review-task, shift-planning, and approval actions continue to rely on backend authorization while Cockpit supplies actor and organization context.
- audit/evidence logic: The live-smoke result is evidence of an infrastructure migration gap, not a UI-only failure.
- external-system boundary: No external communication, ordering, booking, payment, or customer export behavior was added.

## Next logic gate

Operator approval to apply the profile RPC migration to the target Supabase database, then rerun the seeded live smoke and continue only if it reaches the Cockpit endpoint assertions.
