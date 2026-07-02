GRANT SELECT ON TABLE "InventoryItem" TO authenticated;
GRANT SELECT ON TABLE "StorageLocation" TO authenticated;
GRANT SELECT ON TABLE "InventoryStockSnapshot" TO authenticated;

DROP POLICY IF EXISTS "inventory_item_org_member_select" ON "InventoryItem";
CREATE POLICY "inventory_item_org_member_select"
ON "InventoryItem"
FOR SELECT
TO authenticated
USING (
  "organization_id" IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "InventoryItem"."organization_id"
      AND om."userId" = (SELECT auth.uid())::text
  )
);

DROP POLICY IF EXISTS "storage_location_org_member_select" ON "StorageLocation";
CREATE POLICY "storage_location_org_member_select"
ON "StorageLocation"
FOR SELECT
TO authenticated
USING (
  "organization_id" IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "StorageLocation"."organization_id"
      AND om."userId" = (SELECT auth.uid())::text
  )
);

DROP POLICY IF EXISTS "inventory_stock_snapshot_org_member_select" ON "InventoryStockSnapshot";
CREATE POLICY "inventory_stock_snapshot_org_member_select"
ON "InventoryStockSnapshot"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "InventoryItem" AS item
    JOIN "OrganizationMember" AS om
      ON om."organizationId" = item."organization_id"
    WHERE item."id" = "InventoryStockSnapshot"."inventoryItemId"
      AND item."organization_id" IS NOT NULL
      AND om."userId" = (SELECT auth.uid())::text
  )
  OR EXISTS (
    SELECT 1
    FROM "StorageLocation" AS location
    JOIN "OrganizationMember" AS om
      ON om."organizationId" = location."organization_id"
    WHERE location."id" = "InventoryStockSnapshot"."storageLocationId"
      AND location."organization_id" IS NOT NULL
      AND om."userId" = (SELECT auth.uid())::text
  )
);
