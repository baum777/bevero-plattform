CREATE TABLE "procurement_mail_imports" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "message_id" TEXT NOT NULL,
  "from" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL,
  "dkim_pass" BOOLEAN NOT NULL DEFAULT false,
  "dkim_signature" TEXT,
  "parse_status" TEXT NOT NULL,
  "parse_confidence" DECIMAL(3,2) NOT NULL DEFAULT 0,
  "raw_text" TEXT,
  "object_storage_url" TEXT,
  "parse_error_msg" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "procurement_mail_imports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "procurement_orders" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "location_id" TEXT,
  "source" TEXT NOT NULL,
  "source_mail_import_id" TEXT,
  "external_order_number" TEXT NOT NULL,
  "supplier_name" TEXT NOT NULL,
  "ordered_at" TIMESTAMP(3) NOT NULL,
  "expected_delivery_at" TIMESTAMP(3),
  "status" TEXT NOT NULL,
  "raw_snapshot" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "procurement_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "procurement_order_items" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "line_number" INTEGER NOT NULL,
  "product_name_raw" TEXT NOT NULL,
  "supplier_sku" TEXT,
  "unit" TEXT NOT NULL,
  "ordered_qty" DECIMAL(10,3) NOT NULL,
  "delivered_qty" DECIMAL(10,3),
  "accepted_qty" DECIMAL(10,3),
  "unit_price" DECIMAL(12,4),
  "tax_rate" DECIMAL(5,2),
  "inventory_item_id" TEXT,
  "mapping_status" TEXT NOT NULL,
  "comment" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "procurement_order_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "article_mappings" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "supplier_name" TEXT NOT NULL,
  "product_name_raw" TEXT NOT NULL,
  "supplier_sku" TEXT,
  "inventory_item_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "article_mappings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "procurement_mail_imports_message_id_key" ON "procurement_mail_imports" ("message_id");
CREATE INDEX "procurement_mail_imports_org_status_received_idx" ON "procurement_mail_imports" ("organization_id", "parse_status", "received_at");
CREATE INDEX "procurement_mail_imports_message_id_idx" ON "procurement_mail_imports" ("message_id");

CREATE UNIQUE INDEX "procurement_orders_source_mail_import_id_key" ON "procurement_orders" ("source_mail_import_id");
CREATE UNIQUE INDEX "procurement_orders_org_external_number_key" ON "procurement_orders" ("organization_id", "external_order_number");
CREATE INDEX "procurement_orders_org_status_expected_idx" ON "procurement_orders" ("organization_id", "status", "expected_delivery_at");

CREATE INDEX "procurement_order_items_order_id_idx" ON "procurement_order_items" ("order_id");

CREATE UNIQUE INDEX "article_mappings_org_supplier_product_key" ON "article_mappings" ("organization_id", "supplier_name", "product_name_raw");
CREATE INDEX "article_mappings_org_supplier_product_idx" ON "article_mappings" ("organization_id", "supplier_name", "product_name_raw");

ALTER TABLE "procurement_orders"
  ADD CONSTRAINT "procurement_orders_source_mail_import_id_fkey"
  FOREIGN KEY ("source_mail_import_id") REFERENCES "procurement_mail_imports" ("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "procurement_order_items"
  ADD CONSTRAINT "procurement_order_items_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "procurement_orders" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "procurement_order_items"
  ADD CONSTRAINT "procurement_order_items_ordered_qty_check"
  CHECK ("ordered_qty" >= 0);

ALTER TABLE "procurement_mail_imports"
  ADD CONSTRAINT "procurement_mail_imports_parse_confidence_check"
  CHECK ("parse_confidence" >= 0 AND "parse_confidence" <= 1);
