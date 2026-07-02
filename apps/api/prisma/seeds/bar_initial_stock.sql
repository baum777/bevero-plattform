-- Bar inventory: remove smoke-test data, create the "Getränkelager" storage
-- location, and seed initial on-hand stock (Auffüllliste Demo Site Alpha) for the
-- 41 bar articles via goods_received movements + stock snapshots.
--
-- Idempotent: smoke deletes are scoped, the storage location is name-guarded,
-- movements use a stable idempotencyKey, and snapshots upsert on
-- (inventoryItemId, storageLocationId). Safe to re-run.
--
-- Executed against the configured Supabase project.

BEGIN;

-- 1. Remove smoke-test data. Goods receipts first (a smoke GoodsReceiptItem
--    references both the smoke item and smoke location), then movements,
--    snapshots, corrections, items and finally the storage locations.
WITH smoke_items AS (SELECT id FROM "InventoryItem" WHERE name ILIKE 'smoke%'),
smoke_locs AS (SELECT id FROM "StorageLocation" WHERE name ILIKE 'smoke%'),
smoke_receipts AS (
  SELECT DISTINCT "goodsReceiptId" AS gid FROM "GoodsReceiptItem"
  WHERE "inventoryItemId" IN (SELECT id FROM smoke_items)
     OR "storageLocationId" IN (SELECT id FROM smoke_locs)
),
del_gri AS (
  DELETE FROM "GoodsReceiptItem"
  WHERE "inventoryItemId" IN (SELECT id FROM smoke_items)
     OR "storageLocationId" IN (SELECT id FROM smoke_locs)
  RETURNING 1
)
DELETE FROM "GoodsReceipt" WHERE id IN (SELECT gid FROM smoke_receipts);

DELETE FROM "InventoryMovement"
WHERE "inventoryItemId" IN (SELECT id FROM "InventoryItem" WHERE name ILIKE 'smoke%')
   OR "storageLocationId" IN (SELECT id FROM "StorageLocation" WHERE name ILIKE 'smoke%')
   OR "from_storage_location_id" IN (SELECT id FROM "StorageLocation" WHERE name ILIKE 'smoke%')
   OR "to_storage_location_id" IN (SELECT id FROM "StorageLocation" WHERE name ILIKE 'smoke%');

DELETE FROM "InventoryStockSnapshot"
WHERE "inventoryItemId" IN (SELECT id FROM "InventoryItem" WHERE name ILIKE 'smoke%')
   OR "storageLocationId" IN (SELECT id FROM "StorageLocation" WHERE name ILIKE 'smoke%');

DELETE FROM "InventoryCorrectionRequest"
WHERE "inventoryItemId" IN (SELECT id FROM "InventoryItem" WHERE name ILIKE 'smoke%');

DELETE FROM "InventoryItem" WHERE name ILIKE 'smoke%';

DELETE FROM "StorageLocation" WHERE name ILIKE 'smoke%';

-- 2. Create the Getränkelager storage location (name-guarded, no org affinity to
--    match the existing org-less bar items).
INSERT INTO "StorageLocation" (id, organization_id, name, type, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, NULL, 'Getränkelager', 'lager', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "StorageLocation" WHERE name = 'Getränkelager');

-- 3. Seed initial stock. Target quantities ("Soll") from the Auffüllliste.
WITH targets (name, unit, qty) AS (
  VALUES
    ('Apfelsaft', '1,0l', 6),
    ('Bitterlemon', '0,2l', 21),
    ('Bitterlemon', '1,0l', 8),
    ('Coca Cola', '0,2l', 24),
    ('Coca Cola', '1,0l', 4),
    ('Coca Cola Zero', '0,2l', 24),
    ('Corona', '0,33l', 12),
    ('Eistee Pfirsich', '0,33l', 18),
    ('Eistee Zitrone', '0,33l', 18),
    ('Fanta', '0,2l', 24),
    ('Genuss Limo Mango', '0,33l', 18),
    ('Genuss Limo Rhabarber', '0,33l', 18),
    ('Genuss Limo Zitrone', '0,33l', 24),
    ('Ginger Ale', '0,2l', 15),
    ('Ginger Ale', '1,0l', 5),
    ('Hefeweizen Fass', '30l', 1),
    ('Hefezweizen Alkholfrei', '0,5l', 44),
    ('Johannisbeere', '1,0l', 6),
    ('Mango', '1,0l', 4),
    ('Maracuja', '1,0l', 4),
    ('Orange', '1,0l', 4),
    ('Paulaner Spezi', '0,33l', 24),
    ('Pulco Limette', '0,7l', 4),
    ('Pulco Zitrono', '0,7l', 4),
    ('Red Bull', '0,25l', 21),
    ('Rhabarber', '1,0l', 4),
    ('Sanbitter', '0,2l', 24),
    ('Spicy Ginger', '1,0l', 4),
    ('Sprite', '0,2l', 24),
    ('Sprite', '1,0l', 8),
    ('Tonic Water', '0,2l', 20),
    ('Tonic Water', '1,0l', 4),
    ('Wasser medium', '0,25l', 27),
    ('Wasser medium', '0,75l', 12),
    ('Wasser Medium', '0,75l', 13),
    ('Wasser still', '0,25l', 20),
    ('Wasser still', '0,75l', 15),
    ('Wasser Still', '0,75l', 13),
    ('Weißgold Alkoholfrei', '0,33l', 46),
    ('Weißgold Fass', '30l', 1),
    ('Wild Berry', '1,0l', 8)
),
storage AS (
  SELECT id FROM "StorageLocation" WHERE name = 'Getränkelager' LIMIT 1
),
resolved AS (
  SELECT i.id AS item_id, i."defaultUnit" AS unit, t.qty::double precision AS qty, s.id AS storage_id
  FROM targets t
  JOIN "InventoryItem" i ON i.name = t.name AND i."defaultUnit" = t.unit
  CROSS JOIN storage s
),
-- 3a. Audit trail: one goods_received movement per item (stable idempotencyKey).
ins_mov AS (
  INSERT INTO "InventoryMovement" (
    id, "idempotencyKey", "organizationId", "inventoryItemId", type, quantity, unit,
    "actorUserId", "storageLocationId", note, "createdAt"
  )
  SELECT
    gen_random_uuid()::text,
    'initial-stock-' || r.item_id,
    NULL,
    r.item_id,
    'goods_received',
    r.qty,
    r.unit,
    'system-seed',
    r.storage_id,
    'Initialbestand Auffüllliste Demo Site Alpha',
    now()
  FROM resolved r
  ON CONFLICT ("idempotencyKey") DO NOTHING
  RETURNING 1
)
-- 3b. Current on-hand snapshot (drives the movements/balances stock display).
INSERT INTO "InventoryStockSnapshot" (id, "inventoryItemId", "storageLocationId", quantity, unit, "calculatedAt")
SELECT gen_random_uuid()::text, r.item_id, r.storage_id, r.qty, r.unit, now()
FROM resolved r
ON CONFLICT ("inventoryItemId", "storageLocationId")
DO UPDATE SET quantity = EXCLUDED.quantity, unit = EXCLUDED.unit, "calculatedAt" = now();

COMMIT;
