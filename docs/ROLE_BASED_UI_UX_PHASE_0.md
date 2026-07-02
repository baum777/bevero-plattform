# Role-Based UI/UX Phase 0 Notes

## Current Canonical State

`origin/master` now contains the canonical DB-backed Warenwirtschaft slice:

- Legacy static `web/` app shell (frozen)
- Admin inventory item management
- Purchase orders
- Goods receipts
- Withdrawals
- Correction requests
- Admin review tasks
- Supabase/Postgres-oriented Prisma migration

This document records the remaining role-based UI/UX direction while keeping the current DB-backed implementation canonical.

## Role Direction

Target roles:

- `admin`: full inventory administration and review authority
- `shift_lead`: operational booking authority for assigned work areas, future review scope
- `staff`: operational quick actions for assigned work areas

The current backend authorizes by actor headers and route-level roles. Workspace-specific filtering and assignment are not yet implemented in the DB model.

## Workspace Direction

Target workspaces:

- `SERVICE`
- `HOTEL`
- `KITCHEN`

Future workspace support should be added through a migration-backed schema change, not through an in-memory route layer. Required follow-up decisions:

- Whether workspace is mandatory on `InventoryItem`
- Whether existing `category` stays free text or becomes a controlled taxonomy
- How actor-to-workspace assignment is represented
- Which routes require workspace-scoped reads and writes

## Movement Direction

The current canonical implementation already preserves the key audit rule:

- Stock-changing operations create `InventoryMovement` rows.
- Stock snapshots are derived/updated by backend services.
- Corrections require review before stock-changing movement creation.

Future conflict/offline work should extend this DB-backed path with migration-backed fields such as `clientMutationId`, `baseStockVersion`, `syncStatus`, and `conflictReason` only when the persistence and migration plan are explicit.

## UI Direction

The active Cockpit UI migration target is `apps/cockpit/` (Next.js App Router). Future role-based UX should add:

- Workspace-aware navigation
- Staff mobile quick actions
- Shift-lead review surface
- Conflict/offline queue status
- A clear Post-MVP inventory-counting/inventory-delta path

`web/` remains frozen as a legacy reference surface and should not receive new feature work.
