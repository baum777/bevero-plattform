# Intent Memory — Repository map

- id: 2026-06-20-repository-map
- timestamp: 2026-06-20T23:07:37+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-20-repository-map.md`
- status: reviewed

## Core intention

Make the monorepo understandable without converting documentation claims into unverified runtime claims or bypassing the repository's governance around `apps/` inspection.

## Logic followed

The repository is a governed Rauschenberger OS surface with Bevero as its operational application layer. The mapping must preserve its separation of governance, application UI, API/persistence, and external-system boundaries. A full recursive app scan was rejected because `AGENTS.md` permits only targeted inspection of the large `apps/` directory.

## Design assumptions

- The user's request is a read-only L0 analysis.
- Existing working-tree changes belong to another slice and must remain untouched.

## Tradeoffs

- Accepted:
  - A generated deterministic file/import graph for the explicitly authorized `apps/api` and `apps/cockpit` scope.
- Rejected:
  - Persistently disabling the plugin's supply-chain build-script protection to work around a non-interactive approval prompt.

## Durable memory

- The root owns governance and routing; app-local frontdoors own product and runtime details.
- The generated graph represents only API and Cockpit file/import topology, not semantic behavior inside functions or classes.
- `apps/api` owns Fastify, Prisma, and Supabase persistence; `apps/cockpit` owns the Next.js operational UI; `apps/landing` owns the Vite presentation surface.

## Do not reuse blindly

- Do not infer live deployment, active integrations, or database connectivity from README or current-state documents alone.
- Do not run a repository-wide plugin scan over `apps/` without a governance-compatible scope decision.
- Do not enable unrestricted dependency build scripts merely to make the analysis runtime available.

## Relation to Rauschenberger OS / Bevero

- location logic: Bevero models location- and organization-scoped operations.
- role/approval logic: L0–L4 governance and role-gated UI/API behavior remain authoritative.
- inventory/procurement/shift-planning logic: implemented across API modules and Cockpit routes, under human-gated operational controls.
- external-system boundary: FoodNotify, Dynamics 365, and DATEV remain external leading systems; automatic writeback is not claimed.

## Next logic gate

If function/class-level exploration is needed, run the remaining semantic batch analysis and graph-review phases.
