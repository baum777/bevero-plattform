-- Recovered from live-prod observation: this migration was applied to the
-- Supabase database out-of-band (no source-controlled copy existed at the
-- time of recovery). Content reconstructed from `prisma db pull` against the
-- live database, which exposes columns / indices that the local Prisma
-- schema does not declare.
--
-- Observed delta between `prisma/migrations` baseline and the live DB
-- `StorageLocation` table:
--   * Columns added: `locationId` (→ `Location.id`),
--                     `areaId` (→ `Area.id`),
--                     `parentStorageLocationId` (→ `StorageLocation.id` self)
--   * Indices added: `StorageLocation_locationId_idx`,
--                     `StorageLocation_areaId_idx`,
--                     `StorageLocation_parentStorageLocationId_idx`
--
-- All statements are idempotent (`ADD COLUMN IF NOT EXISTS`,
-- `CREATE INDEX IF NOT EXISTS`, FK guards via `pg_constraint`) so the
-- migration is safe to re-apply. The committed
-- `20260618_add_workspace_groups_and_kitchen_locations` migration runs
-- cleanly after this one; it adds the snake_case `temperature_zone` /
-- `is_countable` / `is_transfer_point` / `walk_order` /
-- `workspace_group_id` columns and the matching `WorkspaceGroup` FK for
-- the kitchen workspace split.

-- ── New columns ──────────────────────────────────────────────────────────────

ALTER TABLE "public"."StorageLocation"
  ADD COLUMN IF NOT EXISTS "locationId"                 TEXT,
  ADD COLUMN IF NOT EXISTS "areaId"                     TEXT,
  ADD COLUMN IF NOT EXISTS "parentStorageLocationId"    TEXT;

-- ── Foreign keys ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StorageLocation_locationId_fkey'
  ) THEN
    ALTER TABLE "public"."StorageLocation"
      ADD CONSTRAINT "StorageLocation_locationId_fkey"
      FOREIGN KEY ("locationId")
      REFERENCES "public"."Location" ("id")
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StorageLocation_areaId_fkey'
  ) THEN
    ALTER TABLE "public"."StorageLocation"
      ADD CONSTRAINT "StorageLocation_areaId_fkey"
      FOREIGN KEY ("areaId")
      REFERENCES "public"."Area" ("id")
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StorageLocation_parentStorageLocationId_fkey'
  ) THEN
    ALTER TABLE "public"."StorageLocation"
      ADD CONSTRAINT "StorageLocation_parentStorageLocationId_fkey"
      FOREIGN KEY ("parentStorageLocationId")
      REFERENCES "public"."StorageLocation" ("id")
      ON DELETE SET NULL;
  END IF;
END $$;

-- ── Indices ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "StorageLocation_locationId_idx"
  ON "public"."StorageLocation" ("locationId");

CREATE INDEX IF NOT EXISTS "StorageLocation_areaId_idx"
  ON "public"."StorageLocation" ("areaId");

CREATE INDEX IF NOT EXISTS "StorageLocation_parentStorageLocationId_idx"
  ON "public"."StorageLocation" ("parentStorageLocationId");
