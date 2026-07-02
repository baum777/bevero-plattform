-- ADR-0031: Multi-Standort Phase B Data Model — schema additions (B-1).
-- Forward-only. Rollback is the manual DROP script documented in ADR-0031 §Rollback Plan.
-- Four new tables (Brand, Location, Area, LocationMember), one new join
-- (LocationInventoryConfig), and two new enums (LocationProfile,
-- StoragePrecisionLevel) in the public schema. No RLS, no grants here —
-- those land in the companion RLS migration
-- 20260608171000_add_multi_location_rls.
--
-- Existing models (InventoryItem, StorageLocation, OrganizationMember) are
-- UNCHANGED per ADR-0030 §Decisions Made Binding §2-3 and ADR-0031
-- §Decisions Made Binding §1. The new tables layer on top via additive
-- foreign keys.

CREATE TYPE "LocationProfile" AS ENUM ('MOTORWORLD_STANDARD', 'CUBE_PREMIUM', 'EVENT_BANKETT_FUTURE');
CREATE TYPE "StoragePrecisionLevel" AS ENUM ('BASIC', 'DETAILED', 'PREMIUM_TRACEABLE');

CREATE TABLE "Brand" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Location" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "type" TEXT,
  "profile" "LocationProfile" NOT NULL DEFAULT 'MOTORWORLD_STANDARD',
  "precisionLevel" "StoragePrecisionLevel" NOT NULL DEFAULT 'BASIC',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Area" (
  "id" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT,
  "storageLocationId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LocationMember" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LocationMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LocationInventoryConfig" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "inventoryItemId" TEXT NOT NULL,
  "areaId" TEXT,
  "storageLocationId" TEXT,
  "targetQuantity" DOUBLE PRECISION,
  "minimumQuantity" DOUBLE PRECISION,
  "premiumHandlingRequired" BOOLEAN NOT NULL DEFAULT false,
  "qualityNoteRequired" BOOLEAN NOT NULL DEFAULT false,
  "batchNoteAllowed" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LocationInventoryConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Brand_organizationId_slug_key" ON "Brand"("organizationId", "slug");
CREATE INDEX "Brand_organizationId_idx" ON "Brand"("organizationId");

CREATE UNIQUE INDEX "Location_organizationId_slug_key" ON "Location"("organizationId", "slug");
CREATE INDEX "Location_organizationId_idx" ON "Location"("organizationId");
CREATE INDEX "Location_organizationId_id_idx" ON "Location"("organizationId", "id");
CREATE INDEX "Location_brandId_idx" ON "Location"("brandId");
CREATE INDEX "Location_profile_idx" ON "Location"("profile");

CREATE INDEX "Area_locationId_idx" ON "Area"("locationId");
CREATE INDEX "Area_organizationId_idx" ON "Area"("organizationId");
CREATE INDEX "Area_locationId_sortOrder_idx" ON "Area"("locationId", "sortOrder");
CREATE INDEX "Area_storageLocationId_idx" ON "Area"("storageLocationId");

CREATE UNIQUE INDEX "LocationMember_locationId_userId_key" ON "LocationMember"("locationId", "userId");
CREATE INDEX "LocationMember_organizationId_idx" ON "LocationMember"("organizationId");
CREATE INDEX "LocationMember_userId_idx" ON "LocationMember"("userId");
CREATE INDEX "LocationMember_locationId_isActive_idx" ON "LocationMember"("locationId", "isActive");

CREATE UNIQUE INDEX "LocationInventoryConfig_locationId_inventoryItemId_key" ON "LocationInventoryConfig"("locationId", "inventoryItemId");
CREATE INDEX "LocationInventoryConfig_organizationId_idx" ON "LocationInventoryConfig"("organizationId");
CREATE INDEX "LocationInventoryConfig_locationId_idx" ON "LocationInventoryConfig"("locationId");
CREATE INDEX "LocationInventoryConfig_inventoryItemId_idx" ON "LocationInventoryConfig"("inventoryItemId");
CREATE INDEX "LocationInventoryConfig_areaId_idx" ON "LocationInventoryConfig"("areaId");
CREATE INDEX "LocationInventoryConfig_storageLocationId_idx" ON "LocationInventoryConfig"("storageLocationId");
CREATE INDEX "LocationInventoryConfig_locationId_isActive_idx" ON "LocationInventoryConfig"("locationId", "isActive");

ALTER TABLE "Location"
  ADD CONSTRAINT "Location_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "Brand"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Area"
  ADD CONSTRAINT "Area_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Area"
  ADD CONSTRAINT "Area_storageLocationId_fkey"
  FOREIGN KEY ("storageLocationId") REFERENCES "StorageLocation"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LocationMember"
  ADD CONSTRAINT "LocationMember_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LocationInventoryConfig"
  ADD CONSTRAINT "LocationInventoryConfig_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LocationInventoryConfig"
  ADD CONSTRAINT "LocationInventoryConfig_inventoryItemId_fkey"
  FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LocationInventoryConfig"
  ADD CONSTRAINT "LocationInventoryConfig_areaId_fkey"
  FOREIGN KEY ("areaId") REFERENCES "Area"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LocationInventoryConfig"
  ADD CONSTRAINT "LocationInventoryConfig_storageLocationId_fkey"
  FOREIGN KEY ("storageLocationId") REFERENCES "StorageLocation"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
