DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'transfer'
      AND enumtypid = '"InventoryMovementType"'::regtype
  ) THEN
    ALTER TYPE "InventoryMovementType" ADD VALUE 'transfer';
  END IF;
END
$$;

ALTER TABLE "InventoryMovement"
  ADD COLUMN IF NOT EXISTS "from_storage_location_id" TEXT,
  ADD COLUMN IF NOT EXISTS "to_storage_location_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'InventoryMovement_from_storage_location_id_fkey'
  ) THEN
    ALTER TABLE "InventoryMovement"
      ADD CONSTRAINT "InventoryMovement_from_storage_location_id_fkey"
      FOREIGN KEY ("from_storage_location_id") REFERENCES "StorageLocation"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'InventoryMovement_to_storage_location_id_fkey'
  ) THEN
    ALTER TABLE "InventoryMovement"
      ADD CONSTRAINT "InventoryMovement_to_storage_location_id_fkey"
      FOREIGN KEY ("to_storage_location_id") REFERENCES "StorageLocation"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "InventoryMovement_from_storage_location_id_idx"
  ON "InventoryMovement"("from_storage_location_id");

CREATE INDEX IF NOT EXISTS "InventoryMovement_to_storage_location_id_idx"
  ON "InventoryMovement"("to_storage_location_id");
