GRANT SELECT ON TABLE "OrganizationMember" TO authenticated;
GRANT SELECT ON TABLE "WorkspaceMember" TO authenticated;
GRANT SELECT ON TABLE "UserProfile" TO authenticated;

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
      AND (
        "InventoryStockSnapshot"."storageLocationId" IS NULL
        OR EXISTS (
          SELECT 1
          FROM "StorageLocation" AS location
          WHERE location."id" = "InventoryStockSnapshot"."storageLocationId"
            AND location."organization_id" = item."organization_id"
        )
      )
  )
);
