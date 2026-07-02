ALTER TABLE "procurement_order_items"
  ADD COLUMN "rejection_reason" TEXT;

ALTER TABLE "article_mappings"
  ADD COLUMN "created_by" TEXT;

ALTER TABLE "InventoryMovement"
  ADD COLUMN "procurement_order_item_id" TEXT;

CREATE INDEX "InventoryMovement_procurement_order_item_id_idx"
  ON "InventoryMovement" ("procurement_order_item_id");

ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_procurement_order_item_id_fkey"
  FOREIGN KEY ("procurement_order_item_id") REFERENCES "procurement_order_items" ("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "procurement_order_items"
  ADD CONSTRAINT "procurement_order_items_accepted_qty_check"
  CHECK ("accepted_qty" IS NULL OR "accepted_qty" >= 0);

ALTER TABLE "procurement_order_items"
  ADD CONSTRAINT "procurement_order_items_delivered_qty_check"
  CHECK ("delivered_qty" IS NULL OR "delivered_qty" >= 0);
