# Inventory Transfer Org Affinity

Decision: `model-backed (nullable backfill phase)`
Runtime validation status: `Supabase smoke pass (including cross-org rejection)`

## Observed Model State

- `InventoryItem.organizationId` exists as nullable `organization_id` with indexes on `(organization_id)` and `(organization_id, id)`.
- `StorageLocation.organizationId` exists as nullable `organization_id` with indexes on `(organization_id)` and `(organization_id, id)`.
- Migration `prisma/migrations/20260531174500_add_inventory_org_ownership/migration.sql` backfills ownership only from deterministic single-org evidence.
- `InventoryMovement` still carries `organizationId`.

## Current Transfer Boundary

The transfer service now enforces:

- authenticated actor context is required;
- inventory item must match `id + organizationId`;
- source storage location must match `id + organizationId`;
- target storage location must match `id + organizationId`;
- `fromStorageLocationId` and `toStorageLocationId` must differ;
- `quantity > 0`;
- source stock (org-scoped movement stream) must not go negative;
- exactly one `InventoryMovement` row is created with `type = "transfer"`;
- source and target snapshots are refreshed in the same Prisma transaction;
- the created movement is tagged with the actor's organization.
- transfers with missing or mismatching ownership are rejected (`409` conflict path).

## Live Validation Evidence (Current)

- `SMOKE_TEST_ENABLED=true npm run smoke:supabase`: pass
- Transfer smoke: pass
- Cross-org rejection smoke: pass
  - item-org mismatch rejected
  - source-org mismatch rejected
  - target-org mismatch rejected
  - no additional movement rows created for rejected attempts

## Why This Is Not Fully Final Yet

- The repo currently has no modeled `Organization` table that can be safely referenced as a Prisma relation target.
- Ownership columns are therefore model-backed but currently nullable and relationless.
- `NOT NULL` can only be enforced after a data pass proves all existing rows are uniquely backfillable.

## Tests That Cover the Current Boundary

- `tests/transfer.service.test.ts`
- `tests/transfer.schema.test.ts`
- `tests/inventory.routes.test.ts`
- `tests/inventory-schema.test.ts`

## Remaining Gap

- Nullable historical rows can still exist until operational backfill is completed.
- No FK to `Organization` is possible in the current schema surface because no unique Organization owner model is present.

## Next Hardening Gate

1. Finalize a single referenceable organization owner model in the Prisma surface.
2. Validate complete backfill coverage for `InventoryItem.organization_id` and `StorageLocation.organization_id`.
3. Add `NOT NULL` constraints.
4. Add FK constraints.
5. Re-run Supabase smoke to confirm unchanged transfer isolation behavior.
