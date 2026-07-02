-- Bar inventory items + category seed for the Demo Site Alpha refill list.
--
-- Idempotent / non-destructive:
--   * categories and items are inserted with ON CONFLICT DO NOTHING
--   * items are only created when no item with the same (name, defaultUnit)
--     already exists, so existing rows are never duplicated or overwritten
--
-- Source of truth for product names + units is the already-seeded
-- "bar_refill_template_items" table (migration 20260601190000). Deriving the
-- items straight from the template guarantees the name+unit auto-match used by
-- BarRefillService maps every non-misc template row to an inventory item.
--
-- The real table names are PascalCase ("InventoryItem"); only the columns added
-- by later migrations (organization_id, category_id, target_stock,
-- display_order) are snake_case.

BEGIN;

-- 1b. Bar categories. The 15 existing inventory_categories already occupy
-- display_order 1..15, so these use a high offset (100..106) to avoid the
-- UNIQUE(organization_id, display_order) constraint.
INSERT INTO "inventory_categories" ("id", "organization_id", "name", "display_order", "created_at", "updated_at")
VALUES
  ('cat-bar-softdrinks-klein', NULL, 'Softdrinks klein',  100, now(), now()),
  ('cat-bar-energy-wasser',    NULL, 'Energy & Wasser',   101, now(), now()),
  ('cat-bar-mix-033',          NULL, 'Mixgetränke 0,33l', 102, now(), now()),
  ('cat-bar-fass',             NULL, 'Fass',              103, now(), now()),
  ('cat-bar-alkoholfrei',      NULL, 'Alkoholfrei',       104, now(), now()),
  ('cat-bar-softdrinks-1l',    NULL, 'Softdrinks 1l',     105, now(), now()),
  ('cat-bar-mixer-saefte',     NULL, 'Mixer & Säfte',     106, now(), now())
ON CONFLICT DO NOTHING;

-- 1a. Inventory items derived from the non-misc template rows. One item per
-- distinct (product_name, unit) pair (41 rows; "Ginger Ale 1,0l" appears twice
-- in the template, rows 28 and 38, and collapses to a single item).
INSERT INTO "InventoryItem" (
  "id",
  "organization_id",
  "category_id",
  "name",
  "defaultUnit",
  "target_stock",
  "display_order",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  'bar-item-' || t."display_order",
  NULL,
  CASE
    WHEN t."display_order" IN (1, 2, 3, 4, 5, 6, 7, 8)            THEN 'cat-bar-softdrinks-klein'
    WHEN t."display_order" IN (9, 10, 11, 12, 13, 41, 42)         THEN 'cat-bar-energy-wasser'
    WHEN t."display_order" IN (14, 15, 16, 17, 18, 19, 24)        THEN 'cat-bar-mix-033'
    WHEN t."display_order" IN (20, 21)                            THEN 'cat-bar-fass'
    WHEN t."display_order" IN (22, 23)                            THEN 'cat-bar-alkoholfrei'
    WHEN t."display_order" IN (25, 26, 27, 28, 37, 38, 39, 40)    THEN 'cat-bar-softdrinks-1l'
    ELSE 'cat-bar-mixer-saefte'
  END,
  t."product_name",
  t."unit",
  t."target_quantity",
  t."display_order",
  true,
  now(),
  now()
FROM (
  SELECT DISTINCT ON ("product_name", "unit")
    "product_name",
    "unit",
    "target_quantity",
    "display_order"
  FROM "bar_refill_template_items"
  WHERE "is_misc" = false
  ORDER BY "product_name", "unit", "display_order"
) t
WHERE NOT EXISTS (
  SELECT 1
  FROM "InventoryItem" i
  WHERE i."name" = t."product_name"
    AND i."defaultUnit" = t."unit"
)
ON CONFLICT DO NOTHING;

-- 1c. Map template rows to the inventory items via name + unit. Covers all 42
-- non-misc rows (both "Ginger Ale 1,0l" rows map to the same item).
UPDATE "bar_refill_template_items" t
SET "inventory_item_id" = i."id"
FROM "InventoryItem" i
WHERE i."name" = t."product_name"
  AND i."defaultUnit" = t."unit"
  AND t."inventory_item_id" IS NULL
  AND t."is_misc" = false;

COMMIT;
