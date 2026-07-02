# Intent Memory — Cockpit API Transport

- id: 2026-06-26-cockpit-api-transport
- timestamp: 2026-06-26T16:35:00+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-26-cockpit-api-transport.md`
- status: reviewed

## Core intention

Make Cockpit backend actions use one explicit transport contract so authorization, selected organization, JSON handling, and error normalization cannot drift per button or workflow.

## Logic followed

The backend already owns tenant selection through `parseActorFromHeaders()` and the Next proxy already forwards `x-organization-id`. The correct frontend move is therefore not a backend route rewrite, but a repo-local Cockpit helper that makes the existing authority mandatory at action boundaries. The helper defaults to proxy mode to keep browser calls same-origin, but retains direct mode for places that intentionally need `NEXT_PUBLIC_API_BASE_URL`.

## Design assumptions

- `AuthProvider` is the right browser source for the current organization because it already reads `OrganizationMember.organizationId`.
- Organization-scoped mutation and admin-action paths should fail before network when `organizationId` is absent.
- Bar-Refill cancel is a first-class backend endpoint, so the UI should call `POST /bar-refill/runs/:runId/items/:itemId/cancel` instead of encoding cancellation as a quantity convention.
- Confirm evidence does not need to become visible primary UI yet, but it must remain typed and locally inspectable.

## Tradeoffs

- Accepted:
  - Migrate the high-risk action cluster first: Bar-Refill, Movements, goods receipt, withdrawal, walk-route correction, correction approval/rejection, and the Bar-Refill primer.
  - Keep the helper small and dependency-free.
  - Add static contract coverage for Cockpit transport because the Cockpit workspace has no dedicated browser smoke harness with credentials in this slice.
- Rejected:
  - Backend route churn. Local evidence showed the route and auth layers already support the required header.
  - Treating `requestedQuantity: 0` as the main cancel path. The backend has a dedicated cancel endpoint, which is clearer and auditable.
  - Running a live browser login smoke without supplied credentials or explicit live runtime target.

## Durable memory

- Future Cockpit backend actions should use `apiFetch` or `apiJson` and pass `{ accessToken, organizationId, requireOrganization: true }` unless the endpoint is explicitly non-tenant-scoped.
- Paths passed to `apiFetch` are backend paths such as `/withdrawals`, not Next proxy paths such as `/api/backend/withdrawals`.
- Multi-organization users are the regression case: without `X-Organization-Id`, backend auth must return 409 instead of guessing a tenant.
- Confirm and movement write responses carry operational evidence (`movementId`, `movementIds`, `stockAfter`, `stockFromAfter`, `stockToAfter`); do not discard those fields in future UI refactors.

## Do not reuse blindly

- Do not apply `requireOrganization: true` to public health checks, auth callback flows, or endpoints that intentionally do not carry organization context.
- Do not use the local debug event as an audit log. It is a frontend evidence retention aid only; backend `InventoryMovement` remains the durable audit record.
- Do not assume the runtime smoke proves browser login. It now proves backend multi-org header behavior in-process; real browser login still needs Supabase test credentials.

## Relation to Rauschenberger OS / Bevero

- location logic: Organization and workspace context must be explicit in Cockpit actions; tenant inference is not acceptable for multi-location operation.
- role/approval logic: Staff and manager actions continue to rely on backend role checks; frontend transport only forwards the actor and selected organization.
- inventory/procurement/shift-planning logic: Inventory mutations stay backend-owned through `InventoryMovement`; Bar-Refill cancel and confirm remain human-triggered actions.
- external-system boundary: No FoodNotify, Dynamics, DATEV, booking, payment, or external communication writeback was added.

## Next logic gate

Run an approved live/browser smoke with a seeded Supabase user, then migrate remaining lower-priority Cockpit fetches to `apiFetch` in small endpoint-owned slices.
