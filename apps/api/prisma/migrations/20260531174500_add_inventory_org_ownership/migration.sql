ALTER TABLE "InventoryItem"
  ADD COLUMN IF NOT EXISTS "organization_id" TEXT;

ALTER TABLE "StorageLocation"
  ADD COLUMN IF NOT EXISTS "organization_id" TEXT;

WITH item_org AS (
  SELECT
    "inventoryItemId" AS inventory_item_id,
    MIN("organizationId") AS organization_id
  FROM "InventoryMovement"
  WHERE "organizationId" IS NOT NULL
  GROUP BY "inventoryItemId"
  HAVING COUNT(DISTINCT "organizationId") = 1
)
UPDATE "InventoryItem" AS item
SET "organization_id" = item_org.organization_id
FROM item_org
WHERE item."id" = item_org.inventory_item_id
  AND item."organization_id" IS NULL;

WITH location_org_candidates AS (
  SELECT
    "storageLocationId" AS location_id,
    "organizationId" AS organization_id
  FROM "InventoryMovement"
  WHERE "storageLocationId" IS NOT NULL
    AND "organizationId" IS NOT NULL
  UNION ALL
  SELECT
    "from_storage_location_id" AS location_id,
    "organizationId" AS organization_id
  FROM "InventoryMovement"
  WHERE "from_storage_location_id" IS NOT NULL
    AND "organizationId" IS NOT NULL
  UNION ALL
  SELECT
    "to_storage_location_id" AS location_id,
    "organizationId" AS organization_id
  FROM "InventoryMovement"
  WHERE "to_storage_location_id" IS NOT NULL
    AND "organizationId" IS NOT NULL
),
location_org AS (
  SELECT
    location_id,
    MIN(organization_id) AS organization_id
  FROM location_org_candidates
  GROUP BY location_id
  HAVING COUNT(DISTINCT organization_id) = 1
)
UPDATE "StorageLocation" AS location
SET "organization_id" = location_org.organization_id
FROM location_org
WHERE location."id" = location_org.location_id
  AND location."organization_id" IS NULL;

UPDATE "InventoryItem" AS item
SET "organization_id" = location."organization_id"
FROM "StorageLocation" AS location
WHERE item."storageLocationId" = location."id"
  AND item."organization_id" IS NULL
  AND location."organization_id" IS NOT NULL;

WITH location_org_from_items AS (
  SELECT
    "storageLocationId" AS location_id,
    MIN("organization_id") AS organization_id
  FROM "InventoryItem"
  WHERE "storageLocationId" IS NOT NULL
    AND "organization_id" IS NOT NULL
  GROUP BY "storageLocationId"
  HAVING COUNT(DISTINCT "organization_id") = 1
)
UPDATE "StorageLocation" AS location
SET "organization_id" = location_org_from_items.organization_id
FROM location_org_from_items
WHERE location."id" = location_org_from_items.location_id
  AND location."organization_id" IS NULL;

CREATE INDEX IF NOT EXISTS "InventoryItem_organization_id_idx"
  ON "InventoryItem"("organization_id");

CREATE INDEX IF NOT EXISTS "InventoryItem_organization_id_id_idx"
  ON "InventoryItem"("organization_id", "id");

CREATE INDEX IF NOT EXISTS "StorageLocation_organization_id_idx"
  ON "StorageLocation"("organization_id");

CREATE INDEX IF NOT EXISTS "StorageLocation_organization_id_id_idx"
  ON "StorageLocation"("organization_id", "id");
