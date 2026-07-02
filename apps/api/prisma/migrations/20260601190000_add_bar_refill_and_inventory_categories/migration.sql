CREATE TYPE "BarRefillRunStatus" AS ENUM ('open', 'partially_confirmed', 'completed');
CREATE TYPE "BarRefillRunItemStatus" AS ENUM ('open', 'pending', 'confirmed', 'cancelled');

CREATE TABLE "inventory_categories" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT,
  "name" TEXT NOT NULL,
  "display_order" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bar_refill_template_items" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT,
  "display_order" INTEGER NOT NULL,
  "product_name" TEXT NOT NULL,
  "unit" TEXT,
  "target_quantity" DOUBLE PRECISION,
  "inventory_item_id" TEXT,
  "is_misc" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bar_refill_template_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bar_refill_runs" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "run_date_local" DATE NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Europe/Berlin',
  "created_by" TEXT NOT NULL,
  "status" "BarRefillRunStatus" NOT NULL DEFAULT 'open',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bar_refill_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bar_refill_run_items" (
  "id" TEXT NOT NULL,
  "refill_run_id" TEXT NOT NULL,
  "template_item_id" TEXT NOT NULL,
  "inventory_item_id" TEXT,
  "display_order" INTEGER NOT NULL,
  "product_name_snapshot" TEXT NOT NULL,
  "unit_snapshot" TEXT,
  "target_quantity" DOUBLE PRECISION,
  "requested_quantity" DOUBLE PRECISION,
  "status" "BarRefillRunItemStatus" NOT NULL DEFAULT 'open',
  "confirmed_by" TEXT,
  "confirmed_at" TIMESTAMP(3),
  "stock_movement_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bar_refill_run_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "InventoryItem"
  ADD COLUMN "category_id" TEXT,
  ADD COLUMN "target_stock" DOUBLE PRECISION,
  ADD COLUMN "display_order" INTEGER;

ALTER TABLE "InventoryMovement"
  ADD COLUMN "bar_refill_run_item_id" TEXT;

ALTER TABLE "inventory_categories"
  ADD CONSTRAINT "inventory_categories_org_name_key" UNIQUE ("organization_id", "name");

ALTER TABLE "inventory_categories"
  ADD CONSTRAINT "inventory_categories_org_display_order_key" UNIQUE ("organization_id", "display_order");

ALTER TABLE "bar_refill_template_items"
  ADD CONSTRAINT "bar_refill_template_items_org_display_order_key" UNIQUE ("organization_id", "display_order");

CREATE UNIQUE INDEX "bar_refill_template_items_global_display_order_key"
  ON "bar_refill_template_items" ("display_order")
  WHERE "organization_id" IS NULL;

CREATE INDEX "bar_refill_template_items_organization_id_idx"
  ON "bar_refill_template_items" ("organization_id");

CREATE INDEX "bar_refill_template_items_inventory_item_id_idx"
  ON "bar_refill_template_items" ("inventory_item_id");

CREATE INDEX "bar_refill_runs_organization_id_run_date_local_idx"
  ON "bar_refill_runs" ("organization_id", "run_date_local");

CREATE UNIQUE INDEX "bar_refill_runs_open_per_day_key"
  ON "bar_refill_runs" ("organization_id", "run_date_local")
  WHERE "status" IN ('open', 'partially_confirmed');

CREATE INDEX "bar_refill_run_items_refill_run_id_idx"
  ON "bar_refill_run_items" ("refill_run_id");

CREATE INDEX "bar_refill_run_items_template_item_id_idx"
  ON "bar_refill_run_items" ("template_item_id");

CREATE INDEX "bar_refill_run_items_inventory_item_id_idx"
  ON "bar_refill_run_items" ("inventory_item_id");

ALTER TABLE "bar_refill_run_items"
  ADD CONSTRAINT "bar_refill_run_items_refill_run_id_display_order_key"
  UNIQUE ("refill_run_id", "display_order");

ALTER TABLE "bar_refill_run_items"
  ADD CONSTRAINT "bar_refill_run_items_stock_movement_id_key" UNIQUE ("stock_movement_id");

CREATE INDEX "InventoryItem_category_id_idx" ON "InventoryItem"("category_id");
CREATE INDEX "InventoryMovement_bar_refill_run_item_id_idx" ON "InventoryMovement"("bar_refill_run_item_id");
CREATE UNIQUE INDEX "InventoryMovement_bar_refill_run_item_id_key"
  ON "InventoryMovement"("bar_refill_run_item_id");

ALTER TABLE "bar_refill_template_items"
  ADD CONSTRAINT "bar_refill_template_items_target_quantity_check"
  CHECK ("target_quantity" IS NULL OR "target_quantity" >= 0);

ALTER TABLE "bar_refill_template_items"
  ADD CONSTRAINT "bar_refill_template_items_mapping_required_check"
  CHECK ("is_misc" = true OR "inventory_item_id" IS NOT NULL OR "organization_id" IS NULL);

ALTER TABLE "bar_refill_template_items"
  ADD CONSTRAINT "bar_refill_template_items_display_order_check"
  CHECK ("display_order" BETWEEN 1 AND 43);

ALTER TABLE "bar_refill_run_items"
  ADD CONSTRAINT "bar_refill_run_items_requested_quantity_check"
  CHECK ("requested_quantity" IS NULL OR "requested_quantity" >= 0);

ALTER TABLE "InventoryItem"
  ADD CONSTRAINT "InventoryItem_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "inventory_categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bar_refill_template_items"
  ADD CONSTRAINT "bar_refill_template_items_inventory_item_id_fkey"
  FOREIGN KEY ("inventory_item_id") REFERENCES "InventoryItem"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bar_refill_run_items"
  ADD CONSTRAINT "bar_refill_run_items_refill_run_id_fkey"
  FOREIGN KEY ("refill_run_id") REFERENCES "bar_refill_runs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bar_refill_run_items"
  ADD CONSTRAINT "bar_refill_run_items_template_item_id_fkey"
  FOREIGN KEY ("template_item_id") REFERENCES "bar_refill_template_items"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bar_refill_run_items"
  ADD CONSTRAINT "bar_refill_run_items_inventory_item_id_fkey"
  FOREIGN KEY ("inventory_item_id") REFERENCES "InventoryItem"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bar_refill_run_items"
  ADD CONSTRAINT "bar_refill_run_items_stock_movement_id_fkey"
  FOREIGN KEY ("stock_movement_id") REFERENCES "InventoryMovement"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_bar_refill_run_item_id_fkey"
  FOREIGN KEY ("bar_refill_run_item_id") REFERENCES "bar_refill_run_items"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "inventory_categories" ("id", "organization_id", "name", "display_order")
VALUES
  ('cat-water-softdrinks', NULL, 'Wasser / Softdrinks', 1),
  ('cat-juice', NULL, 'Säfte', 2),
  ('cat-beer-fass', NULL, 'Bier / Fass', 3),
  ('cat-sparkling-wine', NULL, 'Schaumwein / Wein', 4),
  ('cat-coffee-tea', NULL, 'Kaffee / Tee', 5),
  ('cat-syrup', NULL, 'Sirups', 6),
  ('cat-aperitif', NULL, 'Aperitife', 7),
  ('cat-gin', NULL, 'Gin', 8),
  ('cat-rum', NULL, 'Rum', 9),
  ('cat-martini', NULL, 'Martini', 10),
  ('cat-vodka', NULL, 'Vodka', 11),
  ('cat-liqueur', NULL, 'Liköre', 12),
  ('cat-schnaps', NULL, 'Schnäpse', 13),
  ('cat-whiskey', NULL, 'Whiskey', 14),
  ('cat-misc', NULL, 'Sonstiges', 15)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "bar_refill_template_items" (
  "id",
  "organization_id",
  "display_order",
  "product_name",
  "unit",
  "target_quantity",
  "inventory_item_id",
  "is_misc",
  "active"
)
VALUES
  ('bar-template-1', NULL, 1, 'Coca Cola', '0,2l', 24, NULL, false, true),
  ('bar-template-2', NULL, 2, 'Coca Cola Zero', '0,2l', 24, NULL, false, true),
  ('bar-template-3', NULL, 3, 'Sprite', '0,2l', 24, NULL, false, true),
  ('bar-template-4', NULL, 4, 'Fanta', '0,2l', 24, NULL, false, true),
  ('bar-template-5', NULL, 5, 'Sanbitter', '0,2l', 24, NULL, false, true),
  ('bar-template-6', NULL, 6, 'Bitterlemon', '0,2l', 21, NULL, false, true),
  ('bar-template-7', NULL, 7, 'Ginger Ale', '0,2l', 15, NULL, false, true),
  ('bar-template-8', NULL, 8, 'Tonic Water', '0,2l', 20, NULL, false, true),
  ('bar-template-9', NULL, 9, 'Red Bull', '0,25l', 21, NULL, false, true),
  ('bar-template-10', NULL, 10, 'Wasser medium', '0,25l', 27, NULL, false, true),
  ('bar-template-11', NULL, 11, 'Wasser medium', '0,75l', 12, NULL, false, true),
  ('bar-template-12', NULL, 12, 'Wasser still', '0,25l', 20, NULL, false, true),
  ('bar-template-13', NULL, 13, 'Wasser still', '0,75l', 15, NULL, false, true),
  ('bar-template-14', NULL, 14, 'Paulaner Spezi', '0,33l', 24, NULL, false, true),
  ('bar-template-15', NULL, 15, 'Eistee Pfirsich', '0,33l', 18, NULL, false, true),
  ('bar-template-16', NULL, 16, 'Eistee Zitrone', '0,33l', 18, NULL, false, true),
  ('bar-template-17', NULL, 17, 'Genuss Limo Zitrone', '0,33l', 24, NULL, false, true),
  ('bar-template-18', NULL, 18, 'Genuss Limo Rhabarber', '0,33l', 18, NULL, false, true),
  ('bar-template-19', NULL, 19, 'Genuss Limo Mango', '0,33l', 18, NULL, false, true),
  ('bar-template-20', NULL, 20, 'Hefeweizen Fass', '30l', 1, NULL, false, true),
  ('bar-template-21', NULL, 21, 'Weißgold Fass', '30l', 1, NULL, false, true),
  ('bar-template-22', NULL, 22, 'Hefezweizen Alkholfrei', '0,5l', 44, NULL, false, true),
  ('bar-template-23', NULL, 23, 'Weißgold Alkoholfrei', '0,33l', 46, NULL, false, true),
  ('bar-template-24', NULL, 24, 'Corona', '0,33l', 12, NULL, false, true),
  ('bar-template-25', NULL, 25, 'Coca Cola', '1,0l', 4, NULL, false, true),
  ('bar-template-26', NULL, 26, 'Sprite', '1,0l', 8, NULL, false, true),
  ('bar-template-27', NULL, 27, 'Wild Berry', '1,0l', 8, NULL, false, true),
  ('bar-template-28', NULL, 28, 'Ginger Ale', '1,0l', 5, NULL, false, true),
  ('bar-template-29', NULL, 29, 'Johannisbeere', '1,0l', 6, NULL, false, true),
  ('bar-template-30', NULL, 30, 'Apfelsaft', '1,0l', 6, NULL, false, true),
  ('bar-template-31', NULL, 31, 'Maracuja', '1,0l', 4, NULL, false, true),
  ('bar-template-32', NULL, 32, 'Mango', '1,0l', 4, NULL, false, true),
  ('bar-template-33', NULL, 33, 'Orange', '1,0l', 4, NULL, false, true),
  ('bar-template-34', NULL, 34, 'Rhabarber', '1,0l', 4, NULL, false, true),
  ('bar-template-35', NULL, 35, 'Pulco Limette', '0,7l', 4, NULL, false, true),
  ('bar-template-36', NULL, 36, 'Pulco Zitrono', '0,7l', 4, NULL, false, true),
  ('bar-template-37', NULL, 37, 'Tonic Water', '1,0l', 4, NULL, false, true),
  ('bar-template-38', NULL, 38, 'Ginger Ale', '1,0l', 4, NULL, false, true),
  ('bar-template-39', NULL, 39, 'Spicy Ginger', '1,0l', 4, NULL, false, true),
  ('bar-template-40', NULL, 40, 'Bitterlemon', '1,0l', 8, NULL, false, true),
  ('bar-template-41', NULL, 41, 'Wasser Still', '0,75l', 13, NULL, false, true),
  ('bar-template-42', NULL, 42, 'Wasser Medium', '0,75l', 13, NULL, false, true),
  ('bar-template-43', NULL, 43, 'Sonstiges', '-', NULL, NULL, true, true)
ON CONFLICT ("id") DO NOTHING;
